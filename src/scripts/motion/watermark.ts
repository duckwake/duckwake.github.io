// Watermarks, windows and late events (src/components/motion/Watermark.astro). The story is in
// ./watermark-data.ts; this plays it one epoch at a time and starts over.
import { type Scene, type Story, flash, fly, show, swap } from './scene';
import { AXIS_END, BATCHES, STEPS, clock, frames } from './watermark-data';

const pct = (t: number) => `${((t / AXIS_END) * 100).toFixed(3)}%`;

function reset(s: Scene): void {
  for (const ev of s.all('.dw-wm-ev')) ev.remove();
  show(s.all('[data-row], [data-late-row]'), false);
  for (const win of s.all('[data-win]')) {
    delete win.dataset.written;
    win.querySelector('[data-wstate]')!.textContent = 'open';
  }
  delete s.el('[data-pid="1"]').dataset.idle;
  for (const el of s.all('[data-newest], [data-wm], [data-delay]')) {
    el.style.opacity = '0';
    el.style.left = '0%';
  }
  s.el('[data-stepno]').textContent = '1';
  s.el('[data-status]').innerHTML = STEPS[0];
}

export function watermark(): Story {
  const all = frames();
  return {
    async cycle(s) {
      const stage = s.el('.dw-wm');
      await s.to(stage, { opacity: 0 }, { duration: 0.35 });
      reset(s);
      await s.to(stage, { opacity: 1 }, { duration: 0.35 });

      const line = s.el('[data-wm]');
      const delay = s.el('[data-delay]');
      const label = s.el('[data-wmt]');
      const newest = [s.el('[data-newest="0"]'), s.el('[data-newest="1"]')];
      const shown: (number | null)[] = [null, null];
      let wm: number | null = null;

      for (const [i, batch] of BATCHES.entries()) {
        const frame = all[i];
        if (batch.step !== undefined && batch.step > 0) {
          await Promise.all([
            swap(s, s.el('[data-status]'), STEPS[batch.step]),
            swap(s, s.el('[data-stepno]'), String(batch.step + 1)),
          ]);
        }

        // The epoch's events land at their event times, in the order they arrived.
        const landings: Promise<void>[] = [];
        let k = 0;
        for (const [p, times] of [batch.p0, batch.p1].entries()) {
          for (const t of times) {
            const ev = document.createElement('i');
            ev.className = 'dw-wm-ev';
            ev.dataset.p = String(p);
            ev.style.left = pct(t);
            ev.style.opacity = '0';
            s.el(`[data-track="${p}"]`).append(ev);
            const isLate = frame.late.some(([lp, lt]) => lp === p && lt === t);
            landings.push(
              s.to(ev, { opacity: [0, 1], y: [-16, 0] }, { delay: k++ * 0.14, duration: 0.4 }).then(async () => {
                if (!isLate) return;
                // Its window was written in an earlier epoch: the event goes to the late-data table.
                ev.dataset.late = '';
                const row = s.el('[data-late-row]');
                await fly(s, ev, row, { keep: true, fade: true, scale: 1.4, duration: 0.8 });
                await Promise.all([s.to(row, { opacity: [0, 1] }, { duration: 0.3 }), flash(s, row, '239 125 98')]);
              }),
            );
          }
        }
        await Promise.all(landings);
        if (batch.p1Idle) s.el('[data-pid="1"]').dataset.idle = '';

        // Each partition's newest event time, then the watermark.
        const moves: Promise<void>[] = [];
        frame.newest.forEach((t, p) => {
          if (t === null || t === shown[p]) return;
          moves.push(s.to(newest[p], { left: [pct(shown[p] ?? t), pct(t)], opacity: 1 }, { duration: 0.45 }));
          shown[p] = t;
        });
        await Promise.all(moves);
        if (frame.watermark !== null && frame.watermark !== wm) {
          const from = wm ?? frame.watermark;
          moves.length = 0;
          moves.push(
            s.to([line, delay], { left: [pct(from), pct(frame.watermark)], opacity: 1 }, { duration: 0.7 }),
            s.count(from, frame.watermark, (v) => (label.textContent = clock(v)), 0.7),
          );
          await Promise.all(moves);
          wm = frame.watermark;
        }

        // Windows whose end the watermark passed are written, and final.
        for (const w of frame.closes) {
          const win = s.el(`[data-win="${w}"]`);
          win.dataset.written = '';
          void swap(s, win.querySelector('[data-wstate]')!, 'written');
          const row = s.el(`[data-row="${w}"]`);
          await fly(s, win, row, { keep: true, fade: true, scale: 0.8, duration: 0.8 });
          await Promise.all([s.to(row, { opacity: [0, 1] }, { duration: 0.3 }), flash(s, row)]);
        }
        await s.wait(batch.step !== undefined ? 1.5 : 0.45);
      }
      await s.wait(3);
    },
  };
}
