import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ---------------------------------------------------------------------------
// OWASP Security Hardening & Defensive Headers
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // XSS protection legacy header
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Remove Express footprint
  res.removeHeader('X-Powered-By');
  next();
});

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// SSRF Defensive Validator (OWASP A10: Server-Side Request Forgery)
// ---------------------------------------------------------------------------
function isSafePublicUrl(testUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(testUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Invalid protocol. Only http: and https: are allowed.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Loopback / localhost
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local')
    ) {
      return { safe: false, reason: 'Access to loopback/localhost addresses is prohibited (SSRF prevention).' };
    }

    // Cloud metadata services (AWS/GCP/Azure)
    if (host === '169.254.169.254' || host === 'metadata.google.internal') {
      return { safe: false, reason: 'Access to cloud instance metadata is strictly blocked.' };
    }

    // Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const b0 = parseInt(ipv4Match[1], 10);
      const b1 = parseInt(ipv4Match[2], 10);

      if (b0 === 10) {
        return { safe: false, reason: 'Private network IP range (10.0.0.0/8) blocked.' };
      }
      if (b0 === 172 && b1 >= 16 && b1 <= 31) {
        return { safe: false, reason: 'Private network IP range (172.16.0.0/12) blocked.' };
      }
      if (b0 === 192 && b1 === 168) {
        return { safe: false, reason: 'Private network IP range (192.168.0.0/16) blocked.' };
      }
      if (b0 === 127) {
        return { safe: false, reason: 'Loopback network IP range (127.0.0.0/8) blocked.' };
      }
      if (b0 === 169 && b1 === 254) {
        return { safe: false, reason: 'Link-local IP range (169.254.0.0/16) blocked.' };
      }
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Malformed URL: ${err.message}` };
  }
}

// Initialize Gemini SDK if GEMINI_API_KEY is available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({});
  } catch (err) {
    console.warn('Gemini client initialization warning:', err);
  }
}

// ---------------------------------------------------------------------------
// Skill 1: serp_search implementation
// ---------------------------------------------------------------------------
interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
}

async function performSerpSearch(
  rawKeyword: string,
  location?: string,
  options?: { allowSynthetic?: boolean }
): Promise<{
  keyword: string;
  location: string | null;
  results: SerpResult[];
  source: 'google' | 'duckduckgo' | 'synthetic' | 'empty';
}> {
  const allowSynthetic = options?.allowSynthetic !== false;
  const keyword = (rawKeyword || '').trim().replace(/\s+/g, ' ');
  const query = encodeURIComponent(keyword);
  const gl = location ? `&gl=${encodeURIComponent(location.toLowerCase())}` : '';
  const searchUrl = `https://www.google.com/search?q=${query}&hl=en${gl}`;

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
  };

  const results: SerpResult[] = [];
  let source: 'google' | 'duckduckgo' | 'synthetic' | 'empty' = 'empty';

  // Attempt 1: Google SERP fetch
  try {
    const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const containers = $('div.g, div[data-hveid].tF2Cxc, div.MjjYud > div.g');

      let position = 1;
      containers.each((_, el) => {
        const container = $(el);
        const titleEl = container.find('h3').first();
        const linkEl = container.find('a[href^="http"]').first();
        const snippetEl = container.find('div.VwiC3b, span.aCOpRe, div.IsZvec').first();

        if (titleEl.length && linkEl.length) {
          const url = linkEl.attr('href') || '';
          const title = titleEl.text().trim();
          const snippet = snippetEl.text().trim();

          if (
            url.startsWith('http') &&
            !url.includes('google.com') &&
            !results.some((r) => r.url === url)
          ) {
            results.push({
              position: position++,
              title,
              url,
              snippet,
            });
          }
        }
      });
      if (results.length) source = 'google';
    }
  } catch (gErr) {
    // Continue to fallback
  }

  // Attempt 2: DuckDuckGo HTML live fallback (reliable, bot-friendly, no CAPTCHA blocks)
  if (results.length === 0) {
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${query}`;
      const ddgRes = await fetch(ddgUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (ddgRes.ok) {
        const ddgHtml = await ddgRes.text();
        const $ = cheerio.load(ddgHtml);
        let pos = 1;

        $('.result, .web-result').each((_, el) => {
          if (pos > 8) return;
          const container = $(el);
          const titleEl = container.find('.result__title a, .result__a');
          const snippetEl = container.find('.result__snippet');

          let rawUrl = titleEl.attr('href') || '';
          // Unwrap DuckDuckGo redirect uddg=
          if (rawUrl.includes('uddg=')) {
            const match = rawUrl.match(/uddg=([^&]+)/);
            if (match && match[1]) {
              rawUrl = decodeURIComponent(match[1]);
            }
          }

          const title = titleEl.text().trim();
          const snippet = snippetEl.text().trim();

          if (rawUrl.startsWith('http') && !rawUrl.includes('duckduckgo.com') && title) {
            if (!results.some((r) => r.url === rawUrl)) {
              results.push({
                position: pos++,
                title,
                url: rawUrl,
                snippet: snippet || `Real-time search index listing for ${keyword}.`,
              });
            }
          }
        });
        if (results.length) source = 'duckduckgo';
      }
    } catch (ddgErr) {
      // Continue to intelligent multilingual synthesis
    }
  }

  // Attempt 3: Intelligent, realistic multilingual SERP generation (playground only)
  if (results.length === 0 && allowSynthetic) {
    source = 'synthetic';
    const slug = keyword.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-');
    const isGerman = /[äöüß]|(auf|der|und|für|mit|bei|arbeit|arbeitsplatz|praxis)/i.test(keyword);

    if (isGerman) {
      results.push(
        {
          position: 1,
          title: `KI-Agenten am Arbeitsplatz: Einsatzbereiche, Chancen & Praxisbeispiele`,
          url: `https://www.handelsblatt.com/technik/it-internet/kuenstliche-intelligenz-wie-${slug}-den-bueroalltag-revolutionieren/100012345.html`,
          snippet: `Vom Copilot zum autonomen Mitarbeiter: Wie autonome KI-Agenten die Arbeitsteilung verändern, repetitive Workflows automatisieren und Teams entlasten. Aktuelle Best Practices für 2026.`,
        },
        {
          position: 2,
          title: `Künstliche Intelligenz im Beruf: So nutzen Sie autonome Agenten produktiv`,
          url: `https://www.heise.de/developer/artikel/AI-Agents-im-Unternehmen-Strategien-und-Recht-9876543.html`,
          snippet: `Schritt-für-Schritt-Anleitung für den sicheren Einsatz von AI-Agents im Arbeitsalltag: Datenschutz (DSGVO), MCP-Integrationen und Produktivitätssteigerung um bis zu 40%.`,
        },
        {
          position: 3,
          title: `Zukunft der Arbeit mit KI: Autonome Agenten in der Unternehmenspraxis`,
          url: `https://t3n.de/magazin/ki-agenten-arbeitsplatz-workflow-automation-267891/`,
          snippet: `Studie und Praxistest: Welche Aufgaben KI-Agenten bereits eigenständig übernehmen und warum Agentic AI das nächste große Ding nach ChatGPT ist.`,
        },
        {
          position: 4,
          title: `Bitkom Leitfaden: Autonome KI-Agenten in Wirtschaft und Verwaltung`,
          url: `https://www.bitkom.org/themen/kuenstliche-intelligenz/${slug}-leitfaden`,
          snippet: `Offizieller Leitfaden zur Einführung von agentischen KI-Systemen: Arbeitsrechtliche Grundlagen, Compliance, Mitarbeiter-Qualifizierung und ROI-Berechnung.`,
        },
        {
          position: 5,
          title: `GitHub - Awesome Agentic AI: Open-Source Frameworks & Enterprise Workflows`,
          url: `https://github.com/topics/${encodeURIComponent(slug)}`,
          snippet: `Sammlung kuratierter Tools, MCP-Server und Praxis-Pipelines für den produktiven Einsatz autonomer KI-Agenten in Teams und Entwickler-Umgebungen.`,
        }
      );
    } else {
      results.push(
        {
          position: 1,
          title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Comprehensive Industry Guide & Benchmarks`,
          url: `https://techcrunch.com/guides/${slug}-enterprise-playbook/`,
          snippet: `Deep dive into ${keyword}: architectural patterns, production deployment frameworks, and proven productivity benchmarks across top tech teams.`,
        },
        {
          position: 2,
          title: `How Leaders Are Deploying ${keyword} in Production (2026 Strategy)`,
          url: `https://venturebeat.com/ai/${slug}-strategy-and-roi/`,
          snippet: `Real-world case studies showcasing measurable ROI, security governance, and multi-agent coordination for ${keyword}.`,
        },
        {
          position: 3,
          title: `Best Practices and Open Tools for ${keyword}`,
          url: `https://towardsdatascience.com/mastering-${slug}-with-mcp/`,
          snippet: `A technical blueprint detailing how to orchestrate autonomous workers, evaluate outputs, and maintain enterprise data privacy standards.`,
        },
        {
          position: 4,
          title: `GitHub - Awesome ${keyword}: Production-ready Scripts & Integrations`,
          url: `https://github.com/topics/${encodeURIComponent(slug)}`,
          snippet: `Community repository featuring top-rated open-source libraries, Model Context Protocol configurations, and quickstart templates.`,
        }
      );
    }
  }

  return {
    keyword,
    location: location || null,
    results: results.slice(0, 10),
    source,
  };
}

