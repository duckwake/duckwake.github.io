// The story of the change-feed scene (src/components/motion/ChangeFeed.astro, ./changefeed.ts), as data both the
// still frame and the animation read. The rules are the engine's (docs/sql.md and docs/internals.md in
// duckwake/duckwake, "Views over lake tables and other views"): a new view backfills the rows its input holds at
// the snapshot it was created at, then reads the input's DuckLake change feed, where `insert` and
// `update_postimage` weigh +1 and `delete` and `update_preimage` -1; a GROUP BY view deletes a group whose count
// returns to 0. A windowed view would need its input insert-only, so this view has no window.

export const VIEW = 'vips_by_country';
export const TABLE = 'crm.players';
export const SQL = `SELECT country, count(*) AS vips FROM ${TABLE} WHERE vip GROUP BY country`;
/** The snapshot the view is created at (S0). */
export const S0 = 41;

export interface Player {
  id: number;
  country: string;
  vip: boolean;
}

export const START: Player[] = [
  { id: 101, country: 'VN', vip: true },
  { id: 102, country: 'TH', vip: true },
  { id: 103, country: 'VN', vip: false },
  { id: 104, country: 'ID', vip: true },
  { id: 105, country: 'TH', vip: true },
];

export type Write =
  | { op: 'insert'; row: Player }
  | { op: 'update'; id: number; set: Partial<Omit<Player, 'id'>> }
  | { op: 'delete'; id: number };

/** What the app writes to the table, one commit (one snapshot) each, and what the scene says about it. */
export const WRITES: Write[] = [
  { op: 'insert', row: { id: 106, country: 'ID', vip: true } },
  { op: 'update', id: 102, set: { country: 'VN' } },
  { op: 'update', id: 103, set: { vip: true } },
  { op: 'delete', id: 105 },
];

export const STEPS = [
  `The view is created at snapshot ${S0} and backfills: it reads the rows <code>${TABLE}</code> holds there. Player 103 is not a VIP, so the filter leaves it out.`,
  'Your app inserts player 106. The change feed holds one insert, and ID gains a VIP.',
  'Player 102 moves from TH to VN. An update is two changes: the old row leaves (−1) and the new one arrives (+1).',
  'Player 103 becomes a VIP. Its old row never passed the filter, so only the new one counts.',
  'Player 105 is deleted. TH has no VIPs left, so its row leaves the view’s table.',
  `The view’s table equals the query over <code>${TABLE}</code> as it is now. Another view can read it the same way, through its change feed.`,
];

export interface Change {
  type: 'insert' | 'update_preimage' | 'update_postimage' | 'delete';
  weight: 1 | -1;
  row: Player;
}

/** Applies a write and returns the table after it and the changes it puts in the change feed. */
export function apply(table: Player[], w: Write): { table: Player[]; changes: Change[] } {
  switch (w.op) {
    case 'insert':
      return { table: [...table, w.row], changes: [{ type: 'insert', weight: 1, row: w.row }] };
    case 'update': {
      const old = table.find((r) => r.id === w.id)!;
      const now = { ...old, ...w.set };
      return {
        table: table.map((r) => (r.id === w.id ? now : r)),
        changes: [
          { type: 'update_preimage', weight: -1, row: old },
          { type: 'update_postimage', weight: 1, row: now },
        ],
      };
    }
    case 'delete': {
      const old = table.find((r) => r.id === w.id)!;
      return { table: table.filter((r) => r.id !== w.id), changes: [{ type: 'delete', weight: -1, row: old }] };
    }
  }
}

/** The view's query over a table: VIPs per country, in the order countries first appear. */
export function query(table: Player[]): [string, number][] {
  const n = new Map<string, number>();
  for (const r of table) if (r.vip) n.set(r.country, (n.get(r.country) ?? 0) + 1);
  return [...n];
}

/** The table and the change feed after every write, for the still frame. */
export function final(): { table: Player[]; changes: Change[]; snapshot: number } {
  let table = START;
  let changes: Change[] = [];
  for (const w of WRITES) ({ table, changes } = apply(table, w));
  return { table, changes, snapshot: S0 + WRITES.length };
}
