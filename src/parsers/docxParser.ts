import type { Parser } from "./types";

/** 스텁: DOCX 추출 미지원(외부 열기로). 인터페이스만 유지 — 추후 구현 자리. */
export const docxParser: Parser = {
  async extract() {
    return null;
  },
};
