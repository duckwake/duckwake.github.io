// One epoch, over and over (src/components/motion/EngineFlow.astro). The story carries on from cycle to cycle,
// as a worker does: offsets, totals, the epoch and the lake's snapshot only ever grow.
import { stagger } from 'motion';
import { type Scene, type Story, flash, fly, fmt, random, show, swap } from './scene';

const GAMES = ['aurora', 'basalt', 'cobalt'] as const;
type Game = (typeof GAMES)[number];
/** How often each game appears in the topic. */
const WEIGHTS = [0.47, 0.36, 0.17];
/** The most events a partition shows waiting. */
const LANE_MAX = 6;

function chip(game: string): HTMLElement {
  const ev = document.createElement('i');
  ev.className = 'dw-ev';
  ev.dataset.game = game;
  return ev;
}

function setStep(s: Scene, step: string | null): void {
  for (const li of s.all('[data-step]')) {
    if (li.dataset.step === step) li.dataset.active = '';
    else delete li.dataset.active;
  }
}

export function engine(): Story {
  const rnd = random(1284);
  const pick = (): Game => {
    let r = rnd();
    for (let i = 0; i < GAMES.length; i++) {
      r -= WEIGHTS[i];
      if (r < 0) return GAMES[i];
    }
    return GAMES[0];
  };
  // The view's numbers, read from the still frame on the first cycle.
  let state: { epoch: number; snapshot: number; offsets: number[]; n: Record<string, number>; revenue: Record<string, number> };

  return {
    init(s) {
      const num = (el: HTMLElement) => Number(el.textContent!.replace(/,/g, ''));
      state = {
        epoch: num(s.el('[data-epoch]')),
        snapshot: num(s.el('[data-snap]')),
        offsets: s.all('[data-off]').map(num),
        n: Object.fromEntries(GAMES.map((g) => [g, num(s.el(`[data-row="${g}"] [data-n]`))])),
        revenue: Object.fromEntries(GAMES.map((g) => [g, num(s.el(`[data-row="${g}"] [data-rev]`))])),
      };
    },

    async cycle(s) {
      const batch = s.el('[data-batch]');
      const deltas = s.el('[data-deltas]');
      const txn = s.el('[data-txn]');
      const timer = s.el('[data-timer]');
      if (getComputedStyle(txn).opacity !== '0') await s.to(txn, { opacity: 0 }, { duration: 0.3 });
      show([batch, deltas, txn], false);
      setStep(s, null);

      // Between epochs: events arrive on the partitions while the epoch interval runs.
      const arrivals: HTMLElement[] = [];
      for (const lane of s.all('.dw-eng-queue')) {
        const room = LANE_MAX - lane.children.length;
        const k = Math.min(room, 1 + Math.floor(rnd() * 3));
        for (let i = 0; i < k; i++) {
          const ev = chip(pick());
          ev.style.opacity = '0';
          lane.append(ev);
          arrivals.push(ev);
        }
      }
      arrivals.sort(() => rnd() - 0.5);
      await Promise.all([
        s.to(timer, { scaleX: [0, 1] }, { duration: 2.4, ease: 'linear' }),
        ...arrivals.map((ev, i) =>
          s.to(ev, { opacity: [0, 1], scale: [0.2, 1] }, { delay: 0.2 + i * 0.22, duration: 0.35, ease: 'backOut' }),
        ),
      ]);

      // 1. Read: everything that arrived, from every partition.
      setStep(s, 'read');
      const events = s.all('.dw-eng-queue .dw-ev');
      const read = [0, 0, 0];
      for (const ev of events) read[Number(ev.closest<HTMLElement>('[data-part]')!.dataset.part)]++;
      batch.replaceChildren(...events.map((ev) => chip(ev.dataset.game!)));
      show(batch, true);
      const slots = [...batch.children] as HTMLElement[];
      await Promise.all(events.map((ev, i) => fly(s, ev, slots[i], { delay: i * 0.05, duration: 0.7 })));
      for (const ev of events) ev.remove();
      void s.to(timer, { scaleX: 0 }, { duration: 0.3 });
      await s.wait(0.3);

      // 2. Stage: each event folds into its game's change; games with no events are not touched.
      setStep(s, 'stage');
      const counts: Record<string, number> = {};
      const amounts: Record<string, number> = {};
      for (const c of slots) {
        const g = c.dataset.game!;
        counts[g] = (counts[g] ?? 0) + 1;
        amounts[g] = (amounts[g] ?? 0) + Math.round((2 + rnd() * 7) * 4) / 4;
      }
      const changed = GAMES.filter((g) => counts[g]);
      const marks: Record<string, HTMLElement> = {};
      deltas.replaceChildren(
        ...changed.map((g) => {
          const d = document.createElement('span');
          d.className = 'dw-eng-delta';
          const mark = chip(g);
          marks[g] = mark;
          d.append(mark, `${g} `);
          const b = document.createElement('b');
          b.textContent = `+${counts[g]}`;
          d.append(b);
          return d;
        }),
      );
      show(deltas, true);
      await Promise.all([
        s.to([...deltas.children], { opacity: [0, 1] }, { duration: 0.3, delay: stagger(0.1) }),
        ...slots.map((c, i) => fly(s, c, marks[c.dataset.game!], { delay: 0.1 + i * 0.04, duration: 0.6 })),
      ]);
      show(batch, false);
      await s.wait(0.7);

      // 3. Commit: rows, state and offsets leave together and land in one snapshot.
      setStep(s, 'commit');
      await s.to(deltas, { opacity: 0 }, { duration: 0.25 });
      const tags = s.all('[data-tag]');
      show(tags, false);
      show(txn, true);
      await s.to(tags, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, delay: stagger(0.12) });
      await s.wait(0.5);
      await Promise.all([
        ...tags.map((t) => fly(s, t, s.el(`[data-land="${t.dataset.tag}"]`), { duration: 0.8, scale: 0.85, fade: true })),
        s.to(txn, { opacity: 0 }, { duration: 0.35, delay: 0.1 }),
      ]);

      state.epoch++;
      state.snapshot++;
      const lake = s.el('[data-lake]');
      const updates: Promise<void>[] = [
        s.to(lake, { outlineColor: ['rgb(47 163 154 / 0.9)', 'rgb(47 163 154 / 0)'] }, { duration: 1.4, ease: 'easeOut' }),
        swap(s, s.el('[data-epoch]'), fmt(state.epoch)),
        swap(s, s.el('[data-snap]'), fmt(state.snapshot)),
        flash(s, [s.el('[data-state]'), s.el('[data-offsets]')]),
      ];
      read.forEach((k, p) => {
        if (!k) return;
        const el = s.el(`[data-off="${p}"]`);
        const from = state.offsets[p];
        state.offsets[p] += k;
        updates.push(s.count(from, state.offsets[p], (v) => (el.textContent = fmt(Math.round(v)))));
      });
      for (const g of changed) {
        const row = s.el(`[data-row="${g}"]`);
        const nEl = row.querySelector<HTMLElement>('[data-n]')!;
        const revEl = row.querySelector<HTMLElement>('[data-rev]')!;
        const n0 = state.n[g];
        const r0 = state.revenue[g];
        state.n[g] += counts[g];
        state.revenue[g] += amounts[g];
        updates.push(
          flash(s, [...row.children]),
          s.count(n0, state.n[g], (v) => (nEl.textContent = fmt(Math.round(v)))),
          s.count(r0, state.revenue[g], (v) => (revEl.textContent = fmt(v, 2))),
        );
      }
      await Promise.all(updates);
      await s.to(txn, { opacity: 0 }, { duration: 0.3 });
      setStep(s, null);
      await s.wait(0.4);
    },
  };
}
