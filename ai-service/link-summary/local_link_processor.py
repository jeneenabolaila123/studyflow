
import json
import os
import re
import sys
import time
import html
import tempfile
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path


YOUTUBE_PATTERNS = [
    "youtube.com/watch",
    "youtu.be/",
    "youtube.com/shorts/",
    "youtube.com/embed/",
]


def print_json(data, status_code=0):
    print(json.dumps(data, ensure_ascii=False, indent=2))
    sys.exit(status_code)


def is_youtube_url(url: str) -> bool:
    lower = url.lower()
    return any(pattern in lower for pattern in YOUTUBE_PATTERNS)


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]+\]", " ", text)
    text = re.sub(r"\([0-9:.]+\)", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def fetch_url_text(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0 Safari/537.36"
            )
        },
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read()

    text = raw.decode("utf-8", errors="replace")
    return text


def extract_webpage_title_and_text(url: str):
    page = fetch_url_text(url)

    title_match = re.search(r"<title[^>]*>(.*?)</title>", page, flags=re.I | re.S)
    title = clean_text(title_match.group(1)) if title_match else "Untitled Page"

    page = re.sub(r"(?is)<script.*?</script>", " ", page)
    page = re.sub(r"(?is)<style.*?</style>", " ", page)
    page = re.sub(r"(?is)<nav.*?</nav>", " ", page)
    page = re.sub(r"(?is)<footer.*?</footer>", " ", page)

    text = clean_text(page)

    return title, text


def make_env_for_ytdlp():
    env = os.environ.copy()

    user_profile = env.get("USERPROFILE") or str(Path.home())
    deno_bin = str(Path(user_profile) / ".deno" / "bin")

    current_path = env.get("PATH") or env.get("Path") or ""

    if os.path.isdir(deno_bin) and deno_bin.lower() not in current_path.lower():
        current_path = current_path + os.pathsep + deno_bin

    env["PATH"] = current_path
    env["Path"] = current_path
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    return env


def run_command(cmd, timeout=180):
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=make_env_for_ytdlp(),
        timeout=timeout,
    )

    return result.returncode, result.stdout, result.stderr


def build_ytdlp_base_cmd():
    js_runtime = os.getenv("LINK_YTDLP_JS_RUNTIME", "deno").strip() or "deno"
    cookies_browser = os.getenv("LINK_YTDLP_COOKIES_FROM_BROWSER", "").strip()

    cmd = ["yt-dlp"]

    if js_runtime:
        cmd.extend(["--js-runtimes", js_runtime])

    if cookies_browser:
        cmd.extend(["--cookies-from-browser", cookies_browser])

    return cmd


def get_youtube_info(url: str):
    cmd = build_ytdlp_base_cmd()
    cmd.extend(
        [
            "--skip-download",
            "--dump-json",
            url,
        ]
    )

    code, out, err = run_command(cmd, timeout=240)

    if code != 0:
        return None, err.strip() or out.strip()

    try:
        return json.loads(out), ""
    except Exception:
        match = re.search(r"\{.*\}", out, flags=re.S)
        if match:
            try:
                return json.loads(match.group(0)), ""
            except Exception:
                pass

    return None, "yt-dlp returned invalid JSON."


def pick_caption_url(info):
    subtitle_sources = []

    subtitles = info.get("subtitles") or {}
    automatic_captions = info.get("automatic_captions") or {}

    for source in (subtitles, automatic_captions):
        for lang in ["en", "en-US", "en-GB", "a.en", "en-orig"]:
            if lang in source:
                subtitle_sources.extend(source[lang])

    if not subtitle_sources:
        for source in (subtitles, automatic_captions):
            for _lang, items in source.items():
                if items:
                    subtitle_sources.extend(items)
                    break

    preferred_exts = ["json3", "vtt", "srt"]

    for ext in preferred_exts:
        for item in subtitle_sources:
            if item.get("ext") == ext and item.get("url"):
                return item.get("url"), ext

    for item in subtitle_sources:
        if item.get("url"):
            return item.get("url"), item.get("ext", "")

    return None, None


def parse_json3_captions(raw: str) -> str:
    data = json.loads(raw)
    events = data.get("events") or []
    parts = []

    for event in events:
        segs = event.get("segs") or []
        for seg in segs:
            txt = seg.get("utf8", "")
            txt = txt.replace("\n", " ").strip()
            if txt:
                parts.append(txt)

    return clean_text(" ".join(parts))