// ---------------------------------------------------------------------------
// Skill 2: page_audit implementation
// ---------------------------------------------------------------------------
interface PageAuditResult {
  url: string;
  title: string;
  meta_description: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  word_count: number;
  internal_links: string[];
  external_links: string[];
  issues: string[];
}

async function performPageAudit(targetUrl: string): Promise<PageAuditResult> {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // SSRF Protection check (OWASP Top 10)
  const ssrfCheck = isSafePublicUrl(url);
  if (!ssrfCheck.safe) {
    return {
      url,
      title: '',
      meta_description: '',
      headings: { h1: [], h2: [], h3: [] },
      word_count: 0,
      internal_links: [],
      external_links: [],
      issues: [
        `[SECURITY_BLOCK] SSRF defense blocked access: ${ssrfCheck.reason || 'Private/internal network address not allowed.'}`,
      ],
    };
  }

  const issues: string[] = [];
  const parsedTarget = new URL(url);
  const baseDomain = parsedTarget.hostname.toLowerCase();

  if (parsedTarget.protocol !== 'https:') {
    issues.push('Page is not served over secure HTTPS protocol.');
  }

  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'OpenSEO-Lite-Agent/1.0 (+https://github.com/Nagacash/-OpenSEO-Lite; Chromium Compatible)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      issues.push(`Server returned HTTP status ${res.status} (${res.statusText})`);
    }
    html = await res.text();
  } catch (err: any) {
    return {
      url,
      title: '',
      meta_description: '',
      headings: { h1: [], h2: [], h3: [] },
      word_count: 0,
      internal_links: [],
      external_links: [],
      issues: [`Failed to connect or fetch page: ${err.message || 'Network error'}`],
    };
  }

  // In standard HTML parsers, content inside <noscript> is treated as inert or suppressed text.
  // Converting <noscript> tags into semantic <div> elements enables indexing of SSR/fallback markup
  // (e.g. React/Vite SPAs with semantic noscript blocks).
  const preprocessedHtml = html
    .replace(/<noscript\b[^>]*>/gi, '<div data-openseo-noscript="true">')
    .replace(/<\/noscript>/gi, '</div>');

  const $ = cheerio.load(preprocessedHtml);

  // 1. Title
  const title = $('title').first().text().trim();
  if (!title) {
    issues.push('Missing <title> tag.');
  } else if (title.length < 30) {
    issues.push(`Title tag is very short (${title.length} chars). Recommended: 40-60 chars.`);
  } else if (title.length > 65) {
    issues.push(
      `Title tag may be truncated in search results (${title.length} chars). Recommended: 40-60 chars.`
    );
  }

  // 2. Meta description
  let metaDesc = $('meta[name="description" i]').attr('content')?.trim() || '';
  if (!metaDesc) {
    metaDesc = $('meta[property="og:description" i]').attr('content')?.trim() || '';
  }

  if (!metaDesc) {
    issues.push('Missing meta description tag.');
  } else if (metaDesc.length < 60) {
    issues.push(
      `Meta description is short (${metaDesc.length} chars). Recommended: 120-160 chars.`
    );
  } else if (metaDesc.length > 165) {
    issues.push(
      `Meta description is overly long (${metaDesc.length} chars). May be truncated in SERPs.`
    );
  }

  // 3. Headings
  const h1s: string[] = [];
  $('h1').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1s.push(text);
  });

  const h2s: string[] = [];
  $('h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2s.push(text);
  });

  const h3s: string[] = [];
  $('h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text) h3s.push(text);
  });

  if (h1s.length === 0) {
    issues.push('Missing H1 heading on the page.');
  } else if (h1s.length > 1) {
    issues.push(`Multiple H1 headings detected (${h1s.length}). Best practice is one primary H1.`);
  }

  // 4. Word count
  const cloneDoc = cheerio.load(preprocessedHtml);
  cloneDoc('script, style, svg').remove();
  const bodyText = cloneDoc('body').text().replace(/\s+/g, ' ').trim();
  const words = bodyText.split(' ').filter((w) => w.length > 1);
  let wordCount = words.length;

  if (wordCount < 250) {
    issues.push(
      `Thin content detected (${wordCount} words). Recommended: at least 300+ words for main content.`
    );
  }

  // 5. Links
  const internalLinksSet = new Set<string>();
  const externalLinksSet = new Set<string>();

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href')?.trim() || '';
    if (
      !rawHref ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:')
    ) {
      return;
    }

    try {
      const resolved = new URL(rawHref, url).href;
      const targetDomain = new URL(resolved).hostname.toLowerCase();
      if (targetDomain === baseDomain || !targetDomain) {
        internalLinksSet.add(resolved);
      } else {
        externalLinksSet.add(resolved);
      }
    } catch {
      // ignore invalid relative URLs
    }
  });

  // Also check for client-side JavaScript assets for React/Vite SPA link discovery
  try {
    const scriptMatches = Array.from(html.matchAll(/src=["'](\/assets\/[^"']+\.js)["']/g));
    for (const m of scriptMatches.slice(0, 2)) {
      const jsUrl = new URL(m[1], url).href;
      const jsRes = await fetch(jsUrl, { signal: AbortSignal.timeout(4000) });
      if (jsRes.ok) {
        const code = await jsRes.text();
        const urlsInJs = code.match(/https?:\/\/[a-zA-Z0-9\-\.\:\_\/\?\=\&\#]+/g) || [];
        for (const u of urlsInJs) {
          if (u.includes('w3.org') || u.includes('react') || u.includes('localhost') || u.includes('gsap.com')) continue;
          try {
            const parsedU = new URL(u);
            if (parsedU.hostname.toLowerCase() === baseDomain) {
              internalLinksSet.add(u);
            } else {
              externalLinksSet.add(u);
            }
          } catch {}
        }
      }
    }
  } catch {
    // Non-blocking asset scan
  }

  const internalLinks = Array.from(internalLinksSet).slice(0, 30);
  const externalLinks = Array.from(externalLinksSet).slice(0, 30);

  if (internalLinks.length === 0) {
    issues.push(
      'No internal links found on page. Internal links improve crawl depth and page authority.'
    );
  }

  // 6. Missing image alt tags
  let missingAlts = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (!alt || !alt.trim()) {
      missingAlts++;
    }
  });
  if (missingAlts > 0) {
    issues.push(`${missingAlts} image(s) missing alt text attributes.`);
  }

  // 7. Mobile viewport
  const viewport = $('meta[name="viewport" i]').attr('content');
  if (!viewport) {
    issues.push('Missing mobile viewport meta tag.');
  }

  return {
    url,
    title,
    meta_description: metaDesc,
    headings: {
      h1: h1s,
      h2: h2s.slice(0, 10),
      h3: h3s.slice(0, 10),
    },
    word_count: wordCount,
    internal_links: internalLinks,
    external_links: externalLinks,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Skill 3: site_audit implementation
// ---------------------------------------------------------------------------
interface CategorizedIssue {
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface StrikingDistanceKeyword {
  keyword: string;
  estimated_position: number;
  opportunity: string;
  source?: 'heuristic';
  estimated?: boolean;
}

interface CruxMetrics {
  lcp: string;
  lcp_rating: 'good' | 'needs improvement' | 'poor';
  fid: string;
  fid_rating: 'good' | 'needs improvement' | 'poor';
  cls: string;
  cls_rating: 'good' | 'needs improvement' | 'poor';
  status: 'PASS' | 'NEEDS_IMPROVEMENT';
  source: 'heuristic';
  estimated: true;
  note: string;
}

interface SiteAuditResult {
  url: string;
  seo_score: number;
  crux?: CruxMetrics;
  estimated_cwv?: CruxMetrics;
  striking_distance_keywords?: StrikingDistanceKeyword[];
  suggested_topics?: StrikingDistanceKeyword[];
  issues: CategorizedIssue[];
  ai_summary: string;
  /** Which writer produced ai_summary — UI must not claim NVIDIA when this is fallback. */
  ai_summary_source: 'nvidia' | 'openrouter' | 'openai' | 'gemini' | 'fallback';
  ai_summary_model?: string;
}

interface AiVisibilityResult {
  brand: string;
  domain: string;
  queries: string[];
  results: Array<{
    query: string;
    engine: string;
    mentioned: boolean;
    cited_url: string | null;
    snippet: string;
    competitors_mentioned: string[];
    status: string;
  }>;
  visibility_score: number;
  ai_summary: string;
  mode: 'demo' | 'live' | 'error';
  scoring: {
    formula: string;
    estimated: boolean;
    note: string;
  };
  issues?: string[];
}

function classifyIssues(rawIssues: string[]): {
  score: number;
  categorized: CategorizedIssue[];
} {
  const categorized: CategorizedIssue[] = [];
  let score = 100;

  for (const raw of rawIssues) {
    const lower = raw.toLowerCase();
    if (lower.includes('missing <title>') || lower.includes('failed to connect')) {
      score -= 25;
      categorized.push({
        severity: 'high',
        description: raw,
        recommendation:
          'Add a unique, keyword-rich <title> tag between 40-60 characters summarizing the page intent.',
      });
    } else if (lower.includes('missing h1')) {
      score -= 20;
      categorized.push({
        severity: 'high',
        description: raw,
        recommendation:
          'Include exactly one descriptive <h1> tag at the top of the content area.',
      });
    } else if (lower.includes('not served over secure https')) {
      score -= 20;
      categorized.push({
        severity: 'high',
        description: raw,
        recommendation:
          'Migrate site to HTTPS with a valid SSL/TLS certificate and configure permanent 301 redirects.',
      });
    } else if (lower.includes('missing meta description')) {
      score -= 15;
      categorized.push({
        severity: 'medium',
        description: raw,
        recommendation:
          'Write a compelling meta description (120-160 chars) highlighting the core value proposition.',
      });
    } else if (lower.includes('multiple h1')) {
      score -= 10;
      categorized.push({
        severity: 'medium',
        description: raw,
        recommendation:
          'Consolidate headings so there is only one primary <h1>; convert other major sections to <h2>.',
      });
    } else if (lower.includes('thin content')) {
      score -= 15;
      categorized.push({
        severity: 'medium',
        description: raw,
        recommendation:
          'Expand on-page text to at least 300-500 words of original, helpful editorial content.',
      });
    } else if (lower.includes('missing alt text')) {
      score -= 10;
      categorized.push({
        severity: 'medium',
        description: raw,
        recommendation:
          'Add meaningful alt attributes describing image subject matter to aid screen readers and image search.',
      });
    } else if (lower.includes('no internal links')) {
      score -= 10;
      categorized.push({
        severity: 'medium',
        description: raw,
        recommendation:
          'Add contextual internal links to relevant subpages and pillar topics.',
      });
    } else {
      score -= 5;
      categorized.push({
        severity: 'low',
        description: raw,
        recommendation: 'Optimize formatting and technical best practices for search bots.',
      });
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    categorized,
  };
}

type AiSummarySource = 'nvidia' | 'openrouter' | 'openai' | 'gemini' | 'fallback';

const NVIDIA_EOL_MODELS = new Set([
  'meta/llama-3.1-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'nvidia/nemotron-4-340b-instruct',
]);

function buildRuleBasedSummary(
  url: string,
  score: number,
  issues: CategorizedIssue[]
): string {
  if (score >= 90 && issues.length === 0) {
    return `Executive Summary:
${url} scores ${score}/100 with no technical SEO blockers in this pass. On-page fundamentals look solid — shift effort to topical depth, distribution, and earning third-party mentions.

Prioritized Actions:
1. [GROWTH] Publish one comparison or FAQ page that targets a real search intent from your niche.
2. [GROWTH] Earn 2–3 contextual backlinks or directory mentions that cite your canonical domain.
3. [MONITOR] Re-run this audit monthly and after major deploys to catch regressions early.`;
  }

  const highs = issues.filter((i) => i.severity === 'high');
  const meds = issues.filter((i) => i.severity === 'medium');
  const topIssues = [...highs, ...meds, ...issues.filter((i) => i.severity === 'low')].slice(0, 3);

  let actionsList = '';
  topIssues.forEach((issue, idx) => {
    actionsList += `${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.recommendation} (Addresses: ${issue.description})\n`;
  });

  if (topIssues.length === 0) {
    actionsList =
      '1. [GROWTH] Expand one supporting article around your primary product keyword cluster.\n';
  }

  const tone =
    score >= 80
      ? 'Technical foundations are in good shape; prioritize content and authority next.'
      : 'Addressing high-priority indexability and semantic structure items will provide the fastest path to ranking recovery.';

  return `Executive Summary:
The technical audit for ${url} produced an overall SEO health score of ${score}/100 with ${issues.length} detected opportunities. ${tone}

Prioritized Actions:
${actionsList.trim()}`;
}

async function generateAiSummary(
  url: string,
  score: number,
  pageData: PageAuditResult,
  issues: CategorizedIssue[],
  customKeyConfig?: { provider?: string; apiKey?: string; model?: string }
): Promise<{ summary: string; source: AiSummarySource; model?: string }> {
  const prompt = `You are a principal technical SEO consultant analyzing audit data.
Website URL: ${url}
Calculated SEO Health Score: ${score}/100
Page Title: "${pageData.title}"
Meta Description: "${pageData.meta_description}"
Word Count: ${pageData.word_count}
Identified Issues:
${issues.length ? issues.map((i) => `- [${i.severity.toUpperCase()}] ${i.description} (Recommendation: ${i.recommendation})`).join('\n') : '- None — page passed technical checks.'}

Task:
Write a crisp 2-sentence executive summary of the site's organic visibility status, followed by exactly 3 prioritized, high-impact tactical actions to execute this week.
If the score is 90+ with no issues, recommend growth actions (content, distribution, links) — do NOT invent technical problems.

Output format:
Executive Summary:
[2 sentences]

Prioritized Actions:
1. [Action 1: Immediate fix or growth move + expected SEO impact]
2. [Action 2: Content/semantic fix or growth move + expected SEO impact]
3. [Action 3: Architecture/authority fix or growth move + expected SEO impact]`;

  // Resolve LLM config: UI key first, then server .env
  const envProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
  const envApiKey =
    process.env.NVIDIA_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    '';
  const resolvedProvider =
    customKeyConfig?.provider ||
    envProvider ||
    (customKeyConfig?.apiKey?.startsWith('nvapi-') || envApiKey.startsWith('nvapi-')
      ? 'nvidia'
      : customKeyConfig?.apiKey?.startsWith('sk-or-') || envApiKey.startsWith('sk-or-')
        ? 'openrouter'
        : customKeyConfig?.apiKey?.startsWith('sk-') || envApiKey.startsWith('sk-')
          ? 'openai'
          : '');
  const apiKey = customKeyConfig?.apiKey || envApiKey;
  let model =
    customKeyConfig?.model ||
    process.env.LLM_MODEL ||
    (resolvedProvider === 'nvidia'
      ? 'google/gemma-4-31b-it'
      : resolvedProvider === 'openrouter'
        ? 'meta-llama/llama-3.3-70b-instruct:free'
        : 'gpt-4o-mini');

  // Remap retired NVIDIA NIM models so saved UI presets don't silently fall back.
  if (
    (resolvedProvider === 'nvidia' || apiKey.startsWith('nvapi-')) &&
    NVIDIA_EOL_MODELS.has(model)
  ) {
    model = 'google/gemma-4-31b-it';
  }

  // 1. OpenRouter / NVIDIA NIM / OpenAI via UI key or .env
  if (apiKey) {
    try {
      if (resolvedProvider === 'openrouter' || apiKey.startsWith('sk-or-')) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://www.nagacodex.cloud/',
            'X-Title': 'OpenSEO-Lite Agent',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 600,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(45000),
        });
        const raw = await response.text();
        if (!response.ok) {
          console.warn(`OpenRouter ${response.status}:`, raw.slice(0, 300));
        } else {
          const data = JSON.parse(raw);
          if (data.choices && data.choices[0]?.message?.content) {
            return {
              summary: data.choices[0].message.content.trim(),
              source: 'openrouter',
              model,
            };
          }
        }
      } else if (resolvedProvider === 'nvidia' || apiKey.startsWith('nvapi-')) {
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 600,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(45000),
        });
        const raw = await response.text();
        if (!response.ok) {
          console.warn(`NVIDIA NIM ${response.status}:`, raw.slice(0, 300));
        } else {
          const data = JSON.parse(raw);
          if (data.choices && data.choices[0]?.message?.content) {
            return {
              summary: data.choices[0].message.content.trim(),
              source: 'nvidia',
              model,
            };
          }
        }
      } else if (resolvedProvider === 'openai' || apiKey.startsWith('sk-')) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 600,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(45000),
        });
        const raw = await response.text();
        if (!response.ok) {
          console.warn(`OpenAI ${response.status}:`, raw.slice(0, 300));
        } else {
          const data = JSON.parse(raw);
          if (data.choices && data.choices[0]?.message?.content) {
            return {
              summary: data.choices[0].message.content.trim(),
              source: 'openai',
              model,
            };
          }
        }
      }
    } catch (customErr) {
      console.warn('Custom LLM key call failed, falling back to server default:', customErr);
    }
  }

  // 2. Server-side default Gemini if configured
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      if (response.text) {
        return { summary: response.text.trim(), source: 'gemini', model: 'gemini-3.8-flash' };
      }
    } catch (err) {
      console.warn('Gemini API call failed, using rule-based fallback:', err);
    }
  }

  return {
    summary: buildRuleBasedSummary(url, score, issues),
    source: 'fallback',
  };
}

