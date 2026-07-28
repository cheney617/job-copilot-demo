import type { Metadata } from "next";
import { JobCopilotApp } from "./JobCopilotApp";

export const metadata: Metadata = {
  title: "求职工作台",
  description: "从核心竞争力到岗位、投递和面试追踪的 Local First 求职工作台。",
};

export default function Home() {
  return <JobCopilotApp />;
}
