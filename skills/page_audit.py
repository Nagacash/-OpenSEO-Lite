"""
Skill 2: page_audit
Navigates to a webpage using browser-use / Playwright and extracts comprehensive on-page SEO data.

Input: url (str)
Output: dict with {
    url,
    title,
    meta_description,
    headings: {h1, h2, h3},
    word_count,
    internal_links,
    external_links,
    issues: list[str]
}
"""

import asyncio
import re
import urllib.parse
from typing import Dict, Any, List

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    BeautifulSoup = None  # type: ignore

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


def _analyze_html_seo(url: str, html: str) -> Dict[str, Any]:
    """Parse HTML and compute SEO properties and detected issues."""
    issues: List[str] = []

    parsed_base = urllib.parse.urlparse(url)
    base_domain = parsed_base.netloc.lower()
    if parsed_base.scheme != "https":
        issues.append("Page is not served over secure HTTPS protocol.")

    if BS4_AVAILABLE and BeautifulSoup:
        soup = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""

        meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
        if not meta_desc_tag:
            meta_desc_tag = soup.find("meta", attrs={"property": re.compile(r"^og:description$", re.I)})
        meta_desc = meta_desc_tag.get("content", "").strip() if meta_desc_tag else ""

        h1s = [h.get_text(strip=True) for h in soup.find_all("h1") if h.get_text(strip=True)]
        h2s = [h.get_text(strip=True) for h in soup.find_all("h2") if h.get_text(strip=True)]
        h3s = [h.get_text(strip=True) for h in soup.find_all("h3") if h.get_text(strip=True)]

        for s in soup(["script", "style", "noscript", "svg"]):
            s.extract()
        body_text = soup.get_text(separator=" ", strip=True)
        words = [w for w in re.findall(r"\b\w+\b", body_text) if len(w) > 1]
        word_count = len(words)

        internal_links_set = set()
        external_links_set = set()
        for a in soup.find_all("a", href=True):
            raw_href = a["href"].strip()
            if not raw_href or raw_href.startswith("#") or raw_href.startswith("javascript:"):
                continue
            full_url = urllib.parse.urljoin(url, raw_href)
            target_domain = urllib.parse.urlparse(full_url).netloc.lower()
            if target_domain == base_domain or not target_domain:
                internal_links_set.add(full_url)
            else:
                external_links_set.add(full_url)

        images = soup.find_all("img")
        missing_alt = [img for img in images if not img.get("alt") or not img.get("alt").strip()]
        if missing_alt:
            issues.append(f"{len(missing_alt)} image(s) missing alt text attributes.")

        viewport = soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.I)})
        if not viewport:
            issues.append("Missing mobile viewport meta tag.")
    else:
        # Standard library regex parser fallback
        title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        title = re.sub(r"<[^>]+>", "", title_m.group(1)).strip() if title_m else ""

        meta_m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', html, re.IGNORECASE)
        meta_desc = meta_m.group(1).strip() if meta_m else ""

        h1s = [re.sub(r"<[^>]+>", "", m.group(1)).strip() for m in re.finditer(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)]
        h2s = [re.sub(r"<[^>]+>", "", m.group(1)).strip() for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", html, re.I | re.S)]
        h3s = [re.sub(r"<[^>]+>", "", m.group(1)).strip() for m in re.finditer(r"<h3[^>]*>(.*?)</h3>", html, re.I | re.S)]

        clean_body = re.sub(r"<(script|style|svg)[^>]*>.*?</\1>", "", html, flags=re.I | re.S)
        clean_text = re.sub(r"<[^>]+>", " ", clean_body)
        words = [w for w in re.findall(r"\b\w+\b", clean_text) if len(w) > 1]
        word_count = len(words)

        internal_links_set = set()
        external_links_set = set()
        for a_m in re.finditer(r'<a\s+[^>]*href=["\']([^"\']+)["\']', html, re.I):
            href = a_m.group(1).strip()
            if href.startswith("http"):
                target_d = urllib.parse.urlparse(href).netloc.lower()
                if target_d == base_domain:
                    internal_links_set.add(href)
                else:
                    external_links_set.add(href)

    # Common issue evaluations
    if not title:
        issues.append("Missing <title> tag.")
    elif len(title) < 30:
        issues.append(f"Title tag is very short ({len(title)} chars). Recommended: 40-60 chars.")
    elif len(title) > 65:
        issues.append(f"Title tag may be truncated in search results ({len(title)} chars). Recommended: 40-60 chars.")

    if not meta_desc:
        issues.append("Missing meta description tag.")
    elif len(meta_desc) < 60:
        issues.append(f"Meta description is short ({len(meta_desc)} chars). Recommended: 120-160 chars.")
    elif len(meta_desc) > 165:
        issues.append(f"Meta description is overly long ({len(meta_desc)} chars). May be truncated.")

    if len(h1s) == 0:
        issues.append("Missing H1 heading on the page.")
    elif len(h1s) > 1:
        issues.append(f"Multiple H1 headings detected ({len(h1s)}). Best practice is one primary H1.")

    if word_count < 250:
        issues.append(f"Thin content detected ({word_count} words). Recommended: at least 300+ words for main content.")

    internal_links = sorted(list(internal_links_set))[:50]
    external_links = sorted(list(external_links_set))[:50]

    if len(internal_links) == 0:
        issues.append("No internal links found on page. Improves crawlability and site architecture.")

    return {
        "url": url,
        "title": title,
        "meta_description": meta_desc,
        "headings": {
            "h1": h1s,
            "h2": h2s[:10],
            "h3": h3s[:10],
        },
        "word_count": word_count,
        "internal_links": internal_links,
        "external_links": external_links,
        "issues": issues,
    }


def is_safe_public_url(target_url: str) -> tuple[bool, str]:
    """OWASP Top 10 SSRF validation: block loopbacks, metadata services, and private RFC 1918 subnets."""
    try:
        parsed = urllib.parse.urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return False, "Invalid protocol. Only http and https are permitted."
        
        host = (parsed.hostname or "").lower()
        if host in ("localhost", "127.0.0.1", "::1", "0.0.0.0") or host.endswith(".localhost") or host.endswith(".local"):
            return False, "Loopback addresses are blocked (SSRF defense)."
        
        if host in ("169.254.169.254", "metadata.google.internal"):
            return False, "Cloud instance metadata services are blocked."
        
        # Check IPv4 private subnets
        match = re.match(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$", host)
        if match:
            b0, b1 = int(match.group(1)), int(match.group(2))
            if b0 == 10 or (b0 == 172 and 16 <= b1 <= 31) or (b0 == 192 and b1 == 168) or b0 == 127 or (b0 == 169 and b1 == 254):
                return False, f"Private/internal network address {host} is blocked."
        
        return True, ""
    except Exception as e:
        return False, f"Malformed URL: {e}"


async def page_audit(url: str) -> Dict[str, Any]:
    """
    Perform an in-depth on-page SEO audit of a specified URL.
    
    Args:
        url: The full webpage URL (including https://).
        
    Returns:
        dict: {
            url,
            title,
            meta_description,
            headings: {h1, h2, h3},
            word_count,
            internal_links,
            external_links,
            issues: list[str]
        }
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"

    # SSRF Protection Check
    is_safe, reason = is_safe_public_url(url)
    if not is_safe:
        return {
            "url": url,
            "title": "",
            "meta_description": "",
            "headings": {"h1": [], "h2": [], "h3": []},
            "word_count": 0,
            "internal_links": [],
            "external_links": [],
            "issues": [f"[SECURITY_BLOCK] SSRF defense blocked: {reason}"],
        }

    html = ""
    # Try Playwright for dynamic rendering if available
    if PLAYWRIGHT_AVAILABLE:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox"]
                )
                page = await browser.new_page(
                    user_agent="OpenSEO-Lite-Agent/1.0 (+https://github.com/Nagacash/-OpenSEO-Lite)"
                )
                await page.goto(url, wait_until="domcontentloaded", timeout=25000)
                await page.wait_for_timeout(1000)
                html = await page.content()
                await browser.close()
        except Exception:
            html = ""

    # Fallback with requests or urllib if Playwright is absent or encounters error
    if not html:
        loop = asyncio.get_event_loop()
        try:
            import requests
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
            resp = await loop.run_in_executor(None, lambda: requests.get(url, headers=headers, timeout=15))
            html = resp.text
        except ImportError:
            import urllib.request
            def _fetch_page():
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"}
                )
                with urllib.request.urlopen(req, timeout=12) as response:
                    return response.read().decode("utf-8", errors="ignore")
            try:
                html = await loop.run_in_executor(None, _fetch_page)
            except Exception as e:
                return {
                    "url": url,
                    "title": "",
                    "meta_description": "",
                    "headings": {"h1": [], "h2": [], "h3": []},
                    "word_count": 0,
                    "internal_links": [],
                    "external_links": [],
                    "issues": [f"Failed to fetch page: {str(e)}"]
                }
        except Exception as e:
            return {
                "url": url,
                "title": "",
                "meta_description": "",
                "headings": {"h1": [], "h2": [], "h3": []},
                "word_count": 0,
                "internal_links": [],
                "external_links": [],
                "issues": [f"Failed to fetch page: {str(e)}"]
            }

    return _analyze_html_seo(url, html)


if __name__ == "__main__":
    import json
    res = asyncio.run(page_audit("https://example.com"))
    print(json.dumps(res, indent=2))
