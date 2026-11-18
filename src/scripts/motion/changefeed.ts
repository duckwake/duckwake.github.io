// A view over a lake table (src/components/motion/ChangeFeed.astro); the story is in ./changefeed-data.ts. Each
// cycle creates the view again over the table as it was, backfills, then follows the app's writes.
import { type Scene, type Story, arrive, flash, fly, swap } from './scene';
import { type Change, type Player, S0, START, STEPS, TABLE, WRITES, apply } from './changefeed-data';

const RED = '239 125 98';

function cell(text: string, col?: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  if (col) td.dataset.col = col;
  return td;
}

function srcRow(r: Player): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.dataset.id = String(r.id);
  tr.append(cell(String(r.id)), cell(r.country, 'country'), cell(String(r.vip), 'vip'));
  return tr;
}

function chip(c: Change, typed: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = 'dw-cf-chip';
  el.dataset.weight = String(c.weight);
  const b = document.createElement('b');
  b.textContent = c.weight > 0 ? '+1' : '−1';
  const row = document.createElement('span');
  row.textContent = `${c.row.id} ${c.row.country} ${c.row.vip}`;
  el.append(b, row);
  if (typed) {
    const type = document.createElement('small');
    type.textContent = c.type;
    el.append(type);
  }
  el.style.opacity = '0';
  return el;
}

function reset(s: Scene): void {
  s.el('[data-src]').replaceChildren(...START.map(srcRow));
  s.el('[data-out]').replaceChildren();
  s.el('[data-chips]').replaceChildren();
  s.el('[data-snap]').textContent = String(S0);
  s.el('[data-pos]').textContent = '–';
  s.el('[data-feed-label]').innerHTML = `Backfill: <code>${TABLE}</code> at snapshot ${S0}`;
  s.el('[data-stepno]').textContent = '1';
  s.el('[data-status]').innerHTML = STEPS[0];
}

/** Puts changes in the feed, each coming out of the source row it is about. */
async function emit(s: Scene, changes: Change[], typed = true): Promise<HTMLElement[]> {
  const strip = s.el('[data-chips]');
  const chips = changes.map((c) => chip(c, typed));
  strip.replaceChildren(...chips);
  await Promise.all(
    chips.map((c, i) => arrive(s, c, s.el(`[data-src] [data-id="${changes[i].row.id}"]`), { delay: i * 0.18 })),
  );
  return chips;
}

/** One change through the view: the filter drops it, or it moves its country's count by its weight. */
async function land(s: Scene, el: HTMLElement, c: Change): Promise<void> {
  if (!c.row.vip) {
    el.dataset.filtered = '';
    await s.to(el, { opacity: 0.4 }, { duration: 0.5 });
    return;
  }
  const out = s.el('[data-out]');
  let row = out.querySelector<HTMLTableRowElement>(`[data-group="${c.row.country}"]`);
  const fresh = !row;
  if (!row) {
    row = document.createElement('tr');
    row.dataset.group = c.row.country;
    row.append(cell(c.row.country), cell('0'));
    row.cells[1].dataset.n = '';
    row.style.opacity = '0';
    out.append(row);
  }
  const n = row.cells[1];
  await fly(s, el, n, { fade: true, scale: 0.8, duration: 0.7 });
  if (fresh) await s.to(row, { opacity: [0, 1] }, { duration: 0.25 });
  const count = Number(n.textContent) + c.weight;
  n.textContent = String(count);
  await flash(s, [...row.cells], c.weight > 0 ? undefined : RED);
  if (count === 0) {
    // The batch query has no row for a group with nothing in it, so neither does the view.
    await s.to(row, { opacity: 0 }, { duration: 0.4 });
    row.remove();
  }
}

async function consume(s: Scene, chips: HTMLElement[], changes: Change[], gap: number): Promise<void> {
  await Promise.all(
    changes.map(async (c, i) => {
      await s.wait(i * gap);
      await land(s, chips[i], c);
    }),
  );
}

export function changefeed(): Story {
  return {
    async cycle(s) {
      const stage = s.el('.dw-cf');
      await s.to(stage, { opacity: 0 }, { duration: 0.35 });
      reset(s);
      await s.to(stage, { opacity: 1 }, { duration: 0.35 });
      await s.wait(1.4);

      // Backfill: every row of the table at S0, in rowid order.
      let table = START;
      const backfill: Change[] = table.map((row) => ({ type: 'insert', weight: 1, row }));
      // The strip's label says where these rows come from, so each chip carries only its row.
      const rows = await emit(s, backfill, false);
      await consume(s, rows, backfill, 0.45);
      await swap(s, s.el('[data-pos]'), String(S0));
      await s.wait(1.6);

      // Then the change feed, one commit of the app at a time.
      let snapshot = S0;
      for (const [i, write] of WRITES.entries()) {
        await Promise.all([
          swap(s, s.el('[data-status]'), STEPS[i + 1]),
          swap(s, s.el('[data-stepno]'), String(i + 2)),
          ...s.all('[data-chips] > *').map((c) => s.to(c, { opacity: 0 }, { duration: 0.3 })),
        ]);
        s.el('[data-chips]').replaceChildren();

        // The app commits: a new snapshot of the table.
        const next = apply(table, write);
        const src = s.el('[data-src]');
        if (write.op === 'insert') {
          const tr = srcRow(write.row);
          tr.style.opacity = '0';
          src.append(tr);
          await s.to(tr, { opacity: [0, 1] }, { duration: 0.3 });
          await flash(s, [...tr.cells]);
        } else if (write.op === 'update') {
          const tr = s.el(`[data-src] [data-id="${write.id}"]`);
          const now = next.table.find((r) => r.id === write.id)!;
          const changed = Object.keys(write.set).map((k) => tr.querySelector<HTMLElement>(`[data-col="${k}"]`)!);
          await Promise.all(changed.map((td) => swap(s, td, String(now[td.dataset.col as keyof Player]))));
          await flash(s, changed);
        } else {
          const tr = s.el<HTMLTableRowElement>(`[data-src] [data-id="${write.id}"]`);
          tr.dataset.deleted = '';
          await flash(s, [...tr.cells], RED);
        }
        snapshot++;
        await swap(s, s.el('[data-snap]'), String(snapshot));

        // The view's next epoch reads the changes since the last snapshot it read.
        await swap(s, s.el('[data-feed-label]'), `Change feed, snapshot ${snapshot - 1} to ${snapshot}`);
        const chips = await emit(s, next.changes);
        if (write.op === 'delete') {
          const tr = s.el(`[data-src] [data-id="${write.id}"]`);
          await s.to(tr, { opacity: 0 }, { duration: 0.35 });
          tr.remove();
        }
        await s.wait(0.5);
        await consume(s, chips, next.changes, 0.6);
        await swap(s, s.el('[data-pos]'), String(snapshot));
        table = next.table;
        await s.wait(1.5);
      }

      await Promise.all([
        swap(s, s.el('[data-status]'), STEPS[STEPS.length - 1]),
        swap(s, s.el('[data-stepno]'), String(STEPS.length)),
      ]);
      await s.wait(4);
    },
  };
}
