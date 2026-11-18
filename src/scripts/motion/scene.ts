// The runtime the site's animations share, built on Motion (https://motion.dev).
//
// A scene is an element with `data-dw-scene` (most are a <figure> from src/components/motion/Scene.astro) and a
// story told in cycles: `cycle` plays the story once, from whatever frame the stage shows, and the scene repeats
// it. Every animation and every pause in a cycle goes through the scene, so it can hold all of them at
// once. A scene plays only while a third of it is on screen in a visible tab, its button pauses and resumes it,
// and it does not start by itself for a reader who asks for reduced motion (the button still plays it). The page
// renders a complete still frame without JavaScript, so a scene that never plays still reads.
//
// Motion never settles an animation that a newer one on the same element and property interrupts (its
// `finished` stays pending after stop()), so the scene does not rely on it alone: everything it waits on also
// settles once its own delay and duration have passed on the scene's clock, which stands still while the scene
// is paused.
import { animate, inView } from 'motion';
import type { AnimationOptions, DOMKeyframesDefinition } from 'motion';

type Controls = ReturnType<typeof animate>;
type Targets = Element | Element[] | NodeListOf<Element>;

/** Slack past an animation's nominal end before the scene stops waiting for Motion to report it. */
const SETTLE_S = 0.25;

export interface Story {
  /** Runs once, before the first cycle: reads what the still frame shows. */
  init?(s: Scene): void;
  /**
   * Plays the story once. Every wait in it goes through `s`. The first cycle starts from the still frame the page
   * rendered and the next from where the last ended, so a story that resets fades its stage out and back in.
   */
  cycle(s: Scene): Promise<void>;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export class Scene {
  readonly root: HTMLElement;
  /** Overlay for elements in flight between parts of the stage (see `fly`). */
  readonly fx: HTMLElement;
  private readonly live = new Set<Controls>();
  private readonly button: HTMLButtonElement | null;
  private onScreen = false;
  /** Held by the reader's button, or by a reduced-motion preference until the reader presses play. */
  private held = reducedMotion.matches;
  private running = false;
  /** The scene's clock: seconds it has played, and when it last started running (while it runs). */
  private elapsed = 0;
  private since: number | null = null;
  /** What the cycle waits on, with the clock time by which each has surely ended. */
  private readonly pending = new Map<Controls, { deadline: number; settle: () => void }>();
  private sweeper: number | undefined;

  constructor(root: HTMLElement, private readonly story: Story) {
    this.root = root;
    this.fx = root.querySelector<HTMLElement>('[data-dw-fx]') ?? root;
    this.button = root.querySelector<HTMLButtonElement>('[data-dw-toggle]');
    this.button?.addEventListener('click', () => {
      this.held = !this.held;
      this.sync();
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        this.held = true;
        this.sync();
      }
    });
    document.addEventListener('visibilitychange', () => this.sync());
    inView(
      root,
      () => {
        this.onScreen = true;
        this.sync();
        return () => {
          this.onScreen = false;
          this.sync();
        };
      },
      { amount: 0.3 },
    );
    this.sync();
  }

  get playing(): boolean {
    return this.onScreen && !this.held && !document.hidden;
  }

  /** The first element under the scene matching `selector`; a missing one is a bug in the page. */
  el<T extends HTMLElement = HTMLElement>(selector: string): T {
    const found = this.root.querySelector<T>(selector);
    if (!found) throw new Error(`scene ${this.root.dataset.dwScene}: no ${selector}`);
    return found;
  }

  all<T extends HTMLElement = HTMLElement>(selector: string): T[] {
    return [...this.root.querySelectorAll<T>(selector)];
  }

  /** Animates elements and resolves when they finish. */
  to(targets: Targets, keyframes: DOMKeyframesDefinition, options: AnimationOptions = {}): Promise<void> {
    const o: AnimationOptions = { duration: 0.45, ease: [0.4, 0, 0.2, 1], ...options };
    const n = targets instanceof Element ? 1 : targets.length;
    let delay = 0;
    if (typeof o.delay === 'number') delay = o.delay;
    else if (typeof o.delay === 'function') for (let i = 0; i < n; i++) delay = Math.max(delay, o.delay(i, n));
    return this.track(animate(targets, keyframes, o), delay + (o.duration ?? 0));
  }

