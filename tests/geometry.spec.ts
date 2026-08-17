import { describe, expect, it } from 'vitest'
import { groupHeight, nearestPosition, ordinalPosition } from '../src/client/geometry.ts'

describe('landmark rail geometry', () => {
  it('keeps a short list comfortably spaced and centered', () => {
    expect(groupHeight(5, 800)).toBe(60)
    expect([0, 1, 2, 3, 4].map(index => ordinalPosition(index, 5, 60)))
      .toEqual([6, 18, 30, 42, 54])
  })

  it('fits a long list into the bounded fixed rail', () => {
    expect(groupHeight(88, 900)).toBe(360)
    expect(ordinalPosition(0, 88, 360)).toBe(6)
    expect(ordinalPosition(87, 88, 360)).toBe(354)
  })

  it('selects the line nearest the pointer and keeps the upper line on a tie', () => {
    expect(nearestPosition([6, 18, 30], 18)).toBe(1)
    expect(nearestPosition([6, 18, 30], 24)).toBe(1)
    expect(nearestPosition([6, 18, 30], 25)).toBe(2)
  })
})
