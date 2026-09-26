"""
OpenSEO-Lite Agent - Core Skills
Exposes:
- serp_search: Scrapes and parses Google SERP results
- page_audit: Inspects on-page SEO factors (tags, headings, word count, links, issues)
- site_audit: Full audit combining on-page heuristics + AI prioritized action plan
- ai_visibility_check: Brand mention/citation visibility across AI/SERP surfaces
"""

from .serp_search import serp_search
from .page_audit import page_audit
from .site_audit import site_audit
from .ai_visibility_check import ai_visibility_check

__all__ = ["serp_search", "page_audit", "site_audit", "ai_visibility_check"]