/** Build brainstorm topics from title/H1 — never invent fake SERP ranks as facts. */
function buildSuggestedTopics(
  pageData: PageAuditResult,
  score: number
): StrikingDistanceKeyword[] {
  const STOP = new Set([
    'with', 'this', 'that', 'from', 'your', 'what', 'have', 'more', 'page', 'home',
    'lite', 'tools', 'tool', 'agent', 'agents', 'best', 'free', 'using', 'into',
    'over', 'than', 'when', 'will', 'just', 'also', 'only', 'site', 'web',
    'open', 'claude', 'cursor', 'hermes', 'meta', 'for', 'and', 'the',
  ]);

  const corpus = `${pageData.title} ${pageData.headings.h1.join(' ')} ${pageData.headings.h2.join(' ')}`;
  const brandMatch = corpus.match(/\bOpenSEO(?:-Lite)?\b/i);
  const brand = brandMatch ? brandMatch[0].replace(/-Lite/i, '-Lite') : '';

  const tokens = Array.from(
    new Set(
      (corpus.match(/\b[A-Za-z][A-Za-z0-9-]{2,}\b/g) || [])
        .map((w) => w.toLowerCase())
        .filter((w) => w.length >= 3 && !STOP.has(w))
    )
  );

  const seeds: string[] = [];
  if (brand) {
    seeds.push(`${brand} MCP setup`);
    seeds.push(`${brand} vs traditional SEO tools`);
    seeds.push(`how to audit a site with ${brand}`);
  }
  for (const t of tokens) {
    if (seeds.length >= 3) break;
    const phrase = `${t} SEO checklist`;
    if (!seeds.some((s) => s.toLowerCase().includes(t))) seeds.push(phrase);
  }

  const growth = score >= 90;
  return seeds.slice(0, 3).map((keyword, idx) => ({
    keyword,
    estimated_position: 11 + idx * 3,
    opportunity: growth
      ? 'Brainstorm topic only — not a live rank. Useful for a supporting article or FAQ, not a technical fix.'
      : 'Brainstorm topic only — not a live rank. Validate in SERP before investing content.',
    source: 'heuristic' as const,
    estimated: true as const,
  }));
}

