import { describe, expect, it } from "vitest";
import { matchJob } from "../src/services/matching.js";
import type { Cv, Job } from "../src/types/index.js";

describe("matchJob", () => {
  it("selects the CV with the strongest role and skill overlap", async () => {
    const cvs: Cv[] = [
      { id:"design",name:"Design",path:"design.txt",text:"UX design Figma research",roles:[],skills:["figma","research"],createdAt:"" },
      { id:"backend",name:"Backend",path:"backend.txt",text:"TypeScript Node.js PostgreSQL API engineer",roles:[],skills:["typescript","node.js","postgresql"],createdAt:"" }
    ];
    const job: Job = { id:"1",title:"Backend Engineer",company:"Acme",url:"https://example.com/job",description:"TypeScript Node.js PostgreSQL API",source:"test",status:"discovered",discoveredAt:"" };
    const result = await matchJob(job,cvs,{roles:["Backend Engineer"],skills:["TypeScript","Node.js"],locations:[]});
    expect(result?.cvId).toBe("backend");
    expect(result?.score).toBeGreaterThan(0);
  });
  it("returns undefined when there are no CVs", async () => {
    const job: Job = { id:"1",title:"Engineer",company:"Acme",url:"https://example.com",description:"",source:"test",status:"discovered",discoveredAt:"" };
    expect(await matchJob(job,[])).toBeUndefined();
  });
});
