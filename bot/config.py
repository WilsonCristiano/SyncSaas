import os
from dotenv import load_dotenv

load_dotenv()

def _list(name: str, default: str = "") -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]

DATABASE_URL = os.environ["POSTGRES_URL_NON_POOLING"]
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")
SCRAPE_LIMIT = int(os.getenv("SCRAPE_LIMIT", "5"))            # Reels lidos por fonte a cada leitura

MAX_ATTEMPTS = int(os.getenv("MAX_ATTEMPTS", "3"))            # teto de tentativas por vídeo
MAX_TRIES_PER_RUN = int(os.getenv("MAX_TRIES_PER_RUN", "3"))  # tentativas de publicação por execução

# Spintax {a|b|c}; [[caption]] = legenda original limpa. (variável vazia no GitHub -> usa o padrão)
CAPTION_TEMPLATE = os.getenv("CAPTION_TEMPLATE") or "{Olha isso|Confira|Você precisa ver|Assista}: [[caption]]"
HASHTAG_POOL = _list("HASHTAG_POOL", "#fyp,#viral,#reels,#paravoce,#trending,#foryou,#explore")

TIKTOK_COOKIES_FILE = os.getenv("TIKTOK_COOKIES_FILE", "cookies.json")
HEADLESS = os.getenv("HEADLESS", "1") != "0"
