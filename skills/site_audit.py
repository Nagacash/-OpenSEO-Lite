"""
Skill 3: site_audit
Performs on-page audit, calculates an SEO health score, classifies issues with recommendations,
and generates an AI prioritized action plan.

Input: url (str)
Output: dict with {
    url,
    seo_score: int,
    issues: list[{severity, description, recommendation}],
    ai_summary: str
}
"""

import os
import json
import re
from typing import Dict, Any, List
from .page_audit import page_audit


def _classify_issues(raw_issues: List[str], page_data: Dict[str, Any]) -> tuple[int, List[Dict[str, str]]]:
    """Convert raw issue strings into structured severity, description, and recommendation."""
    structured: List[Dict[str, str]] = []
    score = 100

    for issue in raw_issues:
        lower = issue.lower()
        if "missing <title>" in lower or "failed to fetch" in lower:
            score -= 25
            structured.append({
                "severity": "high",
                "description": issue,
                "recommendation": "Add a descriptive, keyword-rich <title> tag between 40-60 characters."
            })
        elif "missing h1" in lower:
            score -= 20
            structured.append({
                "severity": "high",
                "description": issue,
                "recommendation": "Add exactly one primary <h1> heading containing your main target keyword."
            })
        elif "not served over secure https" in lower:
            score -= 20
            structured.append({
                "severity": "high",
                "description": issue,
                "recommendation": "Enforce SSL/TLS certificate and 301 redirect all HTTP traffic to HTTPS."
            })
        elif "missing meta description" in lower:
            score -= 15
            structured.append({
                "severity": "medium",
                "description": issue,
                "recommendation": "Craft an engaging meta description (120-160 chars) with a clear call-to-action."
            })
        elif "multiple h1" in lower:
            score -= 10
            structured.append({
                "severity": "medium",
                "description": issue,
                "recommendation": "Demote secondary H1 tags to H2 or H3 to maintain a clear semantic hierarchy."
            })
        elif "thin content" in lower:
            score -= 15
            structured.append({
                "severity": "medium",
                "description": issue,
                "recommendation": "Expand body content with authoritative, comprehensive answers to user intent (aim for 500+ words)."
            })
        elif "missing alt" in lower:
            score -= 10
            structured.append({
                "severity": "medium",
                "description": issue,
                "recommendation": "Provide descriptive alt text for all informative images for accessibility and image search."
            })
        elif "short" in lower or "long" in lower:
            score -= 5
            structured.append({
                "severity": "low",
                "description": issue,
                "recommendation": "Refine snippet length to avoid truncation in mobile and desktop SERP previews."
            })
        elif "no internal links" in lower:
            score -= 10
            structured.append({
                "severity": "medium",
                "description": issue,
                "recommendation": "Add contextual internal links to guide search crawlers and retain users."
            })
        else:
            score -= 5
            structured.append({
                "severity": "low",
                "description": issue,
                "recommendation": "Review technical best practices to resolve this flag."
            })

    # Bound score between 0 and 100
    final_score = max(0, min(100, score))
    return final_score, structured


def _generate_fallback_summary(url: str, score: int, structured_issues: List[Dict[str, str]]) -> str:
    """Generate deterministic expert summary if LLM API is unavailable."""
    if score >= 90 and not structured_issues:
        return (
            f"Overall SEO health for {url} is exceptional (Score: {score}/100).\n"
            "Prioritized Actions:\n"
            "1. Monitor keyword rankings and organic click-through rates (CTR) in Google Search Console.\n"
            "2. Implement Schema.org structured data (Organization, BreadcrumbList, WebSite) for rich snippets.\n"
            "3. Build authoritative backlinks and maintain fresh content updates."
        )

    # Pick top issues
    highs = [i for i in structured_issues if i["severity"] == "high"]
    meds = [i for i in structured_issues if i["severity"] == "medium"]
    lows = [i for i in structured_issues if i["severity"] == "low"]

    prioritized = (highs + meds + lows)[:3]
    actions_text = ""
    for idx, item in enumerate(prioritized, 1):
        actions_text += f"{idx}. [{item['severity'].upper()}] {item['recommendation']} (Issue: {item['description']})\n"

    while len(prioritized) < 3:
        idx = len(prioritized) + 1
        actions_text += f"{idx}. [IMPROVEMENT] Conduct competitor keyword gap analysis and expand topic clusters.\n"
        prioritized.append({})

    return (
        f"Site audit for {url} revealed an overall SEO health score of {score}/100 with "
        f"{len(highs)} critical, {len(meds)} medium, and {len(lows)} minor issues detected.\n\n"
        f"Top 3 Prioritized Actions:\n{actions_text.strip()}"
    )


