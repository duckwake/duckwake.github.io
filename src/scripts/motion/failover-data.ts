// The failover scene's story (src/components/motion/Failover.astro, ./failover.ts). The rules are the worker's
// (docs/cli.md in duckwake/duckwake, "Workers, failover and rebalancing"): a dead worker's views move once its
// heartbeat has not moved for --lease-timeout (default 30s) and continue from their last checkpoint; every
// --rebalance-every (default 30s) the busiest worker gives up to --rebalance-max-moves (2) views to the least
// loaded one when it holds two more than that worker. Here every view costs the same, so load is a view count.

export const START: Record<string, string[]> = {
  w1: ['clicks_per_min', 'sessions'],
  w2: ['signups', 'errors'],
  w3: ['revenue_hourly', 'funnel'],
};

/** w2's views go to the least loaded live worker, one at a time. */
export const FAILOVER: [view: string, to: string][] = [
  ['signups', 'w1'],
  ['errors', 'w3'],
];

/** When w2 joins with no views, each rebalancing round moves a view from the busiest worker to it. */
export const REBALANCE: [view: string, from: string, to: string][] = [
  ['sessions', 'w1', 'w2'],
  ['funnel', 'w3', 'w2'],
];

export const STEPS = [
  'Each worker heartbeats into the lake and holds a lease on each view it runs.',
  'w2 dies: killed, frozen, or its machine gone. Its heartbeat stops moving.',
  'After <code>--lease-timeout</code> (30 s) the live workers take its views, and each continues from its last checkpoint.',
  'w2 starts again and joins with no views.',
  'Every <code>--rebalance-every</code> (30 s) the busiest worker hands a view to the least loaded, until loads are even.',
];
