# knowledge-map

루트 → 폴더 → 노트로 내려가는 **위계 중심 개인 지식 구조 앱** (Obsidian 대체). 그래프가 아니라 위계가 핵심이며, 파일을 노드에 첨부해 원본 보관 + 메타데이터를 관리합니다.

데스크톱 앱 — **Tauri v2 + React + TypeScript + SQLite**.

## 기능
- 3-pane: 좌측 트리(root/folder/note CRUD) · 중앙 노드 상세 편집 · 우측 첨부/태그/메모
- **파일 드래그앤드롭 첨부** — 원본 보관, 파일 유형 선택, 휴지통 soft-delete
- **태그**(재사용·중복방지) · **자유 메모**
- **전문검색(FTS5 trigram)** — 한글 부분검색, 결과 클릭 시 노드로 점프
- **텍스트 추출** — PDF·HWPX 본문을 추출해 검색에 자동 색인(HWP/PPT 등은 외부 열기)
- **자동 업데이트** — GitHub Releases 기반, 새 버전 출시 시 앱이 스스로 업데이트

## 설치
[Releases](https://github.com/carryon-11/knowledge-map/releases) 에서 최신 `.msi` 를 받아 설치하세요. 이후 새 버전이 나오면 앱 실행 시 자동으로 업데이트됩니다. (데이터는 `%LOCALAPPDATA%\com.knowledgemap.app\` 에 보관되어 업데이트에도 유지됩니다.)

## 개발
```bash
npm install
npm run tauri dev      # 개발 실행
npm run tauri build    # 로컬 릴리스 빌드(MSI)
```
> 빌드 전제: Rust(stable-msvc) + Microsoft C++ Build Tools + WebView2.

## 새 버전 배포 (자동 업데이트)
`src-tauri/tauri.conf.json` 의 `version` 을 올린 뒤, 같은 버전으로 태그를 푸시하면 GitHub Actions가 빌드·서명·릴리스를 자동 생성합니다.
```bash
git tag v0.2.0
git push origin v0.2.0
```
서명 키는 GitHub Secrets(`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`)에 저장돼 있습니다.