  /** Tweens a number, calling `onUpdate` with each value, and resolves when it ends. */
  count(from: number, to: number, onUpdate: (v: number) => void, duration = 0.6): Promise<void> {
    return this.track(animate(from, to, { duration, ease: 'easeOut', onUpdate }), duration);
  }

  /** Waits on the scene's clock: a paused scene's waits are paused too. */
  wait(seconds: number): Promise<void> {
    return this.track(animate(0, 1, { duration: seconds, ease: 'linear' }), seconds);
  }

  /** Starts a repeating animation (a heartbeat); stop it with `stop`. */
  loop(targets: Targets, keyframes: DOMKeyframesDefinition, options: AnimationOptions = {}): Controls {
    const c = animate(targets, keyframes, { repeat: Infinity, ...options });
    this.live.add(c);
    if (!this.playing) c.pause();
    return c;
  }

  stop(c: Controls | undefined): void {
    if (!c) return;
    this.live.delete(c);
    c.stop();
  }

  /** Seconds the scene has played. */
  private time(): number {
    return this.elapsed + (this.since === null ? 0 : (performance.now() - this.since) / 1000);
  }

  private track(c: Controls, seconds: number): Promise<void> {
    this.live.add(c);
    if (!this.playing) c.pause();
    return new Promise((resolve) => {
      const settle = () => {
        if (!this.live.delete(c)) return;
        this.pending.delete(c);
        resolve();
      };
      this.pending.set(c, { deadline: this.time() + seconds + SETTLE_S, settle });
      c.then(settle, settle);
      this.sweep();
    });
  }

  /** Settles whatever has passed its end on the scene's clock, a few times a second while anything is pending. */
  private sweep(): void {
    if (this.sweeper !== undefined) return;
    this.sweeper = window.setInterval(() => {
      const now = this.time();
      for (const { deadline, settle } of [...this.pending.values()]) if (now >= deadline) settle();
      if (this.pending.size === 0) {
        window.clearInterval(this.sweeper);
        this.sweeper = undefined;
      }
    }, 150);
  }

  private sync(): void {
    const playing = this.playing;
    if (playing && this.since === null) this.since = performance.now();
    if (!playing && this.since !== null) {
      this.elapsed = this.time();
      this.since = null;
    }
    for (const c of this.live) {
      if (playing) c.play();
      else c.pause();
    }
    this.root.dataset.state = playing ? 'playing' : 'paused';
    if (this.button) {
      // The button says what it will do; while off screen a scene the reader has not held still reads "Pause".
      const label = this.held ? 'Play animation' : 'Pause animation';
      this.button.setAttribute('aria-label', label);
      this.button.title = label;
      this.button.dataset.held = String(this.held);
    }
    if (playing && !this.running) void this.run();
  }

  private async run(): Promise<void> {
    this.running = true;
    try {
      this.story.init?.(this);
    } catch (err) {
      console.error(`scene ${this.root.dataset.dwScene}:`, err);
      return;
    }
    for (;;) {
      const started = performance.now();
      try {
        await this.story.cycle(this);
      } catch (err) {
        // A broken scene stops and leaves its frame as it is, rather than spinning.
        console.error(`scene ${this.root.dataset.dwScene}:`, err);
        return;
      }
      // A cycle always takes time; one that did not would spin the page.
      if (performance.now() - started < 200) await this.wait(1);
    }
  }
}

/** Mounts a story on every scene of that name on the page. */
export function mount(name: string, story: () => Story): void {
  for (const root of document.querySelectorAll<HTMLElement>(`[data-dw-scene="${name}"]`)) {
    if (root.dataset.dwMounted) continue;
    root.dataset.dwMounted = 'true';
    new Scene(root, story());
  }
}

/** Where `el` is, relative to the scene's overlay. */
export function box(s: Scene, el: Element): DOMRect {
  const r = el.getBoundingClientRect();
  const o = s.fx.getBoundingClientRect();
  return new DOMRect(r.left - o.left, r.top - o.top, r.width, r.height);
}

