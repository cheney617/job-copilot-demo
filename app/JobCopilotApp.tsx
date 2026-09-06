"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  analyzeResume,
  chinaCalendarDateKey,
  deriveRoleOptions,
  evaluateJob,
  isSameCompany,
  sampleResumeText,
  weightPresets,
  type ApplicationRecord,
  type ApplicationEvent,
  type BrowserSourceSession,
  type Candidate,
  type DailyJobSettings,
  type DailyRun,
  type IndustryPackId,
  type InterviewPrepMaterial,
  type JobPostingRecord,
  type JobRecord,
  type Preferences,
  type ResumeProfile,
  type ResumeVersion,
  type SourceHealth,
  type StepId,
  type WeightPreset,
} from "./lib/domain";
import { parseResumeFile, type ParsedResumeFile } from "./lib/resume-parser";
import { loadWorkspaceFile } from "./lib/workspace-loader";
import {
  workspaceApplications,
  workspaceBrowserSource,
  workspaceCandidates,
  workspaceDailyJob,
  workspaceDailyRuns,
  workspaceEvents,
  workspaceJobPostings,
  workspacePreferences,
  workspaceProfile,
  workspaceResumeVersions,
  workspaceSourceHealth,
  workspaceSourceNote,
} from "./lib/workspace-seed";
import {
  portfolioApplications,
  portfolioBrowserSource,
  portfolioCandidates,
  portfolioCheckedAt,
  portfolioDailyJob,
  portfolioDailyRuns,
  portfolioEvents,
  portfolioJobPostings,
  portfolioPreferences,
  portfolioProfile,
  portfolioResumeVersions,
  portfolioSourceHealth,
  portfolioSourceNote,
} from "./lib/portfolio-seed";

const onboardingSteps: Array<{ id: StepId; label: string }> = [
  { id: "resume", label: "导入简历" },
  { id: "strengths", label: "核心竞争力" },
  { id: "preferences", label: "求职诉求" },
  { id: "weights", label: "排序权重" },
  { id: "sources", label: "行业与来源" },
];

const appNavItems: Array<{ id: StepId; label: string; short: string }> = [
  { id: "home", label: "今日总览", short: "总" },
  { id: "results", label: "今日推荐", short: "荐" },
  { id: "board", label: "在行机会", short: "行" },
  { id: "automation", label: "每日刷新", short: "刷" },
];

const portfolioIndustryPacks = [
  {
    id: "internet-ai",
    label: "互联网、AI 与消费",
    description: "会员、订阅、增长、商业化和 AI 应用产品",
    sources: ["云帆视频", "启明智伴", "栖木电商", "一隅内容"],
    coverage: "固定虚拟岗位源，仅用于作品集演示",
  },
  {
    id: "finance",
    label: "金融与 Fintech",
    description: "支付激活、生命周期增长和高价值用户运营",
    sources: ["澄海支付"],
    coverage: "固定虚拟岗位源，仅用于作品集演示",
  },
  {
    id: "consulting",
    label: "其他相邻行业",
    description: "健康、出行与零售会员产品",
    sources: ["山海健康", "星河出行", "北辰零售"],
    coverage: "可选扩搜方向，不为凑数降低硬门槛",
  },
];

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function statusLabel(status: Candidate["status"]) {
  if (status === "recommended") return "推荐";
  if (status === "needs_evidence") return "待确认";
  return "已排除";
}

function applicationStatusLabel(status?: ApplicationRecord["status"]) {
  if (status === "rejected") return "已结束";
  if (status === "business_interview") return "业务面";
  if (status === "screening") return "筛选中";
  if (status === "applied") return "已投递";
  if (status === "opened") return "已打开";
  if (status === "saved") return "待投递";
  return "待投递";
}

function jobFactStatusLabel(job: JobRecord) {
  if (job.liveStatus === "apply_visible") return "Apply 入口可见";
  if (job.liveStatus === "jd_verified") return "JD 已验证";
  return "面试邀约已确认；完整 JD 待补全";
}

function isValidDailyTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function nextDailyRun(localTime: string, from = new Date()) {
  // time input can emit "" (cleared/partial); an invalid value here would
  // produce an Invalid Date and toISOString() would throw.
  const safeTime = isValidDailyTime(localTime) ? localTime : "09:00";
  const [hours, minutes] = safeTime.split(":").map(Number);
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= from.getTime()) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

function toLocalDateTimeInput(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function chinaDateParts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    year: chinaTime.getUTCFullYear(),
    month: pad(chinaTime.getUTCMonth() + 1),
    day: pad(chinaTime.getUTCDate()),
    hour: pad(chinaTime.getUTCHours()),
    minute: pad(chinaTime.getUTCMinutes()),
    second: pad(chinaTime.getUTCSeconds()),
  };
}

