# OpenSEO-Lite — Quick Wins (< 1 hour each)

Impact-sorted. Each item is scoped for a single focused session.

---

## 1. Scaffold `ai_visibility_check` (demo mode first)

| | |
|---|---|
| **Why it matters** | Unblocks the “4th skill” story; agents get a stable schema immediately |
| **Effort** | ~45–60 min |
| **Implementation notes** | Create `skills/ai_visibility_check.py` with demo fixtures + score formula from `AUDIT.md`. Wire `__init__.py`, `@mcp.tool()`, `cli.py` subcommand, one schema test. Defer live engine scraping. Return `"mode": "demo"` when no key / engines blocked. |

```bash
# Acceptance
python -c "import asyncio; from skills.ai_visibility_check import ai_visibility_check; \
print(asyncio.run(ai_visibility_check('Example','example.com'))['visibility_score'])"
python mcp_server.py --transport cli  # should list skill 4
```

---

## 2. Relabel synthetic CrUX / striking distance (honesty patch)

| | |
|---|---|
| **Why it matters** | Prevents trust damage with SEO users; 10-minute copy change beats a fake metric |
| **Effort** | ~20 min |
| **Implementation notes** | Rename response keys or add `"source": "heuristic"` / `"estimated": true`. Update README, CLI Markdown headers, and UI labels from “CrUX” → “Estimated CWV (heuristic)”. Same for striking distance → “Suggested topic opportunities (not live ranks)”. |

---

## 3. Expose FAQ / How-it-works in nav + GitHub CTA

| | |
|---|---|
| **Why it matters** | FAQ already written but unreachable; GitHub CTA missing → conversion leak |
| **Effort** | ~15–25 min |
| **Implementation notes** | In `App.tsx` header: add button `setActiveTab('docs')`; add GitHub link next to Add API Key. Soften Zustand jargon in banner (see `DESIGN_ENHANCEMENTS.md`). |

---

## 4. CLI completeness + JSON export for all skills

| | |
|---|---|
| **Why it matters** | Competitors lead with CLI; agents and humans both benefit; you already have half of this |
| **Effort** | ~30–40 min |
| **Implementation notes** | Add `--export json` to `serp_search` / `page_audit`; add `ai_visibility_check` command once skill exists; shared `export_json(data, path)` helper to stay DRY. Update README CLI section. |

---

## 5. Remove dead `browser-use` import OR use it once

| | |
|---|---|
| **Why it matters** | README/marketing claim browser-use; code never calls it → credibility + install bloat |
| **Effort** | ~15 min (remove) or ~50 min (real integration) |
| **Implementation notes** | **Fast path:** drop unused import + make `browser-use` optional in `requirements.txt` extras. **Better path:** one Playwright-free path via browser-use Agent for SERP only — only if it actually improves CAPTCHA resilience. |

---

## Bonus micro-wins (< 15 min)

| Feature | Why | Effort |
|---|---|---|
| Rename `package.json` `"react-example"` → `openseo-lite-agent` | Professionalism | 2 min |
| Fix `.env.example` to match README LLM vars | Onboarding | 5 min |
| Return `source` / `status` on empty SERP | Debuggability | 10 min |
| Add `LICENSE` file (MIT) + fix Apache SPDX in `App.tsx` | Open-source hygiene | 5 min |
| MCP tool: expose `max_results` | Parity with Python API | 10 min |
| Badge row already in README — add MCP Registry “pending” badge after submission | Social proof | 10 min |

---

## Recommended sequence this week

1. Honesty labels (CrUX/striking) — **#2**  
2. Nav + GitHub — **#3**  
3. `ai_visibility_check` demo scaffold — **#1**  
4. CLI export parity — **#4**  
5. browser-use cleanup — **#5**

Total realistic calendar time: **one focused afternoon**.
