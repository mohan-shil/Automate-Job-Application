import { afterEach, describe, expect, it } from "vitest";
import { syncJobsToSheet } from "../src/integrations/google-sheets.js";
import { appendDailyReport } from "../src/integrations/notion.js";
const names=["GOOGLE_SHEET_ID","GOOGLE_APPLICATION_CREDENTIALS","NOTION_API_KEY","NOTION_PAGE_ID"] as const;
const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
afterEach(()=>{for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}});
describe("external integration configuration",()=>{
  it("fails clearly when Google Sheets credentials are missing",async()=>{
    delete process.env.GOOGLE_SHEET_ID;delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    await expect(syncJobsToSheet([])).rejects.toThrow("Google Sheets is not configured");
  });
  it("fails clearly when Notion access is missing",async()=>{
    delete process.env.NOTION_API_KEY;delete process.env.NOTION_PAGE_ID;
    await expect(appendDailyReport("Test","Report")).rejects.toThrow("Notion is not configured");
  });
});
