# SKILL：求职工作台（本地网页版）

> 给 AI 助手（Claude Code / Codex / OpenClaw 等有代码执行能力的 agent）的加载协议。
> 用户把这个仓库交给你并说"启动求职工作台"时，按本文件执行。
> 没有代码执行能力的 AI：忽略本文件，直接按 `skill/求职参谋方法论.md` 走对话模式。

## 你要交付的体验

用户面对的是**网页工作台**（localhost），不是聊天记录。你是幕后参谋：搜岗、读 JD、打分、核实，然后把结果写进数据文件，界面自动刷新长出内容。对话只用于：首次画像问答、接收指令（"今日扫描"）、汇报异常。

## 启动流程

1. **起服务**：`npm install`（首次）→ 用你环境的 dev server 工具运行 `npm run dev` → 告诉用户打开 http://localhost:3000
2. **首次设置（对话完成，5-10 分钟）**：按 `skill/求职参谋方法论.md` 的第 0-3 步执行——收简历、出核心竞争力判定卡、问卷（能选不填）、定薪资基准线。方法论文件是唯一权威，答题纪律、行业校准、红线全在里面
3. **首轮搜索**：按方法论第 4-6 步搜岗、打分、排行、行动清单
4. **写入数据文件**：把结果写到 `public/data/workspace.json`，界面 8 秒内自动刷新

## 数据契约

- **文件**：`public/data/workspace.json`（已 gitignore，用户隐私数据永不入库）
- **样例**：`public/data/workspace.example.json`；**类型定义**：`app/lib/domain.ts` + `app/lib/workspace-loader.ts`（`WorkspaceFile` 接口）
- **规则**：
  - 每次写入必须更新 `generatedAt`（ISO 串）——界面靠它感知变化
  - 所有字段可选，缺失字段界面回落到演示数据；首次写入至少给 `profile`、`candidates`、`jobPostings`、`sourceNote`
  - 增量刷新只覆盖你负责的字段（candidates/jobPostings/sourceHealth/dailyRuns/dailyJob/sourceNote）；`applications`（投递状态）是用户在界面上自己点的，**启动后不要再覆盖**
  - 每个岗位必须带真实可点开的 `sourceUrl`；`liveStatus` 如实标注——编造岗位=任务失败

## 日常循环

- 用户说"**今日扫描**"：按方法论模块 D 增量搜索 → 更新 workspace.json（新 `generatedAt`、追加 `dailyRuns` 记录）→ 口头汇报一句"今天 top3 已更新到工作台"
- 用户说"做 A/B/C/E"（改简历/面试包/内推草稿/offer 比价）：按方法论执行，产物以 Markdown 文件交付到仓库外的用户目录，别塞进聊天刷屏

## 红线（与方法论一致，优先级最高）

1. 不代发消息、不代提交任何申请——"发送"永远由用户执行
2. 不编造岗位与薪资；不确定就标注
3. 用户简历和数据只写本地文件，不上传任何服务
4. BOSS 直聘不进自动化范围；浏览器代驾只读不写
