# Auto-T 后续迭代计划

## 目标

Auto-T 的近期目标是做成一个本地可用、可测试、可持续迭代的 Chrome MV3 双语网页翻译插件。翻译引擎优先使用 DeepSeek，架构上保留多引擎扩展空间。

## 迭代原则

- 每次迭代必须能构建，不能留下半接入状态。
- 优先打通网页翻译主链路，再扩展 PDF、字幕、OCR。
- 所有需要密钥、测试站点、模型选择、账号权限的任务，必须在开始前明确参数。
- 每个子任务由对应 subAgent 在独立开发分支完成，review agent 审查通过后先合入阶段分支，阶段验收完成后再合入 `main`。
- 任何真实 API Key 不写入仓库、日志、提交信息或文档示例。

## 分支路线

Milestone 分支遵循：

```text
stage/m1-mvp-stability
stage/m2-quality
stage/m3-interaction
stage/m4-dynamic-sites
stage/m5-pdf-subtitle-research
```

开发分支遵循：

```text
agent/<milestone>/<area>/<task>
```

当前 Milestone 1 的阶段分支：

```text
stage/m1-mvp-stability
```

## Milestone 1: MVP 稳定化

目标：让当前插件在常规网页上可稳定完成双语翻译、缓存和还原。

任务：

- 修正 DOM 扫描边界，降低菜单、页脚、重复文本被翻译的概率。
- 增加分批翻译进度反馈，让 Popup 显示已完成段落数。
- 增加 DeepSeek 请求超时、重试、错误分类。
- 完善缓存 key，加入 glossary version，避免术语更新后继续命中过期缓存。
- 支持 `displayMode: bilingual | translation-only` 的真实渲染。
- 默认翻译可视区域，保留整页翻译入口，避免大页面一次性翻译过慢。
- 提升 DeepSeek JSON 返回容错，避免非 string 字段导致整个批次失败。
- Popup 和 Options 使用简约高级的工具界面样式。
- 增加 `npm run compile` 和 `npm run build` 的固定验收流程。

验收：

- `npm run compile` 通过。
- `npm run build` 通过。
- 本地加载 `.output/chrome-mv3` 后可翻译普通英文网页到中文。
- 重复点击翻译不会重复插入译文。
- Restore 后页面移除所有 Auto-T 译文节点。

## Milestone 2: 翻译质量增强

目标：把翻译从“能用”推进到“接近 Pro 体验”。

任务：

- Prompt 分层：普通、技术、学术三个模式独立模板。
- 增加页面上下文摘要：页面标题、URL、前后段上下文、站点类型。
- 术语库增强：全局术语、域名术语、术语版本号。
- 增加 JSON 修复 fallback：模型返回代码块、前后废话、漏段时可恢复。
- 增加段落级失败 fallback，单批失败不影响整页。
- 增加 DeepSeek 模型配置项：`deepseek-chat` 默认，后续可选 reasoner。

验收：

- GitHub README、MDN、Wikipedia、新闻网页至少各测试一个页面。
- 技术模式下保留 API 名、函数名、CLI 命令。
- 学术模式下保留引用、数字、专有名词。

## Milestone 3: 交互翻译

目标：补齐阅读插件的高频交互能力。

任务：

- 划词翻译浮窗。
- 悬停段落翻译。
- 快捷键翻译当前选区。
- 复制译文。
- 输入框翻译的技术调研和最小实现。

验收：

- 选中文本后可弹出翻译结果。
- 浮窗不遮挡原文选择区域。
- 快捷键可在 Options 中查看和配置。

## Milestone 4: 动态网页适配

目标：让插件在现代动态站点上可持续工作。

任务：

- MutationObserver 监听新增内容。
- 翻译队列节流，避免无限重复扫描。
- 站点适配层：GitHub、YouTube、Reddit、X、Google Search。
- 域名级设置：自动翻译、跳过站点、默认模式。

验收：

- GitHub README 和 issue 页面能稳定翻译正文。
- YouTube 标题和评论区新增内容可按需翻译。
- 动态内容不会导致无限 API 请求。

## Milestone 5: PDF 和字幕预研

目标：在网页翻译稳定后启动更复杂场景。

任务：

- PDF.js 方案调研：浏览器文本层翻译、双语阅读、导出难度。
- YouTube 字幕抓取方案调研：VTT/SRT 解析、双语字幕渲染。
- 明确 OCR、表格、公式是否进入下一阶段。

验收：

- 输出技术方案和风险清单。
- 给出 MVP 可落地范围，不直接进入大而全实现。

## 本地测试和部署方案

开发测试：

```bash
npm install
npm run dev
```

Chrome 加载：

1. 打开 `chrome://extensions`。
2. 开启 Developer mode。
3. 点击 Load unpacked。
4. 选择项目下的 `.output/chrome-mv3`。
5. 打开插件 Options，填写 DeepSeek API Key。

生产构建测试：

```bash
npm run compile
npm run build
```

构建产物：

```text
.output/chrome-mv3
```

可打包分发：

```bash
npm run zip
```

需要额外参数时必须提示：

- `DEEPSEEK_API_KEY`：用于真实翻译请求。
- DeepSeek model：默认 `deepseek-chat`，如需 reasoner 必须明确。
- target language：默认 `zh-CN`。
- source language：默认 `auto`。
- 测试 URL 列表：用于页面兼容性验证。
- 是否允许真实 API 消耗：默认不允许自动消耗大量额度。
- 是否需要代理或企业网络配置：如 DeepSeek API 无法访问时必须确认。
