import type {
  ApplicationEvent,
  ApplicationRecord,
  BrowserSourceSession,
  Candidate,
  DailyJobSettings,
  DailyRun,
  InterviewPrepMaterial,
  JobPostingRecord,
  JobRecord,
  Preferences,
  ResumeProfile,
  ResumeVersion,
  SourceHealth,
} from "./domain";

export const portfolioCheckedAt = "2026-07-24T01:10:00.000Z";

export const portfolioProfile: ResumeProfile = {
  fileName: "林澈-商业化产品经理-虚拟简历.pdf",
  rawText: [
    "林澈，1998 年生，信息管理硕士，3 年 C 端会员与商业化产品经验。",
    "当前公司：拾光生活。",
    "负责会员首购、连续包月、权益体系和生命周期增长。",
    "通过价格展示、权益排序和支付路径实验，使首购转化率提升 18%，续费率提升 9 个百分点。",
    "最近一年负责 AI 权益推荐助手和 AI 运营 Copilot。",
    "AI 权益助手首批实验使权益激活率提升 16%，人工咨询量下降 12%。",
    "跨运营、数据、算法、研发和客服推动产品灰度上线。",
  ].join("\n"),
  currentCompany: "拾光生活",
  competencies: [
    {
      id: "membership",
      title: "会员与订阅商业化",
      evidence: "会员首购、续费、权益体系和连续包月优化",
      selected: true,
    },
    {
      id: "experimentation",
      title: "数据实验与增长诊断",
      evidence: "价格展示、权益排序、支付路径和分层触达实验",
      selected: true,
    },
    {
      id: "zero-to-one",
      title: "0→1 产品落地",
      evidence: "AI 权益推荐助手从问题发现、方案设计到灰度上线",
      selected: true,
    },
    {
      id: "ai-productization",
      title: "AI 能力产品化",
      evidence: "意图分类、推荐策略、质量指标与运营 Copilot",
      selected: true,
    },
  ],
  extraStrength: "能够把会员商业目标拆成用户路径、实验指标和跨团队交付计划",
};

export const portfolioPreferences: Preferences = {
  inputMode: "choices",
  description: "",
  role: "增长与商业化产品",
  customRole: "",
  industryMode: "adjacent",
  cities: ["上海", "杭州"],
  customCity: "",
  pace: "fast",
  currentCompany: "拾光生活",
  noCurrentCompany: false,
  watchedCompanies: ["云帆视频", "启明智伴", "澄海支付"],
  industryPacks: ["internet-ai", "finance"],
};

function demoJob(
  id: string,
  title: string,
  company: string,
  business: string,
  location: string,
  requirements: string,
  salary: string,
): JobRecord {
  return {
    id,
    title,
    company,
    business,
    location,
    description: `${company} 的虚拟演示岗位，负责${business}。`,
    requirements,
    sourceMode: "public_html",
    sourceLabel: "虚拟官网职位页（作品集演示数据）",
    sourceUrl: `https://example.com/demo-jobs/${id}`,
    postedAt: "2026-07-23",
    liveStatus: "apply_visible",
    salary,
    fixture: true,
  };
}