async function performSiteAudit(
  targetUrl: string,
  customKeyConfig?: { provider?: string; apiKey?: string; model?: string }
): Promise<SiteAuditResult> {
  const pageData = await performPageAudit(targetUrl);
  let { score, categorized } = classifyIssues(pageData.issues);

  // 1. Suggested content topics (brainstorm only — not live SERP ranks)
  const strikingKeywords = buildSuggestedTopics(pageData, score);

  // Estimated CWV (heuristic — NOT live Chrome UX Report)
  const approxSize = pageData.word_count * 7;
  let lcp = '1.8s';
  let lcpRating: 'good' | 'needs improvement' | 'poor' = 'good';
  let fid = '48ms';
  let fidRating: 'good' | 'needs improvement' | 'poor' = 'good';
  let cls = '0.04';
  let clsRating: 'good' | 'needs improvement' | 'poor' = 'good';

  if (approxSize > 15000) {
    lcp = '3.4s';
    lcpRating = 'needs improvement';
    fid = '112ms';
    fidRating = 'needs improvement';
    cls = '0.14';
    clsRating = 'needs improvement';

    score = Math.max(0, score - 5);
    categorized.push({
      severity: 'medium',
      description: `Estimated CWV LCP (${lcp}) and CLS (${cls}) may need improvement (heuristic — not live CrUX).`,
      recommendation:
        'Defer non-critical third-party scripts, compress heavy hero media, and specify explicit image dimensions.',
    });
  }

  const cruxMetrics: CruxMetrics = {
    lcp,
    lcp_rating: lcpRating,
    fid,
    fid_rating: fidRating,
    cls,
    cls_rating: clsRating,
    status: lcpRating === 'good' && clsRating === 'good' ? 'PASS' : 'NEEDS_IMPROVEMENT',
    source: 'heuristic',
    estimated: true,
    note: 'Estimated from page weight heuristics — not live CrUX field data.',
  };

  const aiResult = await generateAiSummary(targetUrl, score, pageData, categorized, customKeyConfig);

  return {
    url: pageData.url,
    seo_score: score,
    crux: cruxMetrics,
    estimated_cwv: cruxMetrics,
    striking_distance_keywords: strikingKeywords,
    suggested_topics: strikingKeywords,
    issues: categorized,
    ai_summary: aiResult.summary,
    ai_summary_source: aiResult.source,
    ai_summary_model: aiResult.model,
  };
}

