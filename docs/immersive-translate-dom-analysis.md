# 沉浸式翻译 DOM 扫描与译文注入技术深度解析

> **分析基础**: 旧版开源代码 (2023年1月归档) + 新版文档  
> **核心文件**: `pageTranslator.js`, `enhance.js`, `showOriginal.js`

---

## 一、整体数据流

```
用户点击翻译 / 自动触发
        │
        ▼
┌──────────────────────────────────┐
│  ① DOM 扫描 (enhance.js)          │
│     getNodesThatNeedToTranslate() │
│     识别需要翻译的 DOM 节点范围      │
└──────────────┬───────────────────┘
               │ 返回: 块级节点数组
               ▼
┌──────────────────────────────────┐
│  ② 文本分段 (pageTranslator.js)    │
│     getPiecesToTranslate()        │
│     将 DOM 节点拆分为翻译单元        │
│     每个单元 = 一组连续内联文本节点    │
└──────────────┬───────────────────┘
               │ 返回: [{nodes: TextNode[]}]
               ▼
┌──────────────────────────────────┐
│  ③ 翻译请求                         │
│     backgroundTranslateHTML()     │
│     批量发送到翻译 API              │
└──────────────┬───────────────────┘
               │ 返回: 译文二维数组
               ▼
┌──────────────────────────────────┐
│  ④ 译文注入 (pageTranslator.js)    │
│     translateResults()            │
│     encapsulateTextNode()         │
│     替换文本节点 + 追加译文          │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  ⑤ 双语对照 (enhance.js)           │
│     cloneNode + formatCopiedNode  │
│     原文节点保留，译文节点并列插入     │
└──────────────────────────────────┘
```

---

## 二、阶段①：DOM 扫描 — 识别翻译区域

### 2.1 核心函数: `getNodesThatNeedToTranslate(root, ctx)`

**目标**: 找出页面中所有需要翻译的"块级节点"

### 2.2 三种扫描策略

```
优先级从高到低：

策略A：精确选择器匹配 (allBlocksSelectors)
  ↓ 如果站点在 specialRules 中配置了 selectors
策略B：容器 + 块标签扫描 (containerSelectors + blockElements)
  ↓ 先找内容容器，再在容器内找块级标签
策略C：全页面块标签扫描
  ↓ 在整个 body 中扫描所有块级标签
```

### 2.3 策略A：精确选择器

```javascript
// 来自 enhance.js
const allBlocksSelectors = pageSpecialConfig.selectors || []

// 例如 Twitter 配置:
// { hostname: "twitter.com", selectors: ['[data-testid="tweetText"]'] }

for (const selector of allBlocksSelectors) {
    const nodes = root.querySelectorAll(selector)
    for (const node of nodes) {
        // 语言检测 (Twitter 特例)
        if (hostname === "twitter.com") {
            const lang = node.getAttribute("lang")
            if (lang && checkIsSameLanguage(lang, targetLang)) continue  // 跳过目标语言
        }
        if (isValidNode(node)) allNodes.push(node)
    }
}
```

### 2.4 策略B：容器 + 块标签扫描

```javascript
// 块级元素列表
let blockElements = ['H1','H2','H3','H4','H5','H6','TABLE','OL','P','LI']
// 可选: 'PRE' (用户可配置)

// 1. 寻找内容容器
const contentContainers = getContainers(root, pageSpecialConfig)
// getContainers 会:
//   - 优先使用用户配置的 containerSelectors
//   - 否则用启发式算法: 找包含最多单词数的 <p> 的父元素

// 2. 在容器内扫描所有块级标签
for (const container of containers) {
    for (const blockTag of blockElements) {
        const paragraphs = container.querySelectorAll(blockTag.toLowerCase())
        for (const p of paragraphs) {
            if (isValidNode(p)) allNodes.push(p)
        }
    }
}
```

### 2.5 节点有效性校验 `isValidNode()`

