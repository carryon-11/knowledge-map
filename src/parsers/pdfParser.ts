import { invoke } from "@tauri-apps/api/core";
import type { Parser } from "./types";

/** PDF: Rust pdf-extract 로 텍스트 추출(텍스트 기반 PDF; 스캔본은 OCR 없어 null). */
export const pdfParser: Parser = {
  async extract(filePath) {
    try {
      const t = await invoke<string | null>("extract_text", { filePath, fileType: "PDF" });
      return t && t.trim() ? t : null;
    } catch (e) {
      console.error("PDF 추출 실패:", e);
      return null;
    }
  },
};