const jobs = {
  yunfan: demoJob(
    "portfolio-yunfan-membership",
    "高级产品经理·会员增长",
    "云帆视频",
    "视频会员首购、续费与权益体系",
    "上海",
    "3 年以上 C 端增长或会员经验；独立负责转化和续费指标；熟悉 A/B 实验。",
    "35K–48K · 16 薪",
  ),
  guangnian: demoJob(
    "portfolio-guangnian-ai-commercial",
    "AI 商业化产品经理",
    "光年 AI",
    "AI 助手订阅、定价与付费转化",
    "杭州",
    "商业化产品经验；理解模型能力边界；能够设计订阅、用量和增值服务。",
    "38K–50K · 15 薪",
  ),
  qimu: demoJob(
    "portfolio-qimu-membership",
    "会员与权益产品经理",
    "栖木电商",
    "电商会员、权益供给和联合营销",
    "上海",
    "会员产品、用户分层、权益设计和跨团队项目推进经验。",
    "32K–42K · 16 薪",
  ),
  xinghe: demoJob(
    "portfolio-xinghe-growth",
    "用户增长产品经理",
    "星河出行",
    "出行用户激活、复购与生命周期增长",
    "杭州",
    "熟悉增长漏斗、实验体系和用户分层；有交易产品经验优先。",
    "33K–45K · 15 薪",
  ),
  chenghai: demoJob(
    "portfolio-chenghai-lifecycle",
    "生命周期增长产品经理",
    "澄海支付",
    "支付用户激活、留存和高价值用户运营",
    "上海",
    "增长实验、生命周期运营与付费转化经验；金融经验优先但非硬门槛。",
    "36K–46K · 16 薪",
  ),
  yiyu: demoJob(
    "portfolio-yiyu-subscription",
    "订阅产品经理",
    "一隅内容",
    "内容订阅、定价和用户留存",
    "上海",
    "订阅、定价、权益或内容增长经验；数据敏感并能独立推进实验。",
    "34K–44K · 15 薪",
  ),
  qiming: demoJob(
    "portfolio-qiming-ai-membership",
    "AI 会员产品经理",
    "启明智伴",
    "AI 学习助手的订阅、会员权益和续费体系",
    "上海",
    "会员商业化和 AI 应用产品经验；理解质量、延迟、成本与安全护栏。",
    "38K–50K · 15 薪",
  ),
  shanhai: demoJob(
    "portfolio-shanhai-commercial",
    "会员商业化产品经理",
    "山海健康",
    "健康会员、服务权益与续费增长",
    "杭州",
    "会员商业化、服务履约和用户生命周期经验；健康行业经验优先。",
    "35K–45K · 16 薪",
  ),
  beichen: demoJob(
    "portfolio-beichen-strategy",
    "会员策略产品经理",
    "北辰零售",
    "零售会员策略和全渠道权益",
    "上海",
    "会员策略、收入模型和大型项目 ownership。",
    "37K–48K · 15 薪",
  ),
  feiniao: demoJob(
    "portfolio-feiniao-commercial",
    "商业化产品经理",
    "飞鸟社区",
    "社区增值服务与会员付费",
    "上海",
    "社区商业化、付费转化和内容生态经验。",
    "26K–32K · 14 薪",
  ),
};

export const portfolioCandidates: Candidate[] = [
  {
    job: jobs.yunfan,
    status: "recommended",
    label: "91% · 直接匹配",
    matchReasons: [
      "会员首购、续费和权益体系经验与 JD 直接重合",
      "已有完整实验设计和量化结果",
      "AI 权益推荐可作为个性化增长的补充证据",
    ],
    risks: ["JD 希望候选人承担更大规模的会员收入目标"],
    unknowns: ["会员收入规模", "团队配置", "最终薪资范围"],
  },
  {
    job: jobs.qiming,
    status: "needs_evidence",
    label: "86% · 补 1 项事实",
    matchReasons: [
      "同时需要会员商业化和 AI 应用经验",
      "权益推荐助手可直接映射到 AI 会员顾问",
      "具备从意图识别到灰度实验的完整产品链路",
    ],
    risks: ["缺少模型评测、延迟和推理成本的直接 ownership"],
    unknowns: ["模型团队分工", "质量评测口径", "成本目标"],
    gateQuestion: "你是否参与过 AI 项目的质量评测、成本判断或异常案例处理？",
    gateType: "ai_evaluation",
  },
  {
    job: jobs.chenghai,
    status: "recommended",
    label: "82% · 跨行业机会",
    matchReasons: [
      "会员生命周期经验可迁移到金融产品激活与留存",
      "擅长分层触达、转化漏斗和连续付费",
      "数据实验与跨团队推进证据完整",
    ],
    risks: ["没有支付、信贷或金融合规经验"],
    unknowns: ["金融经验是否为硬门槛", "汇报线", "薪资上限"],
  },
];

const allJobs = Object.values(jobs);

export const portfolioJobPostings: Record<string, JobPostingRecord> =
  Object.fromEntries(
    allJobs.map((job) => [
      job.id,
      {
        job,
        firstSeenAt: "2026-07-18T02:00:00.000Z",
        lastVerifiedAt: portfolioCheckedAt,
        status: "live",
      },
    ]),
  );

function application(
  job: JobRecord,
  status: ApplicationRecord["status"],
  nextStage: string,
  updatedAt: string,
): ApplicationRecord {
  return {
    id: `portfolio-application-${job.id}`,
    jobId: job.id,
    status,
    resumeVersionId: "portfolio-resume-base",
    createdAt: "2026-07-18T02:00:00.000Z",
    updatedAt,
    nextStage,
  };
}

