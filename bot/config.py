import os
from dotenv import load_dotenv

load_dotenv()

def _list(name: str, default: str = "") -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]

DATABASE_URL = os.environ["POSTGRES_URL_NON_POOLING"]  # conexão direta (psycopg2)
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")
IG_USERNAMES = _list("IG_USERNAMES")
SCRAPE_LIMIT = int(os.getenv("SCRAPE_LIMIT", "5"))

MAX_ATTEMPTS = int(os.getenv("MAX_ATTEMPTS", "3"))          # teto de tentativas por Reel (sem loops)
MAX_POSTS_PER_RUN = int(os.getenv("MAX_POSTS_PER_RUN", "5"))
DELAY_MIN = int(os.getenv("DELAY_MIN", "90"))               # pausa entre posts (s)
DELAY_MAX = int(os.getenv("DELAY_MAX", "240"))

# Spintax: {a|b|c}. [[caption]] é substituído pela legenda original já limpa.
CAPTION_TEMPLATE = os.getenv("CAPTION_TEMPLATE", "{Olha isso|Confira|Você precisa ver|Assista}: [[caption]]")
HASHTAG_POOL = _list("HASHTAG_POOL", "#fyp,#viral,#reels,#paravoce,#trending,#foryou,#explore")

TIKTOK_COOKIES_FILE = os.getenv("TIKTOK_COOKIES_FILE", "cookies.json")  # ou env TIKTOK_COOKIES (JSON)
HEADLESS = os.getenv("HEADLESS", "1") != "0"