```javascript
function isValidNode(node) {
    // 跳过已处理的节点
    if (node.hasAttribute('data-translationmark')) return false
    
    // 跳过内联忽略标签: BR, CODE, KBD, WBR
    if (enhanceHtmlTagsInlineIgnore.includes(node.nodeName)) return false
    
    // 跳过不翻译标签: TITLE, SCRIPT, STYLE, TEXTAREA, SVG
    if (enhanceHtmlTagsNoTranslate.includes(node.nodeName)) return false
    
    // 跳过显式标记不翻译的元素
    if (node.classList.contains('notranslate') ||
        node.getAttribute('translate') === 'no' ||
        node.isContentEditable) return false
    
    // 跳过图片为主的段落 (childNodes < 3 且文字 < 80字符)
    if (node.nodeName === 'P') {
        if (node.querySelector('img') && 
            node.childNodes.length < 3 && 
            node.innerText.length < 80) return false
    }
    
    return true
}
```

### 2.6 启发式容器检测 `getContainers()`

```javascript
// 当没有配置 containerSelectors 时，自动推断内容主区域

function getContainers(root) {
    const numWordsOnPage = root.innerText.match(/\S+/g)?.length || 0
    let ps = root.querySelectorAll("p")
    
    // 找包含最多单词的段落
    let pWithMostWords = null
    let maxWords = 0
    for (const p of ps) {
        const words = p.innerText.match(/\S+/g)?.length || 0
        if (words > maxWords) { maxWords = words; pWithMostWords = p }
    }
    
    // 向上找到内容容器 (不超过50%页面单词数)
    let selectedContainer = pWithMostWords
    while (selectedContainer && selectedContainer !== root) {
        const parentWords = selectedContainer.parentNode.innerText.match(/\S+/g)?.length || 0
        if (parentWords > numWordsOnPage * 0.5) break  // 太大了，不是容器
        selectedContainer = selectedContainer.parentNode
    }
    
    return selectedContainer || root
}
```

### 2.7 页面排序

```javascript
// 按 DOM 文档顺序排序，确保翻译从上到下
allNodes.sort((a, b) => 
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
)
```

---

## 三、阶段②：文本分段 — 从块级节点到翻译单元

### 3.1 核心函数: `getPiecesToTranslate(root)`

**设计理念**: 段落是翻译的最小单位。内联格式（粗体、斜体、链接等）应该在翻译时保持上下文完整。

### 3.2 分段逻辑（递归遍历）

```javascript
function getPiecesToTranslate(root) {
    const pieces = [{
        isTranslated: false,
        parentElement: null,
        topElement: null,        // 段落最顶部的元素
        bottomElement: null,     // 段落最底部的元素
        nodes: []                // 文本节点数组
    }]
    let index = 0
    let currentParagraphSize = 0
    
    function getAllNodes(node, lastHTMLElement) {
        if (node.nodeType === 1 || node.nodeType === 11) {  // 元素节点
            // 跳过这些标签 → 创建新分段
            if (isBlockTag(node)) {
                // 换行标签: BR, CODE, KBD, WBR
                // 不翻译标签: TITLE, SCRIPT, STYLE, TEXTAREA, SVG
                // .notranslate / translate="no" / contentEditable
                
                if (当前分段有内容) {
                    结束当前分段，创建新分段
                }
                return  // 不递归进入
            }
            
            // 递归遍历所有子节点
            getAllChilds(node.childNodes)
            
            // 处理 Shadow DOM
            if (node.shadowRoot) {
                getAllChilds(node.shadowRoot.childNodes)
            }
        }
        else if (node.nodeType === 3) {  // 文本节点
            if (node.textContent.trim().length > 0) {
                // 确定文本所属的父块级元素
                let parent = node.parentNode
                while (parent && isInlineTag(parent.nodeName)) {
                    parent = parent.parentNode
                }
                piece.parentElement = parent
                
                // 段落大小限制 (1000字符)
                if (currentParagraphSize > 1000) {
                    结束当前分段，创建新分段
                    currentParagraphSize = 0
                }
                
                currentParagraphSize += node.textContent.length
                piece.nodes.push(node)
            }
        }
    }
    getAllNodes(root)
    return pieces
}
```

### 3.3 内联标签白名单