def parse_vtt_or_srt(raw: str) -> str:
    lines = []

    for line in raw.splitlines():
        line = line.strip()

        if not line:
            continue

        if line.upper().startswith("WEBVTT"):
            continue

        if re.match(r"^\d+$", line):
            continue

        if "-->" in line:
            continue

        line = re.sub(r"<[^>]+>", "", line)
        line = line.strip()

        if line:
            lines.append(line)

    return clean_text(" ".join(lines))


def download_caption_text(caption_url: str, ext: str) -> str:
    raw = fetch_url_text(caption_url, timeout=60)

    if ext == "json3":
        return parse_json3_captions(raw)

    return parse_vtt_or_srt(raw)


def extract_youtube_text(url: str):
    info, error = get_youtube_info(url)

    if not info:
        raise RuntimeError(error or "Could not read YouTube video information.")

    title = info.get("title") or "YouTube Video"
    description = info.get("description") or ""
    uploader = info.get("uploader") or info.get("channel") or ""

    caption_url, caption_ext = pick_caption_url(info)

    transcript = ""

    if caption_url:
        try:
            transcript = download_caption_text(caption_url, caption_ext)
        except Exception:
            transcript = ""

    fallback_text = clean_text(
        " ".join(
            [
                title,
                uploader,
                description,
            ]
        )
    )

    final_text = transcript if len(transcript) > 80 else fallback_text

    return title, final_text, transcript


def call_ollama(prompt: str):
    host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
    model = (
        os.getenv("LINK_SUMMARY_MODEL")
        or os.getenv("OLLAMA_MODEL")
        or "qwen2.5:1.5b"
    )

    endpoint = f"{host}/api/generate"

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 700,
        },
    }

    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=900) as response:
        raw = response.read().decode("utf-8", errors="replace")

    parsed = json.loads(raw)
    return parsed.get("response", "").strip()


def fallback_summary(title: str, text: str):
    text = clean_text(text)
    sentences = re.split(r"(?<=[.!?])\s+", text)

    useful = []
    for sentence in sentences:
        sentence = sentence.strip()
        if 40 <= len(sentence) <= 240:
            useful.append(sentence)
        if len(useful) >= 5:
            break

    key_points = useful[:3] if useful else [text[:220]]

    return (
        f"Title: {title}\n\n"
        f"Short Summary:\n"
        f"{key_points[0] if key_points else 'This content could not be summarized clearly.'}\n\n"
        f"Key Points:\n"
        + "\n".join(f"- {point}" for point in key_points)
        + "\n\nConclusion:\nThis summary was generated from the available extracted text."
    )


def summarize_content(title: str, text: str, source_type: str):
    max_chars = 12000
    text = clean_text(text)[:max_chars]

    if len(text) < 40:
        return fallback_summary(title, text)

    prompt = f"""
You are StudyFlow local AI.

Summarize the following {source_type} content clearly.

Rules:
- Use only the provided content.
- Do not invent facts.
- If the content is a children video/song, summarize it simply.
- Keep the answer useful for a student.
- Use this exact format:

Title: ...
Short Summary:
...
Key Points:
- ...
- ...
- ...
Important Details:
- ...
- ...
Conclusion:
...

Title:
{title}

Content:
{text}
""".strip()

    try:
        answer = call_ollama(prompt)
        if answer and len(answer) > 80:
            return answer
    except Exception:
        pass

    return fallback_summary(title, text)


def main():
    start = time.time()

    if len(sys.argv) < 2:
        print_json(
            {
                "success": False,
                "message": "Missing URL argument.",
            },
            1,
        )

    url = sys.argv[1].strip()

    try:
        if is_youtube_url(url):
            title, text, transcript = extract_youtube_text(url)
            source_type = "youtube_video"
        else:
            title, text = extract_webpage_title_and_text(url)
            transcript = None
            source_type = "webpage"

        summary = summarize_content(title, text, source_type)

        print_json(
            {
                "success": True,
                "type": source_type,
                "url": url,
                "title": title,
                "summary": summary,
                "transcript": transcript,
                "processing_time_seconds": round(time.time() - start, 2),
            }
        )

    except Exception as exc:
        print_json(
            {
                "success": False,
                "message": str(exc),
                "type": "error",
                "url": url,
                "processing_time_seconds": round(time.time() - start, 2),
            },
            1,
        )


if __name__ == "__main__":
    main()