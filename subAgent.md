# Auto-T subAgent 协作规范

## 总览

本项目采用主 Agent + 多 subAgent + review agent 的协作模式。每个 subAgent 只能在自己的维护范围内改动，并且必须为每个任务创建独立分支。review agent 负责审查、运行验证命令、确认无问题后推送。

默认远端：

```text
origin git@github.com:Kendrick-L/Auto-T.git
```

默认主分支：

```text
main
```

## 标准工作流

1. 主 Agent 明确任务、维护范围、验收标准和需要的参数。
2. subAgent 从最新 `main` 创建任务分支。
3. subAgent 在限定文件范围内实现并提交。
4. subAgent 写 handoff，说明改了什么、怎么测、风险是什么。
5. review agent 切到该分支审查。
6. review agent 运行必要测试。
7. 若无问题，review agent 推送分支到 `origin`。
8. 若有问题，review agent 退回给原 subAgent 或在 review 允许范围内做最小修复。

## 分支规范

每个 subAgent 必须根据任务内容自动创建分支。

格式：

```text
agent/<agent-name>/<short-task-slug>
```

示例：

```text
agent/framework/message-contract
agent/dom/scanner-filtering
agent/translation/deepseek-retry
agent/storage/glossary-version
agent/ui/popup-progress
agent/review/dom-scanner-filtering
```

创建分支：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c agent/<agent-name>/<short-task-slug>
```

提交：

```bash
git add .
git commit -m "<type>: <short summary>"
```

推送只由 review agent 执行：

```bash
git push -u origin agent/<agent-name>/<short-task-slug>
```

## Handoff 模板

每个 subAgent 完成后必须提供以下 handoff：

```markdown
## Handoff

Agent:
Branch:
Commit:

Scope:
- 

Changed files:
- 

Validation:
- [ ] npm run compile
- [ ] npm run build
- [ ] local Chrome load test

Manual test notes:
- 

Required parameters:
- 

Risks:
- 

