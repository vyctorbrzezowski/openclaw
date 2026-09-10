// Monotone cubic interpolation: each interval stays within its recorded endpoints.
export function smoothPath(
  values: number[],
  xs: number[],
  width: number,
  height: number,
  max: number,
  compressed: boolean,
) {
  const y = (value: number) => height * (1 - (compressed ? Math.sqrt(value / max) : value / max));
  const points = values.map((value, index) => ({
    x: xs[index],
    y: y(value),
  }));
  if (points.length === 1) return `M0,${points[0].y} L${width},${points[0].y}`;
  if (!points.length) return "";
  const slopes = points
    .slice(1)
    .map((point, i) => (point.y - points[i].y) / (point.x - points[i].x));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes[i - 1];
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before * after <= 0) return 0;
    const previousWidth = xs[i] - xs[i - 1];
    const nextWidth = xs[i + 1] - xs[i];
    const beforeWeight = 2 * nextWidth + previousWidth;
    const afterWeight = nextWidth + 2 * previousWidth;
    return (beforeWeight + afterWeight) / (beforeWeight / before + afterWeight / after);
  });
  return points.slice(1).reduce((path, point, i) => {
    const previous = points[i];
    const third = (point.x - previous.x) / 3;
    return `${path} C${previous.x + third},${previous.y + third * tangents[i]} ${point.x - third},${point.y - third * tangents[i + 1]} ${point.x},${point.y}`;
  }, `M${points[0].x},${points[0].y}`);
}
