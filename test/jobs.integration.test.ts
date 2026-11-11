import { describe, expect, it, vi } from "vitest";
import { discoverGreenhouse, discoverLever, normalizeJob } from "../src/integrations/jobs.js";

describe("permitted job sources",()=>{
  it("accepts user-provided LinkedIn URLs without fetching them",()=>{
    const job=normalizeJob({title:"Engineer",company:"Example",url:"https://www.linkedin.com/jobs/view/123"});
    expect(job.source).toBe("user-provided");expect(job.description).toBe("");
  });
  it("rejects non-LinkedIn URLs from manual LinkedIn import",()=>{
    expect(()=>normalizeJob({title:"Engineer",company:"Example",url:"https://example.com/job"})).toThrow("LinkedIn job URLs");
  });
  it("maps public Greenhouse board data",async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({jobs:[{id:4,title:"Platform Engineer",absolute_url:"https://boards.greenhouse.io/acme/jobs/4",content:"<p>Node.js role</p>",location:{name:"Warsaw"}}]}),{status:200}));
    const jobs=await discoverGreenhouse("acme",10,fetcher as typeof fetch);
    expect(fetcher).toHaveBeenCalledOnce();expect(jobs[0]).toMatchObject({id:"greenhouse-4",title:"Platform Engineer",location:"Warsaw",source:"greenhouse"});
  });
  it("maps public Lever board data",async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify([{id:"l1",text:"Backend Engineer",hostedUrl:"https://jobs.lever.co/acme/l1",descriptionPlain:"TypeScript",categories:{location:"Remote",team:"Platform"}}]),{status:200}));
    const jobs=await discoverLever("acme",10,fetcher as typeof fetch);
    expect(jobs[0]).toMatchObject({id:"lever-l1",company:"Platform",location:"Remote",description:"TypeScript",source:"lever"});
  });
});
