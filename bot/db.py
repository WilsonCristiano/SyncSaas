import psycopg2
import psycopg2.extras
from .config import DATABASE_URL

DEFAULT_SETTINGS = dict(
    require_approval=False, caption_suffix="", credits_enabled=True, credits_template="Créditos: @{author}",
    max_per_day=3, min_hours_between=4, scrape_every_hours=6,
)

def connect():
    return psycopg2.connect(DATABASE_URL)

def _dict_cur(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

def log(conn, level: str, kind: str, message: str, post_id: str | None = None) -> None:
    with conn.cursor() as c:
        c.execute("INSERT INTO logs (level, kind, message, post_id) VALUES (%s, %s, %s, %s)", (level, kind, message[:1000], post_id))
    conn.commit()

# ---------- configurações ----------
def get_settings(conn) -> dict:
    with _dict_cur(conn) as c:
        c.execute("""SELECT require_approval, caption_suffix, credits_enabled, credits_template,
                            max_per_day, min_hours_between, scrape_every_hours FROM settings WHERE id = 1""")
        row = c.fetchone()
    conn.commit()
    return {**DEFAULT_SETTINGS, **(dict(row) if row else {})}

# ---------- fontes ----------
def due_sources(conn, hours: int, force: bool) -> list[dict]:
    with _dict_cur(conn) as c:
        c.execute("""SELECT id, username FROM sources
                     WHERE active AND (%s OR last_scraped_at IS NULL
                                       OR last_scraped_at < now() - make_interval(hours => %s))
                     ORDER BY last_scraped_at NULLS FIRST""", (force, hours))
        rows = [dict(r) for r in c.fetchall()]
    conn.commit()
    return rows

def touch_source(conn, source_id: str, error: str | None) -> None:
    with conn.cursor() as c:
        c.execute("UPDATE sources SET last_scraped_at = now(), last_error = %s, updated_at = now() WHERE id = %s", (error, source_id))
    conn.commit()

# ---------- fila ----------
def insert_posts(conn, rows: list[dict], status: str) -> int:
    """ig_id UNIQUE + DO NOTHING: Reel já conhecido nunca volta à fila."""
    n = 0
    with conn.cursor() as c:
        for r in rows:
            c.execute(
                """INSERT INTO posts (ig_id, source_id, author, source_url, video_url, caption, status, updated_at)
                   VALUES (%(ig_id)s, %(source_id)s, %(author)s, %(source_url)s, %(video_url)s, %(caption)s, %(status)s::post_status, now())
                   ON CONFLICT (ig_id) DO NOTHING""", {**r, "status": status})
            n += c.rowcount
    conn.commit()
    return n

def recover_stuck(conn, minutes: int = 30) -> None:
    with conn.cursor() as c:
        c.execute("UPDATE posts SET status = 'PENDING', updated_at = now() "
                  "WHERE status = 'RUNNING' AND updated_at < now() - make_interval(mins => %s)", (minutes,))
    conn.commit()

def has_pending(conn, max_attempts: int) -> bool:
    with conn.cursor() as c:
        c.execute("SELECT EXISTS (SELECT 1 FROM posts WHERE status = 'PENDING' AND attempts < %s)", (max_attempts,))
        ok = c.fetchone()[0]
    conn.commit()
    return ok

def posting_window(conn) -> tuple[int, float | None]:
    """(publicados nas últimas 24h, segundos desde a última publicação)."""
    with conn.cursor() as c:
        c.execute("""SELECT count(*) FILTER (WHERE posted_at > now() - interval '24 hours'),
                            EXTRACT(EPOCH FROM (now() - max(posted_at)))
                     FROM posts WHERE status = 'DONE' AND posted_at IS NOT NULL""")
        n, since = c.fetchone()
    conn.commit()
    return int(n), (float(since) if since is not None else None)

def claim_next(conn, max_attempts: int, exclude: list[str]) -> dict | None:
    """Reserva 1 item de forma atômica (SKIP LOCKED); `exclude` evita repetir um falho na mesma execução."""
    with _dict_cur(conn) as c:
        c.execute(
            """UPDATE posts SET status = 'RUNNING', attempts = attempts + 1, updated_at = now()
               WHERE id = (SELECT id FROM posts
                           WHERE status = 'PENDING' AND attempts < %s AND NOT (id = ANY(%s::text[]))
                           ORDER BY attempts, created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
               RETURNING id, ig_id, video_url, caption, author, attempts""", (max_attempts, exclude))
        row = c.fetchone()
    conn.commit()
    return dict(row) if row else None

def mark_done(conn, post_id: str) -> None:
    with conn.cursor() as c:
        c.execute("UPDATE posts SET status = 'DONE', error = NULL, posted_at = now(), updated_at = now() WHERE id = %s", (post_id,))
    conn.commit()

def mark_failed(conn, post_id: str, error: str, max_attempts: int) -> None:
    with conn.cursor() as c:
        c.execute(
            """UPDATE posts SET error = %s, updated_at = now(),
                 status = CASE WHEN attempts >= %s THEN 'FAILED'::post_status ELSE 'PENDING'::post_status END
               WHERE id = %s""", (error[:500], max_attempts, post_id))
    conn.commit()

def release(conn, post_id: str) -> None:
    """Devolve à fila sem gastar tentativa (ex.: sessão do TikTok expirada)."""
    with conn.cursor() as c:
        c.execute("UPDATE posts SET status = 'PENDING', attempts = GREATEST(attempts - 1, 0), updated_at = now() WHERE id = %s", (post_id,))
    conn.commit()
