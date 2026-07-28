import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeResume,
  excludeCurrentCompany,
  inferCurrentCompany,
  isSameCompany,
  sampleResumeText,
} from "../app/lib/domain";
import {
  portfolioApplications,
  portfolioCandidates,
  portfolioPreferences,
  portfolioProfile,
} from "../app/lib/portfolio-seed";
import {
  workspaceApplications,
  workspaceCandidates,
  workspacePreferences,
  workspaceProfile,
} from "../app/lib/workspace-seed";

test("public demo workspace aliases the fictional portfolio seed", () => {
  assert.deepEqual(workspaceProfile, portfolioProfile);
  assert.deepEqual(workspacePreferences, portfolioPreferences);
  assert.deepEqual(workspaceCandidates, portfolioCandidates);
  assert.deepEqual(workspaceApplications, portfolioApplications);
  assert.equal(workspaceProfile.fileName, "林澈-商业化产品经理-虚拟简历.pdf");
});

test("sample onboarding resume is fictional and yields a useful profile", () => {
  const profile = analyzeResume("林澈-虚拟简历.txt", sampleResumeText);
  assert.equal(profile.currentCompany, "拾光生活");
  assert.ok(profile.competencies.length >= 3);
});

test("current company inference and exclusion work on fictional companies", () => {
  assert.equal(
    inferCurrentCompany("当前公司：拾光生活\n职位：商业化产品经理"),
    "拾光生活",
  );
  assert.equal(isSameCompany("拾光生活有限公司", "拾光生活"), true);
  assert.equal(isSameCompany("云帆视频", "拾光生活"), false);

  const jobs = portfolioCandidates.map((candidate) => candidate.job);
  const result = excludeCurrentCompany(
    [
      ...jobs,
      {
        ...jobs[0],
        id: "portfolio-current-company-role",
        company: "拾光生活有限公司",
      },
    ],
    "拾光生活",
  );
  assert.equal(result.excludedCount, 1);
  assert.ok(result.jobs.every((job) => !isSameCompany(job.company, "拾光生活")));
});
