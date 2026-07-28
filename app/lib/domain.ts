export type StepId =
  | "home"
  | "resume"
  | "strengths"
  | "preferences"
  | "weights"
  | "sources"
  | "results"
  | "detail"
  | "board"
  | "automation";

export type SourceMode =
  | "public_api"
  | "public_html"
  | "user_browser"
  | "announcement"
  | "discovery_only";

export type CandidateStatus = "recommended" | "needs_evidence" | "rejected";

export interface Competency {
  id: string;
  title: string;
  evidence: string;
  selected: boolean;
}

export interface ResumeProfile {
  fileName: string;
  rawText: string;
  competencies: Competency[];
  extraStrength: string;
  currentCompany?: string;
  agentOwnershipYears?: number;
  financeDomainConfirmed?: boolean;
  aiEvaluationConfirmed?: boolean;
}

export interface RoleOption {
  id: string;
  label: string;
  reason: string;
  recommended: boolean;
}

export interface Preferences {
  inputMode: "describe" | "choices" | null;
  description: string;
  role: string;
  customRole: string;
  industryMode: "familiar" | "adjacent" | "broad";
  cities: string[];
  customCity: string;
  pace: "steady" | "fast" | "explore";
  currentCompany: string;
  noCurrentCompany: boolean;
  watchedCompanies: string[];
  industryPacks: IndustryPackId[];
}

export type IndustryPackId = "internet-ai" | "automotive" | "finance" | "consulting";

export type WeightPreset = "balanced" | "cash" | "leap" | "steady";

export interface JobRecord {
  id: string;
  title: string;
  company: string;
  companyOverview?: string;
  productUrl?: string;
  business: string;
  location: string | null;
  description: string;
  requirements: string;
  sourceMode: SourceMode;
  sourceLabel: string;
  sourceUrl: string;
  postedAt: string | null;
  liveStatus: "jd_verified" | "apply_visible" | "discovered";
  salary: string | null;
  fixture?: boolean;
}

export interface Candidate {
  job: JobRecord;
  status: CandidateStatus;
  label: string;
  matchReasons: string[];
  risks: string[];
  unknowns: string[];
  gateQuestion?: string;
  gateType?: "agent_years" | "finance_domain" | "ai_evaluation";
}

export interface InterviewPrepMaterial {
  title: string;
  generatedAt: string;
  sourceNote: string;
  summary: string[];
  priorityQuestions: Array<{
    question: string;
    answerGuide: string;
  }>;
  storyMap: Array<{
    theme: string;
    story: string;
    proof: string;
  }>;
  largestGap: string;
  gapResponse: string;
  interviewerQuestions: string[];
  productExperiencePlan?: Array<{
    step: string;
    action: string;
    evidence: string;
  }>;
  caseFramework?: string[];
  finalChecklist?: string[];
  jdMatches?: Array<{
    jdItem: string;
    fit: "direct" | "adjacent" | "gap" | "unknown";
    evidence: string;
    interviewAngle: string;
  }>;
  strategy?: {
    positioning: string;
    roundFocus: string[];
    mustProve: string[];
    avoidClaims: string[];
  };
  questionBank?: Array<{
    category: string;
    questions: Array<{
      question: string;
      answerGuide: string;
    }>;
  }>;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  status:
    | "saved"
    | "opened"
    | "applied"
    | "screening"
    | "business_interview"
    | "rejected";
  resumeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  nextStage: string;
  scheduledAt?: string;
  interviewNotes?: string;
  interviewSummary?: string;
  interviewPrep?: InterviewPrepMaterial;
}

export interface ResumeVersion {
  id: string;
  fileName: string;
  fileType: "text" | "pdf" | "docx" | "sample";
  createdAt: string;
  textLength: number;
  pageCount: number | null;
  warnings: string[];
  competencyIds: string[];
}

export interface JobPostingRecord {
  job: JobRecord;
  firstSeenAt: string;
  lastVerifiedAt: string;
  status: "live" | "pending_recheck" | "closed";
}

export interface ApplicationEvent {
  id: string;
  jobId: string;
  type: "created" | "opened" | "status_changed" | "stage_changed" | "resume_linked";
  createdAt: string;
  summary: string;
}

export interface SourceHealth {
  id: string;
  label: string;
  mode: SourceMode;
  status: "healthy" | "degraded" | "login_required" | "blocked";
  lastCheckedAt: string;
  detail: string;
}

export interface DailyJobSettings {
  enabled: boolean;
  localTime: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  due: boolean;
}