```javascript
// 这些标签内的文本保持在同一翻译单元中
const htmlTagsInlineText = [
    '#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 
    'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 
    'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR'
]

// 示例: <p>Hello <strong>world</strong>, this is <a href="#">link</a>.</p>
// → 一个翻译单元，包含 3 个文本节点:
//   ["Hello ", "world", ", this is ", "link", "."]
```

### 3.4 分段边界规则

```
分段边界由以下条件触发:
  ✓ 遇到块级标签 (<p>, <div>, <h1>, <li>, <table> 等)
  ✓ 遇到不翻译标签 (<script>, <style>, <svg> 等)
  ✓ 遇到 <br>, <code>, <kbd>, <wbr> 等内联忽略标签
  ✓ 遇到 .notranslate 或 translate="no"
  ✓ 遇到 contentEditable 元素
  ✓ 累计字符数超过 1000
```

---

## 四、阶段③：翻译请求

### 4.1 请求方式

```javascript
// 按屏幕可见性分批翻译，而非一次性全部翻译

function translateDynamically() {
    // 筛选屏幕内可见的翻译单元
    const piecesInView = pieces.filter(p => 
        bottomIsInScreen(p.topElement) || topIsInScreen(p.bottomElement)
    )
    
    if (piecesInView.length > 0) {
        // 提取文本并过滤关键词
        const sourceArray2d = piecesInView.map(p => 
            p.nodes.map(node => filterKeywordsInText(node.textContent))
        )
        
        // 发送到 background worker 调用翻译 API
        const results = await backgroundTranslateHTML(
            translationService, targetLanguage, sourceArray2d
        )
        
        // 注入译文结果
        translateResults(piecesInView, results)
    }
    
    // 每 600ms 递归检查（处理滚动时新出现的内容）
    setTimeout(translateDynamically, 600)
}
```

### 4.2 关键词保护机制

```javascript
// 翻译前: 用占位符替换用户定义的不翻译关键词
// 例如: "API" → "@%1#$"

function filterKeywordsInText(text) {
    const customDictionary = twpConfig.get("customDictionary")
    for (let [keyword] of customDictionary) {
        // 只在关键词被标点/空格包围时才替换 (避免误匹配)
        if (isPunctuationOrDelimiter(prevChar) && isPunctuationOrDelimiter(nextChar)) {
            text = text.replace(keyword, startMark + index + endMark)
        }
    }
    return text
}

// 翻译后: 将占位符替换回原文/自定义译文
async function handleCustomWords(translated, originalText) {
    const startIndex = translated.indexOf('@%')
    const endIndex = translated.indexOf('#$')
    const index = translated.substring(startIndex + 2, endIndex)
    const keyword = compressionMap.get(Number(index))
    const customValue = customDictionary.get(keyword) || keyword
    translated = translated.replace('@%' + index + '#$', customValue)
    return translated
}
```

---

## 五、阶段④：译文注入

### 5.1 文本节点替换策略

```javascript
function encapsulateTextNode(node, ctx) {
    // 创建 <font> 元素包裹原文本节点
    const fontNode = document.createElement("font")
    fontNode.textContent = node.textContent  // 保存原文
    
    // 用 <font> 替换原 TextNode
    node.replaceWith(fontNode)
    
    return fontNode
}
```

**为什么用 `<font>`？**
- 它是一个内联元素，不会破坏网页布局
- 可以应用 CSS 样式（下划线、高亮、透明度等）
- 不常用，冲突概率低

### 5.2 译文样式注入

```javascript
// 根据用户设置决定样式
const isShowDualLanguage = twpConfig.get("isShowDualLanguage") === 'no' ? false : true
const dualStyle = pageSpecialConfig.style || twpConfig.get("dualStyle") || 'underline'

let style = 'vertical-align: inherit;'

if (isShowDualLanguage) {
    switch (dualStyle) {
        case 'underline':
            style += 'border-bottom: 2px solid #72ECE9;'
            break
        case 'highlight':
            style += 'background-color: #EAD0B3; padding: 3px 0;'
            break
        case 'weakening':
            style += 'opacity: 0.4;'
            break
        case 'mask':
            style += 'filter: blur(5px);'
            fontNode.classList.add('immersive-translate-mask')
            break
        default:
            style += dualStyle  // 自定义 CSS
    }
}
fontNode.setAttribute('style', style)
```

