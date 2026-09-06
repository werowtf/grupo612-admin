export const RANGES = {
  "7d": { label: "Últimos 7 días", days: 7 },
  "30d": { label: "Últimos 30 días", days: 30 },
  "90d": { label: "Últimos 90 días", days: 90 },
} as const;

export type RangeKey = keyof typeof RANGES;
