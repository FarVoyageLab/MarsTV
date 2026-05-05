use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, fs, path::PathBuf};
use tauri::{
    http::{header, HeaderMap, Request, Response, StatusCode},
    menu::{Menu, MenuItem},
    path::BaseDirectory,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, UriSchemeResponder,
};

const DOUBAN_REFERER: &str = "https://movie.douban.com/";
const DOUBAN_USER_AGENT: &str =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CMS_USER_AGENT: &str = "Mozilla/5.0 (compatible; MarsTV/0.1; +https://github.com/marstv)";
const PROXY_CORS_ORIGIN: &str = "*";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DoubanRequest {
    #[serde(rename = "type")]
    media_type: String,
    tag: String,
    page_size: Option<u32>,
    page_start: Option<u32>,
    sort: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpstreamDoubanSubject {
    rate: Option<String>,
    title: Option<String>,
    url: Option<String>,
    playable: Option<bool>,
    cover: Option<String>,
    id: Option<String>,
    is_new: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct UpstreamDoubanResponse {
    subjects: Option<Vec<UpstreamDoubanSubject>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DoubanItem {
    id: String,
    title: String,
    rate: String,
    cover: String,
    url: String,
    is_new: bool,
    playable: bool,
}

#[derive(Debug, Serialize)]
struct DoubanResult {
    items: Vec<DoubanItem>,
}

#[derive(Debug, Deserialize, Serialize)]
struct CmsSource {
    key: String,
    name: Option<String>,
    api: String,
    detail: Option<String>,
    adult: Option<bool>,
    enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct RawCmsItem {
    vod_id: Option<serde_json::Value>,
    vod_name: Option<serde_json::Value>,
    vod_pic: Option<serde_json::Value>,
    type_name: Option<serde_json::Value>,
    vod_year: Option<serde_json::Value>,
    vod_area: Option<serde_json::Value>,
    vod_content: Option<serde_json::Value>,
    vod_remarks: Option<serde_json::Value>,
    vod_play_from: Option<serde_json::Value>,
    vod_play_url: Option<serde_json::Value>,
    vod_time: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct RawCmsResponse {
    code: Option<serde_json::Value>,
    msg: Option<serde_json::Value>,
    page: Option<serde_json::Value>,
    pagecount: Option<serde_json::Value>,
    total: Option<serde_json::Value>,
    list: Option<Vec<RawCmsItem>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CmsVideoItem {
    source: String,
    id: String,
    title: String,
    poster: Option<String>,
    category: Option<String>,
    year: Option<String>,
    area: Option<String>,
    desc: Option<String>,
    remarks: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CmsSearchResult {
    list: Vec<CmsVideoItem>,
    total: u32,
    page: u32,
    page_count: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CmsEpisode {
    title: String,
    url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CmsPlayLine {
    name: String,
    episodes: Vec<CmsEpisode>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CmsVideoDetail {
    source: String,
    id: String,
    title: String,
    poster: Option<String>,
    category: Option<String>,
    year: Option<String>,
    area: Option<String>,
    desc: Option<String>,
    remarks: Option<String>,
    lines: Vec<CmsPlayLine>,
    update_time: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    api_origin: Option<String>,
    sources: Vec<CmsSource>,
}

fn clamp_page_size(value: Option<u32>) -> u32 {
    value.unwrap_or(20).clamp(1, 50)
}

fn value_to_string(value: serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(value) => {
            let trimmed = value.trim();
            (!trimmed.is_empty()).then(|| trimmed.to_string())
        }
        serde_json::Value::Number(value) => Some(value.to_string()),
        serde_json::Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

fn optional_value_to_string(value: Option<serde_json::Value>) -> Option<String> {
    value.and_then(value_to_string)
}

fn value_to_i64(value: serde_json::Value) -> Option<i64> {
    match value {
        serde_json::Value::Number(value) => value.as_i64(),
        serde_json::Value::String(value) => value.trim().parse::<i64>().ok(),
        _ => None,
    }
}

fn value_to_u32(value: serde_json::Value) -> Option<u32> {
    value_to_i64(value).and_then(|value| u32::try_from(value).ok())
}

fn cms_referer(api: &str) -> String {
    url::Url::parse(api)
        .ok()
        .map(|parsed| {
            format!(
                "{}://{}/",
                parsed.scheme(),
                parsed.host_str().unwrap_or_default()
            )
        })
        .unwrap_or_else(|| "https://www.google.com/".to_string())
}

fn clean_json_text(body: &str) -> Result<&str, String> {
    let trimmed = body.trim_start_matches('\u{feff}').trim();
    if trimmed.is_empty() {
        return Err("empty response".to_string());
    }
    if trimmed.starts_with('<') {
        let preview = trimmed.chars().take(120).collect::<String>();
        return Err(format!("upstream returned html: {preview}"));
    }

    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        return Ok(trimmed);
    }

    if let (Some(open), Some(close)) = (trimmed.find('('), trimmed.rfind(')')) {
        if open < close {
            let inner = trimmed[open + 1..close].trim();
            if inner.starts_with('{') || inner.starts_with('[') {
                return Ok(inner);
            }
        }
    }

    let preview = trimmed.chars().take(120).collect::<String>();
    Err(format!("invalid json response: {preview}"))
}

fn parse_cms_response(body: &str) -> Result<RawCmsResponse, String> {
    let cleaned = clean_json_text(body)?;
    serde_json::from_str::<RawCmsResponse>(cleaned)
        .map_err(|error| format!("cms response parse failed: {error}"))
}

fn raw_to_video_item(raw: RawCmsItem, source_key: &str) -> Option<CmsVideoItem> {
    let id = raw.vod_id.and_then(value_to_string)?;
    let title = optional_value_to_string(raw.vod_name)?;
    if title.is_empty() {
        return None;
    }

    Some(CmsVideoItem {
        source: source_key.to_string(),
        id,
        title,
        poster: optional_value_to_string(raw.vod_pic),
        category: optional_value_to_string(raw.type_name),
        year: optional_value_to_string(raw.vod_year),
        area: optional_value_to_string(raw.vod_area),
        desc: optional_value_to_string(raw.vod_content),
        remarks: optional_value_to_string(raw.vod_remarks),
    })
}

fn parse_play_url(play_from: &str, play_url: &str) -> Vec<CmsPlayLine> {
    if play_url.trim().is_empty() {
        return Vec::new();
    }

    let line_names: Vec<String> = play_from
        .split("$$$")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(String::from)
        .collect();

    play_url
        .split("$$$")
        .enumerate()
        .filter_map(|(line_index, segment)| {
            if segment.trim().is_empty() {
                return None;
            }

            let episodes: Vec<CmsEpisode> = segment
                .split('#')
                .enumerate()
                .filter_map(|(episode_index, part)| {
                    if part.trim().is_empty() {
                        return None;
                    }
                    let (title, url) = part
                        .split_once('$')
                        .map(|(title, url)| {
                            let fallback_title = format!("第{}集", episode_index + 1);
                            let title = title.trim();
                            (
                                if title.is_empty() {
                                    fallback_title
                                } else {
                                    title.to_string()
                                },
                                url.trim().to_string(),
                            )
                        })
                        .unwrap_or_else(|| {
                            (
                                format!("第{}集", episode_index + 1),
                                part.trim().to_string(),
                            )
                        });
                    if url.is_empty() {
                        return None;
                    }
                    Some(CmsEpisode { title, url })
                })
                .collect();

            if episodes.is_empty() {
                return None;
            }

            let name = line_names
                .get(line_index)
                .cloned()
                .unwrap_or_else(|| format!("线路{}", line_index + 1));
            Some(CmsPlayLine { name, episodes })
        })
        .collect()
}

fn raw_to_video_detail(raw: RawCmsItem, source_key: &str) -> Option<CmsVideoDetail> {
    let id = raw.vod_id.and_then(value_to_string)?;
    let title = optional_value_to_string(raw.vod_name)?;
    if title.is_empty() {
        return None;
    }

    let play_from = optional_value_to_string(raw.vod_play_from);
    let play_url = optional_value_to_string(raw.vod_play_url);
    let lines = parse_play_url(
        play_from.as_deref().unwrap_or_default(),
        play_url.as_deref().unwrap_or_default(),
    );

    Some(CmsVideoDetail {
        source: source_key.to_string(),
        id,
        title,
        poster: optional_value_to_string(raw.vod_pic),
        category: optional_value_to_string(raw.type_name),
        year: optional_value_to_string(raw.vod_year),
        area: optional_value_to_string(raw.vod_area),
        desc: optional_value_to_string(raw.vod_content),
        remarks: optional_value_to_string(raw.vod_remarks),
        lines,
        update_time: optional_value_to_string(raw.vod_time),
    })
}

fn is_forbidden_proxy_host(host: &str) -> bool {
    let host = host.to_lowercase();
    host == "localhost"
        || host == "0.0.0.0"
        || host == "::1"
        || host.starts_with("127.")
        || host.starts_with("10.")
        || host.starts_with("192.168.")
        || host.starts_with("169.254.")
        || (host.starts_with("172.")
            && host
                .split('.')
                .nth(1)
                .and_then(|value| value.parse::<u8>().ok())
                .is_some_and(|part| (16..=31).contains(&part)))
}

fn validate_proxy_target(raw: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(raw).map_err(|error| format!("invalid url: {error}"))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("invalid protocol".to_string());
    }
    if is_forbidden_proxy_host(parsed.host_str().unwrap_or_default()) {
        return Err("forbidden host".to_string());
    }
    Ok(parsed)
}

fn proxy_response(
    status: StatusCode,
    content_type: &str,
    body: impl Into<Cow<'static, [u8]>>,
) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, PROXY_CORS_ORIGIN)
        .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
        .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "range, content-type")
        .header(
            header::ACCESS_CONTROL_EXPOSE_HEADERS,
            "content-length, content-range, accept-ranges, content-type",
        )
        .body(body.into())
        .unwrap()
}

fn proxy_error(status: StatusCode, message: &str) -> Response<Cow<'static, [u8]>> {
    proxy_response(
        status,
        "text/plain; charset=utf-8",
        message.as_bytes().to_vec(),
    )
}

fn is_m3u8_url(value: &str) -> bool {
    let path = value.split('?').next().unwrap_or(value);
    path.ends_with(".m3u8") || path.ends_with(".m3u")
}

fn playback_proxy_url(path: &str, upstream: &str) -> String {
    format!(
        "http://marsplay.localhost/{path}?u={}",
        url::form_urlencoded::byte_serialize(upstream.as_bytes()).collect::<String>()
    )
}

fn rewrite_m3u8(text: &str, base_url: &str) -> String {
    let Ok(base) = url::Url::parse(base_url) else {
        return text.to_string();
    };

    text.lines()
        .map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return line.to_string();
            }
            if trimmed.starts_with('#') {
                return rewrite_m3u8_uri_attrs(line, &base);
            }

            let Ok(abs) = base.join(trimmed) else {
                return line.to_string();
            };
            let abs = abs.to_string();
            let path = if is_m3u8_url(&abs) { "m3u8" } else { "ts" };
            playback_proxy_url(path, &abs)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn rewrite_m3u8_uri_attrs(line: &str, base: &url::Url) -> String {
    let mut out = String::with_capacity(line.len());
    let mut rest = line;

    while let Some(start) = rest.find("URI=\"") {
        let (before, after_start) = rest.split_at(start);
        out.push_str(before);
        out.push_str("URI=\"");
        let value_start = &after_start[5..];
        let Some(end) = value_start.find('"') else {
            out.push_str(value_start);
            return out;
        };
        let value = &value_start[..end];
        if let Ok(abs) = base.join(value) {
            let abs = abs.to_string();
            let path = if is_m3u8_url(&abs) { "m3u8" } else { "ts" };
            out.push_str(&playback_proxy_url(path, &abs));
        } else {
            out.push_str(value);
        }
        out.push('"');
        rest = &value_start[end + 1..];
    }

    out.push_str(rest);
    out
}

fn app_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .resolve("", BaseDirectory::AppConfig)
        .map_err(|error| format!("resolve app config dir failed: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("create app config dir failed: {error}"))?;
    Ok(dir.join("settings.json"))
}

fn default_app_config() -> AppConfig {
    AppConfig {
        api_origin: None,
        sources: Vec::new(),
    }
}

#[tauri::command]
fn load_app_config(app: AppHandle) -> Result<AppConfig, String> {
    let path = app_config_path(&app)?;
    if !path.exists() {
        return Ok(default_app_config());
    }
    let content =
        fs::read_to_string(path).map_err(|error| format!("read app config failed: {error}"))?;
    if content.trim().is_empty() {
        return Ok(default_app_config());
    }
    serde_json::from_str::<AppConfig>(&content)
        .map_err(|error| format!("parse app config failed: {error}"))
}

#[tauri::command]
fn save_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = app_config_path(&app)?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|error| format!("serialize app config failed: {error}"))?;
    fs::write(path, content).map_err(|error| format!("write app config failed: {error}"))
}

#[tauri::command]
async fn search_douban(request: DoubanRequest) -> Result<DoubanResult, String> {
    if request.media_type != "movie" && request.media_type != "tv" {
        return Err("invalid type".to_string());
    }
    if request.tag.trim().is_empty() {
        return Err("missing tag".to_string());
    }

    let page_size = clamp_page_size(request.page_size);
    let page_start = request.page_start.unwrap_or(0);
    let sort = request.sort.unwrap_or_else(|| "recommend".to_string());
    let page_size = page_size.to_string();
    let page_start = page_start.to_string();
    let upstream_url = url::Url::parse_with_params(
        "https://movie.douban.com/j/search_subjects",
        &[
            ("type", request.media_type.as_str()),
            ("tag", request.tag.as_str()),
            ("sort", sort.as_str()),
            ("page_limit", page_size.as_str()),
            ("page_start", page_start.as_str()),
        ],
    )
    .map_err(|error| format!("douban url build failed: {error}"))?;

    let client = reqwest::Client::new();
    let response = client
        .get(upstream_url)
        .header("accept", "application/json, text/plain, */*")
        .header("referer", DOUBAN_REFERER)
        .header("user-agent", DOUBAN_USER_AGENT)
        .send()
        .await
        .map_err(|error| format!("douban request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("douban upstream returned {}", response.status()));
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("douban response read failed: {error}"))?;
    let upstream = serde_json::from_str::<UpstreamDoubanResponse>(&body)
        .map_err(|error| format!("douban response parse failed: {error}"))?;

    let items = upstream
        .subjects
        .unwrap_or_default()
        .into_iter()
        .map(|subject| DoubanItem {
            id: subject.id.unwrap_or_default(),
            title: subject.title.unwrap_or_default(),
            rate: subject.rate.unwrap_or_default(),
            cover: subject.cover.unwrap_or_default(),
            url: subject.url.unwrap_or_default(),
            is_new: subject.is_new.unwrap_or(false),
            playable: subject.playable.unwrap_or(false),
        })
        .collect();

    Ok(DoubanResult { items })
}

#[tauri::command]
async fn fetch_douban_image(src: String) -> Result<String, String> {
    let parsed = url::Url::parse(&src).map_err(|error| format!("invalid image url: {error}"))?;
    let host = parsed.host_str().unwrap_or_default();
    if !host.ends_with("doubanio.com") && !host.ends_with("douban.com") {
        return Err("forbidden image host".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .get(parsed)
        .header("accept", "image/webp,image/apng,image/*,*/*;q=0.8")
        .header("referer", DOUBAN_REFERER)
        .header("user-agent", DOUBAN_USER_AGENT)
        .send()
        .await
        .map_err(|error| format!("douban image request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("douban image returned {}", response.status()));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("douban image read failed: {error}"))?;
    let encoded = BASE64_STANDARD.encode(bytes);

    Ok(format!("data:{content_type};base64,{encoded}"))
}

#[tauri::command]
async fn fetch_cms_image(src: String) -> Result<String, String> {
    let parsed = url::Url::parse(&src).map_err(|error| format!("invalid image url: {error}"))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("invalid image protocol".to_string());
    }

    let client = reqwest::Client::new();
    let response = client
        .get(parsed.clone())
        .header("accept", "image/webp,image/apng,image/*,*/*;q=0.8")
        .header(
            "referer",
            format!(
                "{}://{}/",
                parsed.scheme(),
                parsed.host_str().unwrap_or_default()
            ),
        )
        .header("user-agent", CMS_USER_AGENT)
        .send()
        .await
        .map_err(|error| format!("cms image request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("cms image returned {}", response.status()));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();
    if !content_type.starts_with("image/") {
        return Err("cms image response is not an image".to_string());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("cms image read failed: {error}"))?;
    let encoded = BASE64_STANDARD.encode(bytes);

    Ok(format!("data:{content_type};base64,{encoded}"))
}

#[tauri::command]
async fn search_cms(
    source: CmsSource,
    keyword: String,
    page: Option<u32>,
) -> Result<CmsSearchResult, String> {
    if source.key.trim().is_empty() {
        return Err("missing source key".to_string());
    }
    if keyword.trim().is_empty() {
        return Err("missing keyword".to_string());
    }

    let page = page.unwrap_or(1).max(1);
    let page_string = page.to_string();
    let upstream_url = url::Url::parse_with_params(
        &source.api,
        &[
            ("ac", "videolist"),
            ("wd", keyword.trim()),
            ("pg", page_string.as_str()),
        ],
    )
    .map_err(|error| format!("cms url build failed: {error}"))?;

    let client = reqwest::Client::new();
    let response = client
        .get(upstream_url)
        .header("accept", "application/json, text/plain, */*")
        .header("accept-language", "zh-CN,zh;q=0.9,en;q=0.8")
        .header("referer", cms_referer(&source.api))
        .header("user-agent", CMS_USER_AGENT)
        .send()
        .await
        .map_err(|error| format!("cms request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("cms upstream returned {}", response.status()));
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("cms response read failed: {error}"))?;
    let upstream = parse_cms_response(&body)?;

    if let Some(code) = upstream.code.and_then(value_to_i64) {
        if code != 1 && code != 200 {
            return Err(format!(
                "cms source returned code={code}: {}",
                optional_value_to_string(upstream.msg).unwrap_or_default()
            ));
        }
    }

    let list: Vec<CmsVideoItem> = upstream
        .list
        .unwrap_or_default()
        .into_iter()
        .filter_map(|item| raw_to_video_item(item, &source.key))
        .collect();
    let total = upstream
        .total
        .and_then(value_to_u32)
        .unwrap_or(list.len() as u32);
    let page_count = upstream.pagecount.and_then(value_to_u32).unwrap_or(1);
    let page = upstream.page.and_then(value_to_u32).unwrap_or(page);

    Ok(CmsSearchResult {
        list,
        total,
        page,
        page_count,
    })
}

#[tauri::command]
async fn get_cms_detail(source: CmsSource, id: String) -> Result<CmsVideoDetail, String> {
    if source.key.trim().is_empty() {
        return Err("missing source key".to_string());
    }
    if id.trim().is_empty() {
        return Err("missing video id".to_string());
    }

    let upstream_url =
        url::Url::parse_with_params(&source.api, &[("ac", "videolist"), ("ids", id.trim())])
            .map_err(|error| format!("cms detail url build failed: {error}"))?;

    let client = reqwest::Client::new();
    let response = client
        .get(upstream_url)
        .header("accept", "application/json, text/plain, */*")
        .header("accept-language", "zh-CN,zh;q=0.9,en;q=0.8")
        .header("referer", cms_referer(&source.api))
        .header("user-agent", CMS_USER_AGENT)
        .send()
        .await
        .map_err(|error| format!("cms detail request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "cms detail upstream returned {}",
            response.status()
        ));
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("cms detail response read failed: {error}"))?;
    let upstream = parse_cms_response(&body).map_err(|error| format!("cms detail {error}"))?;

    if let Some(code) = upstream.code.and_then(value_to_i64) {
        if code != 1 && code != 200 {
            return Err(format!(
                "cms source returned code={code}: {}",
                optional_value_to_string(upstream.msg).unwrap_or_default()
            ));
        }
    }

    upstream
        .list
        .and_then(|mut list| list.drain(..).next())
        .and_then(|item| raw_to_video_detail(item, &source.key))
        .ok_or_else(|| "video not found".to_string())
}

async fn proxy_m3u8(upstream: String) -> Response<Cow<'static, [u8]>> {
    let upstream_url = match validate_proxy_target(&upstream) {
        Ok(value) => value,
        Err(error) => return proxy_error(StatusCode::BAD_REQUEST, &error),
    };

    let client = reqwest::Client::new();
    let response = match client
        .get(upstream_url.clone())
        .header(
            "accept",
            "application/vnd.apple.mpegurl, application/x-mpegurl, */*",
        )
        .header("user-agent", CMS_USER_AGENT)
        .send()
        .await
    {
        Ok(value) => value,
        Err(error) => {
            return proxy_error(
                StatusCode::BAD_GATEWAY,
                &format!("proxy m3u8 failed: {error}"),
            );
        }
    };

    if !response.status().is_success() {
        return proxy_error(
            StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            &format!("upstream {}", response.status()),
        );
    }

    let final_url = response.url().to_string();
    let text = match response.text().await {
        Ok(value) => value,
        Err(error) => {
            return proxy_error(
                StatusCode::BAD_GATEWAY,
                &format!("proxy m3u8 read failed: {error}"),
            );
        }
    };
    let rewritten = rewrite_m3u8(&text, &final_url);
    proxy_response(
        StatusCode::OK,
        "application/vnd.apple.mpegurl; charset=utf-8",
        rewritten.into_bytes(),
    )
}

async fn proxy_segment(
    upstream: String,
    request_headers: HeaderMap,
) -> Response<Cow<'static, [u8]>> {
    let upstream_url = match validate_proxy_target(&upstream) {
        Ok(value) => value,
        Err(error) => return proxy_error(StatusCode::BAD_REQUEST, &error),
    };

    let client = reqwest::Client::new();
    let mut request = client
        .get(upstream_url)
        .header("user-agent", CMS_USER_AGENT);
    if let Some(range) = request_headers
        .get(header::RANGE)
        .and_then(|value| value.to_str().ok())
    {
        request = request.header("range", range);
    }

    let response = match request.send().await {
        Ok(value) => value,
        Err(error) => {
            return proxy_error(
                StatusCode::BAD_GATEWAY,
                &format!("proxy segment failed: {error}"),
            );
        }
    };

    let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();
    let bytes = match response.bytes().await {
        Ok(value) => value.to_vec(),
        Err(error) => {
            return proxy_error(
                StatusCode::BAD_GATEWAY,
                &format!("proxy segment read failed: {error}"),
            );
        }
    };

    proxy_response(status, &content_type, bytes)
}

fn handle_playback_protocol(request: Request<Vec<u8>>, responder: UriSchemeResponder) {
    let path = request.uri().path().trim_start_matches('/').to_string();
    let query = request.uri().query().unwrap_or_default();
    let upstream = url::form_urlencoded::parse(query.as_bytes())
        .find_map(|(key, value)| (key == "u").then(|| value.into_owned()));
    let headers = request.headers().clone();

    tauri::async_runtime::spawn(async move {
        let Some(upstream) = upstream else {
            responder.respond(proxy_error(StatusCode::BAD_REQUEST, "missing u"));
            return;
        };

        let response = match path.as_str() {
            "m3u8" => proxy_m3u8(upstream).await,
            "ts" => proxy_segment(upstream, headers).await,
            _ => proxy_error(StatusCode::NOT_FOUND, "not found"),
        };
        responder.respond(response);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_asynchronous_uri_scheme_protocol("marsplay", |_ctx, request, responder| {
            handle_playback_protocol(request, responder);
        })
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "显示 MarsTV", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "隐藏到托盘", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            let mut tray = TrayIconBuilder::with_id("main")
                .tooltip("MarsTV")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }
            tray.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_app_config,
            save_app_config,
            search_douban,
            fetch_douban_image,
            fetch_cms_image,
            search_cms,
            get_cms_detail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
