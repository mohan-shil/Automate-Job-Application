import { randomUUID } from "node:crypto";
import type { Job, Preferences } from "../types/index.js";

export interface JobSource {
  discover(preferences: Preferences, limit?: number): Promise<Job[]>;
}

export function normalizeJob(input: Partial<Job> & Pick<Job, "title" | "company" | "url">, source = "user-provided"): Job {
  const parsed = new URL(input.url);
  if (parsed.protocol !== "https:") throw new Error("Job URLs must use HTTPS");
  if (parsed.hostname !== "linkedin.com" && !parsed.hostname.endsWith(".linkedin.com") && source === "user-provided") {
    throw new Error("User-provided URLs must be LinkedIn job URLs. Use a supported job board source for other URLs.");
  }
  return {
    id: input.id ?? randomUUID(), title: input.title, company: input.company,
    url: input.url, description: input.description ?? "", location: input.location,
    salary: input.salary, source, status: input.status ?? "discovered",
    discoveredAt: input.discoveredAt ?? new Date().toISOString(), notes: input.notes,
    matchScore: input.matchScore, selectedCvId: input.selectedCvId,
    appliedAt: input.appliedAt, followUpAt: input.followUpAt,
  };
}

export async function discoverGreenhouse(board: string, limit = 100, fetcher: typeof fetch = fetch): Promise<Job[]> {
  if (!/^[a-zA-Z0-9_-]+$/.test(board)) throw new Error("Invalid Greenhouse board identifier");
  const response = await fetcher(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
  if (!response.ok) throw new Error(`Greenhouse returned HTTP ${response.status}`);
  const data = await response.json() as { jobs?: Array<{ id:number; title:string; location?:{name?:string}; absolute_url:string; content?:string; departments?:Array<{name:string}> }> };
  return (data.jobs ?? []).slice(0, limit).map((job) => normalizeJob({
    id: `greenhouse-${job.id}`, title: job.title, company: board,
    url: job.absolute_url, description: (job.content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    location: job.location?.name,
  }, "greenhouse"));
}

export async function discoverLever(company: string, limit = 100, fetcher: typeof fetch = fetch): Promise<Job[]> {
  if (!/^[a-zA-Z0-9_-]+$/.test(company)) throw new Error("Invalid Lever company identifier");
  const response = await fetcher(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
  if (!response.ok) throw new Error(`Lever returned HTTP ${response.status}`);
  const data = await response.json() as Array<{ id:string; text:string; hostedUrl:string; categories?:{ location?:string; team?:string }; descriptionPlain?:string; salaryRange?:{ currency:string; min:number; max:number } }>;
  return data.slice(0, limit).map((job) => normalizeJob({
    id: `lever-${job.id}`, title: job.text, company: job.categories?.team ?? company,
    url: job.hostedUrl, description: job.descriptionPlain ?? "", location: job.categories?.location,
    salary: job.salaryRange ? `${job.salaryRange.currency} ${job.salaryRange.min}–${job.salaryRange.max}` : undefined,
  }, "lever"));
}
