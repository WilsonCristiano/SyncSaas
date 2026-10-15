import tempfile
from pathlib import Path

import requests
from apify_client import ApifyClient

from .config import APIFY_TOKEN

ACTOR = "apify/instagram-reel-scraper"

def scrape_reels(usernames: list[str], limit: int) -> list[dict]:
    client = ApifyClient(APIFY_TOKEN)
    run = client.actor(ACTOR).call(run_input={"username": usernames, "resultsLimit": limit}, timeout_secs=600)
    items = client.dataset(run["defaultDatasetId"]).list_items().items
    out = []
    for it in items:
        ig_id = it.get("shortCode") or it.get("id")
        if ig_id and it.get("videoUrl"):
            out.append({"ig_id": str(ig_id), "video_url": it["videoUrl"],
                        "caption": it.get("caption") or "", "source_url": it.get("url")})
    return out

def download_video(url: str, ig_id: str) -> Path:
    path = Path(tempfile.gettempdir()) / f"{ig_id}.mp4"
    with requests.get(url, stream=True, timeout=(10, 60)) as r:
        r.raise_for_status()
        ctype = r.headers.get("content-type", "")
        if "video" not in ctype and "octet-stream" not in ctype:
            raise ValueError(f"content-type inesperado: {ctype}")
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    if path.stat().st_size < 10_000:
        path.unlink(missing_ok=True)
        raise ValueError("arquivo de vídeo inválido (muito pequeno)")
    return path
