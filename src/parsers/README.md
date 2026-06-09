# parsers — 문서 텍스트 추출 어댑터 (H5)

file_type 별 어댑터 + 디스패처(`index.ts`의 `extractForFile`). 공통 인터페이스 `Parser.extract(filePath) => Promise<string | null>`.

- **구현**: `pdfParser`(PDF), `hwpxParser`(HWPX) — Rust `extract_text` 커맨드 호출.
- **스텁**: `pptxParser` / `hwpParser` / `docxParser` — null 반환(추출 미지원, 외부 열기로).
  HWP(구 바이너리)는 의도적으로 추출하지 않는다.

추출 텍스트는 `files.extracted_text` 에 저장되고, H4 의 FTS 트리거(`files_au`)가 자동 재색인 → 파일 내용으로 검색된다. 추출은 best-effort(실패/깨진 파일은 null, 크래시 없음).
