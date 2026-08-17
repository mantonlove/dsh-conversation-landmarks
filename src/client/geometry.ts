export const RAIL_INSET = 6
export const REST_GAP = 12
export const GROUP_MARGIN = 36
export const MAX_GROUP_HEIGHT = 360

/** Clamp a number to an inclusive range. */
export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

/** Height of the centered landmark group within the visible conversation area. */
export function groupHeight(count: number, availableHeight: number): number {
  const maximum = Math.max(12, Math.min(MAX_GROUP_HEIGHT, availableHeight - GROUP_MARGIN * 2))
  const desired = count <= 1 ? 12 : (count - 1) * REST_GAP + RAIL_INSET * 2
  return Math.min(desired, maximum)
}

/** Evenly map one landmark ordinal into the fixed rail. */
export function ordinalPosition(index: number, count: number, height: number): number {
  const available = Math.max(0, height - RAIL_INSET * 2)
  const ratio = count <= 1 ? 0.5 : index / (count - 1)
  return RAIL_INSET + available * ratio
}

/** Find the marker nearest one pointer coordinate. */
export function nearestPosition(positions: readonly number[], y: number): number {
  let nearest = 0
  let distance = Number.POSITIVE_INFINITY
  positions.forEach((position, index) => {
    const next = Math.abs(position - y)
    if (next < distance) {
      nearest = index
      distance = next
    }
  })
  return nearest
}
