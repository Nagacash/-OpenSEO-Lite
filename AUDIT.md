# OpenSEO-Lite Agent — Code Audit

**Date:** 2026-09-26  
**Scope:** Full repo (`skills/`, `mcp_server.py`, `cli.py`, `server.ts`, `src/`, `tests/`, docs)  
**Philosophy check:** Zero Docker / zero DB / pip-install / agent-first — mostly upheld for the Python MCP path; the Vite/Express playground is a separate surface.

---

## Executive verdict

The three core skills (`serp_search`, `page_audit`, `site_audit`) are usable, reasonably typed, and wired through MCP + CLI. The claimed fourth skill **`ai_visibility_check` is not implemented anywhere** (no Python module, no MCP tool, no CLI command, no API route, no UI card, no tests, no README mention). Treat that as a **must-fix** before marketing “4 skills.”

CrUX and striking-distance features ship as **heuristic estimates**, not live CrUX/GSC data — README language oversells them.

---

## ✅ What's good (keep as-is)

| Area | Notes |
|---|---|
| Skill isolation | Clear `skills/*.py` modules with `__all__` exports |
| MCP surface | FastMCP tools with solid docstrings for agents |
| CLI + export | `cli.py` already supports `site_audit` JSON/MD export |
| Demo mode | `site_audit` falls back to rule-based AI summary without keys |
| SSRF basics | Loopback / RFC1918 / metadata IP blocks in Python + Express |
| Fallback chain | Playwright → requests → DuckDuckGo for SERP resilience |
| Agent prompts | Ready-to-paste Hermes/Grok/Claude prompts in `src/agentPrompts.ts` |
| Security headers | Express sets nosniff / frame / referrer / permissions policy |
| README workflows | Example agent workflows are clear and copy-pasteable |

---

## ❌ Broken or missing (must-fix)

### 1. `ai_visibility_check` does not exist

**Evidence:**
- `skills/` only has `serp_search.py`, `page_audit.py`, `site_audit.py`
- `skills/__init__.py` exports 3 skills
- `mcp_server.py` / `cli.py` / `server.ts` / `App.tsx` all reference 3 tools only
- Repo-wide search for `ai_visibility` → **0 matches**

**Impact:** Landing/marketing claims of “4 feature cards including AI Visibility” are false; agents cannot call the skill.

**Fix direction:** Add `skills/ai_visibility_check.py`, export it, register MCP + CLI + `/api/skills/ai_visibility_check`, add UI tab, add tests. See deep-dive section below for a concrete design.

### 2. CrUX / striking distance are synthetic (misleading)

```242:310:skills/site_audit.py
def _calculate_striking_distance_keywords(...):
    # Invents keywords like "{term} optimization guide" with hard-coded positions 12/14/17

def _calculate_crux_metrics(url, html_size):
    # Estimates LCP/FID/CLS from word_count * 6 — not Chrome UX Report
```

README and UI present these as real CrUX / Page-2 ranking opportunities. That will erode trust with SEO-savvy users.

**Must-fix options (pick one):**
- **A (honest, quick):** Relabel as `estimated_cwv` / `suggested_topics` and document heuristics
- **B (real, medium):** Call Google CrUX API + use `serp_search` to find true #11–20 positions

### 3. Dual implementations will drift

| Surface | Implementation |
|---|---|
| MCP / CLI | Python `skills/*` |
| Web playground | TypeScript reimplementation in `server.ts` (~1100 lines) |

Same scoring, CrUX, and striking-distance logic is duplicated. Bugfixes in Python won’t reach the UI (and vice versa).

**Must-fix:** Make Express call Python (subprocess / shared HTTP) **or** document that the UI is demo-only and MCP is source of truth.

### 4. `browser-use` is a dead dependency

Imported in `serp_search.py` (`BROWSER_USE_AVAILABLE`) but **never used**. Actual path is Playwright / requests. Marketing and README claim browser-use power; users install a heavy unused package.

---

## ⚠️ Needs improvement

### High priority

