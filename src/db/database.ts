import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Cv, Job, Preferences } from "../types/index.js";

const schema = `
CREATE TABLE IF NOT EXISTS cvs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL, text TEXT NOT NULL,
  roles TEXT NOT NULL DEFAULT '[]', skills TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '', location TEXT, salary TEXT, source TEXT NOT NULL,
  match_score REAL, selected_cv_id TEXT REFERENCES cvs(id), status TEXT NOT NULL DEFAULT 'discovered',
  discovered_at TEXT NOT NULL, applied_at TEXT, notes TEXT, follow_up_at TEXT
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
);
`;

export class JobDatabase {
  readonly db: Database.Database;
  constructor(filename = process.env.DATABASE_PATH ?? "./data/jobs.sqlite") {
    if (filename !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(schema);
  }
  addCv(cv: Cv): void {
    this.db.prepare(`INSERT INTO cvs (id,name,path,text,roles,skills,created_at) VALUES (@id,@name,@path,@text,@roles,@skills,@createdAt)`)
      .run({ ...cv, roles: JSON.stringify(cv.roles), skills: JSON.stringify(cv.skills), createdAt: cv.createdAt });
  }
  listCvs(): Cv[] {
    return this.db.prepare("SELECT id,name,path,text,roles,skills,created_at AS createdAt FROM cvs ORDER BY created_at DESC").all().map((r: any) => ({ ...r, roles: JSON.parse(r.roles), skills: JSON.parse(r.skills) }));
  }
  getCv(id: string): Cv | undefined { return this.listCvs().find((cv) => cv.id === id); }
  savePreferences(prefs: Preferences): void {
    this.db.prepare("INSERT INTO preferences (id,data,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at")
      .run(JSON.stringify(prefs), new Date().toISOString());
  }
  getPreferences(): Preferences | undefined {
    const row = this.db.prepare("SELECT data FROM preferences WHERE id=1").get() as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }
  upsertJob(job: Job): boolean {
    const result = this.db.prepare(`INSERT OR IGNORE INTO jobs
      (id,title,company,url,description,location,salary,source,match_score,selected_cv_id,status,discovered_at,applied_at,notes,follow_up_at)
      VALUES (@id,@title,@company,@url,@description,@location,@salary,@source,@matchScore,@selectedCvId,@status,@discoveredAt,@appliedAt,@notes,@followUpAt)`).run({
        ...job,
        location: job.location ?? null,
        salary: job.salary ?? null,
        matchScore: job.matchScore ?? null,
        selectedCvId: job.selectedCvId ?? null,
        appliedAt: job.appliedAt ?? null,
        notes: job.notes ?? null,
        followUpAt: job.followUpAt ?? null,
      });
    return result.changes > 0;
  }
  listJobs(status?: string): Job[] {
    const rows = (status
      ? this.db.prepare("SELECT * FROM jobs WHERE status=? ORDER BY match_score DESC, discovered_at DESC").all(status)
      : this.db.prepare("SELECT * FROM jobs ORDER BY match_score DESC, discovered_at DESC").all()) as any[];
    return rows.map((r) => ({ id:r.id,title:r.title,company:r.company,url:r.url,description:r.description,location:r.location,salary:r.salary,source:r.source,matchScore:r.match_score,selectedCvId:r.selected_cv_id,status:r.status,discoveredAt:r.discovered_at,appliedAt:r.applied_at,notes:r.notes,followUpAt:r.follow_up_at }));
  }
  updateStatus(id: string, status: Job["status"], appliedAt?: string): void {
    const result = this.db.prepare("UPDATE jobs SET status=?, applied_at=COALESCE(?,applied_at) WHERE id=?").run(status, appliedAt ?? null, id);
    if (!result.changes) throw new Error(`Job ${id} not found`);
  }
  log(kind: string, details: unknown): void {
    this.db.prepare("INSERT INTO activity (kind,details,created_at) VALUES (?,?,?)").run(kind, JSON.stringify(details), new Date().toISOString());
  }
  close(): void { this.db.close(); }
}
