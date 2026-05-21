# Phase 2 New Window Prompt

Copy the prompt below into a new model/window to continue from the latest project state.

```text
你正在接手 Auto-T 项目开发。请先阅读并遵守以下上下文：

工作目录：
/Users/lvtong/Documents/Practice/Auto-T

远端仓库：
git@github.com:Kendrick-L/Auto-T.git

当前分支：
agent/m1/debug-segment-console

第一步必须运行：
git status --short --branch
git log --oneline -5 --decorate

重要：不要重置或丢弃未提交改动。开始前先用 `git status` 判断工作树是否有新 WIP；如果存在，请先保护并理解它们。

必须先阅读：
1. docs/PROJECT_HANDOFF.md
2. docs/Phase-2-step.md
3. docs/USAGE.md
4. ITERATION_PLAN.md
5. subAgent.md

项目目标：
Auto-T 是 Chrome MV3 双语网页翻译插件，使用 DeepSeek，本地优先。Phase 1 的网页翻译主链路基本完成；现在进入 Phase 2 翻译质量增强。

Phase 2 已完成：
- Domain profile 设置：general、technical-docs、legal、medical、finance、product
- Domain profile 进入 DeepSeek prompt
- Domain profile 进入 cache key
- Nearby scanned context 进入 DeepSeek batch prompt
- Nearby context 进入 cache key
- Prompt builder 测试覆盖 profile、glossary、nearby context
- Options 可查看缓存数量并清理全部缓存
- Popup 可识别当前 http/https hostname 并清理当前站点缓存
- Popup 可 Pause/Resume 翻译，Chrome toolbar 有 active/paused icon 和 OFF badge
- DeepSeek model selector 支持 `deepseek-chat` / `deepseek-reasoner`，并进入 cache key
- Response parser 已支持 fenced/prose-wrapped JSON、尾逗号、部分坏 segment、alternate/nested translation 字段恢复

下一步推荐任务：
记录小规模 quality benchmark，或继续做站点级 privacy/cache policy。Glossary 相关优先级已调低，当前没有配置化需求。

建议范围：
- 如做 benchmark，先确认是否允许消耗 DeepSeek API quota
- 如做站点级策略，优先考虑当前站点禁用 cache 和敏感站点提醒
- 更新文档：
  - docs/Phase-2-step.md
  - docs/USAGE.md
  - ITERATION_PLAN.md
  - 如接手状态变化，更新 docs/PROJECT_HANDOFF.md
- 添加测试：
  - 站点策略 storage / UI 行为，或 benchmark 记录格式

约束：
- 不要消耗 DeepSeek API quota，除非用户明确允许。
- 不提交 .env 或任何 API Key。
- 使用 apply_patch 做手工文件编辑。
- 先跑测试和构建再提交。
- 保持改动范围小，不做无关重构。

验证命令：
npm test
npm run compile
npm run build
npm run zip

完成后：
- 更新 Phase 2 进度文档。
- 给出简短 handoff：改了什么、怎么测、风险、下一步。
- 如果提交/推送成功，在最终回复中说明 commit hash。
```
