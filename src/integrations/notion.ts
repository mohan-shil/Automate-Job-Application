import { Client } from "@notionhq/client";
export async function appendDailyReport(title: string, report: string): Promise<void> {
  const token = process.env.NOTION_API_KEY, pageId = process.env.NOTION_PAGE_ID;
  if (!token || !pageId) throw new Error("Notion is not configured. Set NOTION_API_KEY and NOTION_PAGE_ID, then grant the integration access to the project page.");
  const notion = new Client({ auth:token });
  const paragraphs = report.split("\n").filter(Boolean).slice(0,80).map((line) => ({ object:"block" as const,type:"paragraph" as const,paragraph:{ rich_text:[{ type:"text" as const,text:{ content:line.slice(0,1800) } }] } }));
  await notion.blocks.children.append({ block_id:pageId,children:[{ object:"block",type:"heading_2",heading_2:{rich_text:[{type:"text",text:{content:title}}]} },...paragraphs] });
}
