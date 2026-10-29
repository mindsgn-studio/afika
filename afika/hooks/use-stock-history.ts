export type HistoryPoint = { t: number; price: number };

/**
 * Stock history has no REST endpoint yet. Screens fall back to the current
 * price (or zero) so the chart renders a flat line instead of waiting forever.
 */
export function useStockHistory(_address?: string | null, _range = "1D") {
  return { points: [] as HistoryPoint[], loading: false };
}