async def _generate_llm_summary(url: str, score: int, page_data: Dict[str, Any], structured_issues: List[Dict[str, str]]) -> str:
    """Invoke LLM (OpenRouter, NVIDIA NIM, OpenAI, Anthropic, or Gemini) to craft an executive SEO summary."""
    api_key = (
        os.getenv("OPENROUTER_API_KEY")
        or os.getenv("NVIDIA_API_KEY")
        or os.getenv("LLM_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
        or os.getenv("GEMINI_API_KEY")
    )
    provider = os.getenv("LLM_PROVIDER", "").lower()

    if not api_key:
        return _generate_fallback_summary(url, score, structured_issues)

    prompt = f"""You are a principal SEO strategist.
Evaluate this website audit and provide a crisp executive summary followed by exactly 3 prioritized high-impact actions.

URL: {url}
Health Score: {score}/100
Title: {page_data.get('title', 'None')}
Meta Description: {page_data.get('meta_description', 'None')}
Word Count: {page_data.get('word_count', 0)}
H1s: {page_data.get('headings', {}).get('h1', [])}
Issues: {json.dumps(structured_issues, indent=2)}

Format:
Executive Summary:
[2 sentences]

Prioritized Actions:
1. [Action 1: Immediate fix + expected SEO impact]
2. [Action 2: Content/semantic fix + expected SEO impact]
3. [Action 3: Long-term optimization / authority build]
"""

    try:
        # Check OpenRouter (Supports free models e.g., meta-llama/llama-3.3-70b-instruct:free, mistralai/mistral-7b-instruct:free)
        if provider == "openrouter" or api_key.startswith("sk-or-"):
            import openai
            model_name = os.getenv("LLM_MODEL") or "meta-llama/llama-3.3-70b-instruct:free"
            client = openai.OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                default_headers={
                    "HTTP-Referer": "https://www.nagacodex.cloud/",
                    "X-Title": "OpenSEO-Lite Agent",
                }
            )
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.3,
            )
            if resp.choices and resp.choices[0].message.content:
                return resp.choices[0].message.content

        # Check NVIDIA NIM (Supports free tier Llama 3 70B, Nemotron, Mistral)
        elif provider == "nvidia" or api_key.startswith("nvapi-"):
            import openai
            model_name = os.getenv("LLM_MODEL") or "meta/llama-3.1-70b-instruct"
            client = openai.OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=api_key,
            )
            resp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.3,
            )
            if resp.choices and resp.choices[0].message.content:
                return resp.choices[0].message.content

        # Check Anthropic
        elif provider == "anthropic" or "sk-ant" in api_key:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            msg = client.messages.create(
                model=os.getenv("LLM_MODEL") or "claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            return msg.content[0].text

        # Check OpenAI / Compatible
        elif provider == "openai" or api_key.startswith("sk-"):
            import openai
            client = openai.OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model=os.getenv("LLM_MODEL") or "gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.3,
            )
            return resp.choices[0].message.content or _generate_fallback_summary(url, score, structured_issues)

    except Exception:
        pass

    return _generate_fallback_summary(url, score, structured_issues)


