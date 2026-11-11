import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import type { Job, Preferences } from "../types/index.js";

function buildSearchUrl(prefs: Preferences): string {
  const base = process.env.LINKEDIN_SEARCH_URL ?? "https://www.linkedin.com/jobs/search/";
  const url = new URL(base);
  const terms = [...prefs.roles, ...prefs.skills].slice(0, 12).join(" ");
  if (terms) url.searchParams.set("keywords", terms);
  if (prefs.locations[0]) url.searchParams.set("location", prefs.locations[0]);
  url.searchParams.set("f_TPR", "r604800");
  return url.toString();
}
export async function discoverLinkedInJobs(prefs: Preferences, limit = 20): Promise<Job[]> {
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({ userAgent:"Mozilla/5.0 (compatible; JobDiscoveryAgent/1.0)" });
    const response = await page.goto(buildSearchUrl(prefs), { waitUntil:"domcontentloaded", timeout:30000 });
    if (response && [401,403,429].includes(response.status())) throw new Error(`LinkedIn returned ${response.status()}; discovery stopped. No attempt was made to bypass access controls.`);
    if (/checkpoint|captcha|challenge/i.test(page.url()) || await page.locator("input[name='captcha']").count()) throw new Error("LinkedIn presented a security challenge. Discovery stopped; complete any required checks manually in your browser.");
    await page.locator("body").waitFor({ timeout:10000 });
    const cards = await page.locator(".base-card, .job-search-card, .jobs-search__results-list li").evaluateAll((els) => els.slice(0, 50).map((el) => {
      const anchor = el.querySelector("a.base-card__full-link, a.job-search-card__link, a[href*='/jobs/view/']") as HTMLAnchorElement | null;
      const text = (el as HTMLElement).innerText;
      const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
      return { title:el.querySelector("h3")?.textContent?.trim() ?? lines[0] ?? "", company:el.querySelector("h4")?.textContent?.trim() ?? lines[1] ?? "", location:el.querySelector(".job-search-card__location")?.textContent?.trim() ?? lines[2] ?? "", url:anchor?.href ?? "" };
    }));
    const jobs: Job[] = [];
    for (const card of cards) {
      if (!card.url || !card.title) continue;
      const url = card.url.split("?")[0]!;
      let description = "";
      try {
        await page.goto(url, { waitUntil:"domcontentloaded", timeout:20000 });
        description = (await page.locator(".show-more-less-html__markup, .description__text, .decorated-job-posting__details").first().innerText({ timeout:4000 })).slice(0,12000);
      } catch { /* Public listing still useful if description markup is unavailable. */ }
      jobs.push({ id:randomUUID(),title:card.title,company:card.company || "Unknown",url,description,location:card.location,source:"linkedin-public",status:"discovered",discoveredAt:new Date().toISOString() });
      if (jobs.length >= limit) break;
    }
    return jobs;
  } finally { await browser.close(); }
}
