# OpenSEO-Lite — Feature Gaps vs Open-Source Competitors

**Compared against:**
- [antohins/seo-tools-mcp](https://github.com/antohins/seo-tools-mcp) — multi-server MCP (GSC, Yandex, Metrika, SERP bridges, ~70 tools across servers)
- [iannuttall/seo](https://github.com/iannuttall/seo) — local CLI + MCP, 70+ tools, crawl + GSC + GA4 + AI readiness
- [g-battaglia/mcp-seo](https://github.com/g-battaglia/mcp-seo) — 18 analyzers (meta, links, Lighthouse-style, crawl, structured data)
- [giorgikemo/mcp-seo-audit](https://github.com/GiorgiKemo/mcp-seo-audit) — GSC, PSI/Lighthouse, CrUX, indexing actions
- every-app/open-seo (inspiration class) — platform-style: keywords, competitors, backlinks, rank tracking, AI visibility

**OpenSEO-Lite positioning to protect:** agent-first, zero Docker, zero DB, pip-install, few sharp tools — **do not chase 70 tools**. Win on clarity + MCP ergonomics + unique AI visibility.

---

## Checklist vs your brief

| Capability | OpenSEO-Lite today | Gap |
|---|---|---|
| CLI interface | ✅ `cli.py` (3 skills) | Extend for skill #4 + richer exports |
| Google Search Console | ❌ | High value, OAuth complexity |
| Core Web Vitals (real CrUX) | ⚠️ Heuristic only | Misleading if labeled “CrUX” |
| Striking distance keywords | ⚠️ Synthetic phrases | Need real SERP positions |
| Export JSON/Markdown | ✅ site_audit | Extend to all skills |
| Rank tracking (scheduled) | ❌ | Conflicts with zero-DB unless file-based |
| Backlink discovery | ❌ | Usually needs paid APIs |
| MCP Registry listing | ❌ | Marketing/distribution gap |
| AI Visibility | ❌ **Missing entirely** | Differentiator if shipped |
| Multi-page crawl | ❌ | Competitors strong here |
| robots.txt / sitemap / JSON-LD | ❌ | Easy on-page extensions |
| AI readiness (LLM bots) | ❌ | iannuttall has `seo_ai_readiness` |

---

## 🔥 High priority (v0.2) — moves the needle

### 1. Ship `ai_visibility_check` (real or honest MVP)
- **Why:** Differentiates from classic on-page MCP tools; matches OpenSEO-class narrative; your landing already expects 4 skills.
- **Scope fit:** No DB; return JSON for agents; demo mode without keys.
- **Avoid:** Fake ChatGPT “share of voice” numbers.

### 2. Honest CWV + real optional CrUX
- **Why:** giorgikemo / mcp-seo already do performance; shipping fake CrUX is a trust bug.
- **v0.2a:** Relabel heuristics.  
- **v0.2b:** Optional `CRUX_API_KEY` → Chrome UX Report API (still no Docker/DB).

### 3. Real striking distance via `serp_search`
- **Why:** Competitors use GSC positions; you can approximate with SERP scrape for user-supplied keywords.
- **API:** `striking_distance(domain, keywords[])` → positions 11–20 only.

### 4. MCP Registry + clearer install story
- **Why:** Discovery is how agent users find you; antohins publishes to npm; you need PyPI/MCP registry presence.
- **Deliverables:** `server.json` / registry metadata, verified Claude Desktop config, `pip install openseo-lite-agent`.

### 5. Expand on-page checks competitors treat as table stakes
From g-battaglia-style suite, add **into** `page_audit` (don’t explode tool count):
- canonical, robots meta, OG/Twitter
- JSON-LD detection
- sitemap.xml + robots.txt fetch for same host

---

## 🟡 Medium priority (v0.3)

| Feature | Competitor signal | Notes for our constraints |
|---|---|---|
| GSC OAuth read-only | antohins, iannuttall, giorgikemo | Local token file (not DB); optional skill `gsc_query` |
| Multi-page crawl (N≤25) | mcp-seo `crawl_site`, iannuttall crawler | Breadth-first, respect robots, JSON graph out |
| AI readiness / LLM bot access | iannuttall `seo_ai_readiness` | Check GPTBot/ClaudeBot/PerplexityBot in robots + key pages |
| Structured Markdown reports for all tools | mcp-seo | CLI `--export md` everywhere |
| People Also Ask / related | antohins xmlriver | Nice SERP enrichment |
| Lighthouse / PSI optional | giorgikemo | External API; keep optional |
| Competitor page diff | Natural agent workflow | Thin wrapper: audit A vs B |

---

## 🟢 Low priority (future)

| Feature | Why later |
|---|---|
| Scheduled rank tracking | Needs persistence (SQLite file OK if philosophy allows “no server DB”); scheduling is ops-heavy |
| Backlink discovery | Without Ahrefs/DataForSEO quality is poor; paid keys break “free agent” feel |
| PDF export | Nice-to-have after MD |
| Site-wide graph UI | Dashboard creep — against agent-first |
| Yandex / Metrika / multi-locale stacks | antohins niche; not core ICP |
| GA4 | Powerful but OAuth + scopes; duplicate of iannuttall |

---

## Competitive positioning matrix

| Dimension | OpenSEO-Lite | Best-in-class competitor | Win strategy |
|---|---|---|---|
| Tool count | 3 (target 4) | 18–70+ | Stay minimal; better schemas |
| Install | pip + playwright | npm / pip mix | Keep zero Docker |
| Agent prompts | Strong | Varied | Double down |
| Live SERP | Yes (fragile) | Paid SERP APIs | Document ethics + fallbacks |
| GSC truth | No | Yes | Optional v0.3 |
| AI visibility | Missing | Emerging | **Primary differentiator** |
| Trust / honesty | CrUX oversold | Real APIs | Fix messaging ASAP |

---

## What NOT to build (protect the brand)

- Full Ahrefs clone
- Multi-tenant SaaS dashboard
- Docker Compose “platform”
- 50 micro-tools that overlap `page_audit`
- Rank trackers that require always-on cloud workers

---

## Suggested v0.2 milestone definition

Done when:
1. `ai_visibility_check` is callable via MCP + CLI + documented  
2. CrUX / striking distance are either real or honestly labeled  
3. Listed (or submission PR open) on MCP Registry  
4. `page_audit` includes canonical + JSON-LD + robots/sitemap  
5. README/UI say **4 skills** consistently
