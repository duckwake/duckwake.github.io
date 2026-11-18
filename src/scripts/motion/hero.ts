// The hero's table, live (src/components/Hero.astro). The view is `TUMBLE(clicks, ts, INTERVAL 1 MINUTE)`: an
// epoch commits every 2 s (the dbt example's epoch_interval), and a minute's window is written once the watermark
// passes its end. With events arriving on time and the default watermark_delay of 30 s, that is 30 s after the
// minute ends on the reader's clock. Rows are final once written, so their counts never change; the table keeps
// the two newest windows. The numbers are made up, the same for everyone at the same minute.
import { type Scene, type Story, fmt, random, swap } from './scene';

const EPOCH_S = 2;
const DELAY_S = 30;
const GAMES = ['aurora', 'basalt'];

/** The start, in seconds since 1970, of the newest window the watermark has passed. */
function newestWritten(nowMs: number): number {
  return Math.floor((nowMs / 1000 - DELAY_S) / 60) * 60 - 60;
}

function rowsFor(start: number): HTMLTableRowElement[] {
  const time = new Date(start * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return GAMES.map((game, i) => {
    const rnd = random(start / 60 + i * 7919);
    const n = 1200 + Math.floor(rnd() * 1100);
    const revenue = Math.round(n * (4.1 + rnd() * 0.6) * 4) / 4;
    const tr = document.createElement('tr');
    for (const text of [time, game, fmt(n), fmt(revenue, 2)]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    return tr;
  });
}

export function hero(): Story {
  let shown = 0;
  let epoch = 0;
  return {
    init(s) {
      // From the still frame to the reader's clock, at once.
      epoch = Number(s.el('[data-epoch]').textContent!.replace(/,/g, ''));
      shown = newestWritten(Date.now());
      const rows = [...rowsFor(shown - 60), ...rowsFor(shown)];
      rows.slice(2).forEach((r) => r.classList.add('dw-new'));
      s.el('[data-rows]').replaceChildren(...rows);
    },

    async cycle(s) {
      const tbody = s.el<HTMLTableSectionElement>('[data-rows]');
      const ago = s.el('[data-ago]');

      // One epoch commits.
      epoch++;
      await Promise.all([
        swap(s, s.el('[data-epoch]'), fmt(epoch)),
        swap(s, ago, 'committed just now'),
        s.to(s.el('[data-live]'), { scale: [1, 1.7, 1] }, { duration: 0.5 }),
        s.to(s.el('[data-arrow]'), { y: [0, 3, 0] }, { duration: 0.5 }),
      ]);

      // A window the watermark has passed since the last epoch is written in it.
      const due = newestWritten(Date.now());
      if (due !== shown) {
        const fresh = due - shown === 60;
        shown = due;
        const old = [...tbody.rows];
        const added = [...rowsFor(due - 60), ...rowsFor(due)].slice(fresh ? 2 : 0);
        if (!fresh) {
          // The page was away for more than a window: show the newest two, without a story.
          added.slice(2).forEach((r) => r.classList.add('dw-new'));
          tbody.replaceChildren(...added);
        } else {
          await s.to(old.slice(0, 2), { opacity: 0 }, { duration: 0.3 });
          const kept = old.slice(2);
          const before = kept.map((r) => r.getBoundingClientRect().top);
          old.slice(0, 2).forEach((r) => r.remove());
          kept.forEach((r) => r.classList.remove('dw-new'));
          added.forEach((r) => {
            r.classList.add('dw-new');
            r.style.opacity = '0';
          });
          tbody.append(...added);
          await Promise.all([
            ...kept.map((r, i) => s.to(r, { y: [before[i] - r.getBoundingClientRect().top, 0] }, { duration: 0.45 })),
            s.to(added, { opacity: [0, 1], y: [10, 0] }, { duration: 0.45, delay: 0.15 }),
          ]);
        }
      }

      await s.wait(1);
      await swap(s, ago, 'committed 1 s ago');
      await s.wait(EPOCH_S - 1 - 0.8);
    },
  };
}
