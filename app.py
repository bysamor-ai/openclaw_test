import os
import json
import csv
import io
import threading
import uuid
import time
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)

# In-memory job store (keyed by job_id)
jobs = {}
jobs_lock = threading.Lock()


# ─────────────────────────────────────────
# Search helpers
# ─────────────────────────────────────────

def search_serpapi(query: str, api_key: str) -> list:
    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params={"q": query, "api_key": api_key, "hl": "zh-TW", "gl": "hk", "num": 5},
            timeout=10,
        )
        data = resp.json()
        return [
            {"title": r.get("title", ""), "snippet": r.get("snippet", ""), "link": r.get("link", "")}
            for r in data.get("organic_results", [])[:5]
        ]
    except Exception:
        return []


def search_duckduckgo(query: str) -> list:
    """Fallback: DuckDuckGo instant-answer API (no key needed)."""
    try:
        resp = requests.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
            timeout=8,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        data = resp.json()
        results = []
        for rt in data.get("RelatedTopics", [])[:5]:
            if "Text" in rt:
                results.append({"title": rt.get("Text", "")[:80], "snippet": rt.get("Text", ""), "link": rt.get("FirstURL", "")})
        return results
    except Exception:
        return []


def do_search(query: str, serpapi_key: str) -> list:
    if serpapi_key:
        results = search_serpapi(query, serpapi_key)
        if results:
            return results
    return search_duckduckgo(query)


# ─────────────────────────────────────────
# Claude API helpers
# ─────────────────────────────────────────

def claude_chat(prompt: str, claude_key: str, max_tokens: int = 4096) -> str:
    """Call Claude API and return text response."""
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": claude_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-6",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def extract_json(text: str, bracket: str = "["):
    """Extract first JSON object/array from text."""
    close = "]" if bracket == "[" else "}"
    start = text.find(bracket)
    end = text.rfind(close) + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    return [] if bracket == "[" else {}


def run_step_a(search_results: dict, date: str, week_label: str, claude_key: str) -> list:
    search_text = json.dumps(search_results, ensure_ascii=False, indent=2)
    prompt = f"""你係香港資深內容策劃師，專注 50+ 受眾。
今日日期：{date}
本週週數：{week_label}

以下係今日真實香港新聞搜索結果：
{search_text}

根據搜索結果，為以下 10 個主題各提取 5 個本週最新關鍵字：
1. 健康養生  2. 理財規劃  3. 家庭關係  4. 社區生活  5. 懷舊文化
6. 個人成長  7. 長者政策  8. 飲食文化  9. 數碼生活  10. 心理健康

只輸出 JSON 陣列，唔好加任何說明或 markdown：
[
  {{
    "week_label": "{week_label}",
    "generated_date": "{date}",
    "theme": "主題名稱",
    "keywords": ["kw1","kw2","kw3","kw4","kw5"],
    "news_context": "基於搜索結果嘅新聞背景說明（60字內）",
    "source_url": "參考新聞連結"
  }}
]"""
    text = claude_chat(prompt, claude_key, 4096)
    return extract_json(text, "[")


def run_step_b(keywords_data: list, date: str, week_label: str, claude_key: str) -> dict:
    kw_text = json.dumps(keywords_data, ensure_ascii=False, indent=2)
    prompt = f"""你係香港 50+ 受眾內容策劃師。
今日日期：{date}
本週週數：{week_label}

今日關鍵字分類：
{kw_text}

從以下 3 個角度各提供 3-4 個話題，合共輸出 Top 3（總分最高）：
角度 A：今日香港時事新聞
角度 B：社交媒體 50+ 受眾熱話
角度 C：政府/機構長者政策優惠

評分：情感共鳴(1-10) + 分享動力(1-10) + 實用性(1-10)

只輸出 JSON，唔好加任何說明：
{{
  "generated_date": "{date}",
  "week_label": "{week_label}",
  "top_3": [
    {{
      "rank": 1,
      "topic": "話題標題",
      "emotion_type": "情感類型",
      "post_type": "帖文類型",
      "one_liner": "話題說明",
      "emotion_score": 8,
      "share_score": 9,
      "utility_score": 10,
      "total_score": 27,
      "source_angle": "C"
    }}
  ]
}}"""
    text = claude_chat(prompt, claude_key, 2048)
    return extract_json(text, "{")