| Issue | Detail | Suggested fix |
|---|---|---|
| Silent empty SERP | `serp_search` returns `{results: []}` with no error/warning when Google blocks | Return `status: "blocked" \| "ok"`, `source: "google" \| "ddg" \| "none"` |
| SSRF incomplete | Hostname allowlist only; no DNS resolve check → DNS rebinding / evil.com→10.x risk | Resolve IP after parse; re-check private ranges; block redirects to private IPs |
| API key over HTTP body | UI POSTs `customKeyConfig.apiKey` to `/api/skills/site_audit` | Prefer server env only; if BYOK needed, require HTTPS + never log body |
| Keys in localStorage | Zustand persists plaintext API keys — XSS = key theft | Session-only storage, or encrypt-at-rest with user passphrase |
| `.env.example` mismatch | Only `GEMINI_API_KEY` / `APP_URL`; README documents OpenRouter/NVIDIA | Align with README vars |
| Gemini advertised, not implemented | `GEMINI_API_KEY` read but no Gemini branch in `_generate_llm_summary` | Implement or remove from docs |
| Docs tab unreachable | `activeTab === 'docs'` exists; **no nav button** sets it | Add “How it works / FAQ” to header nav |

### Medium priority

| Issue | Detail | Suggested fix |
|---|---|---|
| Broad `except Exception: pass` | Hides LLM/SERP failures | Log `exc_info`; return `error` field |
| Unused exception `e` | `serp_search` line ~165 | Use or `_` |
| Score classifier fragile | String-matching on issue text (`"short" in lower`) | Use structured issue codes from `page_audit` |
| MCP omits `max_results` | Python supports it; MCP tool does not | Expose optional param |
| Tests not pytest | Custom `asyncio` script; no fixtures; flaky network | Add `pytest` + `pytest-asyncio`; mock HTTP |
| No `ai_visibility` / export unit tests | CLI MD export untested | Add schema + golden-file tests |
| `App.tsx` ~2100 lines | Hard to review/maintain | Split tabs into components |
| License inconsistency | `App.tsx` SPDX Apache-2.0; project described as MIT | Pick one + add `LICENSE` |
| `package.json` name | Still `"react-example"` | Rename to `openseo-lite-agent` |
| Playwright cold start | New browser per call | Shared browser context / process pool |
| Canonical / OG / robots / JSON-LD | Missing from `page_audit` | Competitors ship these as separate tools |

### Low priority

| Issue | Detail |
|---|---|
| No `pyproject.toml` / package entry points | Harder to `pip install -e .` and expose console scripts |
| Regex SERP fallback invents snippets | Placeholder text when bs4 missing |
| `get_event_loop()` | Prefer `asyncio.get_running_loop()` on 3.11+ |
| langchain packages in requirements | Unused by skill code — bloat |
| README clone URL placeholder | `your-username/openseo-lite-agent` |

---

## Structure review

```
✅ skills/          — good isolation
✅ mcp_server.py    — clean FastMCP entry
✅ cli.py           — present (competitors often lack this early)
✅ tests/           — exists but thin / network-dependent
⚠️ server.ts + src/ — parallel product surface; not DRY with Python
❌ skills/ai_visibility_check.py — MISSING
```

**Skills properly isolated?** Yes for the three that exist.  
**MCP organized?** Yes.  
**Tests comprehensive?** No — schema smoke tests only; no mocking; no fourth skill; no CLI export coverage.

---

## Documentation review

| Item | Status |
|---|---|
| Function docstrings | ✅ Present on public skill APIs |
| README clarity | ✅ Strong for 3-skill product |
| Example workflows | ✅ Present |
| Honest CrUX/striking claims | ❌ Overstated |
| 4th skill docs | ❌ N/A — skill missing |
| `.env.example` | ❌ Out of sync |

---

## Performance review

| Bottleneck | Severity | Notes |
|---|---|---|
| Chromium launch per SERP/audit | High | Dominant latency; reuse browser |
| Sequential Playwright then fallback | Medium | Fail faster on launch errors |
| LLM calls | OK | Single summary call; not batched (nothing to batch yet) |
| Dual TS+Python stacks | Medium | Extra install surface for “pip only” philosophy |
| `browser-use` install | Low–Med | Cost with zero runtime benefit today |

