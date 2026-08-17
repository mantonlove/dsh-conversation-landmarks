export const STYLES = `
.dshcl-root{position:fixed;top:var(--dshcl-top);left:var(--dshcl-left);z-index:900;width:40px;height:var(--dshcl-height);transform:translateY(-50%);pointer-events:none}
.dshcl-rail{position:relative;width:40px;height:100%;pointer-events:auto}
.dshcl-marker{position:absolute;top:var(--dshcl-y);left:0;z-index:1;display:flex;align-items:center;width:32px;height:var(--dshcl-hit-height);padding:0;appearance:none;border:0!important;border-radius:0;outline:none!important;background:transparent!important;box-shadow:none!important;filter:none!important;transform:translateY(-50%);cursor:pointer}
.dshcl-marker::before,.dshcl-marker::after{content:none!important}
.dshcl-line{display:block;width:12px;height:2px;border-radius:2px;background:var(--dsw-alias-label-tertiary);transition:width 80ms ease,background-color 80ms ease}
.dshcl-marker:hover,.dshcl-marker:focus,.dshcl-marker:focus-visible,.dshcl-marker[data-focused]{z-index:2;border:0!important;outline:none!important;background:transparent!important;box-shadow:none!important;filter:none!important}
.dshcl-marker[data-proximity=neighbor] .dshcl-line{width:20px}
.dshcl-marker[data-proximity=selected] .dshcl-line{width:28px;background-color:#fff}
.dshcl-preview{position:absolute;top:var(--dshcl-y);left:36px;z-index:3;width:min(280px,calc(100vw - 72px));padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3);box-shadow:none;transform:translateY(-50%);pointer-events:none}
.dshcl-request,.dshcl-outcome{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;text-overflow:ellipsis}
.dshcl-request{-webkit-line-clamp:2;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-strong-14)}
.dshcl-outcome{margin-top:5px;-webkit-line-clamp:2;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}
[data-dshcl-target]{border-radius:8px;animation:dshcl-target 1.2s ease-out}
@keyframes dshcl-target{from{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:4px}to{outline:2px solid transparent;outline-offset:10px}}
@media(prefers-reduced-motion:reduce){.dshcl-line{transition:none}[data-dshcl-target]{animation:none;outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:4px}}
`

/** Install plugin-owned styles and return their disposer. */
export function installStyles(): () => void {
  const prior = document.querySelector<HTMLStyleElement>('style[data-plugin-css="dsh-conversation-landmarks"]')
  if (prior !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-conversation-landmarks'
  tag.dataset.pluginCss = 'dsh-conversation-landmarks'
  tag.textContent = STYLES
  document.head.append(tag)
  return () => { tag.remove() }
}
