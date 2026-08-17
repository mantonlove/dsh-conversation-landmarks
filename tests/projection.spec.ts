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

  it('locks the anchor key to the official input-message node format', () => {
    // conversationContextKey(kind, id) === `${kind.length}:${kind}${id}` and
    // 'input-message' is 13 characters, so the prefix must be exactly this.
    expect(inputMessageAnchorKey('message-a')).toBe('13:input-messagemessage-a')
  })

  it('indexes consecutive user tasks (steering included) as separate landmarks', () => {
    const first = event({
      type: 'user/message', seq: 1, time: 1,
      data: {
        id: 'task-1', content: [{ type: 'text', text: 'first task' }],
        source: { kind: 'user' },
      },
      surfaceOp: 'append',
    })
    const steering = event({
      type: 'user/message', seq: 2, time: 2,
      data: {
        id: 'task-2', content: [{ type: 'text', text: 'steering follow-up' }],
        source: { kind: 'user' },
      },
      surfaceOp: 'append',
    })
    const state = applyLandmarkEvent(applyLandmarkEvent([], first), steering)
    expect(state).toEqual([
      {
        messageSeq: 1,
        anchorKey: inputMessageAnchorKey('task-1'),
        request: { kind: 'text', text: 'first task' },
      },
      {
        messageSeq: 2,
        anchorKey: inputMessageAnchorKey('task-2'),
        request: { kind: 'text', text: 'steering follow-up' },
      },
    ])
  })

  it('ignores an Assistant message that precedes any user task', () => {
    const orphan = event({
      type: 'assistant/message', seq: 1, time: 1,
      data: { message: { content: [{ type: 'text', text: 'orphan answer' }] } },
      surfaceOp: 'append',
    })
    expect(applyLandmarkEvent([], orphan)).toEqual([])
  })

  it('does not attach a whitespace-only Assistant outcome', () => {
    const user = event({
      type: 'user/message', seq: 1, time: 1,
      data: {
        id: 'q', content: [{ type: 'text', text: 'ask' }],
        source: { kind: 'user' },
      },
      surfaceOp: 'append',
    })
    const blank = event({
      type: 'assistant/message', seq: 2, time: 2,
      data: { message: { content: [{ type: 'text', text: '   \n  ' }] } },
      surfaceOp: 'append',
    })
    const state = applyLandmarkEvent(applyLandmarkEvent([], user), blank)
    expect(state).toEqual([{
      messageSeq: 1,
      anchorKey: inputMessageAnchorKey('q'),
      request: { kind: 'text', text: 'ask' },
    }])
  })
})
