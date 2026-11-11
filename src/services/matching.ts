import OpenAI from "openai";
import type { Cv, Job, Preferences } from "../types/index.js";
import { extractTerms } from "./cv.js";

export interface MatchResult { score: number; cvId: string; rationale: string; }
export async function matchJob(job: Job, cvs: Cv[], preferences?: Preferences): Promise<MatchResult | undefined> {
  if (!cvs.length) return undefined;
  const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : undefined;
  if (client) {
    try {
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Evaluate candidate-to-job fit using only supplied facts. Return JSON {score: integer 0-100, cvId: string, rationale: string}. Never infer qualifications not in the CV." },
          { role: "user", content: JSON.stringify({ job: { title:job.title,description:job.description,location:job.location }, preferences, cvs: cvs.map((cv) => ({ id:cv.id,name:cv.name,text:cv.text.slice(0,9000) })) }) }
        ]
      });
      const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}");
      const selected = cvs.find((cv) => cv.id === parsed.cvId);
      if (selected && Number.isFinite(parsed.score)) return { score: Math.max(0,Math.min(100,Math.round(parsed.score))), cvId:selected.id, rationale:String(parsed.rationale ?? "") };
    } catch (error) { console.warn("OpenAI matching unavailable; using local keyword matching:", error instanceof Error ? error.message : error); }
  }
  const jobTerms = new Set(extractTerms(`${job.title} ${job.description} ${preferences?.roles.join(" ") ?? ""} ${preferences?.skills.join(" ") ?? ""}`));
  let best: MatchResult | undefined;
  for (const cv of cvs) {
    const terms = new Set([...cv.skills, ...extractTerms(cv.text)]);
    const overlap = [...jobTerms].filter((term) => terms.has(term));
    const score = Math.round((overlap.length / Math.max(jobTerms.size, 1)) * 100);
    if (!best || score > best.score) best = { score, cvId:cv.id, rationale:`Keyword overlap: ${overlap.slice(0,8).join(", ") || "limited"}` };
  }
  return best;
}

export async function writeCoverLetter(job: Job, cv: Cv): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY to generate a tailored cover letter");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await client.chat.completions.create({ model:process.env.OPENAI_MODEL ?? "gpt-4o-mini", messages:[
    { role:"system",content:"Draft a concise, truthful cover letter using only the CV and job details supplied. Do not invent achievements, experience, or contact information. Clearly leave placeholders for missing personal details." },
    { role:"user",content:JSON.stringify({ job:{title:job.title,company:job.company,description:job.description},cv:cv.text.slice(0,12000) }) }
  ]});
  return result.choices[0]?.message.content ?? "";
}
