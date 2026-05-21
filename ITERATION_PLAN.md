# Auto-T 后续迭代计划

## 目标

Auto-T 的近期目标是做成一个本地可用、可测试、可持续迭代的 Chrome MV3 双语网页翻译插件。翻译引擎优先使用 DeepSeek，架构上保留多引擎扩展空间。

## 迭代原则

- 每次迭代必须能构建，不能留下半接入状态。
- 优先打通网页翻译主链路，再扩展 PDF、字幕、OCR。
- 所有需要密钥、测试站点、模型选择、账号权限的任务，必须在开始前明确参数。
- 每个子任务由对应 subAgent 在独立开发分支完成，review agent 审查通过后先合入阶段分支，阶段验收完成后再合入 `main`。
- 每个开发分支完成前必须由 Doc Agent 更新当前 Phase step、使用说明和测试说明，确保进度与代码状态对齐。
- 新需求进入开发前必须先和当前 Phase step 及本计划对照，属于后续阶段的需求要标注目标阶段。
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

## 对标调研: 沉浸式翻译能力基线

调研日期：2026-05-20

来源：

- Chrome Web Store: `https://chromewebstore.google.com/detail/immersive-translate-trans/bpoadfkcbjbfhfodiogcnhhhpibjhbnh`
- 官网首页: `https://immersivetranslate.com/en/`
- 使用文档: `https://immersivetranslate.com/en/docs/usage/`
- 网页翻译文档: `https://immersivetranslate.com/en/docs/features/webpage/`
- 输入框翻译文档: `https://immersivetranslate.com/en/docs/input/`
- 定价页: `https://immersivetranslate.com/en/pricing/`

### UI 和入口能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| 浏览器扩展 Popup | 插件图标面板内提供翻译、设置、字幕、文档等入口。 | 已有 Popup，支持 Visible、Page、Retry visible、Restore、Settings。 | M1 继续稳定。 |
| 页面侧边快捷浮球 | 官网文档展示网页右侧快捷翻译图标，可直接触发页面翻译。 | 未实现。 | M3 交互层。 |
| 右键菜单 | 支持右键翻译网页/显示原文。 | 未实现。 | M3 交互层。 |
| 快捷键 | 默认 `Alt+A` 翻译/显示原文，`Alt+W` 整页翻译，支持设置页修改。 | 未实现快捷键配置。 | M3 交互层。 |
| 双语/仅译文切换 | 面板中可切换双语对照和仅译文模式。 | 已支持 `bilingual` / `translation-only`。 | M1 已覆盖，后续优化样式。 |
| 设置页 | 提供界面设置、快捷键、翻译服务、样式等个性化配置。 | 已有 Options 基础设置。 | M1/M2/M3 逐步扩展。 |

### 网页翻译能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| 智能内容区域 | 默认翻译智能识别的内容区域，减少对原页面侵入。 | 已有可视区域和整页扫描，并新增 page rule 层支持站点容器、排除选择器和额外块级选择器。 | M1 提升过滤，M4 继续扩展站点适配。 |
| 整页翻译 | 快捷键可翻译整个页面。 | Popup `Page` 支持最多 80 段。 | M1 已有基础，后续加队列和分页。 |
| 段落双语对照 | 以段落为最小单位，在原文下展示译文。 | 已实现译文插入原文下方。 | M1 已覆盖。 |
| 翻译中状态反馈 | 翻译过程中应让用户感知当前段落正在处理，避免误判为遗漏。 | 可视区域、整页和滚动自动翻译会先插入逐段 loading 转圈，译文返回后替换。 | M1 已覆盖，后续可增加失败/重试状态。 |
| 显示原文/还原 | 可切回原文或仅译文。 | `Restore` 可移除译文并恢复隐藏原文。 | M1 已覆盖。 |
| 主流站点优化 | Chrome 商店描述提到 Google 搜索、Twitter/X、Reddit、Facebook、新闻站点等优化。 | 仅通用 DOM 扫描。 | M4 动态站点适配。 |
| 多浏览器/移动端 | Chrome、Edge、Firefox、Safari、iOS、Android 等多端。 | 仅 Chrome MV3。 | 后续平台扩展，暂不进入 M1。 |

### 快速交互翻译能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| 鼠标悬停翻译 | 开启后，悬停段落并按快捷键显示段落译文。 | 未实现。 | M3。 |
| 划词翻译 | 选中单词或短语即可查看 AI 翻译和发音。 | 未实现。 | M3。 |
| 输入框翻译 | 任意网页输入框内三击空格翻译，支持 `/ja`、`/fr` 等语言命令和局部翻译。 | 未实现。 | M3，输入框翻译先做技术调研。 |
| 复制译文 | 常见阅读插件预期能力。 | 未实现。 | M3。 |

