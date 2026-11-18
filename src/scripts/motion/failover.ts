// Workers, failover and rebalancing (src/components/motion/Failover.astro); the story is in ./failover-data.ts.
// Each cycle starts from the same assignment of views.
import { type Scene, type Story, flash, fly, swap } from './scene';
import { FAILOVER, REBALANCE, START, STEPS } from './failover-data';

const MOST = Math.max(...Object.values(START).map((v) => v.length)) + 2;

function view(name: string): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'dw-fo-view';
  li.dataset.view = name;
  li.textContent = name;
  return li;
}

function reset(s: Scene): void {
  for (const [w, views] of Object.entries(START)) {
    const card = s.el(`[data-w="${w}"]`);
    delete card.dataset.dead;
    card.querySelector('[data-wstate]')!.textContent = 'running';
    card.querySelector('[data-views]')!.replaceChildren(...views.map(view));
    card.querySelector<HTMLElement>('[data-load]')!.style.width = `${(views.length / MOST) * 100}%`;
    const hb = s.el(`[data-hb="${w}"]`);
    delete hb.dataset.stale;
    hb.querySelector('[data-age]')!.textContent = '1 s ago';
  }
  s.el('[data-stepno]').textContent = '1';
  s.el('[data-status]').innerHTML = STEPS[0];
}

/** Moves a view's chip to another worker and updates both workers' load. */
async function move(s: Scene, name: string, to: string): Promise<void> {
  const chip = s.el(`[data-view="${name}"]`);
  const from = chip.closest<HTMLElement>('[data-w]')!;
  const target = s.el(`[data-w="${to}"]`);
  const slot = view(name);
  target.querySelector('[data-views]')!.append(slot);
  await fly(s, chip, slot, { duration: 0.85 });
  chip.remove();
  const load = (card: HTMLElement) =>
    s.to(
      card.querySelector('[data-load]')!,
      { width: `${(card.querySelectorAll('[data-view]').length / MOST) * 100}%` },
      { duration: 0.4 },
    );
  await Promise.all([load(from), load(target), flash(s, slot)]);
}

export function failover(): Story {
  return {
    async cycle(s) {
      const stage = s.el('.dw-fo');
      await s.to(stage, { opacity: 0 }, { duration: 0.35 });
      reset(s);
      await s.to(stage, { opacity: 1 }, { duration: 0.35 });

      const status = s.el('[data-status]');
      const stepNo = s.el('[data-stepno]');
      const step = (i: number) => Promise.all([swap(s, status, STEPS[i]), swap(s, stepNo, String(i + 1))]);

      // Heartbeats: each live worker writes one into the lake every beat, until the cycle ends.
      const alive: Record<string, boolean> = Object.fromEntries(Object.keys(START).map((w) => [w, true]));
      let beating = true;
      const heartbeat = async (w: string, offset: number) => {
        const card = s.el(`[data-w="${w}"]`);
        const dot = card.querySelector<HTMLElement>('[data-beat]')!;
        const hb = s.el(`[data-hb="${w}"]`);
        const age = hb.querySelector<HTMLElement>('[data-age]')!;
        await s.wait(offset);
        while (beating) {
          if (alive[w]) {
            await fly(s, dot, hb.querySelector('b')!, { keep: true, fade: true, scale: 1, duration: 0.7 });
            if (alive[w] && beating) {
              age.textContent = '0 s ago';
              await flash(s, hb);
            }
          }
          await s.wait(0.9);
        }
      };
      const beats = Object.keys(START).map((w, i) => heartbeat(w, i * 0.4));

      try {
        await s.wait(3);

        // w2 dies; its last heartbeat ages until the lease times out.
        await step(1);
        const w2 = s.el('[data-w="w2"]');
        alive.w2 = false;
        w2.dataset.dead = '';
        w2.querySelector('[data-wstate]')!.textContent = 'dead';
        const hb2 = s.el('[data-hb="w2"]');
        const age2 = hb2.querySelector<HTMLElement>('[data-age]')!;
        await s.count(0, 30, (v) => (age2.textContent = `${Math.round(v)} s ago`), 2.8);
        hb2.dataset.stale = '';

        // The live workers take its views.
        await step(2);
        for (const [name, to] of FAILOVER) await move(s, name, to);
        await s.wait(1.6);

        // w2 joins again, with no views.
        await step(3);
        delete w2.dataset.dead;
        w2.querySelector('[data-wstate]')!.textContent = 'running';
        delete hb2.dataset.stale;
        alive.w2 = true;
        await s.wait(2);

        // Rebalancing evens the load out, one round at a time.
        await step(4);
        for (const [name, , to] of REBALANCE) {
          await move(s, name, to);
          await s.wait(0.9);
        }
        await s.wait(2.4);
      } finally {
        beating = false;
        await Promise.all(beats);
      }
    },
  };
}
