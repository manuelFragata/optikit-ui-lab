/** An amount in euros, as the views show it: €1,234.50. */
export const formatEur = (v: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(v);

/** A share, 0–1, as a whole percentage: 0.394 → "39%". */
export const formatPercent = (v: number) => `${Math.round(v * 100)}%`;