### 文档和文件翻译能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| PDF 翻译 | 支持在线/本地 PDF，保留排版，双语或仅译文输出。 | 未实现。 | M5 预研，M6 实现。 |
| PDF Pro | Chrome 商店描述提到复杂公式、表格、图片 OCR。 | 未实现。 | M6+，高成本能力。 |
| EPUB/eBook | 支持 ePub、Mobi 等阅读和双语导出。 | 未实现。 | M7 文档扩展。 |
| 多文档格式 | 官网列出 PDF、ePub、HTML、TXT、DOCX、Markdown、字幕文件等。 | 未实现。 | M7 文档扩展。 |
| 字幕文件翻译 | 支持 ASS/SRT 等字幕文件。 | 未实现。 | M5 预研，M6/M7 实现。 |

### 视频、会议和多媒体能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| 视频双语字幕 | 支持 YouTube、Netflix、Prime Video 等大量视频站点。 | 未实现。 | M5 预研，M6 实现。 |
| 无字幕视频翻译 | 官网称支持无原字幕视频翻译。 | 未实现。 | M7+，依赖 ASR/字幕生成。 |
| 在线会议翻译 | 支持 Zoom、Google Meet、Microsoft Teams 字幕翻译。 | 未实现。 | M7+。 |
| 图片翻译 | 支持网页图片右键翻译和本地图片翻译，强调 OCR 与视觉样式保留。 | 未实现。 | M7+。 |
| 漫画翻译 | 支持特定漫画站点，Pro 可配置漫画/图片翻译。 | 未实现。 | M7+。 |

### AI 和 Pro 能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| 多翻译引擎 | 官网/商店列出 DeepL、OpenAI、Gemini、Claude、DeepSeek 等。 | DeepSeek 单引擎。 | M2 后保留 provider 抽象，M8 扩展多引擎。 |
| AI 术语库 | 支持自定义术语，提升特定术语一致性。 | 已有基础 glossary，已纳入 cache version。 | M2 增强域名级、页面级、导入导出。 |
| AI 专家/行业身份 | 可设定特定行业身份进行专业翻译。 | 仅 normal/technical/academic。 | M2 增加领域 Profile。 |
| 上下文感知翻译 | 官网强调 context-aware translation，结合术语和领域上下文。 | Prompt 带页面标题/URL，缺少全文上下文摘要。 | M2。 |
| 高级模型额度 | 定价页强调会员支持 DeepSeek、DeepL、OpenAI、Claude、Gemini 等高级服务。 | 用户自带 DeepSeek Key，无额度系统。 | 暂不做商业化，M8 可评估额度统计。 |

### 隐私和安全能力

| 能力 | 沉浸式翻译表现 | Auto-T 当前状态 | Roadmap 对齐 |
| --- | --- | --- | --- |
| 隐私优先声明 | 定价页声明不保留翻译内容、不用于训练、加密传输。 | 本地配置 API Key，直接请求 DeepSeek；缺少明确隐私文档。 | M1/M2 增加隐私说明。 |
| 敏感信息处理 | 文档导航中包含 Sensitive Information Desensitization。 | 未实现脱敏。 | M8 安全增强。 |
| 数据留存控制 | 声明不留存翻译内容。 | 本地缓存会保存原文和译文。 | M2 增加缓存开关说明、清理和敏感站点禁用。 |

### Auto-T Roadmap 调整结论

- M1 目标保持聚焦：网页双语翻译闭环、可视区域优先、基础还原、基础设置、基础缓存、基础隐私说明。
- M2 追加“翻译质量和专业能力”：上下文摘要、领域 Profile、术语库增强、Prompt 模板、隐私/缓存策略说明。
- M3 追加“低打扰交互”：页面浮球、右键菜单、快捷键、划词翻译、悬停翻译、输入框翻译。
- M4 聚焦“动态站点适配”：MutationObserver、站点规则、Google Search/GitHub/YouTube/Reddit/X 适配。
- M5 调整为“PDF/字幕技术预研”：PDF.js、字幕抓取、YouTube VTT/SRT、OCR/ASR 可行性。
- 新增 M6 “PDF 和字幕 MVP”：PDF 文本层双语阅读、YouTube 双语字幕、字幕文件翻译。
- 新增 M7 “多媒体和文档扩展”：图片、漫画、EPUB/DOCX/Markdown、会议字幕。
- 新增 M8 “引擎、隐私和高级配置”：多 provider、敏感信息脱敏、缓存清理、站点级隐私策略、用量统计。

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
- 增加基础隐私说明：API Key 本地存储、翻译内容会发送到 DeepSeek、本地缓存可关闭。
- 支持本地 `.env` DeepSeek API Key fallback，减少开发态手动配置。
- 增加 `npm run compile` 和 `npm run build` 的固定验收流程。
- 增加 page rule 扫描层，先内置 Mobalytics/GitHub 的内容容器和排除规则。
- 增加扫描器自动化测试，覆盖站点规则、排除规则、短标题和短按钮文本。
- 增加轻量 MutationObserver，在动态内容插入后刷新可视区域扫描并复用自动可视翻译。
- 增加本地手动 smoke fixture，固定验证 Visible、Page、Restore 和动态内容场景。

