import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** 시작 시 GitHub 릴리스에서 업데이트 확인 → 배너로 안내, 클릭 시 다운로드·설치·재시작. */
export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await check();
        if (!cancelled && u) setUpdate(u);
      } catch (e) {
        // 릴리스가 아직 없거나(첫 배포 전) 네트워크 문제 → 조용히 무시
        console.warn("업데이트 확인 실패:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  async function install() {
    if (!update) return;
    setBusy(true);
    setStatus("다운로드 준비…");
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setStatus(total ? `다운로드 ${Math.round((downloaded / total) * 100)}%` : "다운로드 중…");
        } else if (event.event === "Finished") {
          // Windows 설치 단계에서 앱이 자동 종료된다(설치기 제약).
          setStatus("설치 시작 — 앱이 곧 종료됩니다. 자동으로 다시 열리지 않으면 직접 실행해 주세요.");
        }
      });
      await relaunch();
    } catch (e) {
      console.error("업데이트 실패:", e);
      setStatus("업데이트 실패: " + String(e));
      setBusy(false);
    }
  }

  return (
    <div className="update-banner">
      <span>
        새 버전 <b>v{update.version}</b> 이(가) 있습니다.
      </span>
      {status && <span className="update-status">{status}</span>}
      <span className="update-spacer" />
      <button className="btn btn-primary" onClick={install} disabled={busy}>
        {busy ? "진행 중…" : "지금 업데이트"}
      </button>
      {!busy && (
        <button className="btn update-later" onClick={() => setUpdate(null)}>
          나중에
        </button>
      )}
    </div>
  );
}
