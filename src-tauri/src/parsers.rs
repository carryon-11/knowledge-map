// H5: 텍스트 추출 — PDF / HWPX 만 구현. 그 외 타입은 None(= 추출 미지원, 외부 열기로).
// best-effort: 깨진/예상외 파일은 None 반환, 절대 크래시하지 않는다(패닉도 격리).

use std::io::Read;
use std::path::Path;

use quick_xml::events::Event;
use quick_xml::reader::Reader;

/// 첨부 파일에서 텍스트를 추출한다. file_path 는 storage 베이스 기준 상대경로.
/// 지원 타입(PDF/HWPX) 외에는 None. 추출 실패/패닉 시에도 None(크래시 금지).
#[tauri::command]
pub fn extract_text(file_path: String, file_type: String) -> Option<String> {
    let abs = crate::app_data_dir().ok()?.join("storage").join(&file_path);
    if !abs.is_file() {
        return None;
    }
    // pdf-extract 등은 깨진 입력에서 패닉할 수 있으므로 격리한다.
    let result =
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| match file_type.as_str() {
            "PDF" => extract_pdf(&abs),
            "HWPX" => extract_hwpx(&abs),
            _ => None,
        }));
    result.unwrap_or(None)
}

fn nonempty(s: String) -> Option<String> {
    let t = s.trim();
    if t.is_empty() {
        None
    } else {
        Some(t.to_string())
    }
}

/// PDF: 텍스트 기반 PDF 대상. 스캔/이미지 PDF 는 텍스트가 없어 None(OCR 없음, 정상).
fn extract_pdf(path: &Path) -> Option<String> {
    match pdf_extract::extract_text(path) {
        Ok(text) => nonempty(text),
        Err(_) => None,
    }
}

/// HWPX(OWPML): ZIP 컨테이너의 Contents/section*.xml 에서 <hp:t> 본문 텍스트를 모은다.
fn extract_hwpx(path: &Path) -> Option<String> {
    let file = std::fs::File::open(path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;

    // Contents/section*.xml 항목명을 정렬해 순서 보장(section0, section1 ...)
    let mut sections: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        if let Ok(f) = archive.by_index(i) {
            let name = f.name().to_string();
            let lower = name.to_lowercase().replace('\\', "/");
            if lower.starts_with("contents/section") && lower.ends_with(".xml") {
                sections.push(name);
            }
        }
    }
    sections.sort();

    let mut out = String::new();
    for name in &sections {
        if let Ok(mut entry) = archive.by_name(name) {
            let mut xml = String::new();
            if entry.read_to_string(&mut xml).is_ok() {
                collect_hp_t_text(&xml, &mut out);
            }
        }
    }
    nonempty(out)
}

/// section XML 에서 local-name 이 't' 인 요소(= <hp:t>)의 텍스트를 모은다.
/// 네임스페이스 접두사에 무관하게 local-name 으로 매칭한다.
fn collect_hp_t_text(xml: &str, out: &mut String) {
    let mut reader = Reader::from_str(xml);
    let mut depth_t: u32 = 0;
    loop {
        match reader.read_event() {
            Ok(Event::Start(e)) => {
                if e.name().local_name().as_ref() == b"t" {
                    depth_t += 1;
                }
            }
            Ok(Event::End(e)) => {
                if e.name().local_name().as_ref() == b"t" {
                    depth_t = depth_t.saturating_sub(1);
                    out.push('\n');
                }
            }
            Ok(Event::Text(e)) => {
                if depth_t > 0 {
                    if let Ok(text) = e.decode() {
                        out.push_str(&unescape_basic(&text));
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break, // best-effort: 파싱 오류 시 여기까지만
            _ => {}
        }
    }
}

/// 흔한 XML 엔티티만 간단 복원(best-effort). &amp; 는 마지막에.
fn unescape_basic(s: &str) -> String {
    s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
}
