# OpenSEO-Lite — Landing / UI Design Enhancements

**Reviewed:** `index.html` shell + `src/App.tsx` (~2114 lines) + `src/index.css`  
**Reality check:** This is not a classic marketing landing page with 4 feature cards. It is a **dark playground product UI** (tabs: Test Tools, Agent Prompts, Free Models, Connect AI, Code, Policy). FAQ lives under an orphaned `docs` tab with **no nav entry**.

---

## ✅ What's good

- Distinct brand mark (emerald → teal gradient icon) + “by Naga Codex” credit
- Expressive type pairing: Cabinet Grotesk + Plus Jakarta Sans + JetBrains Mono
- Atmosphere via layered dark surfaces (`#0C0E12` / `#12151B`) rather than flat gray
- API Key flow is highly visible (header CTA + banner + modal)
- Agent connect guide and copy-prompt UX are conversion-oriented for the real ICP (agent builders)
- Free-models education reduces “need paid OpenAI” friction
- Sticky header + segmented control feels modern

---

## ⚠️ Gaps vs your intended landing brief

| Expected | Actual |
|---|---|
| Hero + 4 feature cards (incl. AI Visibility) | Hero copy + **3** tool cards only |
| How it works section | Exists in `docs` tab — **not linked in nav** |
| FAQ | Same orphaned `docs` tab |
| Roadmap / momentum | Only in README, not in UI |
| Clear GitHub CTA | Missing from header |

---

## 💡 Suggested improvements (high impact first)

### 1. Fix the first viewport (brand + one job)

Right now the first viewport is: sticky nav → key banner → playground hero. That’s dashboard-y. For marketing visitors, add a **landing mode** (or top section before playground) with one composition:

```tsx
{/* Suggestion: LandingHero — first viewport only */}
<section className="relative overflow-hidden rounded-3xl border border-white/[0.06] mb-10">
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.12),_transparent_55%)]" />
  <div className="relative px-8 py-14 sm:py-20 max-w-3xl">
    <p className="font-display text-4xl sm:text-6xl font-black tracking-tight text-white">
      OpenSEO-Lite
    </p>
    <h1 className="mt-3 text-xl sm:text-2xl text-slate-200 font-semibold">
      Agent-native SEO tools. No Docker. No database.
    </h1>
    <p className="mt-3 text-sm text-slate-400 max-w-xl">
      Give Claude, Cursor, or Hermes live SERP + on-page audit skills via MCP — pip install and go.
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <a href="https://github.com/YOUR_ORG/openseo-lite-agent"
         className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-bold">
        Star on GitHub
      </a>
      <button onClick={() => setActiveTab('playground')}
              className="px-5 py-2.5 rounded-xl border border-emerald-400/50 text-emerald-300 text-sm font-semibold">
        Try the playground
      </button>
    </div>
  </div>
</section>
```

**Brand test:** After removing the nav, “OpenSEO-Lite” remains the dominant signal — good. Keep the product name larger than the supporting headline.

### 2. Four feature cards (when skill #4 ships)

```tsx
const FEATURES = [
  { id: 'serp_search', title: 'SERP Search', blurb: 'Live organic rankings by keyword + region.' },
  { id: 'page_audit', title: 'Page Audit', blurb: 'Titles, headings, links, thin content flags.' },
  { id: 'site_audit', title: 'Site Audit', blurb: '0–100 score + 3 prioritized fixes.' },
  { id: 'ai_visibility_check', title: 'AI Visibility', blurb: 'Are LLMs mentioning and citing your brand?' },
];
```

Until `ai_visibility_check` exists, either hide the fourth card or mark it `Coming soon` with disabled click — don’t ship a dead feature tile.

### 3. Wire the orphan FAQ / How-it-works tab

Add to the header nav:

```tsx
<button onClick={() => setActiveTab('docs')} className={/* same segmented styles */}>
  How it works
</button>
```

Optional: rename tab label to **FAQ** if that’s the conversion goal.

### 4. Soften “Zustand Local Storage Key” jargon

Banner currently leads with infrastructure jargon. Swap for benefit copy:

```tsx
<span className="text-xs font-bold text-white">
  {customApiKey ? 'Your free model key is ready' : 'Optional: unlock smarter AI summaries'}
</span>
<p className="text-[11px] text-slate-400">
  Keys stay in your browser. No account. No telemetry database.
</p>
```

