// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationNavigation } from '../src/client/ConversationNavigation.tsx'
import type { ConversationLandmarkProjection } from '../src/types.ts'

const LANDMARKS = [
  {
    messageSeq: 10,
    anchorKey: '13:input-messagemessage-a',
    request: { kind: 'text', text: 'First user task' },
    outcome: 'First answer',
  },
  {
    messageSeq: 20,
    anchorKey: '13:input-messagemessage-b',
    request: { kind: 'text', text: 'Second user task' },
    outcome: 'Second answer',
  },
  {
    messageSeq: 30,
    anchorKey: '13:input-messagemessage-c',
    request: { kind: 'text', text: 'Third user task' },
  },
] as unknown as ConversationLandmarkProjection

function rect(top: number, bottom: number, width = 1000): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: width,
    width,
    height: bottom - top,
    toJSON: () => ({}),
  }
}

function mountScrollport(): HTMLElement {
  const column = document.createElement('div')
  column.dataset.conversationColumn = ''
  column.getBoundingClientRect = () => rect(0, 900)
  const scrollport = document.createElement('div')
  scrollport.dataset.conversationScroll = ''
  scrollport.getBoundingClientRect = () => rect(100, 600)
  column.append(scrollport)
  document.body.append(column)
  return scrollport
}

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

describe('ConversationNavigation', () => {
  it('tracks the nearest line without collapsing the other targets', async () => {
    mountScrollport()
    const { container, getByText } = render(
      <ConversationNavigation
        sessionId={'session-a' as SessionId}
        sessions={{} as ISessions}
        t={key => key}
        useProjection={() => LANDMARKS}
      />,
    )

    await waitFor(() => { expect(container.querySelectorAll('.dshcl-marker')).toHaveLength(3) })
    const rail = container.querySelector<HTMLElement>('.dshcl-rail')
    expect(rail).not.toBeNull()
    fireEvent.mouseMove(rail as HTMLElement, { clientY: 18 })

    const markers = [...container.querySelectorAll<HTMLElement>('.dshcl-marker')]
    expect(markers.map(marker => marker.dataset.proximity)).toEqual(['neighbor', 'selected', 'neighbor'])
    expect(getByText('Second user task')).toBeTruthy()
    expect(getByText('Second answer')).toBeTruthy()
  })

  it('hides the rail until at least three user tasks exist', async () => {
    mountScrollport()
    const two = LANDMARKS.slice(0, 2) as unknown as ConversationLandmarkProjection
    const view = render(
      <ConversationNavigation
        sessionId={'session-a' as SessionId}
        sessions={{} as ISessions}
        t={key => key}
        useProjection={() => two}
      />,
    )
    expect(view.container.querySelectorAll('.dshcl-marker')).toHaveLength(0)
    view.rerender(
      <ConversationNavigation
        sessionId={'session-a' as SessionId}
        sessions={{} as ISessions}
        t={key => key}
        useProjection={() => LANDMARKS}
      />,
    )
    await waitFor(() => { expect(view.container.querySelectorAll('.dshcl-marker')).toHaveLength(3) })
  })

  it('tiers the two nearest markers on each side down toward the resting length', async () => {
    mountScrollport()
    const five = Array.from({ length: 5 }, (_, index) => ({
      messageSeq: (index + 1) * 10,
      anchorKey: `13:input-message-${String(index)}`,
      request: { kind: 'text', text: `Task ${String(index)}` },
    })) as unknown as ConversationLandmarkProjection
    const { container } = render(
      <ConversationNavigation
        sessionId={'session-a' as SessionId}
        sessions={{} as ISessions}
        t={key => key}
        useProjection={() => five}
      />,
    )
    await waitFor(() => { expect(container.querySelectorAll('.dshcl-marker')).toHaveLength(5) })
    const rail = container.querySelector<HTMLElement>('.dshcl-rail')!
    fireEvent.mouseMove(rail, { clientY: 30 })
    const markers = [...container.querySelectorAll<HTMLElement>('.dshcl-marker')]
    expect(markers.map(marker => marker.dataset.proximity)).toEqual(['near2', 'neighbor', 'selected', 'neighbor', 'near2'])
  })

  it('loads an older page and reveals the user message with highlight clearance', async () => {
    const scrollport = mountScrollport()
    const loadOlder = vi.fn(async () => {
      loaded = true
      const anchor = document.createElement('div')
      anchor.dataset.chatAnchorKey = LANDMARKS[0]?.anchorKey
      anchor.getBoundingClientRect = () => rect(260, 320)
      scrollport.append(anchor)
    })
    let loaded = false
    const session = {
      getSnapshot: () => ({
        chat: {
          nodes: { get: () => loaded ? {} : undefined },
          order: loaded ? [LANDMARKS[0]?.anchorKey] : ['newer-message'],
        },
        hasMore: !loaded,
        loadingOlder: false,
      }),
      loadOlder,
    }
    const sessions = {
      binding: () => ({ session }),
    } as unknown as ISessions
    const { getByRole } = render(
      <ConversationNavigation
        sessionId={'session-a' as SessionId}
        sessions={sessions}
        t={key => key}
        useProjection={() => LANDMARKS}
      />,
    )

    fireEvent.click(getByRole('button', { name: 'First user task' }))
    await waitFor(() => { expect(loadOlder).toHaveBeenCalledOnce() })
    // Row offset is 260 - 100 = 160; revealed 14px short so the highlight outline shows.
    await waitFor(() => { expect(scrollport.scrollTop).toBe(146) })
  })
})