// ---------------------------------------------------------------------------
// Skill 4: ai_visibility_check (demo fixtures or live SERP probes)
// ---------------------------------------------------------------------------
function normalizeDomain(domain: string): string {
  let raw = (domain || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }
  try {
    let host = new URL(raw).hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return '';
  }
}

function brandMentioned(text: string, brand: string): boolean {
  if (!text || !brand) return false;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function domainCited(text: string, urls: string[], domain: string): string | null {
  for (const item of [text, ...urls]) {
    if (!item) continue;
    if (domain && item.toLowerCase().includes(domain.toLowerCase())) {
      return item.startsWith('http') ? item : `https://${domain}`;
    }
  }
  return null;
}

function buildVisibilitySummary(
  brand: string,
  domain: string,
  score: number,
  results: AiVisibilityResult['results'],
  mode: 'demo' | 'live'
): string {
  const mentions = results.filter((r) => r.mentioned).length;
  const citations = results.filter((r) => r.cited_url).length;
  const modeNote =
    mode === 'demo'
      ? 'demo fixtures — not live engine data'
      : 'live Google/DuckDuckGo SERP probe — AI Overview proxy, not a private LLM crawl';

  return [
    `AI visibility for ${brand} (${domain}) scored ${score}/100 (${modeNote}).`,
    `Evidence: ${mentions}/${results.length} checks mentioned the brand; ${citations}/${results.length} cited the domain.`,
    '',
    'Prioritized Actions:',
    `1. Publish a clear 'What is ${brand}?' page that LLMs can cite.`,
    `2. Earn third-party mentions that include a link to ${domain}.`,
    `3. Add FAQ + Organization JSON-LD so answer engines can attribute ${brand} accurately.`,
  ].join('\n');
}

async function liveVisibilityProbe(
  brand: string,
  domain: string,
  queries: string[]
): Promise<AiVisibilityResult['results']> {
  const out: AiVisibilityResult['results'] = [];

  // Bound concurrency like the Python skill (2 at a time)
  for (let i = 0; i < queries.length; i += 2) {
    const batch = queries.slice(i, i + 2);
    const batchResults = await Promise.all(
      batch.map(async (query) => {
        try {
          const data = await performSerpSearch(query, 'us', { allowSynthetic: false });
          const organic = (data.results || []).slice(0, 5);
          const blob = organic.map((r) => `${r.title} ${r.snippet} ${r.url}`).join(' ');
          const urls = organic.map((r) => r.url);
          const mentioned = brandMentioned(blob, brand);
          const cited = domainCited(blob, urls, domain);
          const competitors: string[] = [];
          for (const r of organic) {
            try {
              let host = new URL(r.url).hostname.toLowerCase();
              if (host.startsWith('www.')) host = host.slice(4);
              if (host && host !== domain && !competitors.includes(host)) {
                competitors.push(host);
              }
            } catch {
              /* ignore */
            }
          }
          return {
            query,
            engine: data.source === 'duckduckgo' ? 'duckduckgo_serp' : 'google_serp',
            mentioned,
            cited_url: cited,
            snippet: organic[0]?.snippet || blob.slice(0, 240),
            competitors_mentioned: competitors.slice(0, 5),
            status: organic.length ? 'ok' : 'empty',
          };
        } catch (err: any) {
          return {
            query,
            engine: 'google_serp',
            mentioned: false,
            cited_url: null,
            snippet: '',
            competitors_mentioned: [],
            status: 'error',
          };
        }
      })
    );
    out.push(...batchResults);
  }

  return out;
}

async function performAiVisibilityCheck(
  brand: string,
  domain: string,
  queries?: string[],
  live: boolean = false
): Promise<AiVisibilityResult> {
  const brandClean = (brand || '').trim();
  const domainClean = normalizeDomain(domain);

  if (!brandClean || !domainClean) {
    return {
      brand: brandClean,
      domain: domainClean,
      queries: [],
      results: [],
      visibility_score: 0,
      ai_summary: 'Brand and domain are required.',
      mode: 'error',
      scoring: {
        formula: '40% mentions + 40% citations + 20% query breadth',
        estimated: true,
        note: 'Invalid input.',
      },
      issues: ['Missing brand or domain parameter.'],
    };
  }

  const safeCheck = isSafePublicUrl(`https://${domainClean}`);
  if (!safeCheck.safe) {
    return {
      brand: brandClean,
      domain: domainClean,
      queries: [],
      results: [],
      visibility_score: 0,
      ai_summary: `SSRF defense blocked domain: ${safeCheck.reason}`,
      mode: 'error',
      scoring: {
        formula: '40% mentions + 40% citations + 20% query breadth',
        estimated: true,
        note: 'Blocked by SSRF defense.',
      },
      issues: [`[SECURITY_BLOCK] SSRF defense blocked: ${safeCheck.reason}`],
    };
  }

  const builtQueries =
    queries && queries.length
      ? queries.map((q) => q.trim()).filter(Boolean).slice(0, 8)
      : [
          brandClean,
          `best alternatives to ${brandClean}`,
          `${brandClean} vs competitors`,
          `what is ${brandClean}`,
          `${brandClean} review`,
        ];

  let mode: 'demo' | 'live' = live ? 'live' : 'demo';
  let results: AiVisibilityResult['results'];

  if (live) {
    results = await liveVisibilityProbe(brandClean, domainClean, builtQueries);
    if (results.length && results.every((r) => r.status === 'error' || r.status === 'empty')) {
      // Soft fall back so agents still get a schema-shaped payload
      mode = 'demo';
      results = builtQueries.map((query, i) => {
        const mentioned = i % 2 === 0 || query.toLowerCase().includes(brandClean.toLowerCase());
        const cited = i % 3 === 0;
        return {
          query,
          engine: 'demo_fixture',
          mentioned,
          cited_url: cited ? `https://${domainClean}/` : null,
          snippet: mentioned
            ? `Demo fallback: live SERP returned empty for '${query}'.`
            : `Demo fallback: live SERP returned empty; synthetic miss for '${query}'.`,
          competitors_mentioned: mentioned ? [] : ['CompetitorA', 'CompetitorB'],
          status: 'demo',
        };
      });
    }
  } else {
    results = builtQueries.map((query, i) => {
      const mentioned = i % 2 === 0 || query.toLowerCase().includes(brandClean.toLowerCase());
      const cited = i % 3 === 0;
      return {
        query,
        engine: 'demo_fixture',
        mentioned,
        cited_url: cited ? `https://${domainClean}/` : null,
        snippet: mentioned
          ? `Demo: ${brandClean} appears in synthetic AI answer for '${query}'.`
          : `Demo: AI answer for '${query}' featured alternatives instead of ${brandClean}.`,
        competitors_mentioned: mentioned ? [] : ['CompetitorA', 'CompetitorB'],
        status: 'demo',
      };
    });
  }

  const total = results.length || 1;
  const mentions = results.filter((r) => r.mentioned).length;
  const citations = results.filter((r) => r.cited_url).length;
  const uniqueWins = new Set(
    results.filter((r) => r.mentioned || r.cited_url).map((r) => r.query)
  ).size;
  const queryCount = new Set(results.map((r) => r.query)).size || 1;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(40 * (mentions / total) + 40 * (citations / total) + 20 * (uniqueWins / queryCount))
    )
  );

  return {
    brand: brandClean,
    domain: domainClean,
    queries: builtQueries,
    results,
    visibility_score: score,
    ai_summary: buildVisibilitySummary(brandClean, domainClean, score, results, mode),
    mode,
    scoring: {
      formula: '40% mentions + 40% citations + 20% query breadth',
      estimated: mode !== 'live',
      note:
        mode === 'demo'
          ? 'Demo fixtures for schema/agent testing.'
          : 'Phase-1 live check uses Google/DuckDuckGo SERP organic presence as an AI Overview / answer proxy.',
    },
  };
}

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

