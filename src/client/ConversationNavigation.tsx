import {
  useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent,
} from 'react'
import type { ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConversationLandmark, ConversationLandmarkProjection } from '../types.ts'
import { clamp, groupHeight, nearestPosition, ordinalPosition, RAIL_INSET } from './geometry.ts'

const RAIL_LEFT = 6
const TARGET_HIGHLIGHT_MS = 1_200

interface NavigationProps {
  readonly sessionId: SessionId
  readonly useProjection: (key: 'conversationLandmarks') => ConversationLandmarkProjection | undefined
  readonly sessions: ISessions
  readonly t: (key: 'label' | 'imageRequest' | 'otherRequest') => string
}

interface Measurement {
  readonly left: number
  readonly top: number
  readonly height: number
  readonly positions: readonly number[]
}

interface FocusPoint { readonly index: number }

const EMPTY_MEASUREMENT: Measurement = { left: 0, top: 0, height: 12, positions: [] }

function requestText(landmark: ConversationLandmark, imageLabel: string, otherLabel: string): string {
  if (landmark.request.kind === 'text') return landmark.request.text
  return landmark.request.kind === 'image' ? imageLabel : otherLabel
}

function visibleScrollport(): HTMLElement | null {
  for (const candidate of document.querySelectorAll<HTMLElement>('[data-conversation-scroll]')) {
    const rect = candidate.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return candidate
  }
  return null
}

function findAnchor(scrollport: HTMLElement, key: string): HTMLElement | null {
  for (const element of scrollport.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')) {
    if (element.dataset.chatAnchorKey === key) return element
  }
  return null
}

function sameMeasurement(left: Measurement, right: Measurement): boolean {
  return left.left === right.left
    && left.top === right.top
    && left.height === right.height
    && left.positions.length === right.positions.length
    && left.positions.every((position, index) => position === right.positions[index])
}

function measure(landmarks: readonly ConversationLandmark[]): Measurement {
  const scrollport = visibleScrollport()
  if (scrollport === null) {
    const height = groupHeight(landmarks.length, 0)
    return {
      ...EMPTY_MEASUREMENT,
      height,
      positions: landmarks.map((_landmark, index) => ordinalPosition(index, landmarks.length, height)),
    }
  }
  const viewport = scrollport.getBoundingClientRect()
  const composer = scrollport.querySelector<HTMLElement>('[data-composer-seat]')
    ?? document.querySelector<HTMLElement>('[data-composer-seat]')
  const composerTop = composer?.getBoundingClientRect().top
  const bottom = composerTop === undefined ? viewport.bottom : Math.min(viewport.bottom, composerTop)
  const availableHeight = Math.max(0, bottom - viewport.top)
  const height = groupHeight(landmarks.length, availableHeight)
  const positions = landmarks.map((_landmark, index) => ordinalPosition(index, landmarks.length, height))
  return {
    left: viewport.left + RAIL_LEFT,
    top: viewport.top + availableHeight / 2,
    height,
    positions,
  }
}

function markerStyle(y: number, positions: readonly number[] = [], index = 0): CSSProperties {
  const previous = positions[index - 1]
  const following = positions[index + 1]
  const before = previous === undefined ? Number.POSITIVE_INFINITY : y - previous
  const after = following === undefined ? Number.POSITIVE_INFINITY : following - y
  const nearest = Math.min(before, after)
  const hitHeight = Number.isFinite(nearest) ? clamp(nearest, 1, 12) : 12
  return {
    '--dshcl-hit-height': `${String(hitHeight)}px`,
    '--dshcl-y': `${String(y)}px`,
  } as CSSProperties
}

async function waitFrame(): Promise<void> {
  await new Promise<void>(resolve => { window.requestAnimationFrame(() => { resolve() }) })
}

async function renderedAnchor(key: string): Promise<{
  readonly anchor: HTMLElement
  readonly scrollport: HTMLElement
} | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scrollport = visibleScrollport()
    const anchor = scrollport === null ? null : findAnchor(scrollport, key)
    if (scrollport !== null && anchor !== null) return { anchor, scrollport }
    await waitFrame()
  }
  return null
}