### 5. Mobile nav overflow

Segmented nav has 6+ buttons + key CTA — overflows awkwardly on small screens.

```css
/* Quick win: collapse secondary tabs into a menu under sm */
@media (max-width: 640px) {
  .nav-secondary { display: none; }
}
```

Or use a single “More” dropdown for Code / Policy / Free Models.

### 6. Roadmap strip (momentum without clutter)

Place **below** the fold (not in hero):

```tsx
<section className="mt-16 border-t border-white/[0.06] pt-10">
  <h2 className="font-display text-lg font-bold text-white">Roadmap</h2>
  <ul className="mt-4 grid sm:grid-cols-3 gap-3 text-xs text-slate-400">
    <li className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <span className="text-emerald-400 font-semibold">Now</span>
      <p className="mt-1 text-slate-200">3 MCP skills + CLI export</p>
    </li>
    <li className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <span className="text-teal-400 font-semibold">Next</span>
      <p className="mt-1 text-slate-200">AI Visibility + MCP Registry</p>
    </li>
    <li className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <span className="text-slate-400 font-semibold">Later</span>
      <p className="mt-1 text-slate-200">GSC OAuth + scheduled ranks</p>
    </li>
  </ul>
</section>
```

### 7. Color / look adjustments

Keep emerald/teal identity (already differentiated from purple-AI cliché). Small polish:

```css
:root {
  --bg: #0C0E12;
  --panel: #12151B;
  --accent: #34d399; /* emerald-400 */
  --accent-2: #2dd4bf; /* teal-400 */
  --text-muted: #94a3b8;
}
```

Avoid adding glow stacks / more rounded-full pills — you already have enough. Prefer one intentional motion (e.g. Motion fade-in on tool result cards) rather than pulse dots everywhere.

### 8. Content / FAQ expansions

Add FAQ answers for:
- “Will Google ban me for SERP scraping?” (rate limits, ethics)
- “How is this different from Screaming Frog / Ahrefs?”
- “Does AI Visibility check ChatGPT itself?” (set honest expectation)
- “Is CrUX real field data?” (**must answer honestly** after audit finding)

### 9. Structural refactor (design maintainability)

Split `App.tsx` into:
- `LandingHero.tsx`
- `Playground.tsx`
- `ConnectAgents.tsx`
- `KeyModal.tsx`
- `FaqSection.tsx`

Keeps visual iteration safe without merge hell.

---

## 🎨 Optional improved section snippets

### CTA footer

```tsx
<footer className="mt-20 border-t border-white/[0.06] py-10 text-center">
  <p className="font-display text-2xl font-bold text-white">Ship SEO agents, not dashboards.</p>
  <p className="text-sm text-slate-400 mt-2">MIT · pip install · MCP-ready</p>
  <div className="mt-5 flex justify-center gap-3">
    <a className="px-4 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-bold" href="...">
      View on GitHub
    </a>
    <button className="px-4 py-2 rounded-xl border border-white/10 text-xs" onClick={() => setActiveTab('connect')}>
      Connect Claude / Cursor
    </button>
  </div>
</footer>
```

### Trust strip (below hero, one line)

```tsx
<p className="text-[11px] text-slate-500 tracking-wide uppercase">
  Works with Claude Desktop · Cursor · Hermes · OpenRouter free models
</p>
```

---

## UX / conversion checklist

| Check | Status | Action |
|---|---|---|
| Value prop in 5s | Partial | Lead with brand + “MCP SEO tools, pip-only” |
| Features easy to understand | Good for 3 | Add 4th when real; benefit-first blurbs |
| Add API Key flow obvious | Excellent | Soften jargon only |
| Clear CTA (GitHub / Try) | Weak | Add GitHub + Try buttons in hero |
| Mobile responsive | Partial | Collapse nav |
| Roadmap visible | Missing | Add below-fold strip |
| FAQ discoverable | Broken | Link `docs` tab |

---

## Priority order for design work

1. GitHub + Try CTAs in hero  
2. Expose How it works / FAQ in nav  
3. Honest labeling of CrUX / striking distance in UI results  
4. Fourth card only after skill exists  
5. Split `App.tsx` + mobile nav cleanup