### 5.3 译文写入

```javascript
async function translateResults(pieces, results) {
    for (let i = 0; i < pieces.length; i++) {
        for (let j = 0; j < pieces[i].nodes.length; j++) {
            const node = pieces[i].nodes[j]
            let translated = results[i][j] + " "
            
            // 1. 将 TextNode 替换为 <font>
            node = encapsulateTextNode(node, ctx)
            
            // 2. 保存恢复信息
            nodesToRestore.push({
                node: node,
                original: node.textContent
            })
            
            // 3. 处理自定义关键词 → 写入译文
            const result = await handleCustomWords(translated, node.textContent)
            node.textContent = result
        }
    }
}
```

### 5.4 恢复原文

```javascript
pageTranslator.restorePage = function () {
    // 恢复所有被替换的文本节点
    for (const ntr of nodesToRestore) {
        ntr.node.replaceWith(ntr.original)  // 换回原始 TextNode
    }
    nodesToRestore = []
    
    // 恢复属性翻译
    for (const ati of attributesToTranslate) {
        if (ati.isTranslated) {
            ati.node.setAttribute(ati.attrName, ati.original)
        }
    }
}
```

**关键**: 恢复原文不是替换 textContent，而是保留原始 TextNode 的引用，用 `replaceWith()` 彻底还原 DOM 结构。这样能完全避免状态残留。

---

## 六、阶段⑤：双语对照渲染

### 6.1 节点克隆策略 (enhance.js)

```javascript
// 在翻译前，为每个块级节点创建原文副本
for (const node of allNodes) {
    // 避免重复克隆
    const prevSibling = node.previousSibling
    if (prevSibling?.hasAttribute('data-translationmark')) continue
    
    // 深克隆原文
    let copyNode = node.cloneNode(true)
    
    // 标记为副本节点
    copyNode.setAttribute('data-translationmark', 'copiedNode')
    
    // 在目标节点前插入副本 (A 是副本 → B 将被翻译)
    node.parentNode.insertBefore(copyNode, node)
}
```

**DOM 结构变化**：

```
翻译前:                         翻译后:
<div>                           <div>
  <p>Hello world</p>     →        <p data-translationmark="copiedNode">Hello world</p>
</div>                             <p data-translationmark="mark">
                                     <font style="...">你好世界</font>
                                   </p>
                                 </div>
```

### 6.2 内联元素间距处理

```javascript
function formatCopiedNode(copyNode, originalDisplay, ctx, pageSpecialConfig) {
    // 内联元素添加右侧间距
    if (inlineElements.includes(copyNode.nodeName.toLowerCase())) {
        copyNode.style.paddingRight = '8px'
    } 
    // 块级元素添加底部间距 (除了 p/ul/ol/li)
    else if (!['p', 'ul', 'ol', 'li'].includes(copyNode.nodeName.toLowerCase())) {
        copyNode.style.paddingBottom = '8px'
    }
}
```

### 6.3 特站适配

不同网站需要不同的副本插入策略（例如行内 vs 块级显示）：

```javascript
// Twitter: 内联元素强制 block 显示
if (hostname === 'twitter.com') {
    if (inlineElements.includes(node.nodeName)) {
        originalDisplay = 'block'
    }
}

// Reddit: 标题后插入 <br>
if (hostname === 'www.reddit.com') {
    if (copyNode.nodeName === 'H3' || copyNode.nodeName === 'H1') {
        copyNode.appendChild(document.createElement('br'))
    }
}

// YouTube: 特殊处理 - 将副本的子节点逐个插入到原文节点内
if (hostname === 'www.youtube.com') {
    for (let child of copyNode.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            const span = document.createElement('span')
            span.appendChild(child)
            child = span
        }
        node.insertBefore(child, node.firstChild)  // 译文插入到原文之前
    }
}
```

---

## 七、富文本处理详细分析

### 7.1 问题定义

