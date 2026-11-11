#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { JobDatabase } from "./db/database.js";
import { parseCv } from "./services/cv.js";
import { matchJob, writeCoverLetter } from "./services/matching.js";
import { discoverLinkedInJobs } from "./integrations/linkedin.js";
import { syncJobsToSheet } from "./integrations/google-sheets.js";
import { appendDailyReport } from "./integrations/notion.js";
import type { Job, Preferences } from "./types/index.js";

const program = new Command();
program.name("job-agent").description("Discover and prepare job applications for your review").version("0.1.0");
const db = () => new JobDatabase();

program.command("cv:add <file>").description("Parse and save a CV (PDF, DOCX, TXT or MD)").option("-n, --name <name>", "Friendly name").action(async (file: string, options: {name?:string}) => {
  const store=db(); try { const cv=await parseCv(file,options.name); store.addCv(cv); store.log("cv.added",{id:cv.id,name:cv.name,path:cv.path}); console.log(`Added ${cv.name} (${cv.id}) with ${cv.skills.length} extracted terms.`); } finally { store.close(); }
});
program.command("cv:list").description("List saved CVs").action(() => { const store=db(); try { console.table(store.listCvs().map(({id,name,path,skills})=>({id,name,path,terms:skills.length}))); } finally {store.close();} });
program.command("preferences:set").description("Save search preferences as JSON").requiredOption("--file <file>","JSON file with roles, skills, locations, experienceYears, remote, minSalary").action(async ({file}:{file:string}) => {
  const prefs=JSON.parse(await fs.readFile(file,"utf8")) as Preferences;
  if (!Array.isArray(prefs.roles)||!Array.isArray(prefs.skills)||!Array.isArray(prefs.locations)) throw new Error("Preferences must include roles, skills and locations arrays");
  const store=db(); try {store.savePreferences(prefs);store.log("preferences.updated",prefs);console.log("Preferences saved.");} finally {store.close();}
});
program.command("preferences:show").description("Show saved search preferences").action(()=>{const store=db();try{console.log(JSON.stringify(store.getPreferences()??{},null,2));}finally{store.close();}});
program.command("search").description("Discover public LinkedIn jobs and score them against saved CVs").option("-l, --limit <number>","Maximum jobs", "20").option("--sync-sheet", "Sync new discovered jobs to Google Sheets").action(async (options:{limit:string;syncSheet?:boolean})=>{
  const store=db(); try {
    const prefs=store.getPreferences(); if(!prefs) throw new Error("Set preferences first with preferences:set");
    const cvs=store.listCvs(); if(!cvs.length) throw new Error("Add at least one CV first with cv:add");
    const discovered=await discoverLinkedInJobs(prefs,Number(options.limit)); const added:Job[]=[];
    for(const job of discovered){const result=await matchJob(job,cvs,prefs);if(result){job.matchScore=result.score;job.selectedCvId=result.cvId;job.notes=result.rationale;}if(store.upsertJob(job))added.push(job);}
    store.log("jobs.discovered",{count:added.length}); console.table(added.map(j=>({title:j.title,company:j.company,location:j.location,match:`${j.matchScore??0}%`,url:j.url})));
    if(options.syncSheet) await syncJobsToSheet(added);
    console.log(`Saved ${added.length} new jobs. Review with jobs:list; nothing has been submitted.`);
  } finally {store.close();}
});
program.command("jobs:list").description("List tracked jobs").option("--status <status>").action((options:{status?:string})=>{const store=db();try{console.table(store.listJobs(options.status).map(j=>({id:j.id,title:j.title,company:j.company,match:`${j.matchScore??0}%`,status:j.status,url:j.url})));}finally{store.close();}});
program.command("job:prepare <id>").description("Generate a cover letter for review").option("-o, --output <file>","Output path").action(async(id:string,options:{output?:string})=>{
  const store=db();try{const job=store.listJobs().find(j=>j.id===id);if(!job)throw new Error("Job not found");if(!job.selectedCvId)throw new Error("No matching CV selected");const cv=store.getCv(job.selectedCvId);if(!cv)throw new Error("Selected CV no longer exists");const letter=await writeCoverLetter(job,cv);const out=options.output??path.join("data","cover-letters",`${id}.md`);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,letter,{flag:"wx"}).catch(async e=>{if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;await fs.writeFile(`${out}.${Date.now()}.md`,letter);});store.log("cover-letter.prepared",{jobId:id});console.log(`Cover letter saved for review: ${out}`);}finally{store.close();}
});
program.command("application:approve <id>").description("Record that you submitted an application after personally reviewing and submitting it").option("--confirm", "Confirm that you personally reviewed and submitted this application").action((id:string,options:{confirm?:boolean})=>{
  if(!options.confirm)throw new Error("This command requires --confirm. It only records an application you have already personally submitted; it never submits anything for you.");
  const store=db();try{store.updateStatus(id,"applied",new Date().toISOString());store.log("application.user_confirmed",{jobId:id});console.log("Application recorded as applied; no browser form was submitted by the agent.");}finally{store.close();}
});
program.command("daily").description("Find jobs, score opportunities, sync Sheets and write a Notion daily report").option("-l, --limit <number>","Maximum jobs","20").option("--no-integrations","Skip Google Sheets and Notion sync").action(async(options:{limit:string;integrations:boolean})=>{
  const store=db();try{
    const prefs=store.getPreferences();if(!prefs)throw new Error("Set preferences first");const cvs=store.listCvs();if(!cvs.length)throw new Error("Add at least one CV first");
    const found=await discoverLinkedInJobs(prefs,Number(options.limit));const added:Job[]=[];
    for(const job of found){const score=await matchJob(job,cvs,prefs);if(score){job.matchScore=score.score;job.selectedCvId=score.cvId;job.notes=score.rationale;}if(store.upsertJob(job))added.push(job);}
    store.log("daily.complete",{newJobs:added.length});
    if(options.integrations){await syncJobsToSheet(store.listJobs());await appendDailyReport(`Daily job report — ${new Date().toLocaleDateString()}`,`New jobs found: ${added.length}\nTracked jobs: ${store.listJobs().length}\nApplications submitted by agent: 0\nAll applications require your own review and submission.`);}
    console.log(`Daily run complete: ${added.length} new jobs. Review and apply manually.`);
  }finally{store.close();}
});
program.command("job:update <id>").description("Update an application status based on a real event").requiredOption("--status <status>","interview, rejected, offer or withdrawn").option("--notes <notes>").action((id:string,options:{status:string;notes?:string})=>{
  const allowed=["interview","rejected","offer","withdrawn"] as const;if(!allowed.includes(options.status as typeof allowed[number]))throw new Error(`Status must be one of ${allowed.join(", ")}`);
  const store=db();try{store.updateStatus(id,options.status as typeof allowed[number]);if(options.notes)store.db.prepare("UPDATE jobs SET notes=? WHERE id=?").run(options.notes,id);store.log("job.status_updated",{id,status:options.status,notes:options.notes});console.log("Status updated.");}finally{store.close();}
});
program.parseAsync().catch((error:unknown)=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