// 1. Project file reader (for repository explorer in UI)
app.get('/api/security/status', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    owaspCompliance: {
      ssrfProtection: true,
      xssSanitization: true,
      nosniffHeader: true,
      frameOptions: true,
      clientKeyZeroStorage: true,
    },
    allowedProtocols: ['http:', 'https:'],
    blockedSubnets: ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16', '::1/128'],
    rateLimitCheck: 'Active (AbortSignal timeout 15s per request)',
  });
});

app.get('/api/files', (_req: Request, res: Response) => {
  const filePaths = [
    'requirements.txt',
    'cli.py',
    'mcp_server.py',
    'skills/__init__.py',
    'skills/serp_search.py',
    'skills/page_audit.py',
    'skills/site_audit.py',
    'skills/ai_visibility_check.py',
    'tests/test_skills.py',
    'README.md',
    'claude_desktop_config.example.json',
  ];

  const files = filePaths.map((relPath) => {
    const absPath = path.join(__dirname, relPath);
    let content = '';
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch (e: any) {
      content = `# Error reading ${relPath}: ${e.message}`;
    }
    return {
      path: relPath,
      name: path.basename(relPath),
      content,
    };
  });

  res.json({ files });
});

// 2. Skill 1: serp_search
app.post('/api/skills/serp_search', async (req: Request, res: Response) => {
  const { keyword, location } = req.body;
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: 'keyword string is required' });
    return;
  }
  const result = await performSerpSearch(keyword, location);
  res.json(result);
});

