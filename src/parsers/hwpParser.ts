import type { Parser } from "./types";

/** 스텁: HWP(구 바이너리)는 의도적으로 추출하지 않음 — 원본 저장 + 외부 열기만. */
export const hwpParser: Parser = {
  async extract() {
    return null;
  },
};