const qimingPrep: InterviewPrepMaterial = {
  title: "启明智伴｜AI 会员产品经理｜业务面准备",
  generatedAt: "2026-07-24T01:00:00.000Z",
  sourceNote: "基于虚拟 JD 与林澈虚拟简历生成；所有公司、岗位和业务数据均为作品集演示数据。",
  summary: [
    "主线定位：能把会员商业目标拆成 AI 产品路径、实验指标和落地计划。",
    "第一故事讲会员首购与续费，第二故事讲 AI 权益推荐助手。",
    "主动说明模型训练和完整成本体系不是直接 ownership，并展示补足方法。",
  ],
  priorityQuestions: [
    {
      question: "讲一个你负责会员商业化并取得结果的项目。",
      answerGuide: "用首购路径改版：用户问题 → 三个实验假设 → 灰度结果 → 对续费的后续影响。",
    },
    {
      question: "为什么从传统会员产品转向 AI 会员产品？",
      answerGuide: "说明 AI 如何改变权益交付和个性化，不要只回答“AI 是趋势”。",
    },
    {
      question: "你会如何衡量 AI 会员助手是否有效？",
      answerGuide: "覆盖激活、有效回答、权益使用、续费、人工兜底率与单次服务成本。",
    },
    {
      question: "为什么不用规则推荐？",
      answerGuide: "先区分稳定规则场景与长尾表达场景，再讨论模型带来的增量价值和成本。",
    },
    {
      question: "如何平衡用户价值、收入和模型成本？",
      answerGuide: "先验证高价值场景，再按用户价值分层决定调用频次、模型等级和付费权益。",
    },
  ],
  storyMap: [
    {
      theme: "会员商业化",
      story: "会员首购与连续包月优化",
      proof: "首购转化率 +18%，续费率 +9pp。",
    },
    {
      theme: "用户价值",
      story: "会员成长与权益体系",
      proof: "权益使用率 +21%。",
    },
    {
      theme: "AI 产品化",
      story: "AI 权益推荐助手",
      proof: "权益激活率 +16%，人工咨询量 -12%。",
    },
    {
      theme: "效率提升",
      story: "AI 运营 Copilot",
      proof: "活动配置周期从约 2 天缩短至 4 小时。",
    },
  ],
  largestGap: "没有独立负责模型训练、推理成本和完整模型评测体系。",
  gapResponse:
    "明确目前的协作边界，同时展示如何与算法和工程团队共同建立质量、延迟、成本和风险护栏。",
  interviewerQuestions: [
    "这个岗位未来 6 个月最重要的会员或收入目标是什么？",
    "AI 助手当前最大的瓶颈是质量、延迟、成本还是使用频次？",
    "产品经理在模型评测、定价和会员策略中分别承担多大 ownership？",
    "目前团队如何判断规则、推荐模型和 LLM 的适用边界？",
  ],
};


// 演示面试时间相对"现在"生成，保证 demo 永远有即将到来的面试（修复种子日期过期后提醒区消失）
function upcomingAt(daysFromNow: number, utcHour: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.toISOString();
}

function chinaDayLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

const qimingInterviewAt = upcomingAt(3, 6);   // 北京时间 14:00
const shanhaiInterviewAt = upcomingAt(6, 8);  // 北京时间 16:00

export const portfolioApplications: Record<string, ApplicationRecord> = {
  [jobs.yunfan.id]: application(
    jobs.yunfan,
    "saved",
    "Review 岗位版简历后投递",
    "2026-07-24T00:20:00.000Z",
  ),
  [jobs.guangnian.id]: application(
    jobs.guangnian,
    "saved",
    "补充 AI 评测经历后再判断",
    "2026-07-23T09:30:00.000Z",
  ),
  [jobs.qimu.id]: application(
    jobs.qimu,
    "applied",
    "等待反馈，7 月 25 日复核",
    "2026-07-21T03:00:00.000Z",
  ),
  [jobs.xinghe.id]: application(
    jobs.xinghe,
    "applied",
    "等待招聘团队处理",
    "2026-07-20T06:30:00.000Z",
  ),
  [jobs.chenghai.id]: application(
    jobs.chenghai,
    "screening",
    "7 月 26 日 11:00 HR 沟通",
    "2026-07-23T06:30:00.000Z",
  ),
  [jobs.yiyu.id]: application(
    jobs.yiyu,
    "screening",
    "简历已通过，等待业务确认",
    "2026-07-22T07:40:00.000Z",
  ),
  [jobs.qiming.id]: {
    ...application(
      jobs.qiming,
      "business_interview",
      `${chinaDayLabel(qimingInterviewAt)} 14:00 第一轮业务面`,
      "2026-07-24T01:00:00.000Z",
    ),
    scheduledAt: qimingInterviewAt,
    interviewPrep: qimingPrep,
  },
  [jobs.shanhai.id]: {
    ...application(
      jobs.shanhai,
      "business_interview",
      `${chinaDayLabel(shanhaiInterviewAt)} 16:00 交叉面`,
      "2026-07-23T08:10:00.000Z",
    ),
    scheduledAt: shanhaiInterviewAt,
  },
  [jobs.beichen.id]: {
    ...application(
      jobs.beichen,
      "rejected",
      "一面后未通过，流程结束",
      "2026-07-22T03:30:00.000Z",
    ),
    interviewNotes:
      "商业化项目指标回答清楚。面试官追问收入模型和项目 scope 时不够具体。过多讲执行过程，没有先说明自己承担的决策责任。",
    interviewSummary:
      "强项是会员实验和量化结果；下一轮需要先讲清 ownership、收入模型和关键取舍，再补充执行细节。",
  },
  [jobs.feiniao.id]: {
    ...application(
      jobs.feiniao,
      "rejected",
      "薪资低于底线，主动结束",
      "2026-07-19T02:20:00.000Z",
    ),
    interviewSummary: "岗位方向相关，但薪资上限明显低于求职底线，停止投入准备时间。",
  },
};