function formatChinaDateTime(iso: string) {
  const parts = chinaDateParts(iso);
  return parts
    ? `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
    : "时间待核";
}

function formatChinaDate(iso: string) {
  const parts = chinaDateParts(iso);
  return parts ? `${parts.year}/${parts.month}/${parts.day}` : "日期待核";
}

function formatChinaInterviewTime(iso: string) {
  const parts = chinaDateParts(iso);
  return parts ? `${Number(parts.month)}月${Number(parts.day)}日 ${parts.hour}:${parts.minute}` : "时间待核";
}

function formatChinaDashboardDate(date: Date) {
  const parts = chinaDateParts(date.toISOString());
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "日期待核";
}

function productExperiencePlanForJob(job: JobRecord): NonNullable<InterviewPrepMaterial["productExperiencePlan"]> {
  return [
    { step: "理解产品承诺", action: `从 ${job.company} 官方入口确认目标用户、核心场景和产品承诺。`, evidence: "能用一句话说清用户为什么使用，以及替代方案是什么。" },
    { step: "完成核心路径", action: "亲手走完与岗位最相关的一条主路径，停在付费、提交或高风险动作之前。", evidence: "记录首次价值时刻、关键摩擦和一处做得好的细节。" },
    { step: "检查商业闭环", action: "标出激活、转化、留存、付费或经营指标分别在哪个环节产生。", evidence: "形成一张用户路径与指标对照图。" },
    { step: "准备一个判断", action: "提出一个产品假设，写清用户、问题、方案、指标、护栏和验证方式。", evidence: "面试中明确标成待验证假设，不冒充内部事实。" },
  ];
}

function buildCompleteInterviewPrep(
  candidate: Candidate,
  profile: ResumeProfile,
  existing?: InterviewPrepMaterial,
  generatedAt?: string,
): InterviewPrepMaterial {
  const job = candidate.job;
  const strongestMatch = candidate.matchReasons[0] ?? "通用产品能力可以迁移，但仍需补充直接证据";
  const largestGap = candidate.risks[0] ?? "尚未发现硬缺口；仍需确认团队、指标和职责边界";
  const genericQuestions: InterviewPrepMaterial["priorityQuestions"] = [
    { question: `为什么 ${job.company}，为什么这个岗位？`, answerGuide: `先讲 ${job.business} 的具体吸引力，再连接一段最直接的真实经历；不要只说看好行业。` },
    { question: "你最相关的一段 0→1 经历是什么？", answerGuide: "按问题、目标、关键判断、个人动作、结果与复盘回答，主动讲清贡献边界。" },
    { question: "如果入职后只能先解决一个问题，你会选什么？", answerGuide: "先确认目标与数据，再给优先级、最小验证、指标和停止条件，不直接跳到功能清单。" },
    { question: "你如何设计指标和实验？", answerGuide: "给出北极星、驱动指标与体验/经营护栏；说明分群、对照、观察窗口和上线决策。" },
    { question: "你最大的经验缺口是什么？", answerGuide: `直接承认：${largestGap}。随后说明可迁移能力、补齐路径和不会越界声称的部分。` },
  ];
  const genericStories: InterviewPrepMaterial["storyMap"] = profile.competencies
    .filter((item) => item.selected)
    .slice(0, 4)
    .map((item) => ({
      theme: item.title,
      story: "从简历中选择一段可被连续追问的真实项目",
      proof: item.evidence,
    }));

  return {
    title: existing?.title ?? `${job.company}｜${job.title}｜完整面试准备文档`,
    generatedAt: existing?.generatedAt ?? generatedAt ?? "1970-01-01T00:00:00.000Z",
    sourceNote:
      existing?.sourceNote ??
      `基于 ${job.sourceLabel} 和当前简历事实生成；未确认的团队、数据和内部流程均保留为待核问题。`,
    summary:
      existing?.summary ?? [
        `岗位核心：${job.description}`,
        `最强匹配：${strongestMatch}`,
        `准备原则：用真实项目证明迁移能力，并正面处理“${largestGap}”。`,
      ],
    priorityQuestions: existing?.priorityQuestions ?? genericQuestions,
    storyMap: existing?.storyMap ?? genericStories,
    largestGap: existing?.largestGap ?? largestGap,
    gapResponse:
      existing?.gapResponse ??
      "先明确承认直接经验边界，再拆出可迁移的方法、需要补齐的领域知识、入职前 30 天验证顺序和需要合作的专业角色。",
    interviewerQuestions:
      existing?.interviewerQuestions ?? [
        "未来 6 个月最希望这个岗位解决的唯一业务问题和核心指标是什么？",
        "当前最大的产品瓶颈和已验证事实分别是什么？",
        "这个岗位对 roadmap、实验、资源与最终结果分别拥有多大决策权？",
        "团队配置、汇报线和跨职能合作方式是什么？",
        "您会用哪些信号判断这个人入职 90 天表现优秀？",
      ],
    productExperiencePlan:
      existing?.productExperiencePlan ?? productExperiencePlanForJob(job),
    caseFramework:
      existing?.caseFramework ?? [
        "先复述问题并确认目标、用户、范围、时间窗口和约束。",
        "建立用户路径或业务价值链，定位最大损失点，不先跳到功能。",
        "提出 2–3 个假设，按影响、证据、成本和可逆性排序。",
        "选择最小验证，定义北极星、驱动指标、经营与体验护栏。",
        "说明 rollout、跨团队 ownership、失败条件和复盘机制。",
      ],
    finalChecklist:
      existing?.finalChecklist ?? [
        "90 秒自我介绍录音一遍，删掉空泛形容词。",
        "四个核心故事各准备 90 秒与 3 分钟版本。",
        "完成产品体验，带 2 个真实观察、1 个假设和 1 个保留意见。",
        "复习最大 gap 的诚实答法，不把相邻经验包装成直接 ownership。",
        "提前 10 分钟检查设备；面试后立即记录追问、反馈和下一步。",
      ],
    jdMatches:
      existing?.jdMatches ?? [
        {
          jdItem: job.description,
          fit: "unknown",
          evidence: "尚未为这一条职责建立逐项证据映射。",
          interviewAngle: "面试前从简历中选择一个真实项目；没有直接经历时明确说相邻迁移。",
        },
        {
          jdItem: job.requirements,
          fit: "unknown",
          evidence: "岗位要求已记录，但不能仅凭关键词判断为直接匹配。",
          interviewAngle: "逐项确认年限、领域、方法和工具边界，不用泛化能力替代硬事实。",
        },
      ],
    strategy:
      existing?.strategy ?? {
        positioning: `把自己定位为能够将现有产品经验迁移到 ${job.business} 的 senior product owner，不冒充未拥有的领域经验。`,
        roundFocus: ["动机与岗位理解", "一段可深挖的核心项目", "产品判断、指标与实验", "最大领域缺口与补齐路径"],
        mustProve: ["个人关键判断与具体动作", "可核验的业务结果", "跨职能推动和取舍", "能从真实产品体验形成判断"],
        avoidClaims: ["未确认的内部数据", "没有直接 ownership 的领域", "只靠关键词拼出的匹配", "未经亲测就断言产品没有某项能力"],
      },
    questionBank:
      existing?.questionBank ?? [
        {
          category: "动机与岗位匹配",
          questions: [
            { question: `为什么 ${job.company}，而不是其他相似公司？`, answerGuide: "用真实产品判断、当前公司阶段和你的下一阶段 ownership 回答。" },
            { question: "为什么现在看机会？", answerGuide: "讲主动选择的责任边界，不负面评价当前团队。" },
          ],
        },
        {
          category: "项目与领导力深挖",
          questions: [
            { question: "你做过最难的产品决策是什么？", answerGuide: "讲取舍、反对意见、证据和结果，不只讲执行过程。" },
            { question: "你如何推动没有汇报关系的团队？", answerGuide: "说明共同目标、决策机制、冲突处理与落地结果。" },
          ],
        },
        {
          category: "指标、实验与经营",
          questions: [
            { question: "你会如何定义这个岗位的北极星与护栏？", answerGuide: "连接用户价值、业务结果、驱动指标和长期质量。" },
            { question: "实验结果不显著时怎么办？", answerGuide: "检查 power、分群、执行质量、机制信号和停止条件。" },
          ],
        },
        {
          category: "产品判断与 Case",
          questions: [
            { question: "体验产品后，你最想改什么？", answerGuide: "先讲真实观察，再讲假设、优先级、指标和验证，不把观察当根因。" },
            { question: "资源只够做一件事，你怎么选？", answerGuide: "按目标、损失点、证据、影响、成本与可逆性排序。" },
          ],
        },
        {
          category: "失败、冲突与复盘",
          questions: [
            { question: "讲一次你判断错了或项目没有达到预期。", answerGuide: "讲自己负责的判断、信号、纠偏和后来改变的方法。" },
            { question: "你和关键 stakeholder 意见相反时怎么办？", answerGuide: "先对齐目标和决策权，再用最小证据化解观点冲突。" },
          ],
        },
        {
          category: "领域缺口与到岗",
          questions: [
            { question: "你缺少直接领域经验，为什么还能胜任？", answerGuide: "承认边界，拆可迁移能力、30 天补齐路径与专家协作。" },
            { question: "如果入职，前 30 / 60 / 90 天怎么做？", answerGuide: "30 天事实与关系，60 天验证，90 天交付可复用结果；不承诺未经确认的数字。" },
          ],
        },
      ],
  };
}

function summarizeInterviewNotes(notes: string) {
  const facts = notes
    .split(/[。！？\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!facts.length) return "尚无可总结的面试事实。";
  const signals = facts.filter((item) => /追问|认可|反馈|担心|风险|下一步|优势|不足|数据|案例/.test(item));
  return (signals.length ? signals : facts).slice(0, 4).map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function JobCopilotApp() {
  const [demoMode, setDemoMode] = useState<"onboarding" | "workspace" | null>("workspace");
  const [step, setStep] = useState<StepId>("home");
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [profile, setProfile] = useState<ResumeProfile | null>(workspaceProfile);
  const [preferences, setPreferences] = useState<Preferences>(workspacePreferences);
  const [weightPreset, setWeightPreset] = useState<WeightPreset>("balanced");
  const [candidates, setCandidates] = useState<Candidate[]>(workspaceCandidates);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] =
    useState<Record<string, ApplicationRecord>>(workspaceApplications);
  const [resumeVersions, setResumeVersions] =
    useState<ResumeVersion[]>(workspaceResumeVersions);
  const [jobPostings, setJobPostings] =
    useState<Record<string, JobPostingRecord>>(workspaceJobPostings);
  const [events, setEvents] = useState<ApplicationEvent[]>(workspaceEvents);
  const [sourceHealth, setSourceHealth] =
    useState<SourceHealth[]>(workspaceSourceHealth);
  const [dailyJob, setDailyJob] =
    useState<DailyJobSettings>(workspaceDailyJob);
  const [dailyRuns, setDailyRuns] = useState<DailyRun[]>(workspaceDailyRuns);
  const [browserSource, setBrowserSource] =
    useState<BrowserSourceSession>(workspaceBrowserSource);
  const [currentCompanyExclusion, setCurrentCompanyExclusion] = useState({
    company: workspaceProfile.currentCompany ?? "",
    count: 0,
  });
  const [hydrated, setHydrated] = useState(false);
  const [fileState, setFileState] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [fileError, setFileError] = useState("");
  const [parsedFile, setParsedFile] = useState<ParsedResumeFile | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchPhase, setSearchPhase] = useState(0);
  const [searchComplete, setSearchComplete] = useState(true);
  const [resultsRevealed, setResultsRevealed] = useState(true);
  const [searchMode, setSearchMode] = useState<"full" | "rerank">("full");
  const [sourceNote, setSourceNote] = useState(workspaceSourceNote);
  const [companyDraft, setCompanyDraft] = useState("");
  const [gapOpen, setGapOpen] = useState<string | null>(null);
  const [gapAnswer, setGapAnswer] = useState<"yes" | "no" | "unknown" | null>(null);
  const [gapEvidence, setGapEvidence] = useState("");
  const [gapResult, setGapResult] = useState("");
  const [resumeAdviceOpen, setResumeAdviceOpen] = useState(false);
  const [adviceAccepted, setAdviceAccepted] = useState(false);
  const [interviewPrepOpen, setInterviewPrepOpen] = useState(false);
  const [liveDataAt, setLiveDataAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const requested =
        new URLSearchParams(window.location.search).get("portfolio") === "onboarding"
          ? "onboarding"
          : "workspace";
      const isWorkspace = requested === "workspace";
      // 本地数据模式：AI 参谋写入的 workspace.json 优先于演示种子
      const live = isWorkspace ? await loadWorkspaceFile() : null;
      if (cancelled) return;

      setDemoMode(requested);
      setPreferences(
        live?.preferences ??
          (isWorkspace
            ? portfolioPreferences
            : {
                ...portfolioPreferences,
                inputMode: null,
                role: "",
                customRole: "",
                currentCompany: "",
              }),
      );
      setWeightPreset("balanced");
      setCandidates(live?.candidates ?? portfolioCandidates);
      setApplications(live?.applications ?? portfolioApplications);
      setResumeVersions(live?.resumeVersions ?? (isWorkspace ? portfolioResumeVersions : []));
      setJobPostings(live?.jobPostings ?? portfolioJobPostings);
      setEvents(live?.events ?? portfolioEvents);
      setSourceHealth(live?.sourceHealth ?? portfolioSourceHealth);
      setDailyJob(live?.dailyJob ?? portfolioDailyJob);
      setDailyRuns(live?.dailyRuns ?? portfolioDailyRuns);
      setBrowserSource(portfolioBrowserSource);
      setSourceNote(live?.sourceNote ?? portfolioSourceNote);
      const excludeCompany =
        live?.preferences?.currentCompany ?? (isWorkspace ? portfolioPreferences.currentCompany : "");
      setCurrentCompanyExclusion({
        company: excludeCompany,
        count: live?.currentCompanyExcludedCount ?? (isWorkspace ? 2 : 0),
      });
      setProfile(live?.profile ?? (isWorkspace ? portfolioProfile : null));
      setOnboardingComplete(isWorkspace);
      setStep(isWorkspace ? "home" : "resume");
      setSearchComplete(true);
      setResultsRevealed(isWorkspace);
      setLiveDataAt(live?.generatedAt ?? null);
      setHydrated(true);
    };
    const timer = window.setTimeout(boot, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !liveDataAt) return;
    const timer = window.setInterval(async () => {
      const next = await loadWorkspaceFile();
      if (!next || next.generatedAt === liveDataAt) return;
      // 只增量刷新"AI 参谋负责"的字段；投递状态等用户交互数据保持本地
      if (next.candidates) setCandidates(next.candidates);
      if (next.jobPostings) setJobPostings(next.jobPostings);
      if (next.sourceHealth) setSourceHealth(next.sourceHealth);
      if (next.dailyRuns) setDailyRuns(next.dailyRuns);
      if (next.dailyJob) setDailyJob(next.dailyJob);
      if (next.sourceNote) setSourceNote(next.sourceNote);
      setLiveDataAt(next.generatedAt);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [hydrated, liveDataAt]);

  useEffect(() => {
    if (!hydrated || !dailyJob.enabled || !dailyJob.nextRunAt) return;
    const refreshDue = () => {
      if (new Date(dailyJob.nextRunAt as string) <= new Date()) {
        setDailyJob((current) => ({ ...current, due: true }));
      }
    };
    refreshDue();
    const timer = window.setInterval(refreshDue, 60_000);
    return () => window.clearInterval(timer);
  }, [hydrated, dailyJob.enabled, dailyJob.nextRunAt]);

  const roleOptions = useMemo(() => deriveRoleOptions(profile), [profile]);
  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.status !== "rejected").slice(0, 3),
    [candidates],
  );
  const rejectedCount = candidates.filter((candidate) => candidate.status === "rejected").length;
  const selectedCandidate =
    candidates.find((candidate) => candidate.job.id === selectedJobId) ??
    (selectedJobId && profile && jobPostings[selectedJobId]
      ? evaluateJob(jobPostings[selectedJobId].job, profile)
      : null);
  const boardApplications = useMemo(
    () => Object.values(applications).flatMap((application) => {
      const job = jobPostings[application.jobId]?.job;
      return job ? [{ application, job }] : [];
    }),
    [applications, jobPostings],
  );
  const pipelineApplications = useMemo(() => {
    const priority: Record<ApplicationRecord["status"], number> = {
      screening: 0,
      business_interview: 1,
      applied: 2,
      opened: 3,
      saved: 4,
      rejected: 5,
    };
    return boardApplications
      .filter(({ application }) =>
        ["applied", "screening", "business_interview"].includes(application.status),
      )
      .sort(
        (left, right) =>
          priority[left.application.status] - priority[right.application.status] ||
          new Date(right.application.updatedAt).getTime() -
            new Date(left.application.updatedAt).getTime(),
      );
  }, [boardApplications]);
  const screeningCount = pipelineApplications.filter(
    ({ application }) => application.status === "screening",
  ).length;
  const awaitingCount = pipelineApplications.filter(
    ({ application }) => application.status === "applied",
  ).length;
  const businessInterviewCount = boardApplications.filter(
    ({ application }) => application.status === "business_interview",
  ).length;
  const dashboardNow = new Date();
  const dashboardDateKey = chinaCalendarDateKey(dashboardNow);
  const scheduledInterviews = useMemo(
    () =>
      boardApplications
        .filter(
          ({ application }) =>
            application.status !== "rejected" &&
            Boolean(application.scheduledAt) &&
            !Number.isNaN(new Date(application.scheduledAt ?? "").getTime()),
        )
        .sort(
          (left, right) =>
            new Date(left.application.scheduledAt ?? "").getTime() -
            new Date(right.application.scheduledAt ?? "").getTime(),
        ),
    [boardApplications],
  );
  const todayInterviews = scheduledInterviews.filter(
    ({ application }) =>
      chinaCalendarDateKey(application.scheduledAt ?? "") === dashboardDateKey,
  );
  const nextInterview =
    scheduledInterviews.find(
      ({ application }) =>
        new Date(application.scheduledAt ?? "").getTime() > dashboardNow.getTime(),
    ) ?? null;
  const interviewAlertItems = todayInterviews.length
    ? todayInterviews
    : nextInterview
      ? [nextInterview]
      : [];

  function saveResumeVersion(nextProfile: ResumeProfile, parsed: ParsedResumeFile | null, fileType: ResumeVersion["fileType"]) {
    const version: ResumeVersion = {
      id: uid("resume"),
      fileName: nextProfile.fileName,
      fileType,
      createdAt: new Date().toISOString(),
      textLength: nextProfile.rawText.length,
      pageCount: parsed?.pageCount ?? null,
      warnings: parsed?.warnings ?? [],
      competencyIds: nextProfile.competencies.map((item) => item.id),
    };
    setResumeVersions((current) => [version, ...current].slice(0, 20));
  }

  function useSampleResume() {
    if (demoMode) {
      const next = {
        ...portfolioProfile,
        competencies: portfolioProfile.competencies.map((item) => ({ ...item })),
      };
      setFileState("reading");
      setProfile(next);
      setParsedFile({
        fileName: next.fileName,
        fileType: "pdf",
        text: next.rawText,
        pageCount: 1,
        warnings: [],
      });
      applyInferredCurrentCompany(next);
      saveResumeVersion(next, { fileName: next.fileName, fileType: "pdf", text: next.rawText, pageCount: 1, warnings: [] }, "pdf");
      setFileState("ready");
      setStep("strengths");
      return;
    }
    setFileState("reading");
    const next = analyzeResume("脱敏示例简历.md", sampleResumeText);
    setProfile(next);
    setParsedFile({ fileName: next.fileName, fileType: "text", text: sampleResumeText, pageCount: null, warnings: [] });
    saveResumeVersion(next, null, "sample");
    setFileState("ready");
    setStep("strengths");
  }

  function applyInferredCurrentCompany(nextProfile: ResumeProfile) {
    if (!nextProfile.currentCompany) return;
    setPreferences((current) =>
      current.currentCompany.trim()
        ? current
        : {
            ...current,
            currentCompany: nextProfile.currentCompany ?? "",
            noCurrentCompany: false,
            watchedCompanies: current.watchedCompanies.filter(
              (company) => !isSameCompany(company, nextProfile.currentCompany ?? ""),
            ),
          },
    );
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileState("reading");
    setFileError("");
    setParsedFile(null);
    try {
      const parsed = await parseResumeFile(file);
      if (parsed.text.length < 20) {
        throw new Error("没有提取到足够正文。扫描版 PDF 需要 OCR；系统不会用文件名猜测经历。");
      }
      const next = analyzeResume(file.name, parsed.text);
      setParsedFile(parsed);
      setProfile(next);
      applyInferredCurrentCompany(next);
      saveResumeVersion(next, parsed, parsed.fileType);
      setFileState("ready");
      setStep("strengths");
    } catch (error) {
      setFileState("error");
      setFileError(error instanceof Error ? error.message : "简历解析失败，请换用 PDF、DOCX、Markdown 或 TXT。");
    }
  }

  function toggleCompetency(id: string) {
    setProfile((current) =>
      current
        ? {
            ...current,
            competencies: current.competencies.map((item) =>
              item.id === id ? { ...item, selected: !item.selected } : item,
            ),
          }
        : current,
    );
  }

  function selectInputMode(mode: "describe" | "choices") {
    setPreferences((current) => ({ ...current, inputMode: mode }));
  }

  function selectRole(role: string) {
    setPreferences((current) => ({ ...current, role }));
  }

  function toggleCity(city: string) {
    setPreferences((current) => ({
      ...current,
      cities: current.cities.includes(city)
        ? current.cities.filter((item) => item !== city)
        : [...current.cities, city],
    }));
  }

  function toggleIndustryPack(packId: IndustryPackId) {
    setPreferences((current) => ({
      ...current,
      industryPacks: current.industryPacks.includes(packId)
        ? current.industryPacks.filter((item) => item !== packId)
        : [...current.industryPacks, packId],
    }));
  }

  function updateCurrentCompany(value: string) {
    setSearchMode("full");
    setPreferences((current) => ({
      ...current,
      currentCompany: value,
      noCurrentCompany: false,
      watchedCompanies: current.watchedCompanies.filter((company) => !isSameCompany(company, value)),
    }));
  }

  function toggleNoCurrentCompany(checked: boolean) {
    setSearchMode("full");
    setPreferences((current) => ({
      ...current,
      noCurrentCompany: checked,
      watchedCompanies: checked
        ? current.watchedCompanies
        : current.watchedCompanies.filter((company) => !isSameCompany(company, current.currentCompany)),
    }));
  }

  function addWatchedCompany() {
    const value = companyDraft.trim();
    if (!value) return;
    if (!preferences.noCurrentCompany && isSameCompany(value, preferences.currentCompany)) {
      setCompanyDraft("");
      return;
    }
    setPreferences((current) => ({
      ...current,
      watchedCompanies: current.watchedCompanies.includes(value)
        ? current.watchedCompanies
        : [...current.watchedCompanies, value],
    }));
    setCompanyDraft("");
  }

  async function runSearch(mode: "full" | "rerank" = searchMode) {
    if (!profile) return;
    if (liveDataAt) {
      // 本地数据模式下搜索由 AI 参谋执行，界面不再用演示数据覆盖真实结果
      setSourceNote("数据由你的 AI 参谋维护——对它说「今日扫描」即可刷新岗位");
      setStep("results");
      return;
    }
    if (!preferences.noCurrentCompany && !preferences.currentCompany.trim()) {
      setSearchMode("full");
      setStep("preferences");
      return;
    }
    setStep("results");
    setSearching(true);
    setSearchComplete(false);
    setResultsRevealed(false);
    setSearchPhase(mode === "rerank" ? 3 : 1);

    if (mode === "rerank") {
      setSourceNote("复用 18 个虚拟核验岗位，只更新优先级");
      await delay(650);
      setCandidates(portfolioCandidates);
      setSearchPhase(4);
      setSearchComplete(true);
      setSearching(false);
      return;
    }

    setSourceNote("正在读取虚拟公司官网岗位源");
    await delay(1800);
    setSearchPhase(2);
    setSourceNote("正在按稳定 ID 去重并核验虚拟 JD");
    await delay(1800);
    setSearchPhase(3);
    setSourceNote("正在检查年限、行业与 AI 经验门槛");
    await delay(1800);
    setCandidates(portfolioCandidates);
    setJobPostings(portfolioJobPostings);
    setSourceHealth(portfolioSourceHealth);
    setCurrentCompanyExclusion({
      company: preferences.currentCompany,
      count: 2,
    });
    setSearchPhase(4);
    setSourceNote(portfolioSourceNote);
    setSearchComplete(true);
    setSearching(false);
    setOnboardingComplete(true);
    setResultsRevealed(true);
    setStep("results");
  }

  function openJobDetail(jobId: string, openInterviewPrep = false) {
    setResumeAdviceOpen(false);
    setAdviceAccepted(false);
    setInterviewPrepOpen(openInterviewPrep);
    setSelectedJobId(jobId);
    setStep("detail");
  }

  function openCandidate(candidate: Candidate) {
    openJobDetail(candidate.job.id);
  }

  function saveGap(candidate: Candidate) {
    if (!profile || !gapAnswer) {
      setGapResult("请先选择一个答案。");
      return;
    }
    if (gapAnswer === "yes" && !gapEvidence.trim()) {
      setGapResult("请补充项目、正式职责或时间范围中的至少一条真实事实。");
      return;
    }
    setGapResult("正在重新核对 JD 硬门槛与画像事实…");
    window.setTimeout(() => {
      if (gapAnswer === "yes") {
        if (candidate.gateType === "ai_evaluation") {
          const nextProfile = { ...profile, aiEvaluationConfirmed: true };
          setProfile(nextProfile);
          setCandidates((current) =>
            current.map((item) =>
              item.job.id === candidate.job.id
                ? {
                    ...item,
                    status: "recommended",
                    label: "88% · 补证后推荐",
                    risks: ["模型训练与完整成本体系仍非直接 ownership"],
                  }
                : item,
            ),
          );
          setGapResult("重新判断完成：AI 评测事实已补充，岗位进入正式推荐；不会自动写入简历。");
          return;
        }
        const nextProfile = candidate.gateType === "finance_domain"
          ? { ...profile, financeDomainConfirmed: true }
          : { ...profile, agentOwnershipYears: 2 };
        setProfile(nextProfile);
        setCandidates((current) =>
          current.map((item) =>
            item.job.id === candidate.job.id ? evaluateJob(item.job, nextProfile) : item,
          ),
        );
        setGapResult("重新判断完成：年限门槛通过。补充事实进入简历建议 Review，不会直接写入简历。");
      } else if (gapAnswer === "no") {
        setCandidates((current) =>
          current.map((item) =>
            item.job.id === candidate.job.id
              ? { ...item, status: "rejected", label: "硬门槛不满足" }
              : item,
          ),
        );
        setGapResult("重新判断完成：该岗位不进入正式推荐，历史判断仍保留。");
      } else {
        setGapResult("证据仍不足：岗位保留在观察区，不改变排序。");
      }
    }, 500);
  }

  function updateApplication(jobId: string, status: ApplicationRecord["status"]) {
    const now = new Date().toISOString();
    setApplications((current) => {
      const previous = current[jobId];
      return {
        ...current,
        [jobId]: {
          id: previous?.id ?? uid("application"),
          jobId,
          status,
          resumeVersionId: previous?.resumeVersionId ?? resumeVersions[0]?.id ?? null,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
          nextStage: previous?.nextStage ?? "等待反馈",
        },
      };
    });
    setEvents((current) => [
      {
        id: uid("event"),
        jobId,
        type: status === "opened" ? "opened" : "status_changed",
        createdAt: now,
        summary: status === "opened" ? "打开了官网 Apply" : `投递状态更新为 ${status}`,
      },
      ...current,
    ].slice(0, 200));
  }

  function updateApplicationProgress(
    jobId: string,
    status: Extract<ApplicationRecord["status"], "applied" | "screening" | "business_interview" | "rejected">,
  ) {
    const now = new Date().toISOString();
    const nextStageByStatus = {
      applied: "已投递，等待反馈",
      screening: "筛选 / HR 沟通中",
      business_interview: "业务面进行中或等待结果",
      rejected: "流程结束 / 未通过",
    } as const;
    const nextStage = nextStageByStatus[status];
    setApplications((current) => {
      const application = current[jobId];
      if (!application) return current;
      return {
        ...current,
        [jobId]: {
          ...application,
          nextStage,
          status,
          updatedAt: now,
        },
      };
    });
    setEvents((current) => [
      { id: uid("event"), jobId, type: "stage_changed", createdAt: now, summary: `下一阶段更新为 ${nextStage}` },
      ...current,
    ].slice(0, 200));
  }

  function updateApplicationSchedule(jobId: string, scheduledAt: string) {
    const now = new Date().toISOString();
    setApplications((current) => {
      const application = current[jobId];
      if (!application) return current;
      return {
        ...current,
        [jobId]: { ...application, scheduledAt, updatedAt: now },
      };
    });
    setEvents((current) => [
      { id: uid("event"), jobId, type: "stage_changed", createdAt: now, summary: "已设置面试时间与日程提醒" },
      ...current,
    ].slice(0, 200));
  }

  function saveInterviewReview(jobId: string, notes: string) {
    const now = new Date().toISOString();
    const summary = summarizeInterviewNotes(notes);
    setApplications((current) => {
      const application = current[jobId];
      if (!application) return current;
      return {
        ...current,
        [jobId]: { ...application, interviewNotes: notes, interviewSummary: summary, updatedAt: now },
      };
    });
    setEvents((current) => [
      { id: uid("event"), jobId, type: "stage_changed", createdAt: now, summary: "保存了面试记录并生成轻量复盘" },
      ...current,
    ].slice(0, 200));
  }

  function downloadCalendar(job: JobRecord, application: ApplicationRecord) {
    if (!application.scheduledAt) return;
    const start = new Date(application.scheduledAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const icsTime = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const safe = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Job Copilot//CN",
      "BEGIN:VEVENT",
      `UID:${application.id}@job-copilot.local`,
      `DTSTAMP:${icsTime(new Date())}`,
      `DTSTART:${icsTime(start)}`,
      `DTEND:${icsTime(end)}`,
      `SUMMARY:${safe(`${job.company} · ${job.title} 面试`)}`,
      `DESCRIPTION:${safe(`岗位：${job.title}\n阶段：${application.nextStage}\n来源：${job.sourceUrl}`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:面试将在 30 分钟后开始",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.company}-${job.title}-面试.ics`.replace(/[\\/:*?"<>|]/g, "-");
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleDailyJob(enabled: boolean) {
    setDailyJob((current) => ({
      ...current,
      enabled,
      due: false,
      nextRunAt:
        enabled && isValidDailyTime(current.localTime)
          ? nextDailyRun(current.localTime)
          : null,
    }));
  }

  function updateDailyTime(localTime: string) {
    setDailyJob((current) => ({
      ...current,
      localTime,
      nextRunAt:
        current.enabled && isValidDailyTime(localTime)
          ? nextDailyRun(localTime)
          : null,
      due: false,
    }));
  }

  function restartOnboarding() {
    setOnboardingComplete(false);
    setProfile(null);
    setPreferences(
      {
        ...portfolioPreferences,
        inputMode: null,
        role: "",
        customRole: "",
        currentCompany: "",
      },
    );
    setWeightPreset("balanced");
    setCurrentCompanyExclusion({ company: "", count: 0 });
    setStep("resume");
    setFileState("idle");
    setFileError("");
    setParsedFile(null);
  }

  const selectedStrengthCount = profile?.competencies.filter((item) => item.selected).length ?? 0;
  const currentCompanyReady = preferences.noCurrentCompany || preferences.currentCompany.trim().length >= 2;
  const currentApplication = selectedCandidate ? applications[selectedCandidate.job.id] : undefined;
  const interviewPrep = selectedCandidate && profile
    ? buildCompleteInterviewPrep(
        selectedCandidate,
        profile,
        currentApplication?.interviewPrep,
        currentApplication?.updatedAt ?? jobPostings[selectedCandidate.job.id]?.lastVerifiedAt,
      )
    : undefined;
  const onboardingStepIndex = onboardingSteps.findIndex((item) => item.id === step);
  const onboardingIndex =
    onboardingStepIndex === -1 && !onboardingComplete
      ? onboardingSteps.length
      : onboardingStepIndex;

  return (
    <main className={`app-shell ${demoMode ? "portfolio-demo" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">求</span>
          <div>
            <strong>求职工作台</strong>
            <span>{onboardingComplete ? "Daily workspace" : "首次设置"}</span>
          </div>
        </div>
        {demoMode && (
          <div className="demo-badge">
            {liveDataAt ? "本地数据 · 由你的 AI 参谋维护" : "作品集演示 · 全部为虚拟数据"}
          </div>
        )}
        {onboardingComplete ? (
          <nav aria-label="求职工作台" className="step-nav">
            {appNavItems.map((item) => (
              <button
                className={step === item.id ? "step-link active" : "step-link"}
                key={item.id}
                onClick={() => setStep(item.id)}
                type="button"
              >
                <span>{item.short}</span>
                {item.label}
              </button>
            ))}
          </nav>
        ) : (
          <nav aria-label="首次设置进度" className="step-nav onboarding-nav">
            {onboardingSteps.map((item, index) => (
              <div
                className={`step-link ${step === item.id ? "active" : ""} ${onboardingIndex > index ? "complete" : ""}`}
                key={item.id}
              >
                <span>{onboardingIndex > index ? "✓" : index + 1}</span>
                {item.label}
              </div>
            ))}
          </nav>
        )}
        <div className="sidebar-footer">
          <span>
            {liveDataAt
              ? "数据存于本地文件，由 AI 参谋写入，不上传"
              : demoMode
                ? "演示模式不会访问真实岗位或账号"
                : "数据保存在当前设备"}
          </span>
          {demoMode && (
            <Link
              href="/?portfolio=onboarding"
              onClick={(event) => {
                event.preventDefault();
                window.location.assign(event.currentTarget.href);
              }}
            >
              重播首次 Onboarding
            </Link>
          )}
          {demoMode && (
            <Link
              href="/?portfolio=workspace"
              onClick={(event) => {
                event.preventDefault();
                window.location.assign(event.currentTarget.href);
              }}
            >
              查看虚拟求职工作台
            </Link>
          )}
          {onboardingComplete && <button type="button" onClick={restartOnboarding}>重新配置求职画像</button>}
        </div>
      </aside>

      <section className="workspace">
        {step === "home" && profile && (
          <section className="screen dashboard-screen">
            <header className="screen-header dashboard-header">
              <div>
                <span className="eyebrow">TODAY · {formatChinaDashboardDate(dashboardNow)}</span>
                <h1>{demoMode && !liveDataAt ? "林澈的求职总览" : "求职总览"}</h1>
                <p>先跟进在行流程，再处理今天的新机会。</p>
              </div>
              <button className="secondary" onClick={() => setStep("automation")} type="button">
                查看每日刷新
              </button>
            </header>

            {interviewAlertItems.length > 0 && (
              <section
                className={`today-interview-alert ${todayInterviews.length ? "is-today" : "is-upcoming"}`}
                aria-label={todayInterviews.length ? "今日面试提醒" : "下一场面试提醒"}
              >
                <div className="interview-alert-heading">
                  <span className="interview-alert-badge">
                    <i aria-hidden="true" />
                    {todayInterviews.length ? "TODAY" : "NEXT"}
                  </span>
                  <div>
                    <strong>
                      {todayInterviews.length
                        ? `今日有 ${todayInterviews.length} 场面试`
                        : "今日无面试，下一场已为你置顶"}
                    </strong>
                    <span>
                      {todayInterviews.length
                        ? "先打开材料快速过一遍重点，提前 10 分钟进入会议。"
                        : "面试当天这里会自动升级为醒目的今日提醒。"}
                    </span>
                  </div>
                </div>
                <div className="interview-alert-list">
                  {interviewAlertItems.map(({ application, job }) => (
                    <article className="interview-alert-item" key={application.id}>
                      <time dateTime={application.scheduledAt}>
                        {formatChinaInterviewTime(application.scheduledAt ?? "")}
                        <small>北京时间</small>
                      </time>
                      <div className="interview-alert-copy">
                        <span>{job.company} · {applicationStatusLabel(application.status)}</span>
                        <strong>{job.title}</strong>
                        <small>{application.nextStage}</small>
                      </div>
                      <button
                        className="interview-alert-action"
                        onClick={() => openJobDetail(job.id, true)}
                        type="button"
                      >
                        打开完整面试文档
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="dashboard-metrics" aria-label="当前求职状态">
              <article>
                <span>当前在行</span>
                <strong>{pipelineApplications.length}</strong>
                <small>不含已结束流程</small>
              </article>
              <article>
                <span>筛选推进中</span>
                <strong>{screeningCount}</strong>
                <small>{screeningCount ? `${screeningCount} 个岗位等待下一步` : "暂无筛选中的岗位"}</small>
              </article>
              <article>
                <span>业务面</span>
                <strong>{businessInterviewCount}</strong>
                <small>{businessInterviewCount ? "已确认的业务面流程" : "暂无进行中的业务面"}</small>
              </article>
              <article>
                <span>今日推荐</span>
                <strong>{visibleCandidates.length}</strong>
                <small>{rejectedCount} 个未进入清单</small>
              </article>
            </div>

            <div className="dashboard-grid">
              <section className="surface pipeline-panel">
                <div className="section-label dashboard-section-label">
                  <div>
                    <strong>当前在行机会</strong>
                    <span>筛选、面试与等待反馈集中在这里</span>
                  </div>
                  <button className="ghost" onClick={() => setStep("board")} type="button">
                    打开完整看板
                  </button>
                </div>
                <div className="pipeline-list">
                  {pipelineApplications.map(({ application, job }) => (
                    <article className="pipeline-row" key={application.id}>
                      <span className={`application-status ${application.status}`}>
                        {applicationStatusLabel(application.status)}
                      </span>
                      <div className="pipeline-copy">
                        <strong>{job.title}</strong>
                        <span>{job.company} · {job.location ?? "地点待核"}</span>
                      </div>
                      <div className="pipeline-next">
                        <strong>{application.nextStage}</strong>
                        <span>{formatChinaDate(application.updatedAt)} 更新</span>
                      </div>
                      <button
                        className="row-action"
                        onClick={() => openJobDetail(job.id, true)}
                        type="button"
                      >
                        完整文档
                      </button>
                    </article>
                  ))}
                </div>
                <footer className="pipeline-footer">
                  <span>{awaitingCount} 个已投待反馈</span>
                  <span>{screeningCount} 个筛选推进中</span>
                  <span>{businessInterviewCount} 个业务面等待结果</span>
                </footer>
              </section>

              <aside className="surface recommendation-panel">
                <div className="section-label dashboard-section-label">
                  <div>
                    <strong>今日推荐</strong>
                    <span>最多 3 个，不为凑数降标准</span>
                  </div>
                  <button className="ghost" onClick={() => setStep("results")} type="button">
                    查看完整判断
                  </button>
                </div>
                <div className="recommendation-stack">
                  {visibleCandidates.map((candidate, index) => (
                    <article className="recommendation-card" key={candidate.job.id}>
                      <div className="recommendation-rank">{index + 1}</div>
                      <div>
                        <span>{candidate.job.company}</span>
                        <h2>{candidate.job.title}</h2>
                        <strong>{candidate.label}</strong>
                        <p>{candidate.matchReasons[0]}</p>
                        <button className="secondary" onClick={() => openCandidate(candidate)} type="button">
                          查看岗位判断
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="dashboard-source-note">
                  <strong>本轮来源状态</strong>
                  <p>{sourceNote}</p>
                </div>
              </aside>
            </div>
          </section>
        )}

        {step === "resume" && (
          <section className="screen narrow">
            <header className="screen-header">
              <div><span className="eyebrow">开始</span><h1>先让系统看懂你的经历</h1><p>简历只在本地读取。系统先提取事实，再由你确认。</p></div>
            </header>
            <div className="upload-panel">
              <input
                accept=".pdf,.docx,.md,.txt"
                onChange={handleFile}
                ref={fileInputRef}
                type="file"
              />
              <div className="upload-copy"><strong>拖入简历，或选择文件</strong><span>PDF、DOCX、Markdown、文本；正文只在当前设备解析</span></div>
              <button className="primary" onClick={() => fileInputRef.current?.click()} type="button">选择简历</button>
            </div>
            {fileState === "reading" && <div className="notice">正在读取简历…</div>}
            {fileState === "error" && <div className="notice warning">{fileError}</div>}
            {fileState === "ready" && parsedFile && <div className="notice">已解析 {parsedFile.fileName}：{parsedFile.pageCount ? `${parsedFile.pageCount} 页，` : ""}{parsedFile.text.length} 个字符。{parsedFile.warnings[0] ?? "可以进入事实 Review。"}</div>}
            <button className="secondary full" onClick={useSampleResume} type="button">
              {demoMode ? "使用林澈的虚拟简历继续" : "使用脱敏示例简历体验"}
            </button>
            {demoMode && <a className="text-link demo-resume-link" href="/demo/lin-che-resume.pdf" target="_blank">预览这份虚拟简历 PDF</a>}
          </section>
        )}

        {step === "strengths" && profile && (
          <section className="screen">
            <header className="screen-header split">
              <div><span className="eyebrow">画像 Review</span><h1>这些是不是你的核心竞争力？</h1><p>点掉不准确项，可补充一项遗漏。确认后才选择求职方向。</p></div>
              <span className="count-pill">已选 {selectedStrengthCount} 项</span>
            </header>
            <div className="surface">
              <div className="section-label"><strong>根据简历事实提取</strong><span>{profile.fileName}</span></div>
              <div className="strength-grid">
                {profile.competencies.map((item) => (
                  <button
                    aria-pressed={item.selected}
                    className={item.selected ? "select-card selected" : "select-card"}
                    key={item.id}
                    onClick={() => toggleCompetency(item.id)}
                    type="button"
                  >
                    <span className="selection-indicator">{item.selected ? "✓" : "+"}</span>
                    <strong>{item.title}</strong>
                    <span>{item.evidence}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>还有哪一项能力最希望招聘方看见？ <small>可跳过</small></span>
              <textarea
                onChange={(event) => setProfile({ ...profile, extraStrength: event.target.value })}
                placeholder="只写真实能力或成果"
                rows={3}
                value={profile.extraStrength}
              />
            </label>
            <div className="action-bar"><button className="ghost" onClick={() => setStep("resume")} type="button">返回</button><button className="primary" disabled={!selectedStrengthCount} onClick={() => setStep("preferences")} type="button">确认竞争力，选择方向</button></div>
          </section>
        )}

        {step === "preferences" && profile && (
          <section className="screen">
            <header className="screen-header"><div><span className="eyebrow">求职诉求</span><h1>你想怎么告诉我？</h1><p>两种方式最终形成同一套搜索条件。</p></div></header>
            <div className="mode-grid">
              <button className={preferences.inputMode === "describe" ? "mode-card selected" : "mode-card"} onClick={() => selectInputMode("describe")} type="button"><strong>我知道自己想要什么</strong><span>用一段话描述方向、城市和取舍</span></button>
              <button className={preferences.inputMode === "choices" ? "mode-card selected" : "mode-card"} onClick={() => selectInputMode("choices")} type="button"><strong>我还没想好</strong><span>选几个选项，帮我厘清</span></button>
            </div>
            <section className="surface employer-exclusion">
              <div className="section-label"><strong>排除当前任职公司</strong><span>{profile.currentCompany && isSameCompany(profile.currentCompany, preferences.currentCompany) ? "简历已识别，请确认" : currentCompanyReady ? "已由你确认" : "搜索前必须确认"}</span></div>
              <p>当前公司的岗位不会进入候选池、评分或 Top List，也不会被加入关注公司。</p>
              <label className="field">
                <span>当前任职公司</span>
                <input
                  className="text-input"
                  disabled={preferences.noCurrentCompany}
                  onChange={(event) => updateCurrentCompany(event.target.value)}
                  placeholder="例如：云帆视频、栖木电商"
                  value={preferences.currentCompany}
                />
              </label>
              <label className="toggle-row">
                <input checked={preferences.noCurrentCompany} onChange={(event) => toggleNoCurrentCompany(event.target.checked)} type="checkbox" />
                <span><strong>目前没有在职公司</strong><small>校招、待业或确实无需排除时选择</small></span>
              </label>
              {!currentCompanyReady && <div className="notice warning">请填写当前公司，或确认目前没有在职公司。</div>}
            </section>
            {preferences.inputMode === "describe" && (
              <div className="surface form-stack">
                <label className="field"><span>快速描述</span><textarea rows={5} value={preferences.description} onChange={(event) => setPreferences({ ...preferences, description: event.target.value })} placeholder="例如：想找国内 Senior 产品岗位，优先 AI 和增长，也愿意看相邻行业…" /></label>
                <div className="notice">提交后会先展示解析确认卡；不会直接开始搜索。</div>
              </div>
            )}
            {preferences.inputMode === "choices" && (
              <div className="form-stack">
                <ChoiceSection title="优先方向" hint="根据简历能力证据推荐，可选一个。">
                  <div className="option-grid">
                    {roleOptions.map((option) => (
                      <button className={preferences.role === option.label ? "option selected" : "option"} key={option.id} onClick={() => selectRole(option.label)} type="button"><strong>{option.label}{option.recommended ? " · 推荐" : ""}</strong><span>{option.reason}</span></button>
                    ))}
                    <button className={preferences.role === "custom" ? "option selected" : "option"} onClick={() => selectRole("custom")} type="button"><strong>其他方向</strong><span>自己填写目标职能</span></button>
                  </div>
                  {preferences.role === "custom" && <input className="text-input" value={preferences.customRole} onChange={(event) => setPreferences({ ...preferences, customRole: event.target.value })} placeholder="例如：产品战略、商业运营" />}
                </ChoiceSection>
                <ChoiceSection title="行业开放度" hint="决定是否搜索相邻行业。">
                  <div className="chip-row">
                    {([['familiar','只看熟悉行业'],['adjacent','主行业 + 相邻迁移 · 推荐'],['broad','广泛探索']] as const).map(([value,label]) => <button className={preferences.industryMode === value ? "chip selected" : "chip"} key={value} onClick={() => setPreferences({ ...preferences, industryMode: value })} type="button">{label}</button>)}
                  </div>
                </ChoiceSection>
                <ChoiceSection title="工作地点" hint="地点不能只靠简历推断，可多选。">
                  <div className="chip-row">{["上海","杭州","深圳","北京","远程","其他"].map((city) => <button className={preferences.cities.includes(city) ? "chip selected" : "chip"} key={city} onClick={() => toggleCity(city)} type="button">{city}</button>)}</div>
                  {preferences.cities.includes("其他") && <input className="text-input" value={preferences.customCity} onChange={(event) => setPreferences({ ...preferences, customCity: event.target.value })} placeholder="输入其他城市" />}
                </ChoiceSection>
                <ChoiceSection title="求职节奏" hint="这是你的选择，系统不会从简历猜。">
                  <div className="chip-row">{([['steady','稳步启动'],['fast','尽快拿 Offer'],['explore','先探索市场']] as const).map(([value,label]) => <button className={preferences.pace === value ? "chip selected" : "chip"} key={value} onClick={() => setPreferences({ ...preferences, pace: value })} type="button">{label}</button>)}</div>
                </ChoiceSection>
              </div>
            )}
            <div className="action-bar"><button className="ghost" onClick={() => setStep("strengths")} type="button">返回</button><button className="primary" disabled={!currentCompanyReady || !preferences.inputMode || (preferences.inputMode === "describe" ? !preferences.description.trim() : !preferences.role)} onClick={() => setStep("weights")} type="button">确认搜索方向</button></div>
          </section>
        )}

        {step === "weights" && (
          <section className="screen narrow">
            <header className="screen-header"><div><span className="eyebrow">排序策略</span><h1>这次求职更看重什么？</h1><p>预设只影响优先级，不会覆盖行业硬门槛。</p></div></header>
            <div className="chip-row preset-row">{(Object.keys(weightPresets) as WeightPreset[]).map((key) => <button className={weightPreset === key ? "chip selected" : "chip"} key={key} onClick={() => setWeightPreset(key)} type="button">{weightPresets[key].label}</button>)}</div>
            <div className="surface weight-list">{([['fit','能力匹配'],['cash','薪资空间'],['leap','长期跳板'],['steady','稳定可控']] as const).map(([key,label]) => <div className="weight-row" key={key}><span>{label}</span><div className="weight-track"><span style={{ width: `${weightPresets[weightPreset][key]}%` }} /></div><strong>{weightPresets[weightPreset][key]}%</strong></div>)}</div>
            <div className="notice">匹配高分只表示准备 ROI 较高，不代表 Offer 概率。</div>
            <div className="action-bar"><button className="ghost" onClick={() => setStep("preferences")} type="button">返回</button><button className="primary" onClick={() => searchMode === "rerank" ? runSearch("rerank") : setStep("sources")} type="button">{searchMode === "rerank" ? "重新排序当前岗位" : "确认行业与岗位源"}</button></div>
          </section>
        )}

        {step === "sources" && profile && (
          <section className="screen">
            <header className="screen-header split">
              <div><span className="eyebrow">SOURCE CENTER</span><h1>这次要扫描哪些行业与来源？</h1><p>公开连接器负责岗位事实；登录网站只补充情报，不承担 live 证明。</p></div>
              <span className="count-pill">已选 {preferences.industryPacks.length} 个行业包</span>
            </header>
            {demoMode && <div className="notice demo-notice"><strong>作品集演示模式</strong><p>下面只演示来源选择和降级逻辑，搜索使用固定虚拟岗位，不访问真实网站或账号。</p></div>}
            <div className="pack-grid">
              {portfolioIndustryPacks.map((pack) => (
                <button className={preferences.industryPacks.includes(pack.id) ? "pack-card selected" : "pack-card"} key={pack.id} onClick={() => toggleIndustryPack(pack.id)} type="button">
                  <span className="selection-indicator">{preferences.industryPacks.includes(pack.id) ? "✓" : "+"}</span>
                  <strong>{pack.label}</strong><p>{pack.description}</p><small>{pack.coverage}</small><div>{pack.sources.filter((source) => preferences.noCurrentCompany || !isSameCompany(source, preferences.currentCompany)).map((source) => <span key={source}>{source}</span>)}</div>
                </button>
              ))}
            </div>
            {currentCompanyReady && !preferences.noCurrentCompany && <div className="notice employer-exclusion-result"><strong>已从所有行业包排除：{preferences.currentCompany}</strong><p>即使官网、API 或登录情报命中，也不会进入评分和 Top List。</p></div>}
            <div className="source-center-grid">
              <section className="surface source-catalog">
                <div className="section-label"><strong>无需登录的基础供给</strong><span>搜索时自动运行</span></div>
                <div><span className="health-dot healthy" /><p><strong>互联网与 AI 虚拟岗位源</strong><small>会员、增长、商业化与 AI 应用岗位</small></p></div>
                <div><span className="health-dot healthy" /><p><strong>消费与电商虚拟岗位源</strong><small>订阅、会员权益和生命周期岗位</small></p></div>
                <div><span className="health-dot healthy" /><p><strong>Fintech 虚拟岗位源</strong><small>支付激活、留存与高价值用户增长岗位</small></p></div>
              </section>
              <section className="surface login-source-card">
                <div className="section-label"><strong>脉脉登录增强</strong><span>{browserSource.status === "not_connected" ? "未确认登录" : browserSource.status === "user_confirmed" ? "已确认登录" : "任务已准备"}</span></div>
                <p>此处仅展示登录情报在产品中的位置，不连接任何真实账号。</p>
                <div className="inline-actions">
                  <button className="secondary" disabled type="button">登录情报演示占位</button>
                </div>
              </section>
            </div>
            {!currentCompanyReady && <div className="notice warning"><strong>还不能开始搜索</strong><p>请返回“求职诉求”，确认当前任职公司或选择目前没有在职公司。</p></div>}
            <div className="action-bar"><button className="ghost" onClick={() => setStep("weights")} type="button">返回权重</button><button className="primary" disabled={!preferences.industryPacks.length || !currentCompanyReady} onClick={() => runSearch("full")} type="button">按已选来源搜索</button></div>
          </section>
        )}

        {step === "results" && (
          <section className="screen">
            {searching || !searchComplete || !resultsRevealed ? (
              <>
                <header className="screen-header split"><div><span className="eyebrow">岗位搜索</span><h1>{searchMode === "rerank" ? "正在重新排序" : "正在搜索和核验岗位"}</h1><p>你可以补充关注公司，也可以什么都不做。</p></div><span className="count-pill">后台继续</span></header>
                <div className="surface search-progress" aria-live="polite">
                  <div className="phase-line"><span className="pulse-dot" /><strong>{sourceNote}</strong></div>
                  <div className="progress-track"><span style={{ width: `${Math.max(searchPhase,1) * 25}%` }} /></div>
                  <div className="phase-list">{["读取官方来源","去重与 JD 核验","检查硬门槛","生成候选"].map((label,index) => <span className={searchPhase > index ? "done" : ""} key={label}>{index + 1}. {label}</span>)}</div>
                </div>
                <div className="surface form-stack"><div><strong>等待时可选：补充想看的公司</strong><p>不会暂停搜索；来不及进入本轮时自动放到下一次刷新。</p></div><div className="inline-field"><input className="text-input" value={companyDraft} onChange={(event) => setCompanyDraft(event.target.value)} placeholder="例如：光年 AI、山海健康" /><button className="secondary" onClick={addWatchedCompany} type="button">加入关注</button></div>{preferences.watchedCompanies.length > 0 && <div className="chip-row">{preferences.watchedCompanies.map((company) => <span className="static-chip" key={company}>{company}</span>)}</div>}</div>
                <div className="action-bar"><button className="ghost" onClick={() => { setSearchMode("full"); setStep("preferences"); }} type="button">修改搜索条件（会重新搜索）</button><button className="primary" disabled={!searchComplete} onClick={() => setResultsRevealed(true)} type="button">查看当前结果</button></div>
              </>
            ) : (
              <>
                <header className="screen-header split"><div><span className="eyebrow">Top List</span><h1>今天值得你处理的岗位</h1><p>{sourceNote}</p></div><span className="count-pill">{visibleCandidates.filter((item) => item.status === "recommended").length} 推荐 · {visibleCandidates.filter((item) => item.status === "needs_evidence").length} 待确认</span></header>
                {businessInterviewCount >= 3 && <div className="notice warning"><strong>当前已有 3 个业务面排期，建议暂停新增投递。</strong><span>匹配岗位仍保留排序，方便你在流程结束后接续处理。</span></div>}
                {currentCompanyExclusion.company && <div className="notice employer-exclusion-result"><strong>已排除当前公司：{currentCompanyExclusion.company}</strong><p>{currentCompanyExclusion.count ? `本轮在评分前移除了 ${currentCompanyExclusion.count} 个岗位。` : "本轮来源中没有发现该公司的岗位。"}</p></div>}
                <div className="source-strip">
                  <span>互联网与 AI 虚拟岗位源</span>
                  <span>消费与电商虚拟岗位源</span>
                  <span>Fintech 虚拟岗位源</span>
                  <span>演示核验于 {formatChinaDateTime(portfolioCheckedAt)}</span>
                  <span>{rejectedCount} 个被硬门槛挡下</span>
                </div>
                {sourceHealth.length > 0 && <details className="surface source-health"><summary>查看岗位源状态与降级原因</summary><div className="source-health-grid">{sourceHealth.map((source) => <div key={source.id}><span className={`health-dot ${source.status}`} /><p><strong>{source.label}</strong><small>{source.mode} · {source.status}</small><small>{source.detail}</small></p></div>)}</div></details>}
                <div className="candidate-list">
                  {visibleCandidates.map((candidate) => (
                    <article className="candidate" key={candidate.job.id}>
                      <div><span className={`status ${candidate.status}`}>{statusLabel(candidate.status)}</span><h2>{candidate.job.title}</h2><p>{candidate.job.company} · {candidate.job.business}</p><div className="fact-line"><span>{candidate.job.location ?? "地点待核"}</span><span>{candidate.job.salary ?? "薪资待核"}</span><span>{candidate.job.liveStatus === "apply_visible" ? "Apply 可见" : "JD 已验证"}</span></div></div>
                      <div className="candidate-decision"><strong>{candidate.label}</strong><span>{candidate.matchReasons[0] ?? candidate.risks[0]}</span></div>
                      {candidate.status === "needs_evidence" ? <button className="secondary" onClick={() => { setGapOpen(candidate.job.id); setGapResult(""); }} type="button">回答 1 个问题</button> : <button className="primary" onClick={() => openCandidate(candidate)} type="button">查看决策信息</button>}
                      {gapOpen === candidate.job.id && (
                        <div className="gap-panel">
                          {candidate.status === "needs_evidence" ? (
                            <>
                              <div><strong>这会决定岗位能否进入正式推荐</strong><p>{candidate.gateQuestion}</p></div>
                              <div className="radio-stack">{([['yes','有，可以补充事实'],['no','没有'],['unknown','不确定，先保留观察']] as const).map(([value,label]) => <label key={value}><input checked={gapAnswer === value} name="gap-answer" onChange={() => setGapAnswer(value)} type="radio" />{label}</label>)}</div>
                              {gapAnswer === "yes" && <label className="field"><span>补充可核验事实</span><textarea rows={3} value={gapEvidence} onChange={(event) => setGapEvidence(event.target.value)} placeholder="项目、正式职责和时间范围" /></label>}
                              <div className="inline-actions"><button className="primary" onClick={() => saveGap(candidate)} type="button">保存并重新判断</button><button className="ghost" onClick={() => setGapOpen(null)} type="button">稍后回答</button></div>
                              {gapResult && <div className="notice">{gapResult}</div>}
                            </>
                          ) : (
                            <div className="notice action-notice">
                              <div><strong>重新判断已刷新</strong><p>{gapResult || "该岗位已按补充事实更新。"}</p></div>
                              <button className="secondary" onClick={() => setGapOpen(null)} type="button">完成</button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                  {visibleCandidates.length < 3 && <article className="empty-candidate"><div><strong>还有 {3 - visibleCandidates.length} 个位置暂空</strong><p>不符合行业、年限或岗位类型硬门槛时不会凑数。</p></div><button className="secondary" onClick={() => { setSearchMode("full"); setStep("preferences"); }} type="button">修改条件并扩搜</button></article>}
                </div>
                <div className="action-bar">
                  <button className="ghost" onClick={() => { setSearchMode("rerank"); setStep("weights"); }} type="button">调整排序权重</button>
                  <button className="ghost" onClick={() => { setSearchMode("full"); setStep("preferences"); }} type="button">修改搜索条件（重新搜索）</button>
                  <button className="primary" onClick={() => runSearch("full")} type="button">立即刷新岗位</button>
                </div>
              </>
            )}
          </section>
        )}

        {step === "detail" && selectedCandidate && (
          <section className="screen">
            <header className="screen-header split"><div><span className="eyebrow">岗位决策</span><h1>{selectedCandidate.job.title}</h1><p>{selectedCandidate.job.company} · {selectedCandidate.label}</p></div><span className="count-pill">{applicationStatusLabel(currentApplication?.status)}</span></header>
            <div className="decision-grid">
              <div className="surface decision-table">
                <DecisionRow label="公司与业务" value={`${selectedCandidate.job.company}；${selectedCandidate.job.business}`} />
                {selectedCandidate.job.companyOverview && <DecisionRow label="公司介绍" value={selectedCandidate.job.companyOverview} />}
                <DecisionRow label="岗位职责" value={selectedCandidate.job.description} />
                <DecisionRow label="岗位要求" value={selectedCandidate.job.requirements} />
                <DecisionRow label="为什么匹配" value={selectedCandidate.matchReasons.join("；") || "暂无足够匹配证据"} />
                <DecisionRow label="最大风险" value={selectedCandidate.risks.join("；") || "未发现明确硬风险"} />
                <DecisionRow label="仍然未知" value={selectedCandidate.unknowns.join("、") || "暂无"} />
                <DecisionRow label="事实状态" value={`${selectedCandidate.job.sourceLabel}；${jobFactStatusLabel(selectedCandidate.job)}`} />
              </div>
              <aside className="surface interview-card ready">
                <div className="section-label"><strong>完整面试准备文档</strong><span>每个岗位均可打开</span></div>
                <p>{interviewPrep?.summary[0]}</p>
                <small>岗位与 JD 解读 · 匹配依据 · 产品实测 · 完整题库 · 故事与 Case · Gap · 反问</small>
                <button aria-controls="interview-prep-material" aria-expanded={interviewPrepOpen} className="secondary" onClick={() => setInterviewPrepOpen((value) => !value)} type="button">
                  {interviewPrepOpen ? "收起完整文档" : "打开完整面试准备文档"}
                </button>
              </aside>
            </div>
            {interviewPrep && interviewPrepOpen && (
              <section className="surface interview-prep-detail" id="interview-prep-material">
                <header>
                  <div><span className="eyebrow">INTERVIEW PREP</span><h2>{interviewPrep.title}</h2><p>{interviewPrep.sourceNote}</p></div>
                  {currentApplication?.scheduledAt && <span className="count-pill">{formatChinaDateTime(currentApplication.scheduledAt).slice(0, -3)} · 北京时间</span>}
                </header>
                <div className="prep-summary-list">
                  {interviewPrep.summary.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}
                </div>
                <section className="prep-role-brief">
                  <div className="section-label"><strong>岗位事实</strong><span>先对齐 JD，再准备回答</span></div>
                  <div>
                    {interviewPrep && selectedCandidate.job.companyOverview && <DecisionRow label="公司介绍" value={selectedCandidate.job.companyOverview} />}
                    <DecisionRow label="岗位职责" value={selectedCandidate.job.description} />
                    <DecisionRow label="岗位要求" value={selectedCandidate.job.requirements} />
                  </div>
                </section>
                <section className="prep-jd-matches">
                  <div className="section-label"><strong>JD 逐项匹配</strong><span>直接证据与边界分开写</span></div>
                  <div className="jd-match-list">
                    {interviewPrep.jdMatches?.map((item) => (
                      <article key={`${item.jdItem}-${item.evidence}`}>
                        <span className={`fit-badge ${item.fit}`}>
                          {item.fit === "direct" ? "直接匹配" : item.fit === "adjacent" ? "相邻迁移" : item.fit === "gap" ? "明确缺口" : "待核证据"}
                        </span>
                        <strong>{item.jdItem}</strong>
                        <p><b>证据：</b>{item.evidence}</p>
                        <small><b>面试讲法：</b>{item.interviewAngle}</small>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="prep-strategy">
                  <div className="section-label"><strong>面试策略</strong><span>不只是快捷问答</span></div>
                  <p className="prep-positioning">{interviewPrep.strategy?.positioning}</p>
                  <div className="prep-strategy-grid">
                    <div><strong>本轮重点</strong><ul>{interviewPrep.strategy?.roundFocus.map((item) => <li key={item}>{item}</li>)}</ul></div>
                    <div><strong>必须证明</strong><ul>{interviewPrep.strategy?.mustProve.map((item) => <li key={item}>{item}</li>)}</ul></div>
                    <div><strong>不要声称</strong><ul>{interviewPrep.strategy?.avoidClaims.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                </section>
                <section className="prep-product-experience">
                  <div className="section-label"><strong>如何体验产品功能</strong><span>{interviewPrep.productExperiencePlan?.length ?? 0} 步 · <a href={selectedCandidate.job.productUrl ?? selectedCandidate.job.sourceUrl} rel="noreferrer" target="_blank">{selectedCandidate.job.productUrl ? "打开产品入口" : "打开官方信息入口"}</a></span></div>
                  <div className="prep-experience-list">
                    {interviewPrep.productExperiencePlan?.map((item, index) => (
                      <article key={item.step}>
                        <span>{index + 1}</span>
                        <div><strong>{item.step}</strong><p>{item.action}</p><small>产出：{item.evidence}</small></div>
                      </article>
                    ))}
                  </div>
                </section>
                <div className="prep-content-grid">
                  <section>
                    <div className="section-label"><strong>高优问题</strong><span>{interviewPrep.priorityQuestions.length} 题</span></div>
                    <div className="prep-question-list">
                      {interviewPrep.priorityQuestions.map((item, index) => <article key={item.question}><span>Q{index + 1}</span><div><strong>{item.question}</strong><p>{item.answerGuide}</p></div></article>)}
                    </div>
                  </section>
                  <section>
                    <div className="section-label"><strong>故事映射</strong><span>{interviewPrep.storyMap.length} 组</span></div>
                    <div className="prep-story-list">
                      {interviewPrep.storyMap.map((item) => <article key={item.story}><span>{item.theme}</span><strong>{item.story}</strong><p>{item.proof}</p></article>)}
                    </div>
                  </section>
                </div>
                <section className="prep-question-bank">
                  <div className="section-label"><strong>完整分类题库</strong><span>{interviewPrep.questionBank?.reduce((total, group) => total + group.questions.length, 0) ?? 0} 题</span></div>
                  <div className="question-bank-grid">
                    {interviewPrep.questionBank?.map((group) => (
                      <article key={group.category}>
                        <strong>{group.category}</strong>
                        {group.questions.map((item) => <div key={item.question}><b>{item.question}</b><p>{item.answerGuide}</p></div>)}
                      </article>
                    ))}
                  </div>
                </section>
                <div className="prep-gap">
                  <span className="eyebrow">最大证据缺口</span>
                  <strong>{interviewPrep.largestGap}</strong>
                  <p>{interviewPrep.gapResponse}</p>
                </div>
                <section className="prep-case-framework">
                  <div className="section-label"><strong>现场 Case 通用骨架</strong><span>不靠背快捷答案</span></div>
                  <ol>{interviewPrep.caseFramework?.map((item) => <li key={item}>{item}</li>)}</ol>
                </section>
                <section className="prep-interviewer-questions">
                  <div className="section-label"><strong>反问面试官</strong><span>{interviewPrep.interviewerQuestions.length} 个</span></div>
                  <ol>{interviewPrep.interviewerQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
                </section>
                <section className="prep-final-checklist">
                  <div className="section-label"><strong>面试前最后检查</strong><span>完成后再停</span></div>
                  <ul>{interviewPrep.finalChecklist?.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              </section>
            )}
            {(!currentApplication || ["saved", "opened"].includes(currentApplication.status)) && <div className="surface detail-action-panel">
              <div><span className="eyebrow">下一步</span><strong>先确认简历怎么改，再决定是否投递</strong><p>查看建议不会改写原简历；打开官网也不会自动标记为已投递。</p></div>
              <div className="inline-actions detail-cta-buttons"><button className="secondary" onClick={() => setResumeAdviceOpen((value) => !value)} type="button">{resumeAdviceOpen ? "收起简历建议" : "Review 简历建议"}</button><a className="primary link-button" href={selectedCandidate.job.sourceUrl} onClick={() => updateApplication(selectedCandidate.job.id,"opened")} rel="noreferrer" target="_blank">打开官网 Apply</a></div>
            </div>}
            {currentApplication?.status === "rejected" && <section className="surface closed-application-panel"><div><span className="eyebrow">流程已结束</span><strong>{currentApplication.nextStage}</strong><p>该岗位已从“当前在行机会”移出，保留在“已结束”列和历史记录中。</p></div>{currentApplication.interviewSummary && <div className="review-summary"><strong>面试复盘摘要</strong><p>{currentApplication.interviewSummary}</p></div>}{currentApplication.interviewNotes && <details><summary>查看完整面试记录</summary><pre>{currentApplication.interviewNotes}</pre></details>}</section>}
            {resumeAdviceOpen && <div className="surface advice-panel"><strong>建议突出，不新增事实</strong>{demoMode ? <><div className="advice-item"><span>1</span><p><b>把会员商业化结果提前</b><small>先展示首购 +18% 与续费 +9pp，再解释方案。</small></p></div><div className="advice-item"><span>2</span><p><b>补清楚为什么需要 AI</b><small>对比规则推荐与长尾意图，使用已有项目事实。</small></p></div></> : <><div className="advice-item"><span>1</span><p><b>前移 0→1 与 C 端经历</b><small>这是 JD 主要求，比补行业词更重要。</small></p></div><div className="advice-item"><span>2</span><p><b>展开一次数据实验闭环</b><small>只使用已有事实，没有的数据不补。</small></p></div></>}{adviceAccepted ? <div className="advice-accepted" role="status"><div><strong>岗位版修改清单已生成</strong><p>不需要等待：把这两项应用到岗位版草稿即可。当前只确认修改方向，不会自动改写或导出文件。</p></div><button className="secondary" onClick={() => setAdviceAccepted(false)} type="button">撤销接受</button></div> : <button className="primary advice-accept-button" onClick={() => setAdviceAccepted(true)} type="button">接受并生成修改清单</button>}</div>}
            {currentApplication?.status === "opened" && <div className="notice action-notice"><div><strong>官网页面已经打开</strong><p>打开不等于已投递，请确认结果。</p></div><div className="inline-actions"><button className="primary" onClick={() => updateApplication(selectedCandidate.job.id,"applied")} type="button">我已完成投递</button><button className="ghost" onClick={() => updateApplication(selectedCandidate.job.id,"saved")} type="button">暂未投递</button></div></div>}
            {currentApplication && ["applied","screening","business_interview"].includes(currentApplication.status) && <div className="surface form-stack"><strong>投递已记录，当前流程状态是什么？</strong><label className="field"><span>流程状态</span><select value={currentApplication.status} onChange={(event) => updateApplicationProgress(selectedCandidate.job.id, event.target.value as Extract<ApplicationRecord["status"], "applied" | "screening" | "business_interview" | "rejected">)}><option value="applied">已投递 / 等待反馈</option><option value="screening">筛选或 HR / TA 沟通</option><option value="business_interview">业务面进行中 / 等待结果</option><option value="rejected">流程结束 / 未通过</option></select></label><p>选择“流程结束 / 未通过”后，岗位会立即移出在行列表，面试记录仍保留。</p></div>}
            {currentApplication?.status === "business_interview" && <div className="surface interview-workbench"><div className="section-label"><strong>面试安排与轻量复盘</strong><span>Local First</span></div><div className="interview-schedule"><label className="field"><span>面试时间</span><input className="text-input" type="datetime-local" value={toLocalDateTimeInput(currentApplication.scheduledAt)} onInput={(event) => { const value = (event.target as HTMLInputElement).value; updateApplicationSchedule(selectedCandidate.job.id, value ? new Date(value).toISOString() : ""); }} /></label><button className="secondary" disabled={!currentApplication.scheduledAt} onClick={() => downloadCalendar(selectedCandidate.job, currentApplication)} type="button">下载日历提醒 .ics</button></div><label className="field"><span>面试记录</span><textarea rows={5} value={currentApplication.interviewNotes ?? ""} onChange={(event) => setApplications((current) => ({ ...current, [selectedCandidate.job.id]: { ...current[selectedCandidate.job.id], interviewNotes: event.target.value } }))} placeholder="记录追问、面试官反馈、自己答得不顺的地方和下一步" /></label><button className="primary" disabled={!currentApplication.interviewNotes?.trim()} onClick={() => saveInterviewReview(selectedCandidate.job.id, currentApplication.interviewNotes ?? "")} type="button">保存并生成复盘</button>{currentApplication.interviewSummary && <div className="review-summary"><strong>自动复盘</strong><pre>{currentApplication.interviewSummary}</pre></div>}</div>}
            <div className="detail-footer-nav"><button className="ghost" onClick={() => setStep("results")} type="button">← 返回 Top List</button><span>外部投递状态由你确认</span><button className="ghost" onClick={() => setStep("board")} type="button">查看投递看板 →</button></div>
          </section>
        )}

        {step === "board" && (
          <section className="screen">
            <header className="screen-header split">
              <div><span className="eyebrow">APPLICATION BOARD</span><h1>投递与面试看板</h1><p>所有岗位状态、简历版本和事件记录都保存在当前设备。</p></div>
              <span className="count-pill">业务面 {businessInterviewCount} / 3</span>
            </header>
            {businessInterviewCount >= 3 && <div className="notice warning">已有 3 个业务面确认排期。系统暂停新增高优投递建议，但继续维护候选榜单。</div>}
            {boardApplications.length === 0 ? (
              <div className="surface board-empty"><strong>还没有投递记录</strong><p>从 Top List 打开岗位并确认投递后，会自动进入这里。</p><button className="primary" onClick={() => setStep("results")} type="button">返回 Top List</button></div>
            ) : (
              <div className="board-grid">
                {([
                  { id: "saved", label: "待投递", statuses: ["saved", "opened"] },
                  { id: "applied", label: "已投递", statuses: ["applied"] },
                  { id: "screening", label: "筛选中", statuses: ["screening"] },
                  { id: "business", label: "业务面", statuses: ["business_interview"] },
                  { id: "closed", label: "已结束", statuses: ["rejected"] },
                ] as const).map((column) => {
                  const items = boardApplications.filter(({ application }) => (column.statuses as readonly string[]).includes(application.status));
                  return <section className="board-column" key={column.id}><header><strong>{column.label}</strong><span>{items.length}</span></header><div>{items.length ? items.map(({ application, job }) => <article className="board-card" key={application.id}><span>{job.company}</span><h2>{job.title}</h2><p>{application.nextStage}</p><small>更新于 {formatChinaDate(application.updatedAt)}</small><small className="board-prep-ready">完整面试文档可打开</small><div className="board-card-actions"><button className="ghost" onClick={() => openJobDetail(job.id, false)} type="button">岗位详情</button><button className="secondary" onClick={() => openJobDetail(job.id, true)} type="button">完整面试文档</button></div></article>) : <p className="board-placeholder">暂无岗位</p>}</div></section>;
                })}
              </div>
            )}
            <div className="activity-layout">
              <section className="surface"><div className="section-label"><strong>最近事件</strong><span>{events.length} 条</span></div>{events.length ? <div className="event-list">{events.slice(0, 8).map((event) => <div key={event.id}><span>{formatChinaDateTime(event.createdAt)}</span><p>{event.summary}</p></div>)}</div> : <p className="muted-copy">状态变化后会在这里形成可追溯记录。</p>}</section>
              <section className="surface"><div className="section-label"><strong>简历版本</strong><span>{resumeVersions.length} 个</span></div>{resumeVersions.length ? <div className="version-list">{resumeVersions.slice(0, 5).map((version, index) => <div key={version.id}><span>{index === 0 ? "当前" : `v${resumeVersions.length - index}`}</span><p><strong>{version.fileName}</strong><small>{version.fileType.toUpperCase()} · {version.textLength} 字符 · {version.competencyIds.length} 项能力</small></p></div>)}</div> : <p className="muted-copy">导入简历后会自动建立版本。</p>}</section>
            </div>
          </section>
        )}

        {step === "automation" && (
          <section className="screen">
            <header className="screen-header split"><div><span className="eyebrow">DAILY JOB</span><h1>每天自动检查一次，不让岗位悄悄过期</h1><p>Local First 版本在页面打开时按计划执行；错过时间会在下次打开时提示补跑。</p></div><span className="count-pill">{dailyJob.enabled ? dailyJob.due ? "待补跑" : "已启用" : "未启用"}</span></header>
            <div className="automation-grid">
              <section className="surface form-stack">
                <div className="section-label"><strong>岗位刷新计划</strong><span>设备本地时间</span></div>
                <label className="toggle-row"><input checked={dailyJob.enabled} onChange={(event) => toggleDailyJob(event.target.checked)} type="checkbox" /><span><strong>启用每日刷新</strong><small>只访问公开连接器，不发送简历、投递或面试数据</small></span></label>
                <label className="field"><span>每天执行时间</span><input className="text-input" disabled={!dailyJob.enabled} onInput={(event) => updateDailyTime((event.target as HTMLInputElement).value)} type="time" value={dailyJob.localTime} /></label>
                <div className="schedule-facts"><span>上次执行<strong>{dailyJob.lastRunAt ? formatChinaDateTime(dailyJob.lastRunAt) : "尚未执行"}</strong></span><span>下次计划<strong>{dailyJob.nextRunAt ? formatChinaDateTime(dailyJob.nextRunAt) : "启用后生成"}</strong></span></div>
                <button className="primary" disabled={!profile || searching} onClick={() => runSearch("full")} type="button">{searching ? "正在刷新…" : dailyJob.due ? "立即补跑" : "立即刷新岗位"}</button>
              </section>
              <section className="surface">
                <div className="section-label"><strong>最近刷新记录</strong><span>{dailyRuns.length} 次</span></div>
                {dailyRuns.length ? <div className="daily-run-list">{dailyRuns.slice(0,8).map((run) => <div key={run.id}><span>{formatChinaDateTime(run.finishedAt)}</span><p><strong>{run.resultCount} 个核验岗位 · {run.recommendedCount} 个推荐</strong><small>{run.degradedSourceIds.length ? `${run.degradedSourceIds.length} 个来源降级` : "公开来源全部正常"}</small></p></div>)}</div> : <p className="muted-copy">完成一次搜索后会在这里留下覆盖与降级记录。</p>}
              </section>
            </div>
            <section className="surface automation-note"><strong>日历和邮箱边界</strong><p>面试时间可在岗位详情中下载带 30 分钟提醒的 .ics；邮箱自动读取尚未接入，避免在 Local First 阶段引入账号授权和云端数据。</p></section>
          </section>
        )}

        {step !== "resume" && !profile && (
          <section className="screen narrow"><div className="notice warning">请先导入简历或使用示例简历。</div><button className="primary" onClick={() => setStep("resume")} type="button">回到简历导入</button></section>
        )}
      </section>
    </main>
  );
}

function ChoiceSection({ children, hint, title }: { children: React.ReactNode; hint: string; title: string }) {
  return <section className="surface choice-section"><div className="section-label"><strong>{title}</strong><span>{hint}</span></div>{children}</section>;
}

function DecisionRow({ label, value }: { label: string; value: string }) {
  return <div className="decision-row"><strong>{label}</strong><span>{value}</span></div>;
}
