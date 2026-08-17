import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { z } from 'zod'
import type { ZodType } from 'zod'
import type {
  ConversationLandmark,
  ConversationLandmarkAnchorKey,
  ConversationLandmarkProjection,
  ConversationLandmarkRequest,
} from './types.ts'

const PREVIEW_TEXT_LIMIT = 320

const landmarkSchema = z.object({
  messageSeq: z.number().int().nonnegative(),
  anchorKey: z.string(),
  request: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), text: z.string() }),
    z.object({ kind: z.literal('image') }),
    z.object({ kind: z.literal('other') }),
  ]),
})

/** Runtime schema for the projection value sent to Web clients. */
export const conversationLandmarksSchema: ZodType<ConversationLandmarkProjection> = z.array(z.union([
  landmarkSchema.extend({ outcome: z.string() }),
  landmarkSchema,
])) as unknown as ZodType<ConversationLandmarkProjection>

/**
 * Build the stable Chat row key used by the official input-message definition.
 *
 * Mirrors `conversationContextKey('input-message', id)` from
 * `@deepseek-ai/dsh-client-runtime`, which formats node keys as
 * `` `${kind.length}:${kind}${id}` ``. `'input-message'` is 13 characters, so
 * every input-message row key (user and steering alike) starts with the fixed
 * prefix below. The anchor-format test locks this derivation.
 */
export function inputMessageAnchorKey(messageId: string): ConversationLandmarkAnchorKey {
  return `13:input-message${messageId}` as ConversationLandmarkAnchorKey
}

function previewText(parts: readonly string[]): string | undefined {
  const normalized = parts.join('\n').replace(/\s+/g, ' ').trim()
  if (normalized === '') return undefined
  return normalized.length <= PREVIEW_TEXT_LIMIT
    ? normalized
    : `${normalized.slice(0, PREVIEW_TEXT_LIMIT - 1)}…`
}

function requestOf(event: SessionEvent<'user/message'>): ConversationLandmarkRequest {
  const text = previewText(event.data.content.flatMap(block => block.type === 'text' ? [block.text] : []))
  if (text !== undefined) return { kind: 'text', text }
  if (event.data.content.some(block => block.type === 'image')) return { kind: 'image' }
  return { kind: 'other' }
}

function outcomeOf(event: SessionEvent<'assistant/message'>): string | undefined {
  return previewText(event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : []))
}

/** Fold one durable session event into the complete landmark list. */
export function applyLandmarkEvent(
  state: ConversationLandmarkProjection,
  event: SessionEvent,
): ConversationLandmarkProjection {
  if (event.type === 'user/message'
    && event.data.source.kind === 'user'
    && isAppendSurfaceEvent(event)) {
    return [...state, {
      messageSeq: event.seq,
      anchorKey: inputMessageAnchorKey(String(event.data.id)),
      request: requestOf(event),
    }]
  }
  if (event.type !== 'assistant/message' || !isAppendSurfaceEvent(event)) return state
  const outcome = outcomeOf(event)
  const last = state.at(-1)
  if (last === undefined || outcome === undefined || last.outcome === outcome) return state
  const updated: ConversationLandmark = { ...last, outcome }
  return [...state.slice(0, -1), updated]
}
