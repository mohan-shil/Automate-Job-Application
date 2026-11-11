import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Cv } from "../types/index.js";

const stop = new Set(["about","above","after","again","against","being","could","from","have","into","more","other","their","there","these","those","which","while","with","years","your","will","would","this","that","them","they","what","when","where","were","been","also","using","used"]);
export function extractTerms(text: string): string[] {
  const terms = text.toLowerCase().match(/[a-z][a-z+#.-]{1,}/g) ?? [];
  return [...new Set(terms.filter((t) => !stop.has(t) && t.length > 2))];
}
export async function parseCv(filePath: string, name = path.basename(filePath)): Promise<Cv> {
  const ext = path.extname(filePath).toLowerCase();
  let text: string;
  if (ext === ".txt" || ext === ".md") text = await fs.readFile(filePath, "utf8");
  else if (ext === ".pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    text = (await pdfParse(await fs.readFile(filePath))).text;
  } else if (ext === ".docx") {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ path: filePath })).value;
  } else throw new Error("Supported CV formats: .pdf, .docx, .txt, .md");
  if (!text.trim()) throw new Error("No readable text found in CV");
  return { id: randomUUID(), name, path: path.resolve(filePath), text, roles: [], skills: extractTerms(text), createdAt: new Date().toISOString() };
}
