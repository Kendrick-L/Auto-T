# 后续开发评估

## 当前判断

根据 `ITERATION_PLAN.md` 和沉浸式翻译对标结果，Auto-T 现在处于 M1 收尾阶段。下一步不宜直接跳到 PDF、字幕或图片翻译，应该先把网页阅读闭环做到可靠、快、低打扰，再进入 M2/M3。

## 新增文档参考价值评估

`docs/immersive-translate-analysis.md` 有中高参考价值。它适合做产品能力和阶段规划校准，尤其是网页、PDF、字幕、输入框、多引擎、隐私边界这些能力如何拆 milestone。它不适合直接照搬实现，因为其中不少内容来自公开文档和架构推断，且沉浸式翻译新版核心并不开源。

`docs/immersive-translate-dom-analysis.md` 有高参考价值。它对当前 Auto-T 最有用的是 DOM 扫描和译文注入策略：站点规则、正文容器优先、排除选择器、TextNode 分段、动态可见区域翻译、原文恢复策略。这些可以直接转化为 Auto-T 的扫描器和 M4 动态站点适配基础。

本轮先落地低风险部分：增加 page rule 扫描层，支持内置站点规则、容器优先、排除选择器和额外块级选择器。暂不照搬 TextNode 替换和 cloneNode 双语方案，因为当前 portal/inline 渲染已经解决 Lexical 清理问题，贸然替换原 TextNode 会扩大恢复和页面状态风险。

## 优先级排序

### P0: M1 收尾

目标：让本地插件能稳定用于日常网页阅读。

功能：

- `.env` DeepSeek API Key fallback，减少每次手动配置。
- Manual Chrome smoke test 记录。
- 真实 DeepSeek 可视区域翻译测试。
- API Key 来源状态提示：Options 输入 / `.env` fallback / missing。
- 预扫描当前视口 segments，降低点击翻译时的解析等待。
- 轻量 `Auto visible on scroll`，滚动停止后翻译当前视口未翻译段落。
- 轻量 MutationObserver，动态内容插入后刷新当前视口扫描并复用自动可视翻译。
- 隐私边界继续完善：缓存、发送内容、构建期 key 暴露风险。
- 扫描器自动化测试，先覆盖 page rule 和短文本捕获，降低站点规则迭代风险。

UI：

- Popup 保持简约工具面板，不扩展复杂导航。
- 增加更明确的状态文案：Using env key、Using saved key、Missing key。
- `Visible` 保持主按钮，`Page` 保持次级按钮。
- 译文默认继承原文字号、颜色和行高，仅用轻微透明度区分。

风险：

- `.env` key 在扩展构建后会进入产物，不适合公开发布或共享构建包。
- 真实 API 测试会消耗 DeepSeek 额度。
- `Auto visible on scroll` 和动态内容监听会增加 API 请求，必须默认关闭，由用户主动开启。

### P1: M2 翻译质量增强

目标：把翻译结果从“可用”提升到“接近 Pro”。

功能：

- Prompt 模板分层：normal / technical / academic 独立模板。
- 领域 Profile：法律、医学、金融、产品文档。
- 页面上下文摘要：页面标题、URL、附近段落、站点类型。
- 术语库增强：域名级术语、页面级术语、导入导出。
- JSON 修复和段落级 fallback：坏段不拖垮整批。
- 缓存管理：清理全部、按站点清理、禁用当前站点缓存。

UI：

- Options 分组：Engine、Language、Display、Glossary、Privacy、Cache。
- Glossary 改成更像表格的管理界面。
- 翻译失败显示可操作原因：认证失败、限流、解析失败、超时。

### P2: M3 低打扰交互

目标：接近沉浸式翻译的高频阅读体验。

功能：

- 页面侧边浮球：Visible / Page / Restore。
- 右键菜单：翻译可视区域、翻译整页、显示原文。
- 快捷键：翻译/还原、整页翻译。
- 划词翻译浮窗。
- 悬停段落翻译。
- 输入框翻译原型：三击空格和 `/ja` 这类目标语言命令。

UI：

- 浮窗和浮球必须低干扰，不遮挡正文。
- 浮窗提供复制、重新翻译、切换语言。
- 快捷键配置放到 Options。

### P3: M4 动态站点适配

目标：覆盖真实高频站点。

功能：

- MutationObserver 增量扫描。
- 翻译队列节流；当前 M1 只做轻量 observer，M4 需要补完整队列和站点策略。
- 站点适配：GitHub、Google Search、YouTube、Reddit、X、新闻站点。
- 域名级设置：自动翻译、默认模式、跳过站点。

UI：

- Popup 显示当前站点规则。
- Options 支持站点配置列表。

### P4: M5+ 文档、字幕、多媒体

目标：进入沉浸式翻译的扩展场景。

功能：

- M5: PDF/字幕预研。
- M6: PDF 文本层双语阅读、YouTube 双语字幕、字幕文件翻译。
- M7: EPUB/DOCX/Markdown、图片 OCR、漫画、会议字幕预研。
- M8: 多 provider、隐私策略、敏感信息脱敏、用量统计。

UI：

- PDF 和字幕应使用独立页面或独立工具入口，不要塞进 Popup。
- 大文件场景必须有进度、取消、错误恢复。

## 推荐下一步

先完成 P0：

1. `.env` key fallback。
2. Options 显示 key 来源。
3. Usage 文档更新 `.env` 使用方法和风险。
4. 手动 Chrome smoke test。

P0 完成后，再进入 M2 的 Prompt/术语/缓存管理。
