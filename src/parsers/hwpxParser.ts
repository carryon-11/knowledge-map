import { invoke } from "@tauri-apps/api/core";
import type { Parser } from "./types";

/** HWPX(OWPML): Rust 에서 ZIP 풀고 Contents/section*.xml 의 <hp:t> 텍스트 추출. */
export const hwpxParser: Parser = {
  async extract(filePath) {
    try {
      const t = await invoke<string | null>("extract_text", { filePath, fileType: "HWPX" });
      return t && t.trim() ? t : null;
    } catch (e) {
      console.error("HWPX 추출 실패:", e);
      return null;
    }
  },
};
