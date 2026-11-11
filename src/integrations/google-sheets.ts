import { google } from "googleapis";
import type { Job } from "../types/index.js";
const headers = ["Job title","Company","Job description","Job URL","Location","Salary","Matching percentage","Selected CV","Application date","Application status","Interview / rejection / offer updates","Notes","Follow-up date"];
export async function syncJobsToSheet(jobs: Job[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!spreadsheetId || !credentials) throw new Error("Google Sheets is not configured. Set GOOGLE_SHEET_ID and GOOGLE_APPLICATION_CREDENTIALS, then share the target sheet with the service account.");
  const auth = new google.auth.GoogleAuth({ keyFile:credentials,scopes:["https://www.googleapis.com/auth/spreadsheets"] });
  const sheets = google.sheets({ version:"v4",auth });
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId,range:"A:M" });
  const values = existing.data.values ?? [];
  const knownUrls = new Set(values.slice(1).map((row) => row[3]).filter(Boolean));
  const rows = jobs.filter((job) => !knownUrls.has(job.url)).map((job) => [job.title,job.company,job.description,job.url,job.location ?? "",job.salary ?? "",job.matchScore ?? "",job.selectedCvId ?? "",job.appliedAt ?? "",job.status,"",job.notes ?? "",job.followUpAt ?? ""]);
  if (!values.length) await sheets.spreadsheets.values.update({ spreadsheetId,range:"A1:M1",valueInputOption:"RAW",requestBody:{ values:[headers] } });
  if (rows.length) await sheets.spreadsheets.values.append({ spreadsheetId,range:"A:M",valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",requestBody:{ values:rows } });
}
