#!/usr/bin/env python3
"""Fetch MathWorks blog post view counts and update data/views.json."""
from __future__ import annotations

import datetime as dt
import html
import json
import pathlib
import re
import sys
import subprocess
import urllib.request
from typing import Dict, List

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "views.json"

POSTS = {
    "mike": {
        "url": "https://blogs.mathworks.com/matlab/?p=4045",
        "label": "Mike",
    },
    "yann": {
        "url": "https://blogs.mathworks.com/deep-learning/?p=18818",
        "label": "Yann",
        "handicap": -200,
    },
}

VIEW_REGEX = re.compile(r'class="icon-watch icon_16"></span>\s*([0-9,]+)\s+views', re.IGNORECASE)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "identity",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Referer": "https://blogs.mathworks.com/",
}


def fetch_views(url: str) -> int:
    curl_cmd = [
        "curl",
        "-Ls",
        "-H",
        "Accept-Encoding: identity",
        url,
    ]
    result = subprocess.run(curl_cmd, check=False, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout:
        html_content = result.stdout
    else:
        request = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(request, timeout=30) as response:
            html_content = response.read().decode("utf-8", errors="ignore")
    html_content = html_content.replace("\xa0", " ")
    html_content = html.unescape(html_content)
    match = VIEW_REGEX.search(html_content)
    if not match:
        raise RuntimeError(f"Could not find view count in {url}")
    return int(match.group(1).replace(",", ""))


def load_data() -> List[Dict[str, object]]:
    if DATA_PATH.exists():
        with DATA_PATH.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    return []


def save_data(data: List[Dict[str, object]]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=False)
        fh.write("\n")


def main() -> int:
    today = dt.date.today().isoformat()
    data = load_data()

    latest_entry = data[-1] if data else None
    if latest_entry and latest_entry.get("date") == today:
        entry = latest_entry
    else:
        entry = {"date": today}
        data.append(entry)

    for key, meta in POSTS.items():
        views = fetch_views(meta["url"])
        entry[f"{key}_views"] = views

    save_data(data)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(exc, file=sys.stderr)
        raise
