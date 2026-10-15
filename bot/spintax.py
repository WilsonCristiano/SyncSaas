import random
import re

_GROUP = re.compile(r"\{([^{}]*)\}")
_NOISE = re.compile(r"(#\w+|@\w+|https?://\S+)", re.UNICODE)
_HASHTAG = re.compile(r"#\w+", re.UNICODE)

def spin(text: str, rng: random.Random | None = None) -> str:
    """Resolve {a|b|c}, inclusive aninhado (do grupo mais interno para fora)."""
    rng = rng or random
    while True:
        new = _GROUP.sub(lambda m: rng.choice(m.group(1).split("|")), text)
        if new == text:
            return new
        text = new

def rotate_hashtags(original: str, pool: list[str], rng: random.Random | None = None) -> list[str]:
    """Mantém até 2 hashtags originais + 3-5 sorteadas do pool, em ordem embaralhada."""
    rng = rng or random
    keep = list(dict.fromkeys(t.lower() for t in _HASHTAG.findall(original)))[:2]
    extra = [t for t in pool if t.lower() not in keep]
    tags = keep + rng.sample(extra, min(len(extra), rng.randint(3, 5)))
    rng.shuffle(tags)
    return tags

def build_caption(original: str, template: str, pool: list[str], limit: int = 2200) -> str:
    clean = re.sub(r"\s+", " ", _NOISE.sub("", original)).strip()
    body = spin(template).replace("[[caption]]", clean).strip()  # spin só no template: legenda nunca é interpretada
    tags = " ".join(rotate_hashtags(original, pool))
    text = f"{body}\n\n{tags}".strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0]
