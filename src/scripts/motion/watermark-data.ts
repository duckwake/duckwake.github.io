// The story the watermark scene tells (src/components/motion/Watermark.astro, ./watermark.ts), as data both the
// still frame and the animation read. Times are seconds after 12:00:00 on an axis to 12:04:00. The watermark is
// the rule the engine applies (crates/core/src/engine.rs, `advance`): the earliest newest event time over the
// active partitions, minus watermark_delay, and it never moves back. A partition with no events for idle_timeout
// is no longer active. A window is written once the watermark passes its end; an event for a window already
// written is late.

export const AXIS_END = 240;
export const DELAY = 30;
export const WINDOWS = [0, 60, 120, 180];

export interface Batch {
  /** Event times read from each partition in this epoch, in arrival order. */
  p0: number[];
  p1: number[];
  /** p1 has been quiet for idle_timeout by this batch; it stays left out until it has events again. */
  p1Idle?: boolean;
  /** The step of the narration this batch starts, if any (an index into STEPS). */
  step?: number;
}

export const BATCHES: Batch[] = [
  { p0: [5, 18], p1: [8, 22], step: 0 },
  { p0: [33, 12], p1: [38, 15] },
  { p0: [47, 41], p1: [52] },
  { p0: [62, 75], p1: [60, 79], step: 1 },
  { p0: [95, 70], p1: [84, 96], step: 2 },
  { p0: [110, 88], p1: [101] },
  { p0: [125, 118], p1: [], step: 3 },
  { p0: [140, 152], p1: [] },
  { p0: [147, 170], p1: [], p1Idle: true, step: 4 },
  { p0: [185, 178], p1: [] },
  { p0: [200, 64], p1: [], step: 5 },
  { p0: [215], p1: [], step: 6 },
];

export const STEPS = [
  'Events arrive out of order on two partitions. Each partition’s newest event time moves on.',
  'The watermark trails the earlier of the two by <code>watermark_delay</code> (30 s here).',
  'The watermark passes 12:01: window 12:00 is written to the view’s table, and is final.',
  'p1 goes quiet. Its newest event, 12:01:41, holds the watermark back.',
  'After <code>idle_timeout</code> p1 is left out, and the watermark moves on: window 12:01 is written.',
  'An event for 12:01:04 arrives after its window was written: it goes to the late-data table.',
  'The watermark passes 12:03: window 12:02 is written.',
];

export interface Frame {
  /** The watermark after the batch, or null before there is one. */
  watermark: number | null;
  newest: [number, number | null];
  /** Windows written by this batch (their index in WINDOWS). */
  closes: number[];
  /** Events of this batch that are late, as [partition, time]. */
  late: [number, number][];
}

/** Plays the batches through the engine's rule and returns what each one leaves. */
export function frames(): Frame[] {
  let wm: number | null = null;
  const newest: [number | null, number | null] = [null, null];
  let closed = 0;
  let idle = false;
  return BATCHES.map((b) => {
    if (b.p1Idle) idle = true;
    if (b.p1.length) idle = false;
    const late: [number, number][] = [];
    for (const [p, times] of [b.p0, b.p1].entries()) {
      for (const t of times) {
        // Late: its window was written in an earlier epoch.
        if (Math.floor(t / 60) < closed) late.push([p, t]);
        newest[p] = Math.max(newest[p] ?? t, t);
      }
    }
    const active = idle ? [newest[0]] : newest;
    const candidate = active.every((n) => n !== null) ? Math.min(...(active as number[])) - DELAY : null;
    if (candidate !== null) wm = wm === null ? candidate : Math.max(wm, candidate);
    const closes: number[] = [];
    while (wm !== null && wm > 0 && closed < WINDOWS.length && wm >= WINDOWS[closed] + 60) closes.push(closed++);
    return { watermark: wm !== null && wm >= 0 ? wm : null, newest: [newest[0]!, newest[1]], closes, late };
  });
}

/** 12:mm:ss for a time on the axis. */
export function clock(t: number): string {
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `12:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Events per written window, late ones left out. */
export function counts(): number[] {
  const all = frames();
  const late = new Set(all.flatMap((f) => f.late.map(([p, t]) => `${p}:${t}`)));
  const n = WINDOWS.map(() => 0);
  for (const b of BATCHES) {
    for (const [p, times] of [b.p0, b.p1].entries()) {
      for (const t of times) if (!late.has(`${p}:${t}`)) n[Math.floor(t / 60)]++;
    }
  }
  return n;
}
