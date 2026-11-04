export const pourStart = .06;
export const dropTravel = .13;
export const firstContact = pourStart + dropTravel;
export const pourEnd = .53;
export const settleEnd = .72;

export function transferProgress(elapsed: number): number {
  return Math.min(1, Math.max(0, (elapsed - firstContact) / (pourEnd - firstContact)));
}

/** Bound the edge of the wave by the jug floor and rim. */
export function waterSlope(elapsed: number, height: number, capacityHeight: number, radius: number): number {
  const time = elapsed - firstContact;
  if (time <= 0 || elapsed >= settleEnd) return 0;
  const amplitude = Math.max(0, Math.min(.14, height / radius, (capacityHeight - height) / radius));
  return amplitude * Math.sin(time * 24) * Math.exp(-time * 7);
}