def run_step_c(top_topic: dict, claude_key: str) -> dict:
    prompt = f"""你係 50addoil 的內容創作人，負責撰寫 Facebook 帖文同 Blog 文章。
受眾：50-74 歲香港人及其家人。語言：純廣東話，繁體中文。
禁忌：沉重悲觀、複雜術語、過度賣廣告。

話題：{top_topic.get('topic','')}
情感類型：{top_topic.get('emotion_type','')}
帖文類型：{top_topic.get('post_type','')}
話題說明：{top_topic.get('one_liner','')}

Facebook 帖文要求：
- 字數：150-300 字，溫暖親切、簡單易讀、有分享動力
- 結尾：一個互動問題或 CTA
- Hashtag：3-5 個（#50加油 #香港長者 #銀齡生活）

Blog 文章要求：
- 標題：吸引眼球，10-20 字
- 字數：600-800 字，結構：標題→正文（2-3段）→結語
- 結尾：呼籲讀者留言或分享
- SEO 關鍵字：3-5 個自然融入文章

只輸出 JSON，唔好加任何說明：
{{
  "fb_post": "Facebook帖文全文",
  "blog_title": "Blog文章標題",
  "blog_article": "Blog文章全文",
  "seo_keywords": ["kw1","kw2","kw3"],
  "image_prompt": "Image generation prompt in English (describe a warm, positive scene for HK elderly)"
}}"""
    text = claude_chat(prompt, claude_key, 3000)
    return extract_json(text, "{")


# ─────────────────────────────────────────
# Background job runner
# ─────────────────────────────────────────

def run_job(job_id: str, claude_key: str, serpapi_key: str, date: str):
    def update(step: str, msg: str, progress: int, data=None):
        with jobs_lock:
            jobs[job_id].update({"step": step, "message": msg, "progress": progress})
            if data is not None:
                jobs[job_id]["results"][step] = data

    try:
        d = datetime.strptime(date, "%Y-%m-%d")
        week_num = d.isocalendar()[1]
        week_label = f"{d.year}-W{str(week_num).zfill(2)}"

        # ── Search ──────────────────────────────
        update("searching", "🔍 搜索今日香港新聞…", 5)
        queries = [
            f"香港長者醫療券優惠 {date[:7]}",
            f"香港強積金回報 {date[:4]}",
            f"香港流感長者 {date[:7]}",
            f"香港長者政策施政報告 {date[:4]}",
            f"香港懷舊茶樓老字號 {date[:4]}",
            f"香港社區長者活動 {date[:7]}",
            f"香港長者數碼智能手機 {date[:4]}",
            f"香港長者心理健康情緒 {date[:4]}",
            f"香港退休個人成長興趣班 {date[:4]}",
            f"香港家庭照顧者護老 {date[:4]}",
        ]
        search_results = {}
        for i, q in enumerate(queries):
            update("searching", f"🔍 搜索新聞 ({i+1}/{len(queries)})…", 5 + i * 2)
            search_results[q] = do_search(q, serpapi_key)
            time.sleep(0.3)

        # ── Step A ──────────────────────────────
        update("step_a", "📋 Step A：提取 10 個主題關鍵字…", 30)
        step_a = run_step_a(search_results, date, week_label, claude_key)
        update("step_a_done", "✅ Step A 完成", 50, {"step_a": step_a})

        # ── Step B ──────────────────────────────
        update("step_b", "🎯 Step B：生成 Top 3 話題評分…", 55)
        step_b = run_step_b(step_a, date, week_label, claude_key)
        update("step_b_done", "✅ Step B 完成", 72, {"step_b": step_b})

        # ── Step C ──────────────────────────────
        top_3 = step_b.get("top_3", [])
        step_c_results = []
        for i, topic in enumerate(top_3[:3]):
            update("step_c", f"✍️ Step C：撰寫內容 ({i+1}/3)…", 75 + i * 7)
            sc = run_step_c(topic, claude_key)
            sc["source_topic"] = topic
            step_c_results.append(sc)

        update(
            "complete",
            "🎉 完成！",
            100,
            {"step_c": step_c_results},
        )

        with jobs_lock:
            jobs[job_id].update({
                "status": "done",
                "metadata": {"date": date, "week_label": week_label, "generated_at": datetime.now().isoformat()},
            })

    except Exception as e:
        with jobs_lock:
            jobs[job_id].update({"status": "error", "message": str(e), "progress": 0})


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/start", methods=["POST"])
def start():
    data = request.json or {}
    claude_key = data.get("claude_key", os.getenv("ANTHROPIC_API_KEY", ""))
    serpapi_key = data.get("serpapi_key", os.getenv("SERPAPI_KEY", ""))
    date = data.get("date", datetime.now().strftime("%Y-%m-%d"))

    if not claude_key:
        return jsonify({"error": "需要 Claude API Key"}), 400

    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {
            "status": "running",
            "step": "init",
            "message": "初始化…",
            "progress": 0,
            "results": {},
            "metadata": {},
        }

    t = threading.Thread(target=run_job, args=(job_id, claude_key, serpapi_key, date), daemon=True)
    t.start()
    return jsonify({"job_id": job_id})


