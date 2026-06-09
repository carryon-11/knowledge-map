export interface Parser {
  /** 텍스트 추출. 미지원/실패 시 null(= 외부 열기로). 절대 throw 하지 않는다. */
  extract(filePath: string): Promise<string | null>;
}
