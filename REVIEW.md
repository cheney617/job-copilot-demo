# 求职工作台 Review（demo + app 差异部分）

> 2026-07-29 · 方法：全量读码（demo ~3200 行 + app 版连接器）+ 浏览器实机走完 onboarding→搜索→榜单全流程 + 崩溃复现 + 跑通测试套件（3/3 pass, lint clean build）

## 一、代码问题（按严重度）

> **修复进度（2026-07-29）**：✅ P0 崩溃已修（demo+app 双仓，`isValidDailyTime` 守卫，实机复现路径验证通过）；✅ P1 死代码已清（demo 仓：chatgpt-auth.ts / db+drizzle 全套 / examples / worker DB 绑定，lint+7 项测试全过）。app 仓的 chatgpt-auth/db 死代码未动（私有仓不迫切，可后续同步）。

### 🔴 P0 · 已复现的崩溃（✅ 已修）
**每日刷新页清空时间输入 → 整页白屏。**
`nextDailyRun()`（JobCopilotApp.tsx）对 `localTime.split(":")` 无守卫：输入框清空时 value=""，`setHours(NaN)` 产生 Invalid Date，`toISOString()` 抛 `RangeError: Invalid time value`。实测复现：启用每日刷新 → 删掉时间 → 崩。
修法：`updateDailyTime` 与 `nextDailyRun` 双侧守卫——value 不匹配 `/^\d{2}:\d{2}$/` 时保持上一次合法值（或 nextRunAt 置 null 并禁用）。app 版同代码同 bug。

### 🟡 P1 · 匹配标签双体系，答题后会"变脸"
榜单卡片标签存在两套来源：portfolio-seed 硬编码百分比（"91% · 直接匹配"），`saveGap` 部分分支硬编码（"88% · 补证后推荐"），而 `evaluateJob()` 动态产出的是文字档（"强相邻迁移 / 值得评估"）。用户在 agent_years / finance_domain 门槛答"是"后走 `evaluateJob` 重算，卡片标签会从"86% · 补 1 项事实"跳成"强相邻迁移"——像换了套评分系统。
建议：统一走一个 label 生成函数。倾向去掉精确百分比（见推广部分第 2 条）。

### 🟡 P1 · 模板死代码留在公开演示仓里
- `app/chatgpt-auth.ts`：86 行，全仓零引用（OpenAI 托管模板残留，读 `oai-authenticated-user-*` 头）。公开 repo 里放着"读取用户邮箱"的 auth 代码，会引来不必要的隐私疑问。
- `db/`：schema 空导出、`getDb()` 无人调用，但 `worker/index.ts` 的 `Env` 声明了 `DB: D1Database` 与 `IMAGES` 绑定——部署时要么配无用绑定要么报错。
建议：demo 仓三处全删，worker Env 只留 ASSETS。

### 🟡 P2 · 首帧数据闪烁 + demoMode 初始值
初始 state 全用 workspace-seed，`useEffect`(setTimeout 0) 再按 URL 换 portfolio-seed；`?portfolio=onboarding` 进入时会先闪一帧工作台数据。且 `demoMode` 初始为 "workspace" 而非 null。
建议：lazy initializer 里直接读 `window.location.search`（配 `typeof window` 守卫），或 hydrated 前渲染骨架屏。

### 🟢 P3 · 其他
- **a11y**：竞争力卡/方向卡等 card 型按钮在无障碍树中无 accessible name（实测 read_page 全为无名 button）。有 `aria-pressed` 但缺 `aria-label`。
- **时区**：`nextDailyRun` 按设备本地时区算，UI 却全程标"北京时间"——悉尼设备设 09:00 实为悉尼时间。demo 无伤大雅，app 版（你本人在悉尼用）建议统一成"设备本地时间"文案或真按北京时间换算。
- sidebar 的 Link 用 `preventDefault + location.assign` 强刷重置状态——能用，属 smell；响应 searchParams 更稳。
- `downloadCalendar` ICS 转义做了（好评），未做 75 字节折行，主流日历都容忍，可不改。

