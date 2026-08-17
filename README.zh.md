# DeepSeek Harness 对话地标

[English](README.md) | 简体中文

对话地标是一个独立的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 插件，用于在长对话中快速定位。它会在对话工作区左侧增加一组固定且上下居中的横线。每条横线代表一个由用户直接发起的任务轮次，而不是每一条消息。

![对话地标线条组](assets/active-landmark.png)

## 功能

- 对话滚动时，完整线条组始终固定并上下居中。
- 自动选中距离指针最近的横线。选中项最长且为纯白色，相邻两项为中等长度。
- 悬浮时显示用户请求和随后最新一条 Assistant 回复的精简预览。
- 目标不在当前历史窗口时自动加载更早记录，随后把对应用户消息对齐到对话视口顶部。
- 只使用官方 session projection 与 Client slot 扩展点，不修改 DeepSeek Harness 源码。
- 插件自身不发起网络请求，也不收集遥测数据。

![悬浮预览](assets/hover-preview.png)

## 安装

要求：DeepSeek Harness `0.1.0-rc.7` 或更高版本，以及该版本支持的 Node.js。

把预构建插件安装到 Web profile，然后重新启动 Web：

```sh
dsh plugin --profile web add "github:mantonlove/dsh-conversation-landmarks#v0.1.0"
dsh web
```

仓库已经提交运行所需的 `lib/` 文件，因此从 GitHub 安装时不需要授权 pnpm 执行本插件的构建脚本。

请打开启动输出中 `dsh web:` 后显示的实际地址。默认地址是 `http://127.0.0.1:3080`，但配置了其他端口或主机后会不同。

如果你从 DeepSeek Harness 源码目录运行，请使用对应的 `pnpm dsh` 命令：

```sh
pnpm dsh plugin --profile web add "github:mantonlove/dsh-conversation-landmarks#v0.1.0"
pnpm dsh web
```

卸载命令：

```sh
dsh plugin --profile web remove dsh-conversation-landmarks
```

## 交给 AI 编程助手安装

可以把下面这段话直接发给能够操作终端的 AI：

> 使用 `dsh plugin` 把 `github:mantonlove/dsh-conversation-landmarks#v0.1.0` 安装到 DeepSeek Harness 的 `web` profile，重新启动 `dsh web`，然后告诉我启动输出中 `dsh web:` 后的实际访问地址。不要修改 DeepSeek Harness 源码。

## 开发

```sh
pnpm install
pnpm run check
```

该包是一个 Cordis Service 插件。Host 端通过 `ctx.effect()` 注册 `conversationLandmarks` session projection；浏览器端通过 `conversation.input.dock` 挂载，再用 portal 渲染固定线条组。

## 项目状态

这是社区项目，不是 DeepSeek 官方发行内容。当前兼容目标是 DeepSeek Harness `0.1.0-rc.7`。

## 许可证

[MIT](LICENSE)
