import { isAppendSurfaceEvent } from "@deepseek-ai/dsh-session/surface";
import { z } from "zod";
//#region src/projection.ts
const PREVIEW_TEXT_LIMIT = 320;
const landmarkSchema = z.object({
	messageSeq: z.number().int().nonnegative(),
	anchorKey: z.string(),
	request: z.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("text"),
			text: z.string()
		}),
		z.object({ kind: z.literal("image") }),
		z.object({ kind: z.literal("other") })
	])
});
/** Runtime schema for the projection value sent to Web clients. */
const conversationLandmarksSchema = z.array(z.union([landmarkSchema.extend({ outcome: z.string() }), landmarkSchema]));
/**
* Build the stable Chat row key used by the official input-message definition.
*
* Mirrors `conversationContextKey('input-message', id)` from
* `@deepseek-ai/dsh-client-runtime`, which formats node keys as
* `` `${kind.length}:${kind}${id}` ``. `'input-message'` is 13 characters, so
* every input-message row key (user and steering alike) starts with the fixed
* prefix below. The anchor-format test locks this derivation.
*/
function inputMessageAnchorKey(messageId) {
	return `13:input-message${messageId}`;
}
function previewText(parts) {
	const normalized = parts.join("\n").replace(/\s+/g, " ").trim();
	if (normalized === "") return void 0;
	return normalized.length <= PREVIEW_TEXT_LIMIT ? normalized : `${normalized.slice(0, 319)}…`;
}
function requestOf(event) {
	const text = previewText(event.data.content.flatMap((block) => block.type === "text" ? [block.text] : []));
	if (text !== void 0) return {
		kind: "text",
		text
	};
	if (event.data.content.some((block) => block.type === "image")) return { kind: "image" };
	return { kind: "other" };
}
function outcomeOf(event) {
	return previewText(event.data.message.content.flatMap((block) => block.type === "text" ? [block.text] : []));
}
/** Fold one durable session event into the complete landmark list. */
function applyLandmarkEvent(state, event) {
	if (event.type === "user/message" && event.data.source.kind === "user" && isAppendSurfaceEvent(event)) return [...state, {
		messageSeq: event.seq,
		anchorKey: inputMessageAnchorKey(String(event.data.id)),
		request: requestOf(event)
	}];
	if (event.type !== "assistant/message" || !isAppendSurfaceEvent(event)) return state;
	const outcome = outcomeOf(event);
	const last = state.at(-1);
	if (last === void 0 || outcome === void 0 || last.outcome === outcome) return state;
	const updated = {
		...last,
		outcome
	};
	return [...state.slice(0, -1), updated];
}
//#endregion
//#region src/index.ts
/** Cordis plugin name. */
const name = "conversation-landmarks";
/** Complete-log landmarks require the session projection registry. */
const inject = ["sessionProjections"];
/** Register the complete-log projection for the plugin lifetime. */
function apply(ctx) {
	ctx.effect(() => ctx.sessionProjections.register({
		key: "conversationLandmarks",
		schema: conversationLandmarksSchema,
		init: () => [],
		apply: applyLandmarkEvent,
		view: (state) => state,
		stateVersion: 1
	}), "conversation-landmarks: projection");
}
//#endregion
export { apply, applyLandmarkEvent, inject, inputMessageAnchorKey, name };
