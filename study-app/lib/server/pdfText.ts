import "server-only";
import { PDFParse } from "pdf-parse";
import { StudyError } from "@/lib/server/generate";
export async function extractPDFText(file: File) {
  if (file.size > 5000000 || file.type !== "application/pdf")
    throw new StudyError("Upload a PDF of 5 MB or less.", 413);
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(buffer.slice(0, 5)) !== "%PDF-")
    throw new StudyError("This is not a PDF.", 400);
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    if (info.total > 100)
      throw new StudyError("Use a PDF of 100 pages or fewer.", 413);
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
