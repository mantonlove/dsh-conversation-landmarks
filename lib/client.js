window.__ModuleLoader__.load({
	id: "dsh-conversation-landmarks",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom = require("react-dom");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		/** Clamp a number to an inclusive range. */
		function clamp(value, minimum, maximum) {
			return Math.min(maximum, Math.max(minimum, value));
		}
		/** Height of the centered landmark group within the visible conversation area. */
		function groupHeight(count, availableHeight) {
			const maximum = Math.max(12, Math.min(360, availableHeight - 72));
			const desired = count <= 1 ? 12 : (count - 1) * 12 + 12;
			return Math.min(desired, maximum);
		}
		/** Evenly map one landmark ordinal into the fixed rail. */
		function ordinalPosition(index, count, height) {
			return 6 + Math.max(0, height - 12) * (count <= 1 ? .5 : index / (count - 1));
		}
		/** Find the marker nearest one pointer coordinate. */
		function nearestPosition(positions, y) {
			let nearest = 0;
			let distance = Number.POSITIVE_INFINITY;
			positions.forEach((position, index) => {
				const next = Math.abs(position - y);
				if (next < distance) {
					nearest = index;
					distance = next;
				}
			});
			return nearest;
		}
		//#endregion
		//#region src/client/ConversationNavigation.tsx
		const RAIL_LEFT = 6;
		const TARGET_HIGHLIGHT_MS = 1200;
		/** Top clearance kept when a target is revealed, so the highlight outline above it stays visible. */
		const TARGET_HIGHLIGHT_CLEARANCE = 14;
		/** Hide the rail until this many user tasks exist, so short chats stay clean. */
		const MIN_VISIBLE_LANDMARKS = 3;
		const EMPTY_MEASUREMENT = {
			left: 0,
			top: 0,
			height: 12,
			positions: []
		};
		function requestText(landmark, imageLabel, otherLabel) {
			if (landmark.request.kind === "text") return landmark.request.text;
			return landmark.request.kind === "image" ? imageLabel : otherLabel;
		}
		function visibleScrollport() {
			for (const candidate of document.querySelectorAll("[data-conversation-scroll]")) {
				const rect = candidate.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) return candidate;
			}
			return null;
		}
		function findAnchor(scrollport, key) {
			for (const element of scrollport.querySelectorAll("[data-chat-anchor-key]")) if (element.dataset.chatAnchorKey === key) return element;
			return null;
		}
		function sameMeasurement(left, right) {
			return left.left === right.left && left.top === right.top && left.height === right.height && left.positions.length === right.positions.length && left.positions.every((position, index) => position === right.positions[index]);
		}
		function measure(landmarks) {
			const scrollport = visibleScrollport();
			if (scrollport === null) {
				const height = groupHeight(landmarks.length, 0);
				return {
					...EMPTY_MEASUREMENT,
					height,
					positions: landmarks.map((_landmark, index) => ordinalPosition(index, landmarks.length, height))
				};
			}
			const columnRect = (scrollport.closest("[data-conversation-column]") ?? scrollport.parentElement ?? scrollport).getBoundingClientRect();
			const height = groupHeight(landmarks.length, Math.max(0, columnRect.height));
			const positions = landmarks.map((_landmark, index) => ordinalPosition(index, landmarks.length, height));
			return {
				left: columnRect.left + RAIL_LEFT,
				top: columnRect.top + columnRect.height / 2,
				height,
				positions
			};
		}
		/** Marker size tier by distance from the focused landmark. */
		function proximityFor(focus, index) {
			if (focus === null) return void 0;
			const distance = Math.abs(index - focus.index);
			if (distance === 0) return "selected";
			if (distance === 1) return "neighbor";
			if (distance === 2) return "near2";
		}
		function markerStyle(y, positions = [], index = 0) {
			const previous = positions[index - 1];
			const following = positions[index + 1];
			const before = previous === void 0 ? Number.POSITIVE_INFINITY : y - previous;
			const after = following === void 0 ? Number.POSITIVE_INFINITY : following - y;
			const nearest = Math.min(before, after);
			const hitHeight = Number.isFinite(nearest) ? clamp(nearest, 1, 12) : 12;
			return {
				"--dshcl-hit-height": `${String(hitHeight)}px`,
				"--dshcl-y": `${String(y)}px`
			};
		}
		async function waitFrame() {
			await new Promise((resolve) => {
				window.requestAnimationFrame(() => {
					resolve();
				});
			});
		}
		async function renderedAnchor(key) {
			for (let attempt = 0; attempt < 8; attempt += 1) {
				const scrollport = visibleScrollport();
				const anchor = scrollport === null ? null : findAnchor(scrollport, key);
				if (scrollport !== null && anchor !== null) return {
					anchor,
					scrollport
				};
				await waitFrame();
			}
			return null;
		}
		/** Fixed, vertically centered rail over complete-log user tasks. */
		function ConversationNavigation({ sessionId, sessions, t, useProjection }) {
			const landmarks = useProjection("conversationLandmarks") ?? [];
			const railRef = (0, react.useRef)(null);
			const targetRef = (0, react.useRef)(null);
			const targetTimerRef = (0, react.useRef)();
			const activatingRef = (0, react.useRef)(false);
			const [activatingSeq, setActivatingSeq] = (0, react.useState)();
			const [measurement, setMeasurement] = (0, react.useState)(EMPTY_MEASUREMENT);
			const [focus, setFocus] = (0, react.useState)(null);
			const previewId = (0, react.useId)();
			(0, react.useEffect)(() => {
				const scrollport = visibleScrollport();
				let frame;
				const update = () => {
					frame = void 0;
					const next = measure(landmarks);
					setMeasurement((current) => sameMeasurement(current, next) ? current : next);
				};
				const schedule = () => {
					if (frame !== void 0) return;
					frame = window.requestAnimationFrame(update);
				};
				update();
				scrollport?.addEventListener("scroll", schedule, { passive: true });
				window.addEventListener("resize", schedule);
				const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
				if (resizeObserver !== null && scrollport !== null) {
					resizeObserver.observe(scrollport);
					const flow = scrollport.querySelector("[data-chat-flow]");
					const composer = document.querySelector("[data-composer-seat]");
					if (flow !== null) resizeObserver.observe(flow);
					if (composer !== null) resizeObserver.observe(composer);
				}
				return () => {
					scrollport?.removeEventListener("scroll", schedule);
					window.removeEventListener("resize", schedule);
					resizeObserver?.disconnect();
					if (frame !== void 0) window.cancelAnimationFrame(frame);
				};
			}, [landmarks]);
			(0, react.useEffect)(() => () => {
				if (targetTimerRef.current !== void 0) window.clearTimeout(targetTimerRef.current);
				targetRef.current?.removeAttribute("data-dshcl-target");
			}, []);
			if (landmarks.length < MIN_VISIBLE_LANDMARKS) return null;
			const focusFromPointer = (event) => {
				const rail = railRef.current;
				if (rail === null || measurement.positions.length === 0) return;
				const y = clamp(event.clientY - rail.getBoundingClientRect().top, 6, Math.max(6, measurement.height - 6));
				setFocus({ index: nearestPosition(measurement.positions, y) });
			};
			const jumpTo = async (landmark) => {
				if (activatingRef.current) return;
				activatingRef.current = true;
				setActivatingSeq(landmark.messageSeq);
				try {
					const session = sessions.binding(sessionId)?.session;
					if (session === void 0) return;
					let snapshot = session.getSnapshot();
					while (snapshot.chat.nodes.get(landmark.anchorKey) === void 0 && snapshot.hasMore) {
						const firstKey = snapshot.chat.order[0];
						await session.loadOlder();
						snapshot = session.getSnapshot();
						if (snapshot.chat.nodes.get(landmark.anchorKey) !== void 0 || !snapshot.hasMore) break;
						if (snapshot.chat.order[0] === firstKey && snapshot.loadingOlder !== true) break;
					}
					const rendered = await renderedAnchor(landmark.anchorKey);
					if (rendered === null) return;
					const { anchor, scrollport } = rendered;
					scrollport.scrollTop += anchor.getBoundingClientRect().top - scrollport.getBoundingClientRect().top - TARGET_HIGHLIGHT_CLEARANCE;
					targetRef.current?.removeAttribute("data-dshcl-target");
					if (targetTimerRef.current !== void 0) window.clearTimeout(targetTimerRef.current);
					anchor.setAttribute("data-dshcl-target", "");
					targetRef.current = anchor;
					targetTimerRef.current = window.setTimeout(() => {
						anchor.removeAttribute("data-dshcl-target");
						targetRef.current = null;
						targetTimerRef.current = void 0;
					}, TARGET_HIGHLIGHT_MS);
				} finally {
					activatingRef.current = false;
					setActivatingSeq(void 0);
				}
			};
			const focusedLandmark = focus === null ? void 0 : landmarks[focus.index];
			const imageLabel = t("imageRequest");
			const otherLabel = t("otherRequest");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				className: "dshcl-root",
				style: {
					"--dshcl-height": `${String(measurement.height)}px`,
					"--dshcl-left": `${String(measurement.left)}px`,
					"--dshcl-top": `${String(measurement.top)}px`
				},
				"aria-busy": activatingSeq !== void 0 || void 0,
				"aria-label": t("label"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: railRef,
					className: "dshcl-rail",
					onMouseMove: focusFromPointer,
					onMouseLeave: () => {
						setFocus(null);
					},
					children: [landmarks.map((landmark, index) => {
						const request = requestText(landmark, imageLabel, otherLabel);
						const y = measurement.positions[index] ?? ordinalPosition(index, landmarks.length, measurement.height);
						const proximity = proximityFor(focus, index);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dshcl-marker",
							style: markerStyle(y, measurement.positions, index),
							"data-focused": index === focus?.index || void 0,
							"data-proximity": proximity,
							"aria-label": request,
							"aria-describedby": index === focus?.index ? previewId : void 0,
							disabled: activatingSeq !== void 0,
							onFocus: () => {
								setFocus({ index });
							},
							onBlur: () => {
								setFocus(null);
							},
							onClick: () => {
								jumpTo(landmark);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshcl-line" })
						}, landmark.messageSeq);
					}), focus !== null && focusedLandmark !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: previewId,
						role: "tooltip",
						className: "dshcl-preview",
						style: markerStyle(measurement.positions[focus.index] ?? 6),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshcl-request",
							children: requestText(focusedLandmark, imageLabel, otherLabel)
						}), focusedLandmark.outcome !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshcl-outcome",
							children: focusedLandmark.outcome
						})]
					})]
				})
			});
		}
		//#endregion
		//#region src/client/styles.ts
		const STYLES = `
.dshcl-root{position:fixed;top:var(--dshcl-top);left:var(--dshcl-left);z-index:900;width:40px;height:var(--dshcl-height);transform:translateY(-50%);pointer-events:none}
.dshcl-rail{position:relative;width:40px;height:100%;pointer-events:auto}
.dshcl-marker{position:absolute;top:var(--dshcl-y);left:0;z-index:1;display:flex;align-items:center;width:32px;height:var(--dshcl-hit-height);padding:0;appearance:none;border:0!important;border-radius:0;outline:none!important;background:transparent!important;box-shadow:none!important;filter:none!important;transform:translateY(-50%);cursor:pointer}
.dshcl-marker::before,.dshcl-marker::after{content:none!important}
.dshcl-line{display:block;width:12px;height:2px;border-radius:2px;background:var(--dsw-alias-label-tertiary);transition:width 80ms ease,background-color 80ms ease}
.dshcl-marker:hover,.dshcl-marker:focus,.dshcl-marker:focus-visible,.dshcl-marker[data-focused]{z-index:2;border:0!important;outline:none!important;background:transparent!important;box-shadow:none!important;filter:none!important}
.dshcl-marker[data-proximity=near2] .dshcl-line{width:16px}
.dshcl-marker[data-proximity=neighbor] .dshcl-line{width:20px}
.dshcl-marker[data-proximity=selected] .dshcl-line{width:28px;background-color:#fff}
.dshcl-preview{position:absolute;top:var(--dshcl-y);left:36px;z-index:3;width:min(280px,calc(100vw - 72px));padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3);box-shadow:none;transform:translateY(-50%);pointer-events:none}
.dshcl-request,.dshcl-outcome{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;text-overflow:ellipsis}
.dshcl-request{-webkit-line-clamp:2;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-strong-14)}
.dshcl-outcome{margin-top:5px;-webkit-line-clamp:2;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}
[data-dshcl-target]{border-radius:8px;animation:dshcl-target 1.2s ease-out}
@keyframes dshcl-target{from{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:4px}to{outline:2px solid transparent;outline-offset:10px}}
@media(prefers-reduced-motion:reduce){.dshcl-line{transition:none}[data-dshcl-target]{animation:none;outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:4px}}
`;
		/** Install plugin-owned styles and return their disposer. */
		function installStyles() {
			if (document.querySelector("style[data-plugin-css=\"dsh-conversation-landmarks\"]") !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-conversation-landmarks";
			tag.dataset.pluginCss = "dsh-conversation-landmarks";
			tag.textContent = STYLES;
			document.head.append(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion
		//#region src/client/index.tsx
		/** Web Client plugin mounting Conversation Landmarks through the standard input dock. */
		const NS = "conversationLandmarks";
		const dictionaries = {
			en: {
				label: "Conversation landmarks",
				imageRequest: "Image request",
				otherRequest: "Non-text request"
			},
			zh: {
				label: "对话地标",
				imageRequest: "图片请求",
				otherRequest: "非文本请求"
			}
		};
		/** Required Client services for slots, session paging, and localized copy. */
		const inject = [
			"slots",
			"sessions",
			"locale"
		];
		/** Register the portal-backed conversation input-dock contribution. */
		function apply(ctx) {
			ctx.effect(() => installStyles(), "conversation-landmarks: styles");
			ctx.effect(() => ctx.locale.register(NS, dictionaries), "conversation-landmarks: dictionaries");
			const sessions = ctx.sessions;
			const Entry = (props) => (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConversationNavigation, {
				sessionId: props.sessionId,
				sessions,
				t: props.t,
				useProjection: props.useProjection
			}), document.body);
			ctx.effect(() => ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "conversation-landmarks",
				order: 30,
				locale: NS
			}, Entry)), "conversation-landmarks: input dock");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map