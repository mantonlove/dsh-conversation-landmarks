import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { applyLandmarkEvent, inputMessageAnchorKey } from '../src/projection.ts'

function event(value: unknown): SessionEvent {
  return value as SessionEvent
}

describe('conversation landmarks projection', () => {
  it('indexes direct user tasks and the latest following Assistant text', () => {
    const user = event({
      type: 'user/message', seq: 10, time: 1,
      data: {
        id: 'message-a',
        content: [{ type: 'text', text: '  explain   the plugin  ' }],
        source: { kind: 'user' },
      },
      surfaceOp: 'append',
    })
    const assistant = event({
      type: 'assistant/message', seq: 11, time: 2,
      data: {
        message: { content: [{ type: 'text', text: 'First answer' }] },
      },
      surfaceOp: 'append',
    })
    const first = applyLandmarkEvent([], user)
    expect(first).toEqual([{
      messageSeq: 10,
      anchorKey: inputMessageAnchorKey('message-a'),
      request: { kind: 'text', text: 'explain the plugin' },
    }])
    expect(applyLandmarkEvent(first, assistant)).toEqual([{
      ...first[0],
      outcome: 'First answer',
    }])
  })

  it('ignores injected context and non-append surface operations', () => {
    const pluginContext = event({
      type: 'user/message', seq: 1, time: 1,
      data: {
        id: 'context', content: [{ type: 'text', text: 'hidden' }],
        source: { kind: 'plugin', plugin: 'test' },
      },
      surfaceOp: 'append',
    })
    const replacement = event({
      type: 'user/message', seq: 2, time: 2,
      data: {
        id: 'replacement', content: [{ type: 'text', text: 'hidden' }],
        source: { kind: 'user' },
      },
      surfaceOp: { op: 'replace', start: 1, end: 1 },
      sourceEventSeqs: [1],
    })
    expect(applyLandmarkEvent([], pluginContext)).toEqual([])
    expect(applyLandmarkEvent([], replacement)).toEqual([])
  })
})
