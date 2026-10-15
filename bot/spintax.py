import random
import re

_GROUP = re.compile(r"\{([^{}]*)\}")
_NOISE = re.compile(r"(#\w+|@\w+|https?://\S+)", re.UNICODE)
_HASHTAG = re.compile(r"#\w+", re.UNICODE)

def spin(text: str, rng: random.Random | None = None) -> str:
    """Resolve {a|b|c}, inclusive aninhado."""
    rng = rng or random
    while True:
        new = _GROUP.sub(lambda m: rng.choice(m.group(1).split("|")), text)
        if new == text:
            return new
        text = new

def rotate_hashtags(original: str, pool: list[str], rng: random.Random | None = None) -> list[str]:
    rng = rng or random
    keep = list(dict.fromkeys(t.lower() for t in _HASHTAG.findall(original)))[:2]
    extra = [t for t in pool if t.lower() not in keep]
    tags = keep + rng.sample(extra, min(len(extra), rng.randint(3, 5)))
    rng.shuffle(tags)
    return tags

def build_caption(original: str, author: str | None, template: str, pool: list[str], settings: dict, limit: int = 2200) -> str:
    """corpo (spintax) + hashtags rotativas + créditos + bloco fixo. O rodapé nunca é cortado."""
    clean = re.sub(r"\s+", " ", _NOISE.sub("", original)).strip()
    body = spin(template).replace("[[caption]]", clean).strip()  # spin só no template
    head = f"{body}\n\n{' '.join(rotate_hashtags(original, pool))}".strip()

    tail_parts = []
    if settings["credits_enabled"] and author:
        tail_parts.append(settings["credits_template"].replace("{author}", author))  # sem spintax: {author} é literal
    if settings["caption_suffix"].strip():
        tail_parts.append(settings["caption_suffix"].strip())
    tail = "\n\n".join(tail_parts)

    room = limit - len(tail) - 2
    if len(head) > room:
        head = head[:max(room, 0)].rsplit(" ", 1)[0]
    return f"{head}\n\n{tail}".strip()