export function chinaCalendarDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    chinaTime.getUTCFullYear(),
    pad(chinaTime.getUTCMonth() + 1),
    pad(chinaTime.getUTCDate()),
  ].join("-");
}

export interface DailyRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  resultCount: number;
  recommendedCount: number;
  degradedSourceIds: string[];
}

export interface BrowserSourceSession {
  sourceId: "maimai";
  status: "not_connected" | "user_confirmed" | "ready_for_skill";
  confirmedAt: string | null;
  taskPreparedAt: string | null;
}

export const industryPacks: Array<{
  id: IndustryPackId;
  label: string;
  description: string;
  sources: string[];
  coverage: string;
}> = [
  {
    id: "internet-ai",
    label: "互联网与 AI",
    description: "增长、商业化、平台、AI 应用与 Agent 产品",
    sources: ["云帆视频", "启明智伴"],
    coverage: "固定虚拟岗位源，仅用于公开演示",
  },
  {
    id: "automotive",
    label: "汽车与智能出行",
    description: "数字产品、智能座舱、电池服务与汽车软件",
    sources: ["星河出行"],
    coverage: "固定虚拟岗位源，仅用于公开演示",
  },
  {
    id: "finance",
    label: "金融与 Fintech",
    description: "金融产品、支付、风控、财富与机构业务",
    sources: ["澄海支付"],
    coverage: "固定虚拟岗位源，仅用于公开演示",
  },
  {
    id: "consulting",
    label: "咨询与数字化转型",
    description: "战略、管理咨询、增长与企业数字化转型",
    sources: ["山海健康", "北辰零售"],
    coverage: "固定虚拟岗位源，仅用于公开演示",
  },
];

export const sampleResumeText = `
林澈，1998 年生，信息管理硕士，3 年 C 端会员与商业化产品经验。
当前公司：拾光生活。
负责会员首购、连续包月、权益体系和生命周期增长。
通过价格展示、权益排序和支付路径实验，使首购转化率提升 18%，续费率提升 9 个百分点。
最近一年负责 AI 权益推荐助手和 AI 运营 Copilot。
AI 权益助手首批实验使权益激活率提升 16%，人工咨询量下降 12%。
跨运营、数据、算法、研发和客服推动产品灰度上线。
`;

const competencyRules: Array<{
  id: string;
  title: string;
  evidence: string;
  pattern: RegExp;
}> = [
  {
    id: "growth",
    title: "C 端增长与商业化",
    evidence: "发现订阅、留存、转化、商业化或收入相关经历",
    pattern: /增长|转化|留存|订阅|会员|商业化|收入|growth|conversion|retention|subscription/i,
  },
  {
    id: "zero-to-one",
    title: "0→1 产品能力",
    evidence: "发现从 0 到 1、MVP、上线或新产品验证经历",
    pattern: /0.?1|从零到一|从 0 到 1|mvp|launch|上线|新产品/i,
  },
  {
    id: "ai",
    title: "AI 产品化",
    evidence: "发现 AI、Agent、LLM、模型或意图识别相关经历",
    pattern: /\bai\b|agent|llm|模型|智能体|意图识别|machine learning/i,
  },
  {
    id: "data",
    title: "数据驱动与实验",
    evidence: "发现 A/B、实验、指标或数据分析相关经历",
    pattern: /a\/b|实验|指标|数据分析|analytics|experiment|metric/i,
  },
  {
    id: "cross-functional",
    title: "复杂跨团队推进",
    evidence: "发现跨团队、全球协作或多职能项目经历",
    pattern: /跨团队|跨部门|全球|协作|stakeholder|cross.?functional|global|团队/i,
  },
];

export function inferCurrentCompany(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const explicitPatterns = [
    /(?:当前公司|现任公司|目前就职(?:于)?|现就职于)\s*[：:]\s*([^\n，,；;|｜]{2,50})/i,
    /(?:current company|present employer|currently at)\s*[：:]?\s*([^\n,;|]{2,50})/i,
  ];

  for (const line of lines) {
    for (const pattern of explicitPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) return match[1].trim().replace(/[。.]+$/, "");
    }
  }

  const rolePattern = /产品|经理|总监|负责人|主管|工程师|设计师|运营|consultant|manager|director|lead|head|engineer|designer|specialist/i;
  const presentPattern = /至今|现在|present|current/i;
  for (const line of lines) {
    if (!presentPattern.test(line)) continue;
    const parts = line.split(/[|｜\t·•]/).map((part) => part.trim()).filter(Boolean);
    const companyPart = parts.find((part) =>
      !presentPattern.test(part) &&
      !rolePattern.test(part) &&
      !/(?:19|20)\d{2}[./-]?\d{0,2}/.test(part) &&
      part.length >= 2 &&
      part.length <= 50
    );
    if (companyPart) return companyPart;

    const prefix = line.match(/^(.{2,50}?)\s+(?:19|20)\d{2}[./-]?\d{0,2}\s*(?:-|–|—|至)/);
    if (prefix?.[1] && !rolePattern.test(prefix[1])) return prefix[1].trim();
  }

  return "";
}

