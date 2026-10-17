/** Colours for wavelengths, for marking them on charts and plots. */

/** The colour of a visible wavelength (approximate), grey outside 380–750 nm. */
export function nmColor(nm: number): string {
  const stops: [number, string][] = [
    [380, '#7a3cc7'],
    [440, '#3b4fe0'],
    [490, '#14a7d6'],
    [520, '#2fbf4a'],
    [570, '#c9cf1f'],
    [600, '#f29a1a'],
    [650, '#e8341c'],
    [750, '#8f1a12'],
  ];
  if (nm < stops[0][0] || nm > stops[stops.length - 1][0]) return '#8b9199';
  let k = 1;
  while (stops[k][0] < nm) k++;
  return Math.abs(stops[k][0] - nm) < Math.abs(nm - stops[k - 1][0]) ? stops[k][1] : stops[k - 1][1];
}
