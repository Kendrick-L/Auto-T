# 沉浸式翻译 (Immersive Translate) — 深度能力分析

> **分析日期**: 2026-05-20  
> **分析版本**: v1.29.4 (Chrome Web Store)  
> **扩展大小**: 11.59 MiB (MV3)  
> **用户量**: 300万+ Chrome 用户 / 全球 2000万+  
> **仓库地址**: [GitHub (Release-only)](https://github.com/immersive-translate/immersive-translate)  
> **开源状态**: ❌ 非开源（2023年1月归档旧版开源代码）

---

## 1. 产品定位

一款 **AI 驱动的双语对照翻译浏览器扩展**，覆盖网页、文档(PDF/Epub/TXT)、视频字幕、图片、漫画、在线会议六大场景。核心理念：**不替换原文，而是在原文下方/旁边插入译文**，保持"沉浸式"阅读体验。

平台覆盖：Chrome / Edge / Firefox / Safari / 油猴脚本 / iOS / Android

---

## 2. 架构分析

### 2.1 整体架构

```
┌─────────────────────────────────────────────────┐
│                   Browser Extension (MV3)         │
├─────────────────────────────────────────────────┤
│  Popup UI          Settings Page      Side Panel │
│  (React/Vue?)      (配置管理)       (翻译面板)     │
├─────────────────────────────────────────────────┤
│              Background Service Worker            │
│         (消息路由、API调用、缓存管理)               │
├─────────────────────────────────────────────────┤
│              Content Script (注入)                │
│    ┌──────────────────────────────────────┐      │
│    │  网页翻译引擎                          │      │
│    │  - DOM 解析 / 智能区域识别             │      │
│    │  - 分段 / 去重 / 增量翻译               │      │
│    │  - 译文注入 (MutationObserver)         │      │
│    ├──────────────────────────────────────┤      │
│    │  视频字幕引擎                          │      │
│    │  - 字幕 DOM 劫持                      │      │
│    │  - 实时双语注入                        │      │
│    ├──────────────────────────────────────┤      │
│    │  输入框引擎                            │      │
│    │  - Input/Textarea 事件监听              │      │
│    │  - 三连空格触发翻译                     │      │
│    └──────────────────────────────────────┘      │
├─────────────────────────────────────────────────┤
│              翻译请求层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ DeepL    │  │ OpenAI   │  │ Google   │ ...   │
│  │ API      │  │ API      │  │ Translate│       │
│  └──────────┘  └──────────┘  └──────────┘       │
├─────────────────────────────────────────────────┤
│              本地能力层                            │
│  PDF 解析 / Epub 解析 / OCR / 图片处理             │
└─────────────────────────────────────────────────┘
```

### 2.2 技术栈推断

| 层级 | 技术 | 推断依据 |
|------|------|----------|
| 扩展框架 | Chrome Extension MV3 | CWS 列表确认，manifest_version 3 |
| UI 框架 | React / Preact | 复杂面板交互，11.59 MiB 大小 |
| DOM 操作 | 原生 JS + MutationObserver | 实时监听页面变化 |
| 通信 | chrome.runtime.sendMessage | 标准 extension 消息传递 |
| 翻译后端 | REST API 调用 + 流式 | 支持 20+ 翻译引擎 |
| PDF 处理 | pdf.js + Canvas | 保留排版需渲染+覆盖 |
| OCR | 服务端 API | 图片翻译需 OCR 提取文字 |
| 存储 | chrome.storage.local/sync | 配置同步、术语库缓存 |

### 2.3 Chrome 权限分析

从 Chrome Web Store 和功能推断所需权限：

```
- activeTab / <all_urls>:  注入 content script 到所有页面
- storage:                  保存配置、术语库、站点规则
- scripting:               动态注入/执行脚本
- webRequest:               拦截/修改网络请求（可选，用于 API 代理）
- tabs:                     获取标签页信息
- contextMenus:             右键菜单 "翻译网页/图片"
- downloads:                下载翻译后的 PDF/Epub
```

---

## 3. 功能矩阵与实现方式

### 3.1 网页翻译（核心能力）

**触发方式**：
- 点击扩展图标 → "翻译"
- 右键菜单
- 快捷键：`Alt+A`（翻译/切换原文）、`Alt+W`（翻译整页）
- 自动翻译（按域名规则）

**实现原理**：

```
1. 内容区域识别
   - 优先使用用户配置的 selectors
   - 否则使用启发式算法识别正文区域（排除 nav/footer/sidebar/ad）
   - 这是核心难点：不同网站结构差异巨大

2. 文本分段
   - 按段落级 DOM 元素分段（<p>, <div>, <li> 等）
   - 保持上下文完整性，段落是最小翻译单元
   - 过滤代码块、预格式化文本、SVG 等非翻译内容

3. 翻译请求
   - 批量发送段落（减少网络请求）
   - 支持并发请求，流式返回
   - 缓存已翻译段落（同一页面不重复翻译）

4. 译文注入
   - 在每个原文段落下方插入译文 DOM 节点
   - 添加 class 标记（如 .immersive-translate-target）
   - 支持自定义样式（下划线、虚线、高亮、无样式等）
   - 通过 MutationObserver 监听动态加载内容（SPA 路由切换、无限滚动）
```

**关键代码路径**（基于旧版开源代码推断）：

```
src/
├── content_script.js       # 主注入脚本
├── translator.js           # 翻译引擎核心
├── dom_parser.js           # DOM 解析与区域识别
├── injector.js             # 译文注入器
├── rules/                  # 站点适配规则（大量正则/选择器）
└── services/               # 各翻译服务适配器
```

**能力边界**：
- ✅ 静态 HTML 网页
- ✅ SPA 动态渲染（React/Vue/Angular）
- ✅ 无限滚动加载
- ❌ Canvas 渲染的文本（如 Figma）
- ❌ 图片内嵌文字（需图片翻译功能单独处理）
- ❌ iframe 跨域内容（浏览器安全限制）
- ❌ Shadow DOM 封闭模式

### 3.2 PDF 翻译

**功能**：上传/拖拽 PDF → 双语对照翻译 → 下载（保留原排版）

**实现原理**：

```
1. PDF 解析
   - 使用 pdf.js 解析 PDF 结构
   - 提取文本 + 位置坐标

2. 翻译处理
   - 按段落/区域发送至翻译 API
   - 保持原文段落结构

3. 重排渲染
   - 在 Canvas 上重新绘制 PDF 原页面
   - 计算译文文本需要的空间
   - 调整行距/字号/文本换行以容纳双语
   - 公式识别（MathML/LaTeX 区域保持原样）
   - 表格识别（保持表格结构不翻译/仅翻译内容）

4. 导出
   - 重新编码为 PDF 文件
   - 提供"双语对照"和"仅译文"两种下载选项
```

**能力边界**：
- ✅ 文字型 PDF（保留排版良好）
- ✅ 扫描件 PDF（Pro 版支持 OCR）
- ⚠️ 复杂排版（多栏、表格）可能轻度错位
- ❌ 手写体 PDF
- ❌ 加密 PDF（需先解密）
- ⚠️ 超大 PDF（>100MB）受浏览器内存限制

### 3.3 视频双语字幕

**支持平台**：YouTube、Netflix、Vimeo、Hulu、Bilibili、TED、Twitter Spaces、Coursera、Udemy 等 30+ 站点

**实现原理**：

```
1. 字幕 DOM 劫持
   - 定位视频播放器的字幕渲染容器
   - 每个平台有不同的 DOM 结构和 class 名
   - 通过 MutationObserver 监听字幕文本变化

2. 实时翻译
   - 获取当前字幕文本
   - 发送至翻译 API（优先使用 AI 引擎以获取上下文连贯性）
   - 在字幕 DOM 下方插入译文节点

3. 同步处理
   - 字幕切换时同步更新译文
   - 延迟通常 < 500ms（取决于 API 响应速度）
   - 缓存已翻译的字幕句（同一视频不重复翻译）

4. 在线会议支持
   - Google Meet / Zoom / Microsoft Teams
   - 劫持会议内置字幕（需先开启原平台字幕功能）
   - 实时注入双语字幕
```

**能力边界**：
- ✅ 有 DOM 字幕的在线视频（自动适配）
- ✅ 在线会议实时字幕
- ❌ 硬编码字幕（嵌在视频画面里的文字）
- ❌ 无字幕视频（无法翻译不存在的内容）
- ❌ DRM 保护的视频流（如部分 Netflix 内容，字幕可能被加密）

### 3.4 输入框翻译

**触发**：在任意网页的输入框/文本框中连按 **三次空格** → 自动翻译输入内容

**实现原理**：

```
1. 事件监听
   - 监听所有 input/textarea 的 keyup 事件
   - 检测空格键连续三次（时间窗口内）
   - 记录光标位置

2. 翻译流程
   - 提取输入框全部文本
   - 发送至翻译 API
   - 替换输入框文本为译文
   - 或追加到原文后（可配置）

3. 反向翻译（支持多轮对话场景）
   - 再次三连空格可将译文翻译回原文语言
```

**能力边界**：
- ✅ 标准 HTML input/textarea
- ✅ ChatGPT、搜索引擎等 AI 工具的输入框
- ❌ contenteditable 复杂编辑器（富文本编辑器可能不可靠）
- ❌ Canvas 内输入框
- ❌ 跨域 iframe 内输入框

### 3.5 鼠标悬停翻译

**实现原理**：

```
1. 鼠标事件委托
   - 监听全局 mousemove → 防抖
   - 检测鼠标所在段落（最接近的块级元素）

2. 即时翻译
   - 获取段落文本
   - 发送至翻译 API（短文本，响应快）
   - 段落下方弹出 tooltip 显示译文

3. 性能优化
   - 缓存已翻译段落（同一段落不重复翻译）
   - 快速移动时取消请求
   - 控制并发请求数量
```

### 3.6 划词翻译

**实现原理**：

```
1. 选中事件
   - 监听 mouseup → 获取 window.getSelection()
   - AI 模式：将选中文本 + 上下文段落一同发送
   - 非 AI 模式：直接查词翻译

2. 译文展示
   - 选中区域附近弹出浮窗
   - 显示：单词释义、例句、上下文翻译（AI 模式）
```

### 3.7 图片翻译

**实现原理**：

```
1. 图片获取
   - 右键网页图片 → "翻译图片"
   - 或上传本地图片

2. OCR 识别
   - 将图片发送至服务端 OCR API
   - 提取文字 + 位置坐标

3. 翻译 + 覆盖
   - 翻译提取的文字
   - 在原图位置覆盖译文
   - 可选抹除原文（inpainting）
```

### 3.8 漫画翻译

**支持站点**：特定漫画网站

**实现原理**：与图片翻译类似，但对漫画气泡做针对性优化：
- 识别气泡区域
- OCR 提取气泡内文字
- 翻译后回填气泡区域
- 保持阅读顺序（右→左 或 左→右）

### 3.9 Epub 电子书翻译

**实现原理**：

```
1. Epub 解析
   - Epub 本质是 ZIP 包 + HTML 内容
   - 解包提取 HTML 章节

2. 翻译
   - 对每个 HTML 章节进行翻译
   - 复用网页翻译引擎

3. 重新打包
   - 生成双语对照 Epub
   - 保持原书目录/样式
```

### 3.10 字幕文件翻译 (ASS/SRT)

**实现原理**：上传字幕文件 → 解析时间轴 → 逐句翻译 → 生成双语字幕文件

---

## 4. 翻译引擎体系

### 4.1 支持的引擎

| 类型 | 引擎 | 费用 |
|------|------|------|
| 免费内置 | Google 翻译、微软翻译、有道翻译、百度翻译、腾讯翻译君、火山翻译、彩云小译、小牛翻译 | 免费 |
| 专业 API | DeepL、OpenL | 自带 API Key |
| AI 大模型 | OpenAI (ChatGPT)、DeepSeek、Gemini、Claude、智谱 GLM、硅基流动 | 自带 API Key |
| 内置 Pro | 沉浸式翻译 Pro 引擎（整合多个 AI 模型） | Pro 订阅 |

### 4.2 翻译请求流程

```
User Config / Site Rule → selectTranslationService()
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                 Google    DeepL     OpenAI
                    │          │          │
                    └──────────┼──────────┘
                               │
                    API Request Builder
                    - Prompt 模板（可自定义）
                    - AI 专家角色设定
                    - 术语库注入
                    - 上下文附加上下文
                               │
                        HTTP Request
                    (Background Worker)
                               │
                        缓存 / 返回
```

### 4.3 AI Prompt 体系

**可配置的 AI Prompt 内容**（来自「AI Prompt 配置指南」）：

- **角色设定**："你是一位专业的学术论文翻译专家"
- **术语库**：`{自定义术语表}` 自动注入到 prompt
- **上下文**：发送相邻段落作为翻译上下文
- **输出格式控制**：强制返回特定格式

---

## 5. 高级自定义能力

### 5.1 规则系统 (Rules System)

三层层级优先级：

```
命中的 rules[].selectors     (最高)
  > generalRule.selectors
  > 内置默认选择器             (最低)
```

**规则类型**：

| 规则字段 | 作用 |
|----------|------|
| `matches` | 匹配域名（`example.com`） |
| `selectors` | 只翻译匹配的元素 |
| `excludeSelectors` | 排除不翻译的元素 (nav, footer, ads) |
| `stayOriginalSelectors` | 保持原文不变（如论坛标签） |
| `extraBlockSelectors` | 强制作为块级元素处理 |
| `extraInlineSelectors` | 强制作为内联元素处理 |
| `translationClasses` | 为译文添加额外 CSS class |
| `injectedCss` | 注入自定义 CSS 样式 |
| `translationTheme` | 译文样式主题 (none/underline/dotted/highlight等) |

### 5.2 样式自定义

```css
/* 译文样式完全可控 */
.immersive-translate-target {
  color: #666;
  font-size: 0.9em;
  border-bottom: 1px dashed #999;
}
```

### 5.3 按站点配置不同翻译服务

```json
{
  "translationService": "google",
  "translationServices": {
    "deepl": { "matches": ["sci-hub.se"] },
    "openai": { "matches": ["arxiv.org"] }
  }
}
```

### 5.4 JS SDK（嵌入式）

网站可以通过 JS SDK 将翻译按钮嵌入自己的页面：

```html
<script src="https://immersivetranslate.com/sdk.js"></script>
<script>
  window.immersiveTranslateConfig = {
    partnerId: "example-project",
    mountPoint: { selector: "#translation-button", action: "child" },
    pageRule: {
      mainFrameSelector: "article",
      excludeSelectors: ["nav", ".ad"],
      translationClasses: "my-custom-class"
    }
  };
</script>
```

---

## 6. 能力边界总结

### 6.1 明确能做到的

| 场景 | 能力 |
|------|------|
| 通用网页 | ✅ 任意网页双语翻译 |
| 主流网站 | ✅ Google/Meta/Twitter/Reddit/GitHub 等深度优化 |
| SPA 应用 | ✅ React/Vue/Angular 动态页面 |
| PDF 文档 | ✅ 上传翻译，保留排版（免费版有限额） |
| Epub 电子书 | ✅ 上传 → 下载双语对照版 |
| 在线视频 | ✅ YouTube/Netflix/Bilibili 等 30+ 站点字幕翻译 |
| 在线会议 | ✅ Google Meet/Zoom/Teams 实时字幕翻译 |
| 输入框 | ✅ 三连空格触发输入翻译 |
| 图片 | ✅ 右键翻译网页图片 + 本地上传 |
| 漫画 | ✅ 支持特定漫画站点 |
| 离线能力 | ❌ 依赖网络（需请求翻译 API） |
| 隐私保护 | ✅ Chrome Store 认证：不收集翻译内容 |

### 6.2 明确做不到的 / 限制

| 场景 | 限制 |
|------|------|
| Canvas 渲染文字 | ❌ 技术不可行（如 Figma 画布文字） |
| 硬编码视频字幕 | ❌ 嵌在视频画面里的文字无法提取 |
| DRM 保护内容 | ❌ 加密字幕/加密视频流 |
| 跨域 iframe | ❌ 浏览器安全策略限制 |
| 离线翻译 | ❌ 所有翻译都依赖远程 API |
| Shadow DOM 封闭模式 | ❌ 无法访问 |
| 加密 PDF | ⚠️ 需先解密 |
| 大文件 PDF | ⚠️ >100MB 可能内存不足 |
| Chrome 内部页面 | ❌ chrome://、chrome-extension:// 等禁止注入 |
| 浏览器默认页 | ❌ 新标签页、无地址的页面 |

### 6.3 已知弱点

1. **非开源** → 无法自行修改/审查核心代码
2. **API 依赖** → 免费服务（Google 翻译等）可能被限流/阻塞
3. **Pro 付费墙** → Pro AI 引擎、OCR、高级 PDF 需要订阅
4. **站点适配靠规则** → 新站点/改版站点可能需要等待规则更新
5. **性能** → 大页面翻译时 DOM 注入量大，可能轻微影响滚动性能

---

## 7. 与竞品对比

| 特性 | 沉浸式翻译 | Google 翻译扩展 | DeepL 扩展 | 沙拉查词 |
|------|-----------|----------------|-----------|---------|
| 双语对照 | ✅ 核心能力 | ❌ 替换原文 | ❌ 替换原文 | ✅ |
| PDF 翻译 | ✅ 保留排版 | ❌ | ✅ 保留排版 | ❌ |
| 视频字幕 | ✅ 30+ 站点 | ❌ | ❌ | ❌ |
| AI 引擎 | ✅ 20+ 引擎 | ❌ | ❌ | ✅ 部分 |
| 术语库 | ✅ | ❌ | ✅ | ❌ |
| 免费程度 | 大部分免费 | 完全免费 | 有限免费 | 免费 |
| 开源 | ❌ | ❌ | ❌ | ✅ MIT |

---

## 8. 落地建议

### 8.1 适用场景

- **科研人员**：外文论文 PDF 翻译 + 术语统一
- **开发者**：技术文档/Stack Overflow/GitHub Issues 双语阅读
- **学生**：MOOC 课程字幕翻译 + 外文教材
- **跨境运营**：社交媒体/竞品分析网页翻译
- **投资者**：海外财报/新闻快速浏览

### 8.2 推荐配置

```
翻译引擎：DeepL（准确度高）/ OpenAI（上下文理解好）
触发方式：Alt+A 手动触发（避免自动翻译浪费 API）
显示模式：双语对照（核心优势）
样式：下划线（最小侵入）
术语库：根据专业领域导入
```

### 8.3 注意事项

1. **API Key 安全**：自带的 API Key 存储在浏览器本地，注意不要在公共电脑使用
2. **敏感内容**：翻译内容会发送至所选的翻译服务商服务器（DeepL/OpenAI 等）
3. **免费额度**：Google 翻译免费但可能不稳定，建议配置备用翻译引擎
4. **Pro 订阅**：重度 PDF/OCR/漫画使用者需要考虑 Pro 会员

---

## 参考资料

- [沉浸式翻译官网](https://immersivetranslate.com/)
- [Chrome Web Store](https://chromewebstore.google.com/detail/immersive-translate-trans/bpoadfkcbjbfhfodiogcnhhhpibjhbnh)
- [GitHub Releases](https://github.com/immersive-translate/immersive-translate)
- [旧版开源代码](https://github.com/immersive-translate/old-immersive-translate)（已归档，2023-01-17）
- [官方文档](https://immersivetranslate.com/docs/)
