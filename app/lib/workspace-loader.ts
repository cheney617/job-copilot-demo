import type {
  ApplicationEvent,
  ApplicationRecord,
  Candidate,
  DailyJobSettings,
  DailyRun,
  JobPostingRecord,
  Preferences,
  ResumeProfile,
  ResumeVersion,
  SourceHealth,
} from "./domain";

/**
 * 本地数据模式：AI 参谋把这个文件写到 public/data/workspace.json，
 * 界面在启动时读取、之后按 generatedAt 变化增量刷新。
 * 所有字段可选——缺失的字段回落到演示种子数据。
 */
export interface WorkspaceFile {
  /** 每次写入都必须更新（ISO 时间串），界面靠它判断"有新数据" */
  generatedAt: string;
  sourceNote?: string;
  checkedAt?: string;
  profile?: ResumeProfile;
  preferences?: Preferences;
  candidates?: Candidate[];
  jobPostings?: Record<string, JobPostingRecord>;
  applications?: Record<string, ApplicationRecord>;
  resumeVersions?: ResumeVersion[];
  events?: ApplicationEvent[];
  sourceHealth?: SourceHealth[];
  dailyJob?: DailyJobSettings;
  dailyRuns?: DailyRun[];
  currentCompanyExcludedCount?: number;
}

export async function loadWorkspaceFile(): Promise<WorkspaceFile | null> {
  try {
    const res = await fetch(`/data/workspace.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as WorkspaceFile;
    if (!data || typeof data.generatedAt !== "string") return null;
    return data;
  } catch {
    return null;
  }
}
