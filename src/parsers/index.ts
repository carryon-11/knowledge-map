import type { Parser } from "./types";
import { pdfParser } from "./pdfParser";
import { hwpxParser } from "./hwpxParser";
import { pptxParser } from "./pptxParser";
import { hwpParser } from "./hwpParser";
import { docxParser } from "./docxParser";

/** file_type → 파서. 구현: PDF/HWPX. 나머지는 스텁(null = 추출 미지원). */
const PARSERS: Record<string, Parser> = {
  PDF: pdfParser,
  HWPX: hwpxParser,
  PPTX: pptxParser,
  HWP: hwpParser,
  DOCX: docxParser,
};

/** 추출을 시도하는 타입인지(= PDF/HWPX). */
export function isExtractable(fileType: string): boolean {
  return fileType === "PDF" || fileType === "HWPX";
}

/** file_type 에 맞는 파서로 추출. 미지원/실패 → null(파일은 그대로 저장·열기 가능). */
export async function extractForFile(filePath: string, fileType: string): Promise<string | null> {
  const parser = PARSERS[fileType];
  if (!parser) return null;
  return parser.extract(filePath);
}

export type { Parser };