### app 版独有部分（job-connectors.ts / api/jobs）
- 路线正确：全部走官方公开 API/careers 页（腾讯/百度/Bosch/Citi/HSBC/Workday 系），无 BOSS/脉脉爬取——合规且与"BOSS 不碰"决策一致 ✅ 每个 connector 有 catch 并降级到 SourceHealth ✅
- **缺 fetch 超时**：任一源挂起会拖死 `/api/jobs` 的 `Promise.all`。建议每个 fetch 加 `AbortSignal.timeout(8000)`，路由层 `Promise.all` → `Promise.allSettled`。

### 测试
`npm test` 全过（build + rendered-html + domain 3 条）。测试还专门断言"demo 数据必须虚构"——这条设计很聪明，防止真实数据混入公开仓。建议补两条：nextDailyRun 非法输入（修 P0 时顺手加回归）、evaluateJob 门槛分支。

## 二、可用性优化点（实机走完全流程后）

1. **搜索等待 5.4 秒纯演出**（三段 1800ms delay）。录屏/演示场景显拖；且等待期"查看当前结果"按钮在完成前一直 disabled，存在感尴尬。建议压到 ~2.5s，或让进度阶段可点击跳过。
2. **"排除当前任职公司"校验反馈太远**：漏填时错误 notice 出现在页面底部，输入框本体无红态。就地标红 + 滚动到位。
3. **gap 问答是全产品最打动人的交互**（"回答 1 个问题"→重新判断→进正式推荐），但按钮文案没说回报。改为"回答 1 个问题，解锁正式推荐"。
4. **每日刷新的能力边界文案要更直白**："Local First 版本在页面打开时按计划执行"→ 用户会以为关页也跑。直说："只在页面开着时到点执行；错过会提示补跑。"
5. **面试文档页缺导航**：十几个 section 一滚到底，加 sticky 锚点目录（岗位事实/JD匹配/策略/题库/反问/checklist）。
6. **移动端未验证**：若要对外传播（小红书流量九成在手机），375px 宽度必须过一遍——侧边栏 + 双栏 dashboard 大概率需要响应式改造。这是"利于推广"视角下最大的工程缺口。

## 三、推广角度优化点

1. **默认入口应该是 onboarding，不是 workspace**。workspace 首屏是满桌数据，第一次看的人 10 秒内抓不到"它帮我干什么"；onboarding 的"上传简历→判定卡→3 个推荐"才是 30 秒讲得完的钩子。至少给 workspace 首屏加一条"从一份简历开始体验 →"的显眼通路。
2. **虚拟数据别摆精确百分比**。"91%"在截图里抓眼，但评论区第一条就会是"这数怎么算的"。展示"判断 + 理由"（强相邻迁移：会员商业化结果可直接复用）反而立"不编造"的人设——和 skill 的口径一体。
3. **"用你自己的简历试试"是最强卖点但被藏住了**：demo 支持真实本地解析 PDF/DOCX（且不上传，这是隐私卖点），建议在首页给一等公民入口 + "简历只在本地读取"大字。
4. **与 skill 项目的叙事联动**：工作台=skill 的图形化进化。传播顺序建议：skill 文件（零门槛领取）→ "想要界面版？"→ demo 链接。demo 页脚预留 skill 领取入口位。
5. **部署前清单**：删死代码三件套（见 P1）→ 修 P0 崩溃 → 移动端适配 → 再挂链接。Cloudflare 部署时把 D1/IMAGES 绑定清掉。

## 四、一句话结论

**底子很好**：概念完整（判定→诉求→权重→来源→榜单→在行→复盘）、文案克制诚实、测试里连"数据必须虚构"都有断言。**离"可推广"差三步**：修掉一个白屏崩溃、把首次体验入口换成 onboarding、过一遍手机端。