export const portfolioResumeVersions: ResumeVersion[] = [
  {
    id: "portfolio-resume-base",
    fileName: portfolioProfile.fileName,
    fileType: "pdf",
    createdAt: "2026-07-24T00:00:00.000Z",
    textLength: portfolioProfile.rawText.length,
    pageCount: 1,
    warnings: [],
    competencyIds: portfolioProfile.competencies.map((item) => item.id),
  },
  {
    id: "portfolio-resume-membership",
    fileName: "林澈-云帆视频-会员增长岗位版.pdf",
    fileType: "pdf",
    createdAt: "2026-07-23T09:00:00.000Z",
    textLength: 2318,
    pageCount: 1,
    warnings: [],
    competencyIds: ["membership", "experimentation", "zero-to-one"],
  },
  {
    id: "portfolio-resume-ai",
    fileName: "林澈-启明智伴-AI会员岗位版.pdf",
    fileType: "pdf",
    createdAt: "2026-07-23T07:00:00.000Z",
    textLength: 2386,
    pageCount: 1,
    warnings: [],
    competencyIds: ["membership", "ai-productization", "experimentation"],
  },
];

export const portfolioEvents: ApplicationEvent[] = [
  {
    id: "portfolio-event-qiming",
    jobId: jobs.qiming.id,
    type: "stage_changed",
    createdAt: "2026-07-24T01:00:00.000Z",
    summary: "启明智伴第一轮业务面已排期，面试准备材料已生成",
  },
  {
    id: "portfolio-event-yunfan",
    jobId: jobs.yunfan.id,
    type: "created",
    createdAt: "2026-07-24T00:20:00.000Z",
    summary: "云帆视频进入今日 Top List，等待 Review 岗位版简历",
  },
  {
    id: "portfolio-event-chenghai",
    jobId: jobs.chenghai.id,
    type: "stage_changed",
    createdAt: "2026-07-23T06:30:00.000Z",
    summary: "澄海支付进入 HR 筛选，已确认沟通时间",
  },
  {
    id: "portfolio-event-beichen",
    jobId: jobs.beichen.id,
    type: "status_changed",
    createdAt: "2026-07-22T03:30:00.000Z",
    summary: "北辰零售流程结束，复盘已归档",
  },
];

export const portfolioSourceHealth: SourceHealth[] = [
  {
    id: "portfolio-public",
    label: "虚拟公司官网岗位源",
    mode: "public_html",
    status: "healthy",
    lastCheckedAt: portfolioCheckedAt,
    detail: "作品集演示固定数据，不访问真实公司或账号。",
  },
  {
    id: "portfolio-login-intel",
    label: "登录情报演示",
    mode: "discovery_only",
    status: "login_required",
    lastCheckedAt: portfolioCheckedAt,
    detail: "仅演示团队、职级和招聘热度的补充位置。",
  },
];

export const portfolioDailyJob: DailyJobSettings = {
  enabled: true,
  localTime: "09:00",
  lastRunAt: portfolioCheckedAt,
  nextRunAt: "2026-07-25T01:00:00.000Z",
  due: false,
};

export const portfolioDailyRuns: DailyRun[] = [
  {
    id: "portfolio-run-20260724",
    startedAt: "2026-07-24T01:09:00.000Z",
    finishedAt: portfolioCheckedAt,
    resultCount: 18,
    recommendedCount: 3,
    degradedSourceIds: [],
  },
];

export const portfolioBrowserSource: BrowserSourceSession = {
  sourceId: "maimai",
  status: "not_connected",
  confirmedAt: null,
  taskPreparedAt: null,
};

export const portfolioSourceNote =
  "作品集演示数据：18 个虚拟岗位完成核验，3 个进入今日 Top List，已排除当前公司拾光生活。";