/** Fixed, vertically centered rail over complete-log user tasks. */
export function ConversationNavigation({ sessionId, sessions, t, useProjection }: NavigationProps) {
  const landmarks = useProjection('conversationLandmarks') ?? []
  const railRef = useRef<HTMLDivElement | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)
  const targetTimerRef = useRef<number | undefined>()
  const activatingRef = useRef(false)
  const [activatingSeq, setActivatingSeq] = useState<number | undefined>()
  const [measurement, setMeasurement] = useState<Measurement>(EMPTY_MEASUREMENT)
  const [focus, setFocus] = useState<FocusPoint | null>(null)
  const previewId = useId()

  useEffect(() => {
    const scrollport = visibleScrollport()
    let frame: number | undefined
    const update = (): void => {
      frame = undefined
      const next = measure(landmarks)
      setMeasurement(current => sameMeasurement(current, next) ? current : next)
    }
    const schedule = (): void => {
      if (frame !== undefined) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    scrollport?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    if (resizeObserver !== null && scrollport !== null) {
      resizeObserver.observe(scrollport)
      const flow = scrollport.querySelector<HTMLElement>('[data-chat-flow]')
      const composer = document.querySelector<HTMLElement>('[data-composer-seat]')
      if (flow !== null) resizeObserver.observe(flow)
      if (composer !== null) resizeObserver.observe(composer)
    }
    return () => {
      scrollport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      resizeObserver?.disconnect()
      if (frame !== undefined) window.cancelAnimationFrame(frame)
    }
  }, [landmarks])

  useEffect(() => () => {
    if (targetTimerRef.current !== undefined) window.clearTimeout(targetTimerRef.current)
    targetRef.current?.removeAttribute('data-dshcl-target')
  }, [])

  if (landmarks.length === 0) return null

  const focusFromPointer = (event: MouseEvent<HTMLDivElement>): void => {
    const rail = railRef.current
    if (rail === null || measurement.positions.length === 0) return
    const y = clamp(
      event.clientY - rail.getBoundingClientRect().top,
      RAIL_INSET,
      Math.max(RAIL_INSET, measurement.height - RAIL_INSET),
    )
    setFocus({ index: nearestPosition(measurement.positions, y) })
  }

  const jumpTo = async (landmark: ConversationLandmark): Promise<void> => {
    if (activatingRef.current) return
    activatingRef.current = true
    setActivatingSeq(landmark.messageSeq)
    try {
      const session = sessions.binding(sessionId)?.session
      if (session === undefined) return
      let snapshot = session.getSnapshot()
      while (snapshot.chat.nodes.get(landmark.anchorKey) === undefined && snapshot.hasMore) {
        const firstKey = snapshot.chat.order[0]
        await session.loadOlder()
        const next = session.getSnapshot()
        snapshot = next
        if (snapshot.chat.nodes.get(landmark.anchorKey) !== undefined || !snapshot.hasMore) break
        if (snapshot.chat.order[0] === firstKey && snapshot.loadingOlder !== true) break
      }
      const rendered = await renderedAnchor(landmark.anchorKey)
      if (rendered === null) return
      const { anchor, scrollport } = rendered
      scrollport.scrollTop += anchor.getBoundingClientRect().top - scrollport.getBoundingClientRect().top
      targetRef.current?.removeAttribute('data-dshcl-target')
      if (targetTimerRef.current !== undefined) window.clearTimeout(targetTimerRef.current)
      anchor.setAttribute('data-dshcl-target', '')
      targetRef.current = anchor
      targetTimerRef.current = window.setTimeout(() => {
        anchor.removeAttribute('data-dshcl-target')
        targetRef.current = null
        targetTimerRef.current = undefined
      }, TARGET_HIGHLIGHT_MS)
    } finally {
      activatingRef.current = false
      setActivatingSeq(undefined)
    }
  }

  const focusedLandmark = focus === null ? undefined : landmarks[focus.index]
  const imageLabel = t('imageRequest')
  const otherLabel = t('otherRequest')

  return (
    <nav
      className="dshcl-root"
      style={{
        '--dshcl-height': `${String(measurement.height)}px`,
        '--dshcl-left': `${String(measurement.left)}px`,
        '--dshcl-top': `${String(measurement.top)}px`,
      } as CSSProperties}
      aria-busy={activatingSeq !== undefined || undefined}
      aria-label={t('label')}
    >
      <div
        ref={railRef}
        className="dshcl-rail"
        onMouseMove={focusFromPointer}
        onMouseLeave={() => { setFocus(null) }}
      >
        {landmarks.map((landmark, index) => {
          const request = requestText(landmark, imageLabel, otherLabel)
          const y = measurement.positions[index] ?? ordinalPosition(index, landmarks.length, measurement.height)
          const proximity = focus === null
            ? undefined
            : index === focus.index
              ? 'selected'
              : Math.abs(index - focus.index) === 1
                ? 'neighbor'
                : undefined
          return (
            <button
              key={landmark.messageSeq}
              type="button"
              className="dshcl-marker"
              style={markerStyle(y, measurement.positions, index)}
              data-focused={index === focus?.index || undefined}
              data-proximity={proximity}
              aria-label={request}
              aria-describedby={index === focus?.index ? previewId : undefined}
              disabled={activatingSeq !== undefined}
              onFocus={() => { setFocus({ index }) }}
              onBlur={() => { setFocus(null) }}
              onClick={() => { void jumpTo(landmark) }}
            >
              <span className="dshcl-line" />
            </button>
          )
        })}
        {focus !== null && focusedLandmark !== undefined && (
          <div
            id={previewId}
            role="tooltip"
            className="dshcl-preview"
            style={markerStyle(measurement.positions[focus.index] ?? RAIL_INSET)}
          >
            <div className="dshcl-request">{requestText(focusedLandmark, imageLabel, otherLabel)}</div>
            {focusedLandmark.outcome !== undefined && (
              <div className="dshcl-outcome">{focusedLandmark.outcome}</div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
