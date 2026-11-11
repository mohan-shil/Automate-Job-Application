import { afterEach, describe, expect, it } from "vitest";
import { JobDatabase } from "../src/db/database.js";
import type { Job } from "../src/types/index.js";

let db: JobDatabase | undefined;
afterEach(()=>{db?.close();db=undefined;});
const job: Job = { id:"abc",title:"Engineer",company:"Acme",url:"https://example.com/job/1",description:"Role",source:"test",status:"discovered",discoveredAt:"2026-11-11T00:00:00.000Z" };
describe("JobDatabase",()=>{
  it("stores preferences and prevents duplicate job URLs",()=>{
    db=new JobDatabase(":memory:");db.savePreferences({roles:["Engineer"],skills:["TypeScript"],locations:["Warsaw"]});
    expect(db.getPreferences()?.roles).toEqual(["Engineer"]);
    expect(db.upsertJob(job)).toBe(true);expect(db.upsertJob({...job,id:"duplicate"})).toBe(false);
    expect(db.listJobs()).toHaveLength(1);
  });
  it("updates status only for existing jobs",()=>{
    db=new JobDatabase(":memory:");db.upsertJob(job);db.updateStatus("abc","applied","2026-11-11T01:00:00.000Z");
    expect(db.listJobs()[0]?.status).toBe("applied");
    expect(()=>db!.updateStatus("missing","offer")).toThrow("not found");
  });
});
