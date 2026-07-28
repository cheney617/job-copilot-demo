import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the fictional public demo workspace by default", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>求职工作台<\/title>/i);
  assert.match(html, /林澈的求职总览/);
  assert.match(html, /作品集演示 · 全部为虚拟数据/);
  assert.match(html, /今日有 \d+ 场面试|今日无面试，下一场已为你置顶/);
  assert.match(html, /打开完整面试文档/);
  assert.match(html, /当前在行机会/);
  assert.match(html, /AI 会员产品经理/);
  assert.match(html, /高级产品经理·会员增长/);
  assert.match(html, /演示模式不会访问真实岗位或账号/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("starter preview is removed", async () => {
  await assert.rejects(access(new URL("app/_sites-preview", root)));
});

test("dashboard adapts to a constrained in-app browser panel", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");
  const component = await readFile(new URL("app/JobCopilotApp.tsx", root), "utf8");
  const constrainedLayout = css.match(
    /@media \(max-width: 1240px\) \{([\s\S]*?)\n\}/,
  )?.[1] ?? "";
  const mobileLayout = css.match(
    /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/,
  )?.[1] ?? "";

  assert.match(constrainedLayout, /\.dashboard-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(constrainedLayout, /\.pipeline-row \{ grid-template-columns: 64px minmax\(0, 1fr\) auto;/);
  assert.match(constrainedLayout, /\.recommendation-stack \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(mobileLayout, /\.jd-match-list article \{ grid-template-columns: 1fr; \}/);
  assert.match(component, /buildCompleteInterviewPrep\(/);
  assert.ok(
    (component.match(/openJobDetail\(job\.id, true\)/g) ?? []).length >= 3,
    "dashboard, alerts and board should open complete prep directly",
  );
});

test("unknown query values fall back to the fictional workspace", async () => {
  const response = await render("/?portfolio=unexpected");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /林澈的求职总览/);
  assert.match(html, /全部为虚拟数据/);
});
