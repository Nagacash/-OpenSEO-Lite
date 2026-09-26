#!/usr/bin/env python3
"""
OpenSEO-Lite Agent - Model Context Protocol (MCP) Server
Exposes 4 core SEO automation skills to AI agents (Claude Desktop, Cursor, Windsurf, etc.):
1. serp_search: Google SERP extraction
2. page_audit: On-page SEO factor analysis
3. site_audit: Full SEO health score + AI prioritized action plan
4. ai_visibility_check: Brand mention/citation visibility for AI/SERP surfaces

Run:
  python mcp_server.py                  # Standard stdio mode for Claude Desktop / Cursor
  python mcp_server.py --transport sse  # HTTP SSE mode on localhost:8000
"""

import os
import sys
import json
import asyncio
import argparse
from typing import Optional, Dict, Any, List

from skills.serp_search import serp_search as _serp_search
from skills.page_audit import page_audit as _page_audit
from skills.site_audit import site_audit as _site_audit
from skills.ai_visibility_check import ai_visibility_check as _ai_visibility_check

try:
    from mcp.server.fastmcp import FastMCP
    HAS_FASTMCP = True
except ImportError:
    HAS_FASTMCP = False


if HAS_FASTMCP:
    mcp = FastMCP(
        name="OpenSEO-Lite Agent",
        instructions=(
            "Minimal SEO automation agent. Perform Google SERP searches, on-page audits, "
            "site audits with AI action plans, and AI visibility checks for brand mention/citation."
        ),
    )

    @mcp.tool()
    async def serp_search(
        keyword: str,
        location: Optional[str] = None,
        max_results: int = 10,
    ) -> Dict[str, Any]:
        """
        Search Google for keyword and extract top organic results.

        Args:
            keyword: The search query string (e.g. 'best headless browser python').
            location: Optional country code (e.g. 'us', 'uk', 'ca').
            max_results: Max organic results to return (default 10).

        Returns:
            Dict containing keyword, location, results, source, and status.
        """
        return await _serp_search(keyword=keyword, location=location, max_results=max_results)

    @mcp.tool()
    async def page_audit(url: str) -> Dict[str, Any]:
        """
        Extract and evaluate technical on-page SEO factors for a given URL.

        Args:
            url: The webpage URL to audit (e.g. 'https://example.com').

        Returns:
            Dict containing url, title, meta_description, headings, word_count, links, and issues.
        """
        return await _page_audit(url=url)

    @mcp.tool()
    async def site_audit(url: str) -> Dict[str, Any]:
        """
        Comprehensive SEO audit with health score, issues, and AI prioritized recommendations.

        Args:
            url: The webpage URL to audit (e.g. 'https://example.com').

        Returns:
            Dict with seo_score, issues, estimated_cwv (heuristic), suggested_topics, ai_summary.
        """
        return await _site_audit(url=url)

    @mcp.tool()
    async def ai_visibility_check(
        brand: str,
        domain: str,
        queries: Optional[List[str]] = None,
        live: bool = False,
    ) -> Dict[str, Any]:
        """
        Check whether AI/SERP surfaces mention and cite a brand+domain.

        Args:
            brand: Brand or product name (e.g. 'OpenSEO-Lite').
            domain: Primary domain without path (e.g. 'example.com').
            queries: Optional custom prompts; defaults to diverse brand intents.
            live: If true, probe Google SERP; otherwise return labeled demo fixtures.

        Returns:
            Dict with visibility_score (0-100), per-query evidence, ai_summary, and mode.
        """
        return await _ai_visibility_check(brand=brand, domain=domain, queries=queries, live=live)


async def run_standalone_cli():
    print("OpenSEO-Lite Agent CLI / Local Test Mode")
    print("---------------------------------------")
    print("1. serp_search")
    print("2. page_audit")
    print("3. site_audit")
    print("4. ai_visibility_check")
    choice = input("Select skill (1-4): ").strip()
    if choice == "1":
        kw = input("Keyword: ").strip() or "python browser automation"
        loc = input("Location (optional): ").strip() or None
        res = await _serp_search(kw, loc)
        print("\nResult:")
        print(json.dumps(res, indent=2))
    elif choice == "2":
        url = input("URL: ").strip() or "https://example.com"
        res = await _page_audit(url)
        print("\nResult:")
        print(json.dumps(res, indent=2))
    elif choice == "3":
        url = input("URL: ").strip() or "https://example.com"
        res = await _site_audit(url)
        print("\nResult:")
        print(json.dumps(res, indent=2))
    elif choice == "4":
        brand = input("Brand: ").strip() or "OpenSEO-Lite"
        domain = input("Domain: ").strip() or "example.com"
        live_raw = input("Live SERP probe? (y/N): ").strip().lower()
        res = await _ai_visibility_check(brand, domain, live=live_raw.startswith("y"))
        print("\nResult:")
        print(json.dumps(res, indent=2))


def main():
    parser = argparse.ArgumentParser(description="OpenSEO-Lite Agent MCP Server")
    parser.add_argument(
        "--transport",
        default="stdio",
        choices=["stdio", "sse", "cli"],
        help="Transport mode: stdio (for desktop agents) or sse (HTTP server)",
    )
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")),
                        help="Port for SSE transport (default: 8000)")
    parser.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"),
                        help="Host for SSE transport (default: 127.0.0.1)")
    args = parser.parse_args()

    if args.transport == "cli" or not HAS_FASTMCP:
        if not HAS_FASTMCP:
            print("Note: 'mcp' package not installed in this environment. Running in standalone CLI mode.")
            print("To enable full MCP server, run: pip install -r requirements.txt\n")
        asyncio.run(run_standalone_cli())
        return

    if args.transport == "sse":
        print(f"Starting OpenSEO-Lite MCP Server on http://{args.host}:{args.port}/sse ...")
        mcp.settings.port = args.port
        mcp.settings.host = args.host
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
