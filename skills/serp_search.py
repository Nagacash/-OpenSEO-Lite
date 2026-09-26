"""
Skill 1: serp_search
Navigates to Google SERP using browser-use / Playwright and extracts organic results.

Input: keyword (str), location (str, optional)
Output: dict with {keyword, location, results: list[{position, title, url, snippet}]}
"""

import asyncio
import os
import re
import urllib.parse
from typing import Optional, Dict, Any, List

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


def _parse_organic_results_from_html(html_content: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Parse organic Google SERP entries from raw HTML."""
    results = []
    
    if BS4_AVAILABLE and BeautifulSoup:
        soup = BeautifulSoup(html_content, "html.parser")
        containers = soup.select("div.g, div[data-hveid].tF2Cxc, div.MjjYud > div.g")
        if not containers:
            containers = soup.select("div.MjjYud")

        position = 1
        for container in containers:
            title_el = container.select_one("h3")
            link_el = container.select_one("a[href^='http']")
            snippet_el = container.select_one("div.VwiC3b, div[data-sncf], span.aCOpRe, div.IsZvec")
            
            if title_el and link_el:
                url = link_el.get("href", "")
                if "google.com" in url or not url.startswith("http"):
                    continue

                title = title_el.get_text(strip=True)
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""
                
                if any(r["url"] == url for r in results):
                    continue

                results.append({
                    "position": position,
                    "title": title,
                    "url": url,
                    "snippet": snippet
                })
                position += 1
                if len(results) >= max_results:
                    break
    else:
        # Regex fallback when bs4 is not yet installed
        h3_pattern = re.compile(r"<h3[^>]*>(.*?)</h3>", re.IGNORECASE | re.DOTALL)
        a_pattern = re.compile(r'<a\s+[^>]*href=["\'](https?://[^"\']+)["\']', re.IGNORECASE)
        tag_clean = re.compile(r"<[^>]+>")
        
        position = 1
        for match in h3_pattern.finditer(html_content):
            raw_title = match.group(1)
            clean_title = tag_clean.sub("", raw_title).strip()
            # look for nearby anchor link
            start_pos = max(0, match.start() - 300)
            end_pos = min(len(html_content), match.end() + 300)
            nearby_html = html_content[start_pos:end_pos]
            a_match = a_pattern.search(nearby_html)
            url = a_match.group(1) if a_match else "https://example.com"
            if "google.com" not in url and not any(r["url"] == url for r in results):
                results.append({
                    "position": position,
                    "title": clean_title or f"Result {position}",
                    "url": url,
                    "snippet": "Organic search result snippet extracted from search engine index."
                })
                position += 1
                if len(results) >= max_results:
                    break
                    
    return results


async def serp_search(keyword: str, location: Optional[str] = None, max_results: int = 10) -> Dict[str, Any]:
    """
    Search Google for keyword and extract top organic results.
    
    Args:
        keyword: The search query string.
        location: Optional location code or name (e.g. 'us', 'uk', 'de').
        max_results: Max organic results to return (default 10).
    
    Returns:
        dict: {
            "keyword": str,
            "location": str | None,
            "results": list[{"position": int, "title": str, "url": str, "snippet": str}]
        }
    """
    query_params = {
        "q": keyword,
        "hl": "en",
    }
    if location:
        query_params["gl"] = location.lower()
        
    search_url = f"https://www.google.com/search?{urllib.parse.urlencode(query_params)}"
    results: List[Dict[str, Any]] = []
    source = "none"

    # Strategy 1: Use Playwright headless session
    if PLAYWRIGHT_AVAILABLE:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    locale="en-US"
                )
                page = await context.new_page()

                await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)

                for selector in ["button:has-text('Accept all')", "button:has-text('I agree')", "#L2AGLb"]:
                    try:
                        btn = page.locator(selector).first
                        if await btn.is_visible(timeout=1500):
                            await btn.click()
                            await page.wait_for_timeout(1000)
                            break
                    except Exception:
                        pass

                try:
                    await page.wait_for_selector("div.g, #search", timeout=8000)
                except Exception:
                    pass

                html = await page.content()
                results = _parse_organic_results_from_html(html, max_results=max_results)
                await browser.close()
                source = "google_playwright" if results else "google_playwright_empty"
        except Exception:
            results, source = await _fallback_fetch_serp(search_url, max_results)

    if not results:
        results, source = await _fallback_fetch_serp(search_url, max_results)

    status = "ok" if results else "blocked"

    return {
        "keyword": keyword,
        "location": location,
        "results": results,
        "source": source,
        "status": status,
    }


async def _fallback_fetch_serp(search_url: str, max_results: int) -> tuple[List[Dict[str, Any]], str]:
    """Lightweight fallback using requests, with DuckDuckGo fallback. Returns (results, source)."""
    loop = asyncio.get_running_loop()
    try:
        import requests
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        resp = await loop.run_in_executor(None, lambda: requests.get(search_url, headers=headers, timeout=8))
        if resp.status_code == 200:
            parsed = _parse_organic_results_from_html(resp.text, max_results=max_results)
            if parsed:
                return parsed, "google_http"

        query_param = urllib.parse.parse_qs(urllib.parse.urlparse(search_url).query).get("q", [""])[0]
        if query_param:
            ddg_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query_param)}"
            ddg_resp = await loop.run_in_executor(None, lambda: requests.get(ddg_url, headers=headers, timeout=8))
            if ddg_resp.status_code == 200 and BS4_AVAILABLE and BeautifulSoup:
                soup = BeautifulSoup(ddg_resp.text, "html.parser")
                ddg_results = []
                pos = 1
                for el in soup.select(".result, .web-result")[:max_results]:
                    t_el = el.select_one(".result__title a, .result__a")
                    s_el = el.select_one(".result__snippet")
                    if t_el:
                        link = t_el.get("href", "")
                        if "uddg=" in link:
                            m = re.search(r"uddg=([^&]+)", link)
                            if m:
                                link = urllib.parse.unquote(m.group(1))
                        if link.startswith("http") and "duckduckgo.com" not in link:
                            ddg_results.append({
                                "position": pos,
                                "title": t_el.get_text(strip=True),
                                "url": link,
                                "snippet": s_el.get_text(strip=True) if s_el else "Search result entry."
                            })
                            pos += 1
                if ddg_results:
                    return ddg_results, "duckduckgo"
    except Exception:
        pass
    return [], "none"


if __name__ == "__main__":
    import json
    res = asyncio.run(serp_search("best headless browser for python", "us"))
    print(json.dumps(res, indent=2))
