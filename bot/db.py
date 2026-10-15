import psycopg2
import psycopg2.extras
from .config import DATABASE_URL

def connect():
    return psycopg2.connect(DATABASE_URL)

def log(conn, level: str, message: str, post_id: str | None = None) -> None:
    with conn.cursor() as c:
        c.execute("INSERT INTO logs (level, message, post_id) VALUES (%s, %s, %s)", (level, message[:1000], post_id))
    conn.commit()

def insert_posts(conn, rows: list[dict]) -> int:
    """ig_id UNIQUE + DO NOTHING: Reel já conhecido nunca volta à fila."""
    n = 0
    with conn.cursor() as c:
        for r in rows:
            c.execute(
                """INSERT INTO posts (ig_id, source_url, video_url, caption, updated_at)
                   VALUES (%(ig_id)s, %(source_url)s, %(video_url)s, %(caption)s, now())
                   ON CONFLICT (ig_id) DO NOTHING""", r)
            n += c.rowcount
    conn.commit()
    return n

def recover_stuck(conn, minutes: int = 30) -> None:
    """RUNNING abandonado (worker morto) volta para PENDING."""
    with conn.cursor() as c:
        c.execute("UPDATE posts SET status = 'PENDING', updated_at = now() "
                  "WHERE status = 'RUNNING' AND updated_at < now() - make_interval(mins => %s)", (minutes,))
    conn.commit()

def claim_next(conn, max_attempts: int) -> dict | None:
    """Reserva 1 item de forma atômica; SKIP LOCKED evita corrida entre workers."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as c:
        c.execute(
            """UPDATE posts SET status = 'RUNNING', attempts = attempts + 1, updated_at = now()
               WHERE id = (SELECT id FROM posts WHERE status = 'PENDING' AND attempts < %s
                           ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
               RETURNING id, ig_id, video_url, caption, attempts""", (max_attempts,))
        row = c.fetchone()
    conn.commit()
    return dict(row) if row else None

def mark_done(conn, post_id: str) -> None:
    with conn.cursor() as c:
        c.execute("UPDATE posts SET status = 'DONE', error = NULL, updated_at = now() WHERE id = %s", (post_id,))
    conn.commit()

def mark_failed(conn, post_id: str, error: str, max_attempts: int) -> None:
    """Esgotou tentativas -> FAILED definitivo; senão volta à fila."""
    with conn.cursor() as c:
        c.execute(
            """UPDATE posts SET error = %s, updated_at = now(),
                 status = CASE WHEN attempts >= %s THEN 'FAILED'::post_status ELSE 'PENDING'::post_status END
               WHERE id = %s""", (error[:500], max_attempts, post_id))
    conn.commit()

def release(conn, post_id: str) -> None:
    """Devolve à fila sem consumir tentativa (ex.: sessão do TikTok expirada)."""
    with conn.cursor() as c:
        c.execute("UPDATE posts SET status = 'PENDING', attempts = GREATEST(attempts - 1, 0), updated_at = now() WHERE id = %s", (post_id,))
    conn.commit()