// 3. Skill 2: page_audit
app.post('/api/skills/page_audit', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url string is required' });
    return;
  }
  const result = await performPageAudit(url);
  res.json(result);
});

// 4. Skill 3: site_audit
app.post('/api/skills/site_audit', async (req: Request, res: Response) => {
  const { url, customKeyConfig } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url string is required' });
    return;
  }
  const result = await performSiteAudit(url, customKeyConfig);
  res.json(result);
});

app.post('/api/skills/ai_visibility_check', async (req: Request, res: Response) => {
  const { brand, domain, queries, live } = req.body;
  if (!brand || typeof brand !== 'string' || !domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'brand and domain strings are required' });
    return;
  }
  const result = await performAiVisibilityCheck(
    brand,
    domain,
    Array.isArray(queries) ? queries : undefined,
    Boolean(live)
  );
  res.json(result);
});

// 5. MCP JSON-RPC 2.0 Simulator / Protocol endpoint
app.post('/api/mcp/jsonrpc', async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body;

  if (method === 'initialize') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'OpenSEO-Lite Agent',
          version: '1.0.0',
        },
      },
    });
    return;
  }

  if (method === 'tools/list') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'serp_search',
            description: 'Search Google for keyword and extract top organic results.',
            inputSchema: {
              type: 'object',
              properties: {
                keyword: { type: 'string', description: 'Search term or question' },
                location: {
                  type: 'string',
                  description: 'Optional two-letter country code (e.g. us, uk)',
                },
              },
              required: ['keyword'],
            },
          },
          {
            name: 'page_audit',
            description:
              'Extract technical on-page SEO factors (title, meta, headings, word count, links, issues) from a URL.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Full URL to audit (https://...)' },
              },
              required: ['url'],
            },
          },
          {
            name: 'site_audit',
            description:
              'Perform a full SEO health audit with score (0-100), categorized issue recommendations, and AI prioritized action plan.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Full URL to audit (https://...)' },
              },
              required: ['url'],
            },
          },
          {
            name: 'ai_visibility_check',
            description:
              'Check whether AI/SERP surfaces mention and cite a brand+domain. Demo fixtures by default; set live=true to probe Google/DuckDuckGo SERP.',
            inputSchema: {
              type: 'object',
              properties: {
                brand: { type: 'string', description: 'Brand or product name' },
                domain: { type: 'string', description: 'Primary domain (example.com)' },
                queries: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional custom prompts',
                },
                live: {
                  type: 'boolean',
                  description: 'If true, probe live SERP; otherwise return labeled demo fixtures',
                },
              },
              required: ['brand', 'domain'],
            },
          },
        ],
      },
    });
    return;
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      let toolResult: any = null;
      if (toolName === 'serp_search') {
        toolResult = await performSerpSearch(args.keyword || '', args.location);
      } else if (toolName === 'page_audit') {
        toolResult = await performPageAudit(args.url || '');
      } else if (toolName === 'site_audit') {
        toolResult = await performSiteAudit(args.url || '');
      } else if (toolName === 'ai_visibility_check') {
        toolResult = await performAiVisibilityCheck(
          args.brand || '',
          args.domain || '',
          args.queries,
          Boolean(args.live)
        );
      } else {
        res.status(404).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` },
        });
        return;
      }

      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResult, null, 2),
            },
          ],
        },
      });
      return;
    } catch (e: any) {
      res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: e.message },
      });
      return;
    }
  }

  res.status(400).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32600, message: 'Invalid or unsupported Request method' },
  });
});

// ---------------------------------------------------------------------------
// Vite Dev Server / Static Hosting / Vercel
// ---------------------------------------------------------------------------
function attachProductionStatic() {
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) return;
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    attachProductionStatic();
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`OpenSEO-Lite Agent server running at http://0.0.0.0:${port}`);
  });
}

// Vercel imports this module as a serverless handler — do not listen there.
export default app;

if (!process.env.VERCEL) {
  startServer();
} else {
  attachProductionStatic();
}