def _calculate_striking_distance_keywords(page_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Suggest topic opportunities from title/headings (heuristic — NOT live SERP ranks)."""
    title = page_data.get("title", "")
    headings = page_data.get("headings", {}).get("h1", []) + page_data.get("headings", {}).get("h2", [])

    words = re.findall(r"\b[A-Za-z]{4,}\b", title + " " + " ".join(headings))
    unique_terms = []
    seen = set()
    for w in words:
        low = w.lower()
        if low not in seen and low not in ("with", "this", "that", "from", "your", "what", "have", "more", "page", "home"):
            seen.add(low)
            unique_terms.append(w)

    striking_keywords: List[Dict[str, Any]] = []

    if len(unique_terms) >= 1:
        striking_keywords.append({
            "keyword": f"{unique_terms[0].lower()} optimization guide",
            "estimated_position": 12,
            "opportunity": "Suggested topic (heuristic). Add 1 internal link from homepage and tighten H2 targeting.",
            "source": "heuristic",
            "estimated": True,
        })
    if len(unique_terms) >= 2:
        striking_keywords.append({
            "keyword": f"best {unique_terms[1].lower()} tools",
            "estimated_position": 14,
            "opportunity": "Suggested topic (heuristic). Expand section by +150 words and add a comparison table.",
            "source": "heuristic",
            "estimated": True,
        })
    if len(unique_terms) >= 3:
        striking_keywords.append({
            "keyword": f"{unique_terms[2].lower()} checklist",
            "estimated_position": 17,
            "opportunity": "Suggested topic (heuristic). Add FAQ schema (JSON-LD) for rich-result eligibility.",
            "source": "heuristic",
            "estimated": True,
        })

    return striking_keywords


def _calculate_crux_metrics(url: str, html_size: int) -> Dict[str, Any]:
    """Estimate CWV-like metrics from page weight heuristics (NOT live Chrome UX Report data)."""
    if html_size < 50000:
        lcp = 1.6
        fid = 42
        cls = 0.03
    elif html_size < 150000:
        lcp = 2.4
        fid = 78
        cls = 0.08
    else:
        lcp = 3.6
        fid = 135
        cls = 0.18

    lcp_rating = "good" if lcp < 2.5 else ("needs improvement" if lcp < 4.0 else "poor")
    fid_rating = "good" if fid < 100 else ("needs improvement" if fid < 300 else "poor")
    cls_rating = "good" if cls < 0.1 else ("needs improvement" if cls < 0.25 else "poor")

    return {
        "lcp": f"{lcp}s",
        "lcp_rating": lcp_rating,
        "fid": f"{fid}ms",
        "fid_rating": fid_rating,
        "cls": str(cls),
        "cls_rating": cls_rating,
        "status": "PASS" if (lcp_rating == "good" and cls_rating == "good") else "NEEDS_IMPROVEMENT",
        "source": "heuristic",
        "estimated": True,
        "note": "Estimated from page weight heuristics — not live CrUX field data.",
    }


async def site_audit(url: str) -> Dict[str, Any]:
    """
    Perform a full site audit for a URL:
    1. Runs on-page extraction via page_audit
    2. Computes an SEO score (0-100)
    3. Categorizes issues by severity with actionable recommendations
    4. Suggests topic opportunities (heuristic — not live ranks #11-20)
    5. Estimates CWV-like metrics (heuristic — not live CrUX)
    6. Generates an AI summary with 3 prioritized actions
    """
    # 1. Run base page audit
    page_data = await page_audit(url)

    # 2. Classify issues & compute score
    score, structured_issues = _classify_issues(page_data.get("issues", []), page_data)

    # 3. Suggested topic opportunities (heuristic)
    striking_keywords = _calculate_striking_distance_keywords(page_data)

    # 4. Estimated CWV (heuristic, not Chrome UX Report)
    html_sample_len = len(page_data.get("title", "")) + page_data.get("word_count", 0) * 6
    crux = _calculate_crux_metrics(url, html_sample_len)

    if crux.get("status") == "NEEDS_IMPROVEMENT":
        score = max(score - 5, 0)
        structured_issues.append({
            "severity": "medium",
            "description": (
                f"Estimated CWV LCP ({crux['lcp']}) or CLS ({crux['cls']}) may need improvement "
                f"(heuristic — not live CrUX)."
            ),
            "recommendation": "Compress hero images, defer off-screen scripts, and set explicit width/height attributes on media tags."
        })

    # 5. Generate AI summary with 3 prioritized actions
    ai_summary = await _generate_llm_summary(url, score, page_data, structured_issues)

    return {
        "url": url,
        "seo_score": score,
        "crux": crux,
        "estimated_cwv": crux,
        "striking_distance_keywords": striking_keywords,
        "suggested_topics": striking_keywords,
        "issues": structured_issues,
        "ai_summary": ai_summary,
    }


if __name__ == "__main__":
    import asyncio
    res = asyncio.run(site_audit("https://example.com"))
    print(json.dumps(res, indent=2))
