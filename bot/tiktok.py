import json
import os
import random
import re
from pathlib import Path

from playwright.sync_api import TimeoutError as PWTimeout, expect, sync_playwright

from .config import HEADLESS, TIKTOK_COOKIES_FILE

UPLOAD_URL = "https://www.tiktok.com/tiktokstudio/upload?from=webapp"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
HD_LABEL = re.compile(r"alta qualidade|high[- ]quality|\bHD\b", re.I)
SAMESITE = {"no_restriction": "None", "unspecified": "Lax", "lax": "Lax", "strict": "Strict", "none": "None"}

class SessionExpired(RuntimeError):
    """Cookies inválidos: renove o login e atualize TIKTOK_COOKIES."""

def _cookies():
    raw = os.getenv("TIKTOK_COOKIES") or Path(TIKTOK_COOKIES_FILE).read_text()
    return json.loads(raw)  # dict = storage_state do Playwright | list = export de extensão

def _norm(c: dict) -> dict:
    out = {k: c[k] for k in ("name", "value", "domain", "path", "httpOnly", "secure") if k in c}
    out.setdefault("path", "/")
    if c.get("expirationDate") or c.get("expires", -1) > 0:
        out["expires"] = int(c.get("expirationDate") or c["expires"])
    out["sameSite"] = SAMESITE.get(str(c.get("sameSite", "lax")).lower(), "Lax")
    return out

def _is_on(sw) -> bool:
    v = sw.get_attribute("aria-checked")
    return v == "true" if v is not None else sw.is_checked()

def enable_hd(page) -> None:
    """Localiza o switch 'Permitir uploads em alta qualidade (HD)' e garante que está ligado."""
    more = page.get_by_text(re.compile(r"^(Mostrar mais|Show more|More)$", re.I))
    if more.count():
        more.first.click(force=True)
    label = page.get_by_text(HD_LABEL).first
    label.wait_for(state="attached", timeout=20_000)
    label.scroll_into_view_if_needed()
    # ancestral mais próximo que contém um switch = a linha da opção
    row = label.locator("xpath=ancestor::*[.//*[@role='switch'] or .//input[@type='checkbox']][1]")
    sw = row.locator("[role='switch'], input[type='checkbox']").first
    if not _is_on(sw):
        sw.click(force=True)
        page.wait_for_timeout(600)
    if not _is_on(sw):
        raise RuntimeError("Switch HD não ficou ativo; publicação abortada")

def post_video(video_path: str, caption: str) -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=HEADLESS, args=["--disable-blink-features=AutomationControlled"])
        data = _cookies()
        ctx = browser.new_context(storage_state=data if isinstance(data, dict) else None,
                                  locale="pt-BR", user_agent=UA, viewport={"width": 1366, "height": 900})
        if isinstance(data, list):
            ctx.add_cookies([_norm(c) for c in data])
        page = ctx.new_page()
        page.set_default_timeout(30_000)
        try:
            page.goto(UPLOAD_URL, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            if "login" in page.url:
                raise SessionExpired("Sessão do TikTok expirada")

            page.locator("input[type='file']").first.set_input_files(video_path)

            editor = page.locator("div[contenteditable='true']").first
            editor.wait_for(timeout=90_000)
            editor.click(force=True)
            page.keyboard.press("Control+A")
            page.keyboard.press("Delete")
            page.keyboard.type(caption, delay=random.randint(15, 45))

            enable_hd(page)  # obrigatório ANTES de publicar

            btn = page.get_by_role("button", name=re.compile(r"^(Publicar|Post)$", re.I)).first
            expect(btn).to_be_enabled(timeout=300_000)  # habilita quando o upload termina
            btn.click(force=True)
            try:  # diálogo "Publicar agora" (verificação de direitos autorais ainda em curso)
                page.get_by_role("button", name=re.compile(r"(Publicar agora|Post now)", re.I)).first.click(force=True, timeout=8_000)
            except PWTimeout:
                pass
            page.wait_for_url(re.compile(r"tiktokstudio/content"), timeout=120_000)
        except Exception:
            page.screenshot(path="/tmp/tiktok_error.png")
            raise
        finally:
            ctx.close()
            browser.close()
