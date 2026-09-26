"""
Skill 4: ai_visibility_check
Estimates whether AI answer engines and SERP AI surfaces mention/cite a brand.

Input: brand (str), domain (str), queries (list[str], optional)
Output: dict with visibility_score, per-query evidence, ai_summary, mode
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from .page_audit import is_safe_public_url
from .serp_search import serp_search


DEFAULT_QUERY_TEMPLATES = [
    "{brand}",
    "best alternatives to {brand}",
    "{brand} vs competitors",
    "what is {brand}",
    "{brand} review",
]


def _normalize_domain(domain: str) -> str:
    raw = (domain or "").strip()
    if not raw:
        return ""
    if not raw.startswith(("http://", "https://")):
        raw = f"https://{raw}"
    host = (urlparse(raw).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _brand_mentioned(text: str, brand: str) -> bool:
    if not text or not brand:
        return False
    pattern = re.compile(rf"\b{re.escape(brand)}\b", re.IGNORECASE)
    return bool(pattern.search(text))


def _domain_cited(text: str, urls: List[str], domain: str) -> Optional[str]:
    haystacks = [text] + urls
    for item in haystacks:
        if not item:
            continue
        lower = item.lower()
        if domain and domain in lower:
            if item.startswith("http"):
                return item
            return f"https://{domain}"
    return None


def _build_queries(brand: str, queries: Optional[List[str]]) -> List[str]:
    if queries:
        cleaned = [q.strip() for q in queries if isinstance(q, str) and q.strip()]
        if cleaned:
            return cleaned[:8]
    return [t.format(brand=brand) for t in DEFAULT_QUERY_TEMPLATES]


def _score_visibility(results: List[Dict[str, Any]]) -> int:
    total = len(results) or 1
    mentions = sum(1 for r in results if r.get("mentioned"))
    citations = sum(1 for r in results if r.get("cited_url"))
    unique_wins = len({r["query"] for r in results if r.get("mentioned") or r.get("cited_url")})
    query_count = len({r["query"] for r in results}) or 1

    score = (
        40 * (mentions / total)
        + 40 * (citations / total)
        + 20 * (unique_wins / query_count)
    )
    return max(0, min(100, int(round(score))))


def _fallback_summary(brand: str, domain: str, score: int, results: List[Dict[str, Any]], mode: str) -> str:
    mentions = sum(1 for r in results if r.get("mentioned"))
    citations = sum(1 for r in results if r.get("cited_url"))
    mode_note = " (demo fixtures — not live engine data)" if mode == "demo" else ""

    actions = [
        f"Publish a clear 'What is {brand}?' page that LLMs can cite with a crisp definition and product category.",
        f"Earn third-party mentions (directories, comparisons, reviews) that include a link to {domain}.",
        f"Add FAQ + Organization JSON-LD so AI Overviews and answer engines can attribute {brand} accurately.",
    ]
    if score >= 70:
        actions[0] = f"Defend visibility: monitor weekly for '{brand}' and 'alternatives to {brand}' queries."
    elif score < 30:
        actions[0] = f"Priority: get {brand} mentioned on authoritative comparison/listicle pages in your category."

    lines = [
        f"AI visibility for {brand} ({domain}) scored {score}/100{mode_note}.",
        f"Evidence: {mentions}/{len(results)} checks mentioned the brand; {citations}/{len(results)} cited the domain.",
        "",
        "Prioritized Actions:",
        f"1. {actions[0]}",
        f"2. {actions[1]}",
        f"3. {actions[2]}",
    ]
    return "\n".join(lines)


def _demo_results(brand: str, domain: str, queries: List[str]) -> List[Dict[str, Any]]:
    """Deterministic fixture results for demo mode (no network / blocked engines)."""
    results: List[Dict[str, Any]] = []
    for i, query in enumerate(queries):
        # Alternate mention/citation patterns so scores are realistic but clearly demo
        mentioned = i % 2 == 0 or brand.lower() in query.lower()
        cited = i % 3 == 0
        competitors = []
        if not mentioned:
            competitors = ["CompetitorA", "CompetitorB"]
        results.append({
            "query": query,
            "engine": "demo_fixture",
            "mentioned": mentioned,
            "cited_url": f"https://{domain}/" if cited else None,
            "snippet": (
                f"Demo: {brand} appears in synthetic AI answer for '{query}'."
                if mentioned
                else f"Demo: AI answer for '{query}' featured alternatives instead of {brand}."
            ),
            "competitors_mentioned": competitors,
            "status": "demo",
        })
    return results


async def _live_serp_probe(brand: str, domain: str, queries: List[str]) -> List[Dict[str, Any]]:
    """Phase-1 live check: Google SERP organic + snippet mention/citation."""
    results: List[Dict[str, Any]] = []

    async def _one(query: str) -> Dict[str, Any]:
        try:
            data = await asyncio.wait_for(serp_search(query, location="us", max_results=5), timeout=20)
            organic = data.get("results") or []
            blob = " ".join(
                f"{r.get('title', '')} {r.get('snippet', '')} {r.get('url', '')}" for r in organic
            )
            urls = [str(r.get("url", "")) for r in organic]
            mentioned = _brand_mentioned(blob, brand)
            cited = _domain_cited(blob, urls, domain)
            competitors: List[str] = []
            for r in organic:
                host = (urlparse(str(r.get("url", ""))).hostname or "").lower()
                if host.startswith("www."):
                    host = host[4:]
                if host and host != domain and host not in competitors:
                    competitors.append(host)
            return {
                "query": query,
                "engine": "google_serp",
                "mentioned": mentioned,
                "cited_url": cited,
                "snippet": (organic[0].get("snippet") if organic else "") or blob[:240],
                "competitors_mentioned": competitors[:5],
                "status": "ok" if organic else "empty",
            }
        except Exception as exc:
            return {
                "query": query,
                "engine": "google_serp",
                "mentioned": False,
                "cited_url": None,
                "snippet": "",
                "competitors_mentioned": [],
                "status": "error",
                "error": str(exc)[:200],
            }

    # Bound concurrency to stay polite
    sem = asyncio.Semaphore(2)

    async def _guarded(q: str) -> Dict[str, Any]:
        async with sem:
            return await _one(q)

    return list(await asyncio.gather(*[_guarded(q) for q in queries]))


async def ai_visibility_check(
    brand: str,
    domain: str,
    queries: Optional[List[str]] = None,
    *,
    live: bool = False,
) -> Dict[str, Any]:
    """
    Check AI / SERP visibility for a brand+domain.

    Args:
        brand: Brand or product name to look for in answers.
        domain: Primary domain (e.g. example.com).
        queries: Optional custom prompts; defaults to diverse brand intents.
        live: If True, probe Google SERP; otherwise return labeled demo fixtures.

    Returns:
        Dict with brand, domain, queries, results, visibility_score, ai_summary, mode.
    """
    brand_clean = (brand or "").strip()
    domain_clean = _normalize_domain(domain)

    if not brand_clean:
        return {
            "brand": brand_clean,
            "domain": domain_clean,
            "queries": [],
            "results": [],
            "visibility_score": 0,
            "ai_summary": "Brand name is required.",
            "mode": "error",
            "issues": ["Missing brand parameter."],
        }

    if not domain_clean:
        return {
            "brand": brand_clean,
            "domain": domain_clean,
            "queries": [],
            "results": [],
            "visibility_score": 0,
            "ai_summary": "Domain is required.",
            "mode": "error",
            "issues": ["Missing domain parameter."],
        }

    safe, reason = is_safe_public_url(f"https://{domain_clean}")
    if not safe:
        return {
            "brand": brand_clean,
            "domain": domain_clean,
            "queries": [],
            "results": [],
            "visibility_score": 0,
            "ai_summary": f"SSRF defense blocked domain: {reason}",
            "mode": "error",
            "issues": [f"[SECURITY_BLOCK] SSRF defense blocked: {reason}"],
        }

    built_queries = _build_queries(brand_clean, queries)
    mode = "live" if live else "demo"

    if live:
        results = await _live_serp_probe(brand_clean, domain_clean, built_queries)
        # If every probe failed/empty, fall back to demo with notice
        if results and all(r.get("status") in ("error", "empty") for r in results):
            results = _demo_results(brand_clean, domain_clean, built_queries)
            mode = "demo"
    else:
        results = _demo_results(brand_clean, domain_clean, built_queries)

    score = _score_visibility(results)
    summary = _fallback_summary(brand_clean, domain_clean, score, results, mode)

    return {
        "brand": brand_clean,
        "domain": domain_clean,
        "queries": built_queries,
        "results": results,
        "visibility_score": score,
        "ai_summary": summary,
        "mode": mode,
        "scoring": {
            "formula": "40% mentions + 40% citations + 20% query breadth",
            "estimated": mode != "live",
            "note": (
                "Demo fixtures for schema/agent testing."
                if mode == "demo"
                else "Phase-1 live check uses Google SERP organic presence as an AI Overview / answer proxy."
            ),
        },
    }


if __name__ == "__main__":
    import json

    out = asyncio.run(ai_visibility_check("OpenSEO-Lite", "nagacodex.cloud", live=False))
    print(json.dumps(out, indent=2))
