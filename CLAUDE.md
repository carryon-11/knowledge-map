# 개인 지식 구조 앱 (Obsidian 대체)

## 한 줄 정의
루트 → 폴더 → 노트로 내려가는 위계 중심 지식 구조 지도 앱. 그래프가 아니라 위계가 핵심.
파일(HWP/HWPX/PDF/PPT/PPTX/DOCX 등)을 노드에 첨부해 원본 보관 + 메타데이터 관리.

## 스택
Tauri v2 + Vite + React + TypeScript + SQLite(tauri-plugin-sql). 데스크톱, 로컬 우선.

## 핵심 원칙
- 구조와 파일 저장을 먼저 안정화한다. AI는 나중.
- 파일 원본 보관과 메타데이터 저장이 최우선.
- 모든 기능은 추후 AI 요약/검색/RAG로 확장 가능하게 설계.

## 확정된 설계 결정
- 첨부 모델: 파일은 노드가 아니라 노드에 매다는 첨부. 노드 타입은 root/folder/note만.
- 폴더 삭제: 하위 전체 cascade 삭제 + 삭제 전 확인창.
- 파일 삭제: 휴지통 보관(원본 즉시 삭제 금지).
- 한 파일 = 한 노드. 공유 모델 없음. 여러 곳에 필요하면 각각 복사.

## 절대 금지 (MVP 동안)
- AI 기능 추가 금지(요약/분류/태그추천/임베딩 전부 나중).
- HWP(구 바이너리) 파싱 시도 금지 — 원본 저장 + 외부 열기만.
- 스키마 임의 변경 금지.
- 첨부 모델을 노드 모델로 바꾸지 말 것.

## 빌드 순서 (0–5 완료 = MVP 코어 동작)
0. 스캐폴딩 + DB ✅
1. UI 골격 + 트리 ✅
2. 드래그앤드롭 첨부 + 유형 드롭다운 + 휴지통 삭제 ✅
3. 태그 + 메모 ✅
4. 검색 (FTS5 trigram, 한글 부분검색) ✅
5. 파서 어댑터 (PDF/HWPX 추출, HWP/PPT 외부 열기) ✅
6. (후순위) 맵 뷰 ← 다음

## 배포 / 자동 업데이트
- GitHub: https://github.com/carryon-11/knowledge-map (public). 태그 푸시 시 GitHub Actions 가 빌드·서명·릴리스(MSI + latest.json) 자동 생성.
- 새 버전 절차: `src-tauri/tauri.conf.json` 의 version ↑ → commit/push → `git tag vX.Y.Z && git push origin vX.Y.Z`.
- 설치본은 시작 시 latest.json 을 확인해 자동 업데이트. 서명 비밀키(`%USERPROFILE%\.tauri\knowledge-map.key` + 암호 파일)는 분실 금지(분실 시 기존 설치본 업데이트 불가).
- 마이그레이션은 append-only — 이미 적용된 마이그레이션 파일 수정 금지(sqlx 체크섬 불일치로 기존 DB 가 깨짐). 변경은 항상 새 번호로.