```
原文: <p>The <strong>quick brown</strong> fox jumps <em>over</em> the lazy dog.</p>

期望译文展示:
<p>
  <span class="original">The <strong>quick brown</strong> fox jumps <em>over</em> the lazy dog.</span>
  <span class="translation">那只 <strong>敏捷的棕色</strong> 狐狸跳 <em>过</em> 了懒狗。</span>
</p>
```

### 7.2 实际处理方式

**方式一 (旧版/单语模式)**: 文本级替换

```
1. 收集所有文本节点: ["The ", "quick brown", " fox jumps ", "over", " the lazy dog."]
2. 发送翻译: → ["那只 ", "敏捷的棕色", " 狐狸跳 ", "过", " 了懒狗。"]
3. 逐个替换: TextNode("The ") → <font>那只</font>
4. 结果: <p><font>那只 </font><strong><font>敏捷的棕色</font></strong>...</p>
```

✅ 优点：不破坏原有 DOM 结构，<strong>/<em> 等格式标签完全保留  
✅ 优点：恢复原文时只需换回原 TextNode  
⚠️ 缺点：与原文显示切换需额外处理  

**方式二 (新版/双语对照模式)**: 节点克隆

```
1. cloneNode(true) 创建完整副本
2. 副本保持原文不变
3. 原节点内的文本被翻译替换
4. 两个节点并列显示
```

✅ 优点：原文格式完美保留（深克隆）  
⚠️ 缺点：增加了 DOM 节点数量，可能影响页面布局  
⚠️ 缺点：需要处理节点间间距  

### 7.3 复杂嵌套结构

```
输入: <blockquote><p>As Einstein said, <cite>E=mc²</cite> is fundamental.</p></blockquote>

处理流程:
1. getNodesThatNeedToTranslate → 找到 <p> 作为翻译单元
2. getPiecesToTranslate → 
   piece.nodes = [
     TextNode("As Einstein said, "),
     TextNode("E=mc²"),        // cite 内
     TextNode(" is fundamental.")
   ]
3. filterKeywordsInText → "E=mc²" 可能在术语库中保持不翻译
4. translateResults → 逐个替换文本节点
5. 最终DOM保持 <blockquote><p><cite> 结构不变
```

### 7.4 表格处理

```
输入:
<table>
  <tr><th>Name</th><th>Age</th></tr>
  <tr><td>John</td><td>25</td></tr>
</table>

处理:
1. TABLE 在 blockElements 中 → <th> 和 <td> 分别成为翻译单元
2. 每个单元格独立翻译
3. 表头和数据的翻译上下文独立
4. 表格结构原样保留
```

### 7.5 代码/预格式化文本

```javascript
// PRE 标签默认不翻译 (除非用户启用)
if (twpConfig.get('translateTag_pre') !== 'yes') {
    htmlTagsInlineIgnore.push('PRE')
}

// CODE 标签始终不翻译
const htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR']
```

### 7.6 公式保护 (MathML/LaTeX)

新版支持 PDF 中的公式识别。实现推断：
- 公式区域添加 `notranslate` class
- 或使用 `stayOriginalSelectors` 配置排除公式元素
- PDF 模式下通过布局分析识别公式块

### 7.7 动态内容处理 (SPA)

```javascript
const mutationObserver = new MutationObserver(mutations => {
    const piecesToTranslate = []
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(addedNode => {
            // 只处理新增的块级元素
            if (!isInlineTag(addedNode.nodeName) && 
                !isNoTranslateTag(addedNode.nodeName)) {
                piecesToTranslate.push(addedNode)
            }
        })
        mutation.removedNodes.forEach(removedNode => {
            removedNodes.push(removedNode)  // 记录已删除节点
        })
    })
    newNodes.push(...piecesToTranslate)
})

// 每 2 秒扫描新增节点
setInterval(async () => {
    for (const nn of newNodes) {
        if (removedNodes.includes(nn)) continue
        // 解析新节点 → 生成翻译单元 → 翻译
        const newPieces = getPiecesToTranslate(nn)
        piecesToTranslate.push(...newPieces)
    }
    newNodes = []
    removedNodes = []
}, 2000)
```