function normalizedCompanyName(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/股份有限公司|有限责任公司|有限公司|科技公司|公司|控股|集团|holdings?|company|corporation|corp\.?|inc\.?|limited|ltd\.?|group/gi, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

const companyAliasGroups = [
  ["拾光生活", "shiguang-life"],
  ["云帆视频", "yunfan-video"],
  ["启明智伴", "qiming-ai"],
  ["澄海支付", "chenghai-pay"],
];

export function isSameCompany(left: string, right: string) {
  const a = normalizedCompanyName(left);
  const b = normalizedCompanyName(right);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  return companyAliasGroups.some((group) => {
    const aliases = group.map(normalizedCompanyName);
    return aliases.some((alias) => a.includes(alias)) && aliases.some((alias) => b.includes(alias));
  });
}

export function excludeCurrentCompany(jobs: JobRecord[], currentCompany: string) {
  if (!currentCompany.trim()) return { jobs, excludedCount: 0 };
  const filtered = jobs.filter((job) => !isSameCompany(job.company, currentCompany));
  return { jobs: filtered, excludedCount: jobs.length - filtered.length };
}

export function analyzeResume(fileName: string, rawText: string): ResumeProfile {
  const matched = competencyRules.filter((rule) => rule.pattern.test(rawText));
  const fallback = matched.length
    ? matched
    : [
        {
          id: "product-delivery",
          title: "产品规划与交付",
          evidence: "简历包含产品相关经历，但需要用户进一步确认重点成果",
          pattern: /./,
        },
      ];

  return {
    fileName,
    rawText,
    competencies: fallback.slice(0, 5).map(({ id, title, evidence }) => ({
      id,
      title,
      evidence,
      selected: true,
    })),
    extraStrength: "",
    currentCompany: inferCurrentCompany(rawText) || undefined,
  };
}

export function deriveRoleOptions(profile: ResumeProfile | null): RoleOption[] {
  const ids = new Set(
    profile?.competencies.filter((item) => item.selected).map((item) => item.id) ?? [],
  );
  const options: RoleOption[] = [];

  if (ids.has("growth") || ids.has("zero-to-one") || ids.has("membership")) {
    options.push({
      id: "product-growth",
      label: ids.has("membership") ? "增长与商业化产品" : "产品与增长",
      reason: ids.has("membership")
        ? "简历中有会员、订阅、增长和商业化结果"
        : "简历中有 C 端、0→1、增长或商业化证据",
      recommended: true,
    });
  }
  if (ids.has("ai") || ids.has("ai-productization")) {
    options.push({
      id: "ai-product",
      label: ids.has("ai-productization") ? "AI 应用产品" : "AI 产品",
      reason: "简历中有 Agent、模型应用或 AI 产品化证据",
      recommended: options.length === 0,
    });
  }
  if (ids.has("cross-functional") || ids.has("data") || ids.has("experimentation")) {
    options.push({
      id: "platform-commercial",
      label: "平台 / 商业化产品",
      reason: "简历中有数据决策和复杂跨团队推进证据",
      recommended: options.length === 0,
    });
  }

  if (!options.length) {
    options.push({
      id: "product",
      label: "产品管理",
      reason: "当前证据只能支持较宽的产品方向，建议继续补充事实",
      recommended: true,
    });
  }

  return options.slice(0, 3);
}

export const fixtureJobs: JobRecord[] = [
  {
    id: "demo-membership-growth",
    title: "高级产品经理·会员增长",
    company: "云帆视频",
    business: "视频会员首购、续费与权益体系",
    location: "上海",
    description:
      "负责会员首购、续费、权益体系与生命周期实验。",
    requirements:
      "3 年以上 C 端增长或会员经验；熟悉 A/B 实验。",
    sourceMode: "public_html",
    sourceLabel: "虚拟官网职位页",
    sourceUrl: "https://example.com/demo-jobs/membership-growth",
    postedAt: "2026-07-23",
    liveStatus: "apply_visible",
    salary: "35K–48K · 16 薪",
    fixture: true,
  },
  {
    id: "demo-ai-membership",
    title: "AI 会员产品经理",
    company: "启明智伴",
    business: "AI 学习助手的订阅、会员权益和续费体系",
    location: "上海",
    description:
      "负责 AI 学习助手的会员权益、定价和续费体系。",
    requirements:
      "会员商业化和 AI 应用产品经验；理解质量、延迟与成本护栏。",
    sourceMode: "public_html",
    sourceLabel: "虚拟官网职位页",
    sourceUrl: "https://example.com/demo-jobs/ai-membership",
    postedAt: "2026-07-23",
    liveStatus: "apply_visible",
    salary: "38K–50K · 15 薪",
    fixture: true,
  },
];

export function evaluateJob(job: JobRecord, profile: ResumeProfile): Candidate {
  const selectedIds = new Set(
    profile.competencies.filter((item) => item.selected).map((item) => item.id),
  );
  const text = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
  const hardAutomotive = /oe\/oes|aspice|iatf|scada|ems|电力系统|汽车零部件/.test(text);
  const needsAgentYears = /2 年以上 agent|2\+.*agent|2 years.*agent/.test(text);
  const needsFinanceDomain = /custody|托管|证券|investment banking|银行产品|金融服务/.test(text);
  const hasFinanceEvidence = Boolean(profile.financeDomainConfirmed || /金融|支付|银行|证券|托管|fintech|banking|custody/i.test(profile.rawText));

  if (hardAutomotive) {
    return {
      job,
      status: "rejected",
      label: "硬门槛不满足",
      matchReasons: [],
      risks: ["岗位要求汽车零部件、电力或工程体系的直接经验"],
      unknowns: [],
    };
  }

  const reasons: string[] = [];
  if (selectedIds.has("growth") && /增长|商业化|活跃|tob|toc|conversion/.test(text)) {
    reasons.push("增长与商业化能力可以直接迁移");
  }
  if (selectedIds.has("zero-to-one") && /0→1|0.?1|规划|建设/.test(text)) {
    reasons.push("0→1 产品经历与职责对应");
  }
  if (selectedIds.has("ai") && /agent|llm|\bai\b|智能体|模型/.test(text)) {
    reasons.push("AI/Agent 产品化经验与业务方向对应");
  }
  if (selectedIds.has("data") && /a\/b|数据|评测|指标/.test(text)) {
    reasons.push("数据实验与评测能力有直接证据");
  }

  if (needsAgentYears && (profile.agentOwnershipYears ?? 0) < 2) {
    return {
      job,
      status: "needs_evidence",
      label: "待补 1 项事实",
      matchReasons: reasons.length ? reasons : ["AI 产品方向高度相关"],
      risks: ["简历无法确认 2 年以上正式 Agent ownership"],
      unknowns: ["项目、正式职责和起止时间"],
      gateQuestion: "你是否有 2 年以上 Agent/LLM 应用产品正式 ownership？",
      gateType: "agent_years",
    };
  }

  if (needsFinanceDomain && !hasFinanceEvidence) {
    return {
      job,
      status: "needs_evidence",
      label: "待补金融领域事实",
      matchReasons: reasons.length ? reasons : ["通用产品能力与岗位职责相关"],
      risks: ["JD 涉及托管或金融服务领域，简历尚无直接证据"],
      unknowns: ["金融产品、支付、风控、托管或合规项目事实"],
      gateQuestion: "你是否有金融、支付、风控、托管或强合规产品的正式项目经验？",
      gateType: "finance_domain",
    };
  }

  return {
    job,
    status: reasons.length ? "recommended" : "rejected",
    label: reasons.length >= 2 ? "强相邻迁移" : reasons.length ? "值得评估" : "相关证据不足",
    matchReasons: reasons,
    risks: [],
    unknowns: [
      ...(job.location ? [] : ["工作地点"]),
      ...(job.salary ? [] : ["薪资"]),
      "职级与汇报线",
    ],
  };
}

export const weightPresets: Record<
  WeightPreset,
  { label: string; fit: number; cash: number; leap: number; steady: number }
> = {
  balanced: { label: "均衡", fit: 35, cash: 20, leap: 25, steady: 20 },
  cash: { label: "现金优先", fit: 25, cash: 40, leap: 20, steady: 15 },
  leap: { label: "跳板优先", fit: 25, cash: 15, leap: 45, steady: 15 },
  steady: { label: "求稳", fit: 30, cash: 15, leap: 15, steady: 40 },
};
