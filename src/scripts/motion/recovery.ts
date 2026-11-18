// A worker killed mid-epoch, and the epoch computed again by another (src/components/motion/ExactlyOnce.astro).
// Each cycle starts from the same frame: w1 runs the view, w2 runs others.
import { type Scene, type Story, flash, fly, show, swap } from './scene';

const STEPS = [
  'w1 runs epoch 43: it reads offsets 4,200 to 4,349 and stages them.',
  'w1 is killed before it commits. Nothing of epoch 43 reaches the lake.',
  'w1’s heartbeat has stopped. After <code>--lease-timeout</code> (30 s) its lease is free.',
  'w2 takes the lease and reads the last commit: epoch 42, offset 4,200 and the view’s state.',
  'w2 runs epoch 43 again from offset 4,200, so it reads the same events.',
  'w2 commits epoch 43: every event in it is counted once.',
];

function chip(game: string): HTMLElement {
  const ev = document.createElement('i');
  ev.className = 'dw-ev';
  ev.dataset.game = game;
  return ev;
}

function reset(s: Scene): void {
  for (const w of s.all('[data-w]')) {
    delete w.dataset.dead;
    w.querySelector('[data-wstate]')!.textContent = 'running';
    const pending = w.querySelector<HTMLElement>('[data-pending]')!;
    show(pending, false);
    delete pending.dataset.lost;
    pending.querySelector('[data-bag]')!.replaceChildren();
    pending.querySelector('[data-plabel]')!.textContent = 'not committed';
    const lease = w.querySelector<HTMLElement>('[data-lease]')!;
    lease.style.visibility = w.dataset.w === 'w1' ? '' : 'hidden';
    lease.querySelector<HTMLElement>('[data-lease-timer]')!.style.transform = 'scaleX(0)';
  }
  show(s.el('[data-epoch="43"]'), false);
  show(s.el('[data-verify]'), false);
  s.el('[data-stepno]').textContent = '1';
  s.el('[data-status]').innerHTML = STEPS[0];
}

/** A worker reads the epoch's events into its pending transaction. */
async function read(s: Scene, worker: HTMLElement): Promise<void> {
  const pending = worker.querySelector<HTMLElement>('[data-pending]')!;
  const bag = pending.querySelector<HTMLElement>('[data-bag]')!;
  const events = s.all('[data-events] .dw-ev');
  const slots = events.map((ev) => chip(ev.dataset.game!));
  bag.replaceChildren(...slots);
  await s.to(pending, { opacity: [0, 1], y: [6, 0] }, { duration: 0.35 });
  await Promise.all(events.map((ev, i) => fly(s, ev, slots[i], { keep: true, delay: i * 0.08, duration: 0.6 })));
}

export function recovery(): Story {
  return {
    async cycle(s) {
      const stage = s.el('.dw-eo');
      await s.to(stage, { opacity: 0 }, { duration: 0.35 });
      reset(s);
      await s.to(stage, { opacity: 1 }, { duration: 0.35 });

      const w1 = s.el('[data-w="w1"]');
      const w2 = s.el('[data-w="w2"]');
      const status = s.el('[data-status]');
      const stepNo = s.el('[data-stepno]');
      const step = (i: number) => Promise.all([swap(s, status, STEPS[i]), swap(s, stepNo, String(i + 1))]);
      const ring = { scale: [1, 2.6], opacity: [0.55, 0] };
      const beat1 = s.loop(w1.querySelector('[data-beat] i')!, ring, { duration: 1.1, ease: 'easeOut' });
      const beat2 = s.loop(w2.querySelector('[data-beat] i')!, ring, { duration: 1.1, ease: 'easeOut', delay: 0.45 });

      try {
        // 1. w1 reads and stages epoch 43.
        await s.wait(0.6);
        await read(s, w1);
        await s.wait(0.9);

        // 2. w1 is killed: its transaction never commits.
        await step(1);
        w1.dataset.dead = '';
        w1.querySelector('[data-wstate]')!.textContent = 'killed';
        s.stop(beat1);
        await s.to(w1, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.4, ease: 'linear' });
        const lost = w1.querySelector<HTMLElement>('[data-pending]')!;
        lost.dataset.lost = '';
        await swap(s, lost.querySelector('[data-plabel]')!, 'never committed');
        await s.wait(0.7);
        await s.to(lost, { opacity: 0 }, { duration: 0.5 });
        await s.wait(0.5);

        // 3. The lease times out.
        await step(2);
        await s.to(w1.querySelector('[data-lease-timer]')!, { scaleX: [0, 1] }, { duration: 2.2, ease: 'linear' });

        // 4. w2 takes the lease and reads the last commit.
        await step(3);
        await fly(s, w1.querySelector('[data-lease]')!, w2.querySelector('[data-lease]')!, { duration: 0.8 });
        const last = s.el('[data-epoch="42"]');
        await Promise.all([
          flash(s, last),
          fly(s, last, w2.querySelector('[data-pending]')!, { keep: true, fade: true, scale: 1, duration: 0.9 }),
        ]);
        await s.wait(0.4);

        // 5. w2 computes epoch 43 again, from the same offsets.
        await step(4);
        await read(s, w2);
        await s.wait(0.8);

        // 6. It commits once.
        await step(5);
        const committed = s.el('[data-epoch="43"]');
        show(committed, true);
        await fly(s, w2.querySelector('[data-pending]')!, committed, { duration: 0.8 });
        await flash(s, committed);
        await s.to(s.el('[data-verify]'), { opacity: [0, 1], y: [6, 0] }, { duration: 0.4 });
        await s.wait(3);
      } finally {
        s.stop(beat1);
        s.stop(beat2);
      }
    },
  };
}