---

## 八、关键技术挑战与解决方案

### 8.1 挑战：DOM 操作对页面状态的影响

| 问题 | 解决方案 |
|------|----------|
| 替换 TextNode 导致事件监听器丢失 | 使用 `replaceWith()` 替换节点，事件监听器原本绑定在父元素上不受影响 |
| 译文注入导致页面重排 | 使用内联 `<font>` 元素，保持文本流内联特性 |
| 恢复原文时的状态一致性 | 保存原始 TextNode 引用，`replaceWith()` 原子替换 |

### 8.2 挑战：翻译 API 的顺序一致性

```javascript
// Google 翻译可能重排数组元素
// 使用 dontSortResults 标记控制结果映射策略

if (dontSortResults) {
    // 按原始顺序映射
    for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
            nodes[j].textContent = results[i][j]
        }
    }
}
```

### 8.3 挑战：跨语言标点符号

```javascript
// isPunctuationOrDelimiter 包含完整的 Unicode 标点范围
// 涵盖: 拉丁、中文、日文、韩文、阿拉伯文、泰文等所有 Unicode 标点类别
// 这对于关键词保护机制至关重要：
//   "API" 在 "REST API design" 中应被保护
//   但 "HAPI" 和 "capita" 不应匹配
```

### 8.4 挑战：iframe 内容

```javascript
// 支持 iframe 内容容器
if (pageSpecialConfig && pageSpecialConfig.iframeContainer) {
    const iframeContainer = root.querySelector(pageSpecialConfig.iframeContainer)
    if (iframeContainer) {
        root = iframeContainer.contentDocument  // 进入 iframe 内部
        isIframeContainer = true
    }
}
// 同源 iframe 直接访问 contentDocument
// 跨域 iframe 无法翻译（浏览器安全限制）
```

---

## 九、新版改进推断 (v1.29.4)

基于新版文档和功能列表，推断新版相对旧版的改进：

| 方面 | 旧版 (2023) | 新版 (2026) |
|------|-------------|-------------|
| 翻译引擎 | Google + Yandex | 20+ 引擎（AI/DeepL/OpenAI等） |
| 视频字幕 | ❌ 不支持 | ✅ 30+ 站点字幕劫持 |
| PDF 翻译 | HTML only | ✅ pdf.js + Canvas 重绘 |
| AI 术语库 | ❌ | ✅ 自定义术语注入 prompt |
| AI 上下文 | ❌ | ✅ 相邻段落作为翻译上下文 |
| 图片翻译 | ❌ | ✅ OCR + Inpainting |
| 样式系统 | 4 种内置样式 | CSS 自定义 + 站点级样式 |
| 规则系统 | specialRules JSON | 三层优先级规则 + JS SDK |
| MV3 架构 | MV2 | MV3 (Service Worker) |

---

## 十、总结

### DOM 扫描核心思路

1. **两级扫描**：先找块级节点（翻译范围），再在块内收集文本节点（翻译单元）
2. **内联感知**：内联标签（`<strong>`, `<em>`, `<a>` 等）内的文本保持在同一翻译单元
3. **智能容器识别**：启发式算法自动定位页面正文区域
4. **站点规则系统**：为特定网站配置精确选择器，绕过启发式的局限性

### 译文注入核心思路

1. **文本节点替换**：`TextNode` → `<font>`，不破坏 DOM 结构
2. **原始引用保存**：用于恢复原文的原子操作
3. **双语对照**：`cloneNode(true)` 保留原文，原节点承载译文
4. **增量翻译**：仅翻译屏幕可见区域，600ms 间隔扫描 + MutationObserver 2s 间隔

### 富文本处理核心思路

- **格式标签**（`<b>`, `<i>`, `<code>` 等）：完全保留，不翻译标签本身
- **连接词文本**：与相邻文本一起翻译以保持上下文
- **块级分隔**：`<p>`, `<div>`, `<li>` 等触发新的翻译单元
- **代码/公式**：通过 `notranslate` class 或标签白名单排除
- **关键词保护**：`@%N#$` 占位符机制，防止专业术语被误翻译