---

## Security checklist (findings)

- [x] Basic SSRF host/IP string checks  
- [ ] Post-DNS SSRF / redirect following checks  
- [ ] Rate limiting on `/api/skills/*` (status endpoint claims it; only AbortSignal timeouts exist)  
- [x] Secrets not committed (`.gitignore` has `.env*`)  
- [ ] Client key persistence hardened  
- [ ] Input length limits on `keyword` / URL (DoS via huge strings)

---

## Part 5 — `ai_visibility_check` deep dive

### Current state: **not implemented**

Cannot review correctness, scoring fairness, query diversity, demo mode, or error handling of production code — **there is none**.

What *does* exist nearby:
- `iannuttall/seo` ships `seo_ai_readiness` (LLM crawler accessibility)
- OpenSEO-class products treat “AI visibility” as: brand mention rate across ChatGPT / Perplexity / Gemini / Claude answers

### Recommended v0.2 contract (agent-first, no DB)

```python
async def ai_visibility_check(
    brand: str,
    domain: str,
    queries: list[str] | None = None,
    engines: list[str] | None = None,  # default: ["perplexity", "bing_copilot", "google_ai_overview"]
) -> dict:
    """
    Returns:
      {
        "brand": str,
        "domain": str,
        "queries": [...],
        "results": [{
           "query": str,
           "engine": str,
           "mentioned": bool,
           "cited_url": str | None,
           "snippet": str,
           "competitors_mentioned": list[str]
        }],
        "visibility_score": int,   # 0-100
        "ai_summary": str,
        "mode": "live" | "demo"
      }
    """
```

### Scoring (fair, transparent)

```text
visibility_score =
  40 * (mentions / total_checks)          # brand name appears
+ 40 * (citations / total_checks)         # domain URL cited
+ 20 * (unique_queries_won / query_count) # breadth across intents
```

Clamp 0–100. Always return per-query evidence so agents don’t trust a single number.

### Query diversity (default if user omits)

1. `{brand}`  
2. `best {category} tools` (infer category from domain homepage title via `page_audit`)  
3. `{brand} vs {top_serp_competitor}`  
4. `alternatives to {brand}`  
5. `how to choose {category} software`

### Demo mode (no API key / blocked engines)

Return deterministic fixture results labeled `"mode": "demo"` with a clear disclaimer — mirror `site_audit` fallback pattern. **Never** invent live-looking citations without the demo flag.

### Error handling (match other skills)

- Validate `domain` with existing `is_safe_public_url`
- Per-engine try/except → mark that engine `status: "error"` without failing whole call
- Timeout per engine ≤ 15s
- Empty engines list → demo mode

### Wiring checklist

1. `skills/ai_visibility_check.py`  
2. Export in `skills/__init__.py`  
3. `@mcp.tool()` in `mcp_server.py`  
4. `cli.py ai_visibility_check --brand --domain [--export json|md]`  
5. `server.ts` route **or** proxy to Python  
6. Fourth playground card in `App.tsx`  
7. Tests: schema + SSRF + demo mode (no network)  
8. README + agent prompts updated to 4 tools

### Minimum viable implementation note

If live multi-engine scraping is too fragile for v0.2, ship **Phase 1**:
- Use `serp_search` for queries containing the brand
- Check organic + AI Overview / featured snippet presence in HTML when available
- Score mention + URL presence
- Label clearly as “SERP AI Overview / organic visibility,” not “ChatGPT share of voice”

Phase 2 can add Perplexity/Bing Copilot adapters behind the same schema.

---

## Priority action list

1. **Implement or stop advertising** `ai_visibility_check`  
2. **Relabel or replace** synthetic CrUX / striking distance  
3. **Pick one runtime** for skill logic (Python canonical)  
4. **Remove or actually use** `browser-use`  
5. **Expose docs/FAQ nav** + harden SSRF / key handling