验收：

- `npm run compile` 通过。
- `npm test` 通过。
- `npm run build` 通过。
- 本地加载 `.output/chrome-mv3` 后可翻译普通英文网页到中文。
- 重复点击翻译不会重复插入译文。
- Restore 后页面移除所有 Auto-T 译文节点。
- 使用说明中包含 DeepSeek API Key、缓存和隐私边界。
- 本地开发可通过 `.env` 提供 DeepSeek API Key，并说明构建期注入风险。
- 开启自动可视翻译后，新增可见内容可被自动扫描和翻译。
- 本地 smoke fixture 可作为手动 Chrome 验收的固定测试 URL。

## Milestone 2: 翻译质量增强

目标：把翻译从“能用”推进到“接近 Pro 体验”。

任务：

- Prompt 分层：普通、技术、学术三个模式独立模板。
- 增加页面上下文摘要：页面标题、URL、前后段上下文、站点类型。
- 术语库增强：全局术语、域名术语、页面级术语、导入导出、术语版本号。
- 增加领域 Profile：通用、技术、学术、法律、医学、金融、产品文档。
- 增加 JSON 修复 fallback：模型返回代码块、前后废话、漏段时可恢复。
- 增加段落级失败 fallback，单批失败不影响整页。
- 增加 DeepSeek 模型配置项：`deepseek-chat` 默认，后续可选 reasoner。
- 增加缓存和隐私策略：缓存清理、站点禁用缓存、敏感站点提醒。

验收：

- GitHub README、MDN、Wikipedia、新闻网页至少各测试一个页面。
- 技术模式下保留 API 名、函数名、CLI 命令。
- 学术模式下保留引用、数字、专有名词。
- 术语库变更后新翻译遵守术语，旧缓存不会误命中。
- 用户可以清理缓存或对当前站点禁用缓存。

## Milestone 3: 交互翻译

目标：补齐阅读插件的高频交互能力。

任务：

- 划词翻译浮窗。
- 悬停段落翻译。
- 快捷键翻译当前选区。
- 页面侧边快捷浮球。
- 右键菜单：翻译当前页面、翻译可视区域、显示原文。
- 复制译文。
- 输入框翻译的技术调研和最小实现。

验收：

- 选中文本后可弹出翻译结果。
- 浮窗不遮挡原文选择区域。
- 快捷键可在 Options 中查看和配置。
- 输入框翻译支持三击空格触发和目标语言命令原型。

## Milestone 4: 动态网页适配

目标：让插件在现代动态站点上可持续工作。

任务：

- MutationObserver 监听新增内容。
- 翻译队列节流，避免无限重复扫描；M1 已有轻量 observer，M4 继续补站点级队列和规则。
- 站点适配层：GitHub、YouTube、Reddit、X、Google Search、新闻站点。
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
- 字幕文件翻译方案调研：ASS/SRT/VTT。
- 明确 OCR、表格、公式是否进入下一阶段。

验收：

- 输出技术方案和风险清单。
- 给出 MVP 可落地范围，不直接进入大而全实现。

## Milestone 6: PDF 和字幕 MVP

目标：在网页翻译稳定后，实现可用的文档和视频学习场景。

任务：

- PDF.js 文本层双语阅读。
- PDF 页面级缓存和进度状态。
- PDF 双语/仅译文模式。
- YouTube VTT/SRT 字幕抓取和双语字幕渲染。
- ASS/SRT/VTT 字幕文件翻译。

验收：

- 普通文本 PDF 可按页显示双语译文。
- YouTube 有字幕视频可显示双语字幕。
- 字幕文件可上传并导出译文版本。

## Milestone 7: 多媒体和文档扩展

目标：补齐沉浸式翻译的扩展场景，但保持每类能力都有单独技术验证。

任务：

- EPUB/Markdown/DOCX 文档翻译方案。
- 图片 OCR 翻译原型。
- 漫画站点翻译按钮和图片批处理预研。
- 在线会议字幕翻译预研。
- 无字幕视频 ASR 预研。

验收：

- 输出每类能力的技术方案、成本和隐私风险。
- 至少实现一个低风险文档格式 MVP。

## Milestone 8: 引擎、隐私和高级配置

目标：形成可扩展的高级设置和安全边界。

任务：

- 多翻译 provider：DeepSeek、OpenAI-compatible、DeepL、Gemini、Claude。
- 站点级隐私策略：禁用缓存、禁用自动翻译、敏感站点提醒。
- 敏感信息脱敏策略：邮箱、手机号、密钥样式、身份证/银行卡模式。
- 用量统计：请求数、段落数、估算 token。
- 缓存管理：查看、清理、按站点清理。

验收：

- provider 可切换且类型统一。
- 用户能明确知道哪些内容会被发送到远端模型。
- 缓存和敏感信息策略可配置。

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
