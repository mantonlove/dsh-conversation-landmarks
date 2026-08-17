import type { Branded } from '@deepseek-ai/dsh-brand'

/** Branded DOM anchor key shared by the Host projection and browser navigator. */
export type ConversationLandmarkAnchorKey = Branded<'ConversationLandmarkAnchorKey'>

/** Previewable form of one direct user request. */
export type ConversationLandmarkRequest =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image' }
  | { readonly kind: 'other' }

/** One direct user task and the latest following Assistant answer. */
export interface ConversationLandmark {
  readonly messageSeq: number
  readonly anchorKey: ConversationLandmarkAnchorKey
  readonly request: ConversationLandmarkRequest
  readonly outcome?: string
}

/** Complete ordered landmark list for one durable session. */
export type ConversationLandmarkProjection = readonly ConversationLandmark[]

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Direct user tasks and their latest following Assistant answers. */
    conversationLandmarks: ConversationLandmarkProjection
  }
}