@app.route("/api/status/<job_id>")
def status(job_id):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


@app.route("/api/download-csv", methods=["POST"])
def download_csv():
    data = request.json or {}
    results = data.get("results", {})
    metadata = data.get("metadata", {})
    date = metadata.get("date", datetime.now().strftime("%Y-%m-%d"))
    week_label = metadata.get("week_label", "")

    output = io.StringIO()
    writer = csv.writer(output)

    # ── Step A ────────────────────────────────────
    writer.writerow(["STEP A — 本週關鍵字提取"])
    writer.writerow(["週數", "日期", "主題", "關鍵字1", "關鍵字2", "關鍵字3", "關鍵字4", "關鍵字5", "新聞背景", "來源連結"])
    for item in results.get("step_a", []):
        kws = (item.get("keywords") or []) + [""] * 5
        writer.writerow([
            item.get("week_label", week_label),
            item.get("generated_date", date),
            item.get("theme", ""),
            *kws[:5],
            item.get("news_context", ""),
            item.get("source_url", ""),
        ])

    writer.writerow([])

    # ── Step B ────────────────────────────────────
    writer.writerow(["STEP B — Top 3 話題評分"])
    writer.writerow(["排名", "話題", "情感類型", "帖文類型", "話題說明", "情感共鳴", "分享動力", "實用性", "總分", "角度"])
    for item in (results.get("step_b") or {}).get("top_3", []):
        writer.writerow([
            item.get("rank", ""),
            item.get("topic", ""),
            item.get("emotion_type", ""),
            item.get("post_type", ""),
            item.get("one_liner", ""),
            item.get("emotion_score", ""),
            item.get("share_score", ""),
            item.get("utility_score", ""),
            item.get("total_score", ""),
            item.get("source_angle", ""),
        ])

    writer.writerow([])

    # ── Step C ────────────────────────────────────
    writer.writerow(["STEP C — 內容創作"])
    writer.writerow(["排名", "Blog標題", "SEO關鍵字", "圖片提示", "Facebook帖文", "Blog文章"])
    for i, sc in enumerate(results.get("step_c", []), 1):
        writer.writerow([
            i,
            sc.get("blog_title", ""),
            "、".join(sc.get("seo_keywords", [])),
            sc.get("image_prompt", ""),
            sc.get("fb_post", ""),
            sc.get("blog_article", ""),
        ])

    output.seek(0)
    filename = f"50addoil_{date}.csv"

    return Response(
        "\ufeff" + output.getvalue(),  # UTF-8 BOM for Excel
        mimetype="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
