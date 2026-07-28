/**
 * Public demo compatibility layer.
 *
 * The application historically imports `workspace*` symbols. In this
 * standalone demo every one of those symbols is backed by the fictional
 * 林澈 portfolio seed, so no private workspace record can enter source,
 * server-rendered HTML, or a client bundle.
 */
export {
  portfolioApplications as workspaceApplications,
  portfolioBrowserSource as workspaceBrowserSource,
  portfolioCandidates as workspaceCandidates,
  portfolioCheckedAt as workspaceCheckedAt,
  portfolioDailyJob as workspaceDailyJob,
  portfolioDailyRuns as workspaceDailyRuns,
  portfolioEvents as workspaceEvents,
  portfolioJobPostings as workspaceJobPostings,
  portfolioPreferences as workspacePreferences,
  portfolioProfile as workspaceProfile,
  portfolioResumeVersions as workspaceResumeVersions,
  portfolioSourceHealth as workspaceSourceHealth,
  portfolioSourceNote as workspaceSourceNote,
} from "./portfolio-seed";

export const workspaceSnapshotVersion = 2026072806;
