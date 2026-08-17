/** Web Client plugin mounting Conversation Landmarks through the standard input dock. */

import { createPortal } from 'react-dom'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '../types.ts'
import { ConversationNavigation } from './ConversationNavigation.tsx'
import { installStyles } from './styles.ts'

type DockProps = PropsRuntime<'conversation.input.dock'> & {
  readonly t: (key: 'label' | 'imageRequest' | 'otherRequest') => string
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Conversation Landmarks browser copy. */
    conversationLandmarks: 'label' | 'imageRequest' | 'otherRequest'
  }
}

const NS = 'conversationLandmarks'

const dictionaries = {
  en: {
    label: 'Conversation landmarks',
    imageRequest: 'Image request',
    otherRequest: 'Non-text request',
  },
  zh: {
    label: '对话地标',
    imageRequest: '图片请求',
    otherRequest: '非文本请求',
  },
}

/** Required Client services for slots, session paging, and localized copy. */
export const inject = ['slots', 'sessions', 'locale']

/** Register the portal-backed conversation input-dock contribution. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'conversation-landmarks: styles')
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'conversation-landmarks: dictionaries')
  const sessions = ctx.sessions
  const Entry = (props: DockProps) => createPortal(
    <ConversationNavigation
      sessionId={props.sessionId}
      sessions={sessions}
      t={props.t}
      useProjection={props.useProjection}
    />,
    document.body,
  )
  ctx.effect(() => ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'conversation-landmarks',
    order: 30,
    locale: NS,
  }, Entry)), 'conversation-landmarks: input dock')
}