/**
 * Moves a copy of `from` onto `to` through the overlay. `from` hides as the copy leaves and `to` shows when it
 * lands, so the element seems to travel between two parts of the stage whatever their layout.
 */
export async function fly(
  s: Scene,
  from: HTMLElement,
  to: HTMLElement,
  {
    duration = 0.6,
    delay = 0,
    keep = false,
    scale,
    fade = false,
  }: {
    duration?: number;
    delay?: number;
    /** Leave `from` where it is: a copy of it travels. */
    keep?: boolean;
    /** The copy's size on landing; by default it takes `to`'s width. */
    scale?: number;
    /** Fade the copy out as it lands, for a label that merges into its target. */
    fade?: boolean;
  } = {},
): Promise<void> {
  const a = box(s, from);
  const b = box(s, to);
  const ghost = from.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.classList.add('dw-ghost');
  Object.assign(ghost.style, {
    position: 'absolute',
    left: `${a.x}px`,
    top: `${a.y}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: '0',
    visibility: 'visible',
    opacity: '',
  });
  s.fx.append(ghost);
  if (!keep) from.style.visibility = 'hidden';
  if (!fade) to.style.visibility = 'hidden';
  const dx = b.x + b.width / 2 - (a.x + a.width / 2);
  const dy = b.y + b.height / 2 - (a.y + a.height / 2);
  const end = scale ?? (a.width > 0 && b.width > 0 ? b.width / a.width : 1);
  const keyframes: DOMKeyframesDefinition = { x: [0, dx], y: [0, dy], scale: [1, end] };
  if (fade) keyframes.opacity = [1, 1, 0];
  try {
    await s.to(ghost, keyframes, { duration, delay, ease: [0.55, 0, 0.25, 1] });
  } finally {
    if (!fade) to.style.visibility = '';
    ghost.remove();
  }
}

/**
 * Brings `el`, already in its place, in from where `from` is: for an element born out of another one that cannot
 * travel itself (a table row).
 */
export function arrive(
  s: Scene,
  el: HTMLElement,
  from: Element,
  { duration = 0.6, delay = 0 }: { duration?: number; delay?: number } = {},
): Promise<void> {
  const a = box(s, from);
  const b = box(s, el);
  const dx = a.x + a.width / 2 - (b.x + b.width / 2);
  const dy = a.y + a.height / 2 - (b.y + b.height / 2);
  return s.to(
    el,
    { x: [dx, 0], y: [dy, 0], opacity: [0, 1], scale: [0.7, 1] },
    { duration, delay, ease: [0.55, 0, 0.25, 1] },
  );
}

/** A short highlight behind an element, in the site's Wake teal (or the given colour). */
export async function flash(s: Scene, targets: Targets, rgb = '47 163 154'): Promise<void> {
  await s.to(
    targets,
    { backgroundColor: [`rgb(${rgb} / 0.38)`, `rgb(${rgb} / 0)`] },
    { duration: 1.1, ease: 'easeOut' },
  );
  // Hand the background back to the stylesheet, so a panel keeps its own colour.
  for (const el of (targets instanceof Element ? [targets] : [...targets]) as HTMLElement[]) {
    el.style.backgroundColor = '';
  }
}

/** Fades an element's text out, changes it and fades it back in. */
export async function swap(s: Scene, el: HTMLElement, html: string): Promise<void> {
  if (el.innerHTML === html) return;
  await s.to(el, { opacity: 0 }, { duration: 0.18 });
  el.innerHTML = html;
  await s.to(el, { opacity: 1 }, { duration: 0.22 });
}

/** Shows or hides elements at once, without animating (for `init`). */
export function show(targets: Targets, visible: boolean): void {
  const list = targets instanceof Element ? [targets] : [...targets];
  for (const el of list as HTMLElement[]) {
    el.style.opacity = visible ? '1' : '0';
    el.style.transform = '';
    el.style.visibility = '';
  }
}

/** A small seeded random generator, so each scene tells a varied but repeatable story. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fmt = (n: number, digits = 0): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
