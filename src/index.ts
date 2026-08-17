/** Host plugin registering the complete-log Conversation Landmarks projection. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session-projection'
import { applyLandmarkEvent, conversationLandmarksSchema } from './projection.ts'
import type { ConversationLandmarkProjection } from './types.ts'

export type * from './types.ts'
export { applyLandmarkEvent, inputMessageAnchorKey } from './projection.ts'

/** Cordis plugin name. */
export const name = 'conversation-landmarks'

/** Complete-log landmarks require the session projection registry. */
export const inject = ['sessionProjections']

/** Register the complete-log projection for the plugin lifetime. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.sessionProjections.register<'conversationLandmarks', ConversationLandmarkProjection>({
    key: 'conversationLandmarks',
    schema: conversationLandmarksSchema,
    init: () => [],
    apply: applyLandmarkEvent,
    view: state => state,
    stateVersion: 1,
  }), 'conversation-landmarks: projection')
}
