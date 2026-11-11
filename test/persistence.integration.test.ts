import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JobDatabase } from "../src/db/database.js";
import { parseCv } from "../src/services/cv.js";
import { matchJob } from "../src/services/matching.js";
import type { Job } from "../src/types/index.js";

const tempDirs:string[]=[];
afterEach(async()=>{await Promise.all(tempDirs.splice(0).map(d=>fs.rm(d,{recursive:true,force:true})));});
describe("SQLite and CV matching integration",()=>{
  it("persists imported sample CV, preferences, and scored job across database reopen",async()=>{
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),"job-agent-"));tempDirs.push(dir);
    const cvPath=path.join(dir,"backend-cv.txt");await fs.writeFile(cvPath,"Backend Engineer. TypeScript Node.js PostgreSQL distributed systems.");
    const cv=await parseCv(cvPath,"Backend CV");
    const job:Job={id:"sample-job",title:"Backend Engineer",company:"Example Co",url:"https://www.linkedin.com/jobs/view/98765",description:"TypeScript and PostgreSQL experience",source:"user-provided",status:"discovered",discoveredAt:new Date().toISOString()};
    const match=await matchJob(job,[cv],{roles:["Backend Engineer"],skills:["TypeScript","PostgreSQL"],locations:["Warsaw"]});
    expect(match?.cvId).toBe(cv.id);expect(match?.score).toBeGreaterThan(0);
    const filename=path.join(dir,"data.sqlite");let db=new JobDatabase(filename);
    db.addCv(cv);db.savePreferences({roles:["Backend Engineer"],skills:["TypeScript","PostgreSQL"],locations:["Warsaw"]});
    expect(db.upsertJob({...job,matchScore:match?.score,selectedCvId:match?.cvId})).toBe(true);db.close();
    db=new JobDatabase(filename);expect(db.listCvs()[0]?.name).toBe("Backend CV");expect(db.getPreferences()?.locations).toEqual(["Warsaw"]);
    expect(db.listJobs()[0]).toMatchObject({id:"sample-job",matchScore:match?.score,selectedCvId:cv.id});db.close();
  });
});
