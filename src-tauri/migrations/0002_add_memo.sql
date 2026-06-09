-- Harness 3 마이그레이션 (version 2) — append-only. 0001 은 절대 수정하지 않는다.
-- nodes 에 자유 메모 칸 추가(nullable). 기존 행은 memo = NULL.
-- description(짧은 요약, 가운데 패널)과는 별개의 자유 메모(우측 패널).
ALTER TABLE nodes ADD COLUMN memo TEXT;
