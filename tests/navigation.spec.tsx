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
  const scrollport = document.createElement('div')
  scrollport.dataset.conversationScroll = ''
  scrollport.getBoundingClientRect = () => rect(100, 600)
  document.body.append(scrollport)
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

  it('loads an older page and aligns the user message to the viewport top', async () => {
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
    await waitFor(() => { expect(scrollport.scrollTop).toBe(160) })
  })
})
