"""Uso: python -m bot.main [--scrape]
--scrape executa o Apify direto (agendamento próprio). O worker acionado pelo webhook roda SEM
essa flag: apenas consome a fila, então Apify -> webhook -> worker nunca se retroalimenta."""
import argparse
import random
import time

from . import db, source, tiktok
from .config import (CAPTION_TEMPLATE, DELAY_MAX, DELAY_MIN, HASHTAG_POOL, IG_USERNAMES,
                     MAX_ATTEMPTS, MAX_POSTS_PER_RUN, SCRAPE_LIMIT)
from .spintax import build_caption

def run_queue(conn) -> None:
    posted = 0
    while posted < MAX_POSTS_PER_RUN:
        post = db.claim_next(conn, MAX_ATTEMPTS)
        if not post:
            break
        if posted:  # pausa humana entre posts, só se ainda houver item
            time.sleep(random.randint(DELAY_MIN, DELAY_MAX))
        pid, video = post["id"], None
        try:
            video = source.download_video(post["video_url"], post["ig_id"])
            caption = build_caption(post["caption"], CAPTION_TEMPLATE, HASHTAG_POOL)
            tiktok.post_video(str(video), caption)
            db.mark_done(conn, pid)
            db.log(conn, "SUCCESS", f"Publicado: {post['ig_id']}", pid)
            posted += 1
        except tiktok.SessionExpired as e:
            db.release(conn, pid)
            db.log(conn, "ERROR", f"{e}. Atualize os cookies; fila preservada.", pid)
            break
        except Exception as e:
            db.mark_failed(conn, pid, repr(e), MAX_ATTEMPTS)
            db.log(conn, "ERROR", f"{post['ig_id']} (tentativa {post['attempts']}/{MAX_ATTEMPTS}): {e}", pid)
        finally:
            if video:
                video.unlink(missing_ok=True)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scrape", action="store_true")
    args = ap.parse_args()

    conn = db.connect()
    try:
        db.recover_stuck(conn)
        if args.scrape and IG_USERNAMES:
            added = db.insert_posts(conn, source.scrape_reels(IG_USERNAMES, SCRAPE_LIMIT))
            db.log(conn, "INFO", f"Scrape Apify: {added} novo(s) Reel(s)")
        run_queue(conn)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