Next recommended step:
- 
```

## 参数提示规则

任何任务如果缺少必要参数，subAgent 必须先提示，不得自行伪造。

必须提示的常见参数：

- DeepSeek API Key：真实翻译请求需要。不得写入仓库。
- DeepSeek model：默认 `deepseek-chat`，非默认模型需要确认。
- 目标语言：默认 `zh-CN`，多语言测试需要明确。
- 源语言：默认 `auto`。
- 测试 URL：页面适配任务必须提供或由主 Agent指定。
- API 消耗授权：批量页面翻译测试前必须确认是否允许消耗额度。
- Chrome 版本或浏览器类型：浏览器兼容任务需要。
- 代理设置：无法访问 DeepSeek API 或 GitHub 时需要。

密钥处理：

- 不提交 `.env`。
- 不把 API Key 写入 README、测试 fixture、日志或提交信息。
- 本地测试优先通过插件 Options 页面填写 API Key。
- 自动化测试如必须使用密钥，只读环境变量，不打印完整值。

## subAgent 维护范围

### Framework Agent

职责：

- WXT、Manifest V3、构建配置。
- background service worker。
- content、popup、options 的入口接线。
- 消息协议的基础结构。

主要文件：

```text
package.json
package-lock.json
wxt.config.ts
tsconfig.json
entrypoints/background.ts
entrypoints/content.ts
src/messaging/*
src/constants.ts
```

不得擅自修改：

- DeepSeek prompt 细节。
- DOM 扫描策略。
- 术语库业务规则。
- UI 样式大改。

handoff 重点：

- Manifest 权限变化。
- background/content 消息兼容性。
- 构建命令结果。

### DOM Agent

职责：

- 网页文本扫描。
- 分段和过滤规则。
- 译文渲染。
- Restore。
- 动态网页监听。

主要文件：

```text
src/core/dom-scanner.ts
src/core/renderer.ts
src/core/restore.ts
src/core/segmenter.ts
src/utils/hash.ts
entrypoints/content.ts
```

允许修改 `entrypoints/content.ts`，但只限于接入 DOM 流程，不改消息协议定义。

不得擅自修改：

- DeepSeek provider。
- Options 页面表单结构。
- 缓存 schema。

handoff 重点：

- 跳过哪些节点。
- 支持哪些站点。
- 是否会改变页面布局。
- Restore 是否完整。

### Translation Agent

职责：

- DeepSeek provider。
- Prompt builder。
- Response parser。
- 批量翻译服务。
- 重试、超时、错误分类。

主要文件：

```text
src/translation/*
```

可协商修改：

```text
src/storage/cache-store.ts
src/storage/glossary-store.ts
src/translation/types.ts
```

不得擅自修改：

- DOM 插入策略。
- Popup/Options UI 大改。
- Manifest 权限，除非需要新增 API host。

handoff 重点：

- 模型名称。
- Prompt 输出格式。
- JSON 解析 fallback。
- 是否消耗真实 API。

### Storage Agent

职责：

- Settings store。
- Translation cache。
- Glossary store。
- 数据迁移和版本号。

主要文件：

```text
src/storage/*
```

可协商修改：

```text
src/translation/types.ts
entrypoints/options/App.tsx
entrypoints/popup/App.tsx
```

不得擅自修改：

- DOM 扫描和渲染实现。
- DeepSeek prompt 核心规则。

handoff 重点：

- schema 变化。
- 是否需要迁移旧数据。
- 缓存 key 是否影响已有缓存。

### UI Agent

职责：

- Popup 操作体验。
- Options 设置体验。
- 状态、错误、进度展示。
- 基础可访问性。

主要文件：

```text
entrypoints/popup/*
entrypoints/options/*
```

可协商修改：

```text
src/storage/settings-store.ts
src/messaging/messages.ts
```

不得擅自修改：

- DeepSeek 请求逻辑。
- DOM 扫描策略。
- 缓存实现细节。

handoff 重点：

- 用户操作路径。
- 需要哪些错误态。
- 是否需要真实 API Key。

### QA/Test Agent

职责：

- 测试策略。
- 手动测试清单。
- 自动化测试脚本。
- 本地 Chrome 加载验证方案。

主要文件：

```text
tests/*
README.md
ITERATION_PLAN.md
```

可协商修改：

```text
package.json
```

不得擅自修改：

- 产品功能代码，除非只是为测试暴露纯函数或修复明显测试阻塞。

handoff 重点：

- 测试覆盖范围。
- 尚未自动化的手动测试。
- 浏览器和系统版本。

### Review Agent

职责：

- 审查 subAgent 分支。
- 运行验证命令。
- 检查维护范围是否越界。
- 确认没有密钥或敏感信息。
- 无问题后推送分支。

主要动作：

```bash
git status --short --branch
git diff main...HEAD --stat
git diff main...HEAD
npm run compile
npm run build
git push -u origin <branch>
```

审查清单：

- 分支名符合规范。
- 改动范围和 handoff 一致。
- 没有提交 `.env`、API Key、个人凭证。
- 没有无关格式化或大范围重构。
- `npm run compile` 通过。
- `npm run build` 通过。
- 如涉及页面行为，提供本地 Chrome 测试说明。
- 如涉及真实翻译，说明是否消耗 DeepSeek API 额度。

review agent 不应做大规模功能实现。若问题较大，退回给原 subAgent。

## 本地测试和部署

开发模式：

```bash
npm install
npm run dev
```

Chrome 本地加载：

1. 打开 `chrome://extensions`。
2. 开启 Developer mode。
3. 点击 Load unpacked。
4. 选择 `.output/chrome-mv3`。
5. 在 Auto-T Options 中填写 DeepSeek API Key。
6. 打开测试网页，点击 Popup 中的 Translate。

生产构建：

```bash
npm run compile
npm run build
```

打包：

```bash
npm run zip
```

推荐测试页面类型：

- 技术文档：MDN、GitHub README。
- 新闻文章：普通英文新闻页。
- 百科页面：Wikipedia。
- 动态页面：YouTube 评论、Reddit、GitHub issue。

真实 API 测试前必须确认：

- 是否允许消耗 DeepSeek API 额度。
- 目标语言。
- 测试页面数量。
- 是否需要记录 token 或费用估算。

## 冲突处理

- 同一文件不能由多个 subAgent 同时修改，除非主 Agent 明确拆分区域。
- 如果任务必须跨维护范围，subAgent 需要在 handoff 中标注跨界原因。
- review agent 发现跨界改动时，优先要求拆分提交或退回。
- 主分支只接受 review agent 推送过的分支后再合并。

