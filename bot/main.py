"""python -m bot.main [--scrape [--force]] [--check]
--scrape  lê as fontes ativas (tabela sources) via Apify e enfileira os Reels novos
--force   ignora o intervalo de leitura (botão "Executar scraping agora")
--check   NÃO publica: só informa (GITHUB_OUTPUT eligible=true|false) se há algo publicável agora.
          Permite ao workflow pular a instalação do Chromium quando não há nada a fazer.
Execuções acionadas por webhook/aprovação rodam SEM --scrape: nunca se retroalimentam."""
import argparse
import os
import time

from . import db, source, tiktok
from .config import CAPTION_TEMPLATE, HASHTAG_POOL, MAX_ATTEMPTS, MAX_TRIES_PER_RUN, SCRAPE_LIMIT
from .spintax import build_caption

def can_post_now(conn, s: dict) -> tuple[bool, str]:
    done24, since = db.posting_window(conn)
    if done24 >= s["max_per_day"]:
        return False, f"limite diário atingido ({done24}/{s['max_per_day']} nas últimas 24h)"
    gap = s["min_hours_between"] * 3600
    if since is not None and since < gap:
        return False, f"intervalo mínimo: faltam {int((gap - since) // 60)} min"
    return True, "ok"

def scrape_all(conn, s: dict, force: bool) -> None:
    status = "WAITING_APPROVAL" if s["require_approval"] else "PENDING"
    for src in db.due_sources(conn, s["scrape_every_hours"], force):
        user = src["username"]
        try:
            rows = source.scrape_reels(user, SCRAPE_LIMIT)
            for r in rows:
                r["source_id"] = src["id"]
            added = db.insert_posts(conn, rows, status)
            db.touch_source(conn, src["id"], None)
            db.log(conn, "INFO", "SCRAPE", f"@{user}: {len(rows)} Reel(s) lido(s), {added} novo(s) [{status}]")
        except Exception as e:
            db.touch_source(conn, src["id"], str(e)[:300])
            db.log(conn, "ERROR", "SCRAPE", f"@{user}: falha no scraping: {e}")

def run_queue(conn, s: dict) -> None:
    tried: list[str] = []
    while len(tried) < MAX_TRIES_PER_RUN:
        ok, why = can_post_now(conn, s)
        if not ok:
            print(f"Fila em espera: {why}")
            break
        post = db.claim_next(conn, MAX_ATTEMPTS, tried)
        if not post:
            break
        pid, video = post["id"], None
        tried.append(pid)
        try:
            video = source.download_video(post["video_url"], post["ig_id"])
            caption = build_caption(post["caption"], post["author"], CAPTION_TEMPLATE, HASHTAG_POOL, s)
            tiktok.post_video(str(video), caption)
            db.mark_done(conn, pid)
            db.log(conn, "SUCCESS", "TIKTOK", f"Publicado: {post['ig_id']} (@{post['author'] or '?'})", pid)
        except tiktok.SessionExpired as e:
            db.release(conn, pid)
            db.log(conn, "ERROR", "TIKTOK", f"{e}. Atualize os cookies; a fila foi preservada.", pid)
            break
        except Exception as e:
            db.mark_failed(conn, pid, repr(e), MAX_ATTEMPTS)
            db.log(conn, "ERROR", "TIKTOK", f"{post['ig_id']} (tentativa {post['attempts']}/{MAX_ATTEMPTS}): {e}", pid)
        finally:
            if video:
                video.unlink(missing_ok=True)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scrape", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    conn = db.connect()
    try:
        db.recover_stuck(conn)
        s = db.get_settings(conn)
        if args.scrape:
            scrape_all(conn, s, args.force)
        if args.check:
            ok, why = can_post_now(conn, s)
            eligible = ok and db.has_pending(conn, MAX_ATTEMPTS)
            print(f"eligible={eligible} ({why})")
            if os.getenv("GITHUB_OUTPUT"):
                with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                    f.write(f"eligible={'true' if eligible else 'false'}\n")
            return
        run_queue(conn, s)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
