"""
Comprehensive Test Suite for OpenSEO-Lite Agent
Validates:
1. Schema integrity across all 4 skills
2. Heuristic estimated CWV + suggested topics labels
3. OWASP SSRF defense
4. ai_visibility_check demo mode + scoring
5. serp_search status/source fields (network-dependent)
"""

import asyncio
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from skills.serp_search import serp_search
from skills.page_audit import page_audit
from skills.site_audit import site_audit
from skills.ai_visibility_check import ai_visibility_check


async def test_page_audit_schema():
    print("\n[TEST 1] Testing page_audit with https://example.com ...")
    data = await page_audit("https://example.com")

    assert "url" in data, "Missing url in page_audit output"
    assert "title" in data, "Missing title in page_audit output"
    assert "meta_description" in data, "Missing meta_description"
    assert "headings" in data, "Missing headings dict"
    assert "h1" in data["headings"]
    assert "word_count" in data and isinstance(data["word_count"], int)
    assert "internal_links" in data and isinstance(data["internal_links"], list)
    assert "external_links" in data and isinstance(data["external_links"], list)
    assert "issues" in data and isinstance(data["issues"], list)

    print("  ✓ page_audit schema verified:")
    print(f"    Title: {data['title']}")
    print(f"    Word count: {data['word_count']}")
    print(f"    Issues detected: {len(data['issues'])}")
    return True


async def test_site_audit_heuristics():
    print("\n[TEST 2] Testing site_audit heuristic CWV + suggested topics ...")
    data = await site_audit("https://example.com")

    assert "seo_score" in data and isinstance(data["seo_score"], int)
    assert 0 <= data["seo_score"] <= 100
    assert "ai_summary" in data and isinstance(data["ai_summary"], str)

    assert "crux" in data, "Missing crux"
    assert data["crux"].get("source") == "heuristic"
    assert data["crux"].get("estimated") is True
    assert "estimated_cwv" in data
    print(f"  ✓ Estimated CWV labeled heuristic: LCP={data['crux']['lcp']}")

    assert "striking_distance_keywords" in data
    assert "suggested_topics" in data
    if data["striking_distance_keywords"]:
        sample = data["striking_distance_keywords"][0]
        assert sample.get("estimated") is True or sample.get("source") == "heuristic"
        print(f"  ✓ Suggested topics labeled heuristic: '{sample.get('keyword')}'")
    return True


async def test_ssrf_protection():
    print("\n[TEST 3] Testing OWASP SSRF Defense ...")
    blocked_targets = [
        "http://127.0.0.1:8080/admin",
        "http://localhost/secret",
        "http://169.254.169.254/latest/meta-data/",
        "http://192.168.1.1/router",
        "http://10.0.0.1/internal",
    ]
    for target in blocked_targets:
        res = await page_audit(target)
        assert len(res.get("issues", [])) > 0
        assert any("SECURITY_BLOCK" in iss or "SSRF" in iss for iss in res.get("issues", [])), f"Failed to block {target}"
    print(f"  ✓ Successfully verified SSRF block across {len(blocked_targets)} dangerous internal endpoints.")
    return True


async def test_ai_visibility_demo():
    print("\n[TEST 4] Testing ai_visibility_check demo mode ...")
    data = await ai_visibility_check("OpenSEO-Lite", "example.com", live=False)

    assert data["mode"] == "demo"
    assert "visibility_score" in data and 0 <= data["visibility_score"] <= 100
    assert isinstance(data["results"], list) and len(data["results"]) >= 3
    assert "ai_summary" in data and "Prioritized Actions" in data["ai_summary"]
    assert data["scoring"]["formula"]

    # SSRF on domain
    blocked = await ai_visibility_check("Evil", "127.0.0.1", live=False)
    assert blocked["mode"] == "error"
    assert any("SECURITY_BLOCK" in i for i in blocked.get("issues", []))

    print(f"  ✓ Demo visibility score: {data['visibility_score']}/100")
    return True


async def test_serp_status_fields():
    print("\n[TEST 5] Testing serp_search status/source fields ...")
    t0 = time.time()
    data = await serp_search("best lightweight mcp server", location="us", max_results=5)
    elapsed = time.time() - t0

    assert "results" in data
    assert "status" in data
    assert "source" in data
    # Network may be blocked in CI; empty is acceptable if status is blocked
    if data["results"]:
        assert data["status"] == "ok"
        print(f"  ✓ serp_search retrieved {len(data['results'])} results via {data['source']} in {elapsed:.2f}s.")
    else:
        assert data["status"] in ("blocked", "empty")
        print(f"  ✓ serp_search returned empty with status={data['status']} (acceptable offline).")
    return True


async def run_all():
    print("==================================================")
    print("OpenSEO-Lite Agent Comprehensive Test Suite")
    print("==================================================")
    try:
        await test_page_audit_schema()
        await test_site_audit_heuristics()
        await test_ssrf_protection()
        await test_ai_visibility_demo()
        await test_serp_status_fields()
        print("\n==================================================")
        print("ALL TESTS PASSED SUCCESSFULLY")
        print("==================================================")
    except AssertionError as err:
        print(f"\n❌ Test failed: {err}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_all())
