/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { POPULAR_MODELS, ModelOption } from './modelPresets';
import { AGENT_PROMPTS } from './agentPrompts';
import { PolicyPage } from './PolicyPage';
import { useAppStore } from './store';
import {
  Search,
  Globe,
  FileSearch,
  Sparkles,
  ArrowUpRight,
  Terminal,
  Copy,
  Check,
  Code2,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Bot,
  Zap,
  BookOpen,
  ArrowRight,
  Compass,
  Link2,
  Key,
  ShieldAlert,
  Server,
  SlidersHorizontal,
  Lock,
  Eye,
  EyeOff,
  Settings,
  HelpCircle,
  ShieldCheck,
  MessageSquareCode,
  FileText,
  Github,
  Radar,
} from 'lucide-react';

interface ProjectFile {
  path: string;
  name: string;
  content: string;
}

const GITHUB_REPO = 'https://github.com/Nagacash/-OpenSEO-Lite';

export default function App() {
  const [activeTab, setActiveTab] = useState<'playground' | 'agent_prompts' | 'connect' | 'free_keys' | 'code' | 'docs' | 'policy'>('playground');
  const [selectedTool, setSelectedTool] = useState<'serp_search' | 'page_audit' | 'site_audit' | 'ai_visibility_check'>('site_audit');

  // Input fields
  const [serpKeyword, setSerpKeyword] = useState('how to rank on google with ai agents');
  const [serpLocation, setSerpLocation] = useState('us');
  const [auditUrl, setAuditUrl] = useState('https://news.ycombinator.com');
  const [visibilityBrand, setVisibilityBrand] = useState('OpenSEO-Lite');
  const [visibilityDomain, setVisibilityDomain] = useState('nagacodex.cloud');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Zustand persistent store for safe local storage
  const {
    provider: customProvider,
    apiKey: customApiKey,
    model: customModel,
    isKeyModalOpen,
    showKeyPassword,
    setProvider,
    setApiKey,
    setModel,
    setIsKeyModalOpen,
    setShowKeyPassword,
    saveKeyConfig,
    clearKey,
  } = useAppStore();

  const [tempApiKey, setTempApiKey] = useState(customApiKey);
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Sync temp key when customApiKey changes
  useEffect(() => {
    setTempApiKey(customApiKey);
  }, [customApiKey]);

  // Selected agent prompt
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);

  // Results
  const [serpResult, setSerpResult] = useState<any>(null);
  const [pageAuditResult, setPageAuditResult] = useState<any>(null);
  const [siteAuditResult, setSiteAuditResult] = useState<any>(null);
  const [visibilityResult, setVisibilityResult] = useState<any>(null);

  // Copied state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected agent for connection guide
  const [selectedAgent, setSelectedAgent] = useState<'openrouter' | 'nvidia' | 'hermes' | 'grok' | 'claude' | 'cursor'>('hermes');

  // Code files
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>('mcp_server.py');

  useEffect(() => {
    fetch('/api/files')
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setFiles(data.files);
        }
      })
      .catch((err) => console.error('Failed to load project files:', err));
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleProviderPresetChange = (provider: 'openrouter' | 'nvidia' | 'openai') => {
    setProvider(provider);
  };

  const handleRunSerp = async () => {
    const cleaned = serpKeyword.trim();
    if (!cleaned) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/skills/serp_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: cleaned, location: (serpLocation || 'us').trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search Google');
      setSerpResult(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPageAudit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/skills/page_audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: auditUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze page');
      setPageAuditResult(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSiteAudit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: any = { url: auditUrl };
      if (customApiKey.trim()) {
        payload.customKeyConfig = {
          provider: customProvider,
          apiKey: customApiKey.trim(),
          model: customModel.trim(),
        };
      }

      const res = await fetch('/api/skills/site_audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to audit site');
      setSiteAuditResult(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAiVisibility = async () => {
    const brand = visibilityBrand.trim();
    const domain = visibilityDomain.trim();
    if (!brand || !domain) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/skills/ai_visibility_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check AI visibility');
      setVisibilityResult(data);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentFile = files.find((f) => f.path === activeFile);

  return (
    <div className="min-h-screen bg-[#0C0E12] text-slate-100 flex flex-col font-sans selection:bg-emerald-400 selection:text-slate-950">
      {/* Top Header with Dribbble elegance */}
      <header className="border-b border-white/[0.06] bg-[#0C0E12]/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => setActiveTab('playground')}
            className="flex items-center gap-2.5 shrink-0 text-left"
          >
            <img
              src="/images/logo.png"
              alt="Naga Codex"
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
            />
            <span className="font-display font-extrabold text-[15px] tracking-tight text-white">
              OpenSEO-Lite
            </span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <nav className="hidden md:flex items-center gap-0.5 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
              {[
                { id: 'playground' as const, label: 'Tools' },
                { id: 'connect' as const, label: 'Connect' },
                { id: 'agent_prompts' as const, label: 'Prompts' },
                { id: 'free_keys' as const, label: 'Keys' },
                { id: 'docs' as const, label: 'Guide' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-white text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <select
              className="md:hidden bg-[#12151B] border border-white/[0.08] rounded-lg px-2.5 py-2 text-[12px] text-slate-200"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
              aria-label="Section"
            >
              <option value="playground">Tools</option>
              <option value="connect">Connect</option>
              <option value="agent_prompts">Prompts</option>
              <option value="free_keys">Keys</option>
              <option value="docs">Guide</option>
              <option value="code">Code</option>
              <option value="policy">Security</option>
            </select>

            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>

            <button
              onClick={() => setIsKeyModalOpen(true)}
              className={`px-3 py-2 rounded-lg border text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
                customApiKey
                  ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
                  : 'border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{customApiKey ? 'Key on' : 'API key'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-6 sm:py-8">
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 text-xs shrink-0">
              Dismiss
            </button>
          </div>
        )}

        {/* Quiet key note — not a competing hero banner */}
        {activeTab === 'playground' && !customApiKey && (
          <p className="mb-5 text-[13px] text-slate-500">
            Works without a key.{' '}
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="text-emerald-400/90 hover:text-emerald-300 underline underline-offset-2"
            >
              Add OpenRouter
            </button>{' '}
            only if you want longer AI write-ups.
          </p>
        )}

        {activeTab === 'policy' && (
          <PolicyPage onBack={() => setActiveTab('playground')} />
        )}

        {/* =================================================================== */}
        {/* TAB: AGENT USER PROMPT (HERMES, GROK, CLAUDE, CURSOR)               */}
        {/* =================================================================== */}
        {activeTab === 'agent_prompts' && (
          <div className="space-y-7 max-w-4xl mx-auto">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Copy a prompt. Paste it into your agent.
              </h2>
              <p className="text-[15px] text-slate-400 mt-2 leading-relaxed max-w-2xl">
                These tell Hermes, Grok, or Claude how to use the four OpenSEO-Lite tools without inventing rankings.
              </p>
            </div>

            {/* Prompt Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {AGENT_PROMPTS.map((promptItem, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPromptIdx(idx)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedPromptIdx === idx
                      ? 'bg-emerald-400/10 border-emerald-400/60 shadow-lg shadow-emerald-500/5'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-400">
                      {promptItem.badge}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-xs text-white truncate">
                    {promptItem.agentName}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {promptItem.role}
                  </p>
                </button>
              ))}
            </div>

            {/* Selected Prompt Viewer */}
            <div className="p-6 rounded-3xl bg-[#12151B] border border-white/[0.08] shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    {AGENT_PROMPTS[selectedPromptIdx].agentName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {AGENT_PROMPTS[selectedPromptIdx].description}
                  </p>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      AGENT_PROMPTS[selectedPromptIdx].systemPrompt,
                      `prompt_${selectedPromptIdx}`
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-400/20 shrink-0"
                >
                  {copiedKey === `prompt_${selectedPromptIdx}` ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Prompt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Pre Box */}
              <div className="relative">
                <pre className="p-4 bg-[#0C0E12] rounded-2xl text-xs font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto border border-white/[0.06]">
                  {AGENT_PROMPTS[selectedPromptIdx].systemPrompt}
                </pre>
              </div>

              {/* Quick Execution Tip */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">How to use this with Hermes:</span>
                  <p className="mt-0.5">
                    Paste this into your Hermes system instructions or <code className="text-emerald-300">system_prompt</code> parameter. When you ask Hermes <em>"Audit my competitor at mysite.io"</em>, it will immediately invoke <code className="text-emerald-300">site_audit</code> and reason through the ranking factors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: TOOL PLAYGROUND (WITH PROMINENT KEY CARD)                    */}
        {/* =================================================================== */}
        {activeTab === 'playground' && (
          <div className="space-y-7">
            {/* Hero: image is the plane, brand is the signal */}
            <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] min-h-[320px] sm:min-h-[380px]">
              <img
                src="/images/playground-banner.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="eager"
              />
              <div className="absolute inset-0 bg-[#0C0E12]/55 sm:bg-[#0C0E12]/40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0C0E12] via-[#0C0E12]/92 to-transparent w-full sm:w-[72%]" />

              <div className="relative px-6 py-10 sm:px-10 sm:py-14 max-w-xl">
                <p className="rise-in font-display text-[2.5rem] sm:text-5xl font-black tracking-tight text-white leading-[1.05]">
                  OpenSEO-Lite
                </p>
                <h2 className="rise-in rise-in-delay-1 mt-4 text-[1.05rem] sm:text-xl text-slate-100 font-medium leading-snug max-w-md">
                  Check rankings. Audit a page. See if AI mentions your brand.
                </h2>
                <p className="rise-in rise-in-delay-2 mt-3 text-[15px] text-slate-400 leading-relaxed max-w-sm">
                  Four tools for Claude, Cursor, or Hermes. No Docker. No database. Just pip install.
                </p>
                <div className="rise-in rise-in-delay-3 mt-7 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      setSelectedTool('site_audit');
                      document.getElementById('skill-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-5 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[13px] font-bold transition-colors"
                  >
                    Run a site audit
                  </button>
                  <button
                    onClick={() => setActiveTab('connect')}
                    className="px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-slate-100 text-[13px] font-semibold transition-colors"
                  >
                    Connect your agent
                  </button>
                </div>
              </div>
            </section>

            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-white">Tools</h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Pick one, paste a URL or keyword, get JSON back.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('docs')}
                className="hidden sm:inline text-[12px] text-slate-500 hover:text-emerald-400 transition-colors"
              >
                How it works →
              </button>
            </div>

            {/* Skill picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                onClick={() => setSelectedTool('site_audit')}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  selectedTool === 'site_audit'
                    ? 'bg-white/[0.06] border-emerald-400/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400 mb-3" />
                <h3 className="font-display font-bold text-sm text-white">Site audit</h3>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  Score plus the next fixes to make.
                </p>
              </button>

              <button
                onClick={() => setSelectedTool('serp_search')}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  selectedTool === 'serp_search'
                    ? 'bg-white/[0.06] border-emerald-400/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]'
                }`}
              >
                <Search className="w-4 h-4 text-teal-400 mb-3" />
                <h3 className="font-display font-bold text-sm text-white">SERP search</h3>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  Who ranks for a keyword right now.
                </p>
              </button>

              <button
                onClick={() => setSelectedTool('page_audit')}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  selectedTool === 'page_audit'
                    ? 'bg-white/[0.06] border-emerald-400/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]'
                }`}
              >
                <FileSearch className="w-4 h-4 text-slate-300 mb-3" />
                <h3 className="font-display font-bold text-sm text-white">Page audit</h3>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  Titles, headings, links, thin copy.
                </p>
              </button>

              <button
                onClick={() => setSelectedTool('ai_visibility_check')}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  selectedTool === 'ai_visibility_check'
                    ? 'bg-white/[0.06] border-emerald-400/50'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]'
                }`}
              >
                <Radar className="w-4 h-4 text-amber-400 mb-3" />
                <h3 className="font-display font-bold text-sm text-white">AI visibility</h3>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  Brand mentions and citations.
                </p>
              </button>
            </div>

            {/* Interactive Workspace Box */}
            <div id="skill-workspace" className="bg-[#12151B] border border-white/[0.08] rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
              {/* Inline Key Configuration Box */}
              {selectedTool === 'site_audit' && (
                <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          Where is your API Key configured?
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          {customApiKey ? 'Connected' : 'Free Default'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {customApiKey
                          ? `Currently set to ${customProvider.toUpperCase()} (${customModel}). Saved safely via Zustand local storage.`
                          : 'You can paste your OpenRouter or NVIDIA key directly here, or set OPENROUTER_API_KEY in terminal.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsKeyModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{customApiKey ? 'Change Key' : 'Paste Key Here'}</span>
                    </button>
                    {customApiKey && (
                      <button
                        onClick={clearKey}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-rose-300 text-xs transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TOOL: Full Site Audit */}
              {selectedTool === 'site_audit' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      <span>Live Demo</span>
                      <span>·</span>
                      <span>Skill: site_audit</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mt-1">
                      Audit a website and get simple fixes
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter any web page. The agent will read its structure, grade it out of 100, and give you 3 clear recommendations.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="url"
                        value={auditUrl}
                        onChange={(e) => setAuditUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleRunSiteAudit}
                      disabled={loading || !auditUrl}
                      className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-400/10 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Auditing website...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Run Audit</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Audit Results */}
                  {siteAuditResult && (
                    <div className="space-y-6 pt-6 border-t border-white/[0.08]">
                      {/* Export Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">Export Audit Report:</span>
                          <span className="text-[11px] text-slate-400">Save for clients or offline review</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const jsonStr = JSON.stringify(siteAuditResult, null, 2);
                              const blob = new Blob([jsonStr], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `openseo_audit_${new URL(siteAuditResult.url).hostname}.json`;
                              a.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Export JSON</span>
                          </button>

                          <button
                            onClick={() => {
                              const md = `# OpenSEO-Lite Audit Report\n**Target URL:** ${siteAuditResult.url}\n**Health Score:** ${siteAuditResult.seo_score}/100\n\n## AI Strategic Advice\n${siteAuditResult.ai_summary}\n\n## Estimated CWV (heuristic — not live CrUX)\n- LCP: ${siteAuditResult.crux?.lcp || 'N/A'}\n- FID: ${siteAuditResult.crux?.fid || 'N/A'}\n- CLS: ${siteAuditResult.crux?.cls || 'N/A'}\n\n## Suggested Topics (heuristic — not live ranks)\n${(siteAuditResult.striking_distance_keywords || []).map((k: any) => `- **${k.keyword}** (Est. #${k.estimated_position}): ${k.opportunity}`).join('\n')}\n\n## Issues Found\n${siteAuditResult.issues.map((i: any) => `- [${i.severity.toUpperCase()}] ${i.description}\n  Fix: ${i.recommendation}`).join('\n')}\n`;
                              const blob = new Blob([md], { type: 'text/markdown' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `openseo_audit_${new URL(siteAuditResult.url).hostname}.md`;
                              a.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5 text-teal-400" />
                            <span>Export Markdown (.md)</span>
                          </button>

                          <button
                            onClick={() => {
                              const cleanAiSummary = siteAuditResult.ai_summary
                                .replace(/\*\*(.*?)\*\*/g, '$1')
                                .replace(/\*(.*?)\*/g, '$1')
                                .replace(/`/g, '');
                              const txt = `OPENSEO-LITE AUDIT REPORT\n========================================\nTarget URL: ${siteAuditResult.url}\nSEO Health Score: ${siteAuditResult.seo_score}/100\n\nEXECUTIVE AI STRATEGIC ADVICE\n----------------------------------------\n${cleanAiSummary}\n\nCORE WEB VITALS (CrUX)\n----------------------------------------\nLCP: ${siteAuditResult.crux?.lcp || 'N/A'} (${siteAuditResult.crux?.lcp_rating || 'N/A'})\nFID: ${siteAuditResult.crux?.fid || 'N/A'} (${siteAuditResult.crux?.fid_rating || 'N/A'})\nCLS: ${siteAuditResult.crux?.cls || 'N/A'} (${siteAuditResult.crux?.cls_rating || 'N/A'})\nStatus: ${siteAuditResult.crux?.status || 'N/A'}\n\nSTRIKING DISTANCE KEYWORDS (PAGE 2 QUICK WINS)\n----------------------------------------\n${(siteAuditResult.striking_distance_keywords || []).map((k: any, idx: number) => `${idx + 1}. ${k.keyword} [Est. Rank #${k.estimated_position}]\n   Action: ${k.opportunity}`).join('\n\n')}\n\nIDENTIFIED OPPORTUNITIES (${siteAuditResult.issues.length})\n----------------------------------------\n${siteAuditResult.issues.map((i: any, idx: number) => `${idx + 1}. [${i.severity.toUpperCase()}] ${i.description}\n   Fix: ${i.recommendation}`).join('\n\n')}\n`;
                              const blob = new Blob([txt], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `openseo_audit_${new URL(siteAuditResult.url).hostname}.txt`;
                              a.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-400/10 hover:bg-emerald-400/20 text-xs font-semibold text-emerald-300 border border-emerald-400/30 transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Export Plain Text (.txt)</span>
                          </button>
                        </div>
                      </div>

                      {/* Big Score Card */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                          <span className="text-xs text-slate-400 font-medium">SEO Health Score</span>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span
                              className={`font-display text-5xl font-black ${
                                siteAuditResult.seo_score >= 80
                                  ? 'text-emerald-400'
                                  : siteAuditResult.seo_score >= 60
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {siteAuditResult.seo_score}
                            </span>
                            <span className="text-slate-500 text-base font-semibold">/ 100</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2">
                            {siteAuditResult.seo_score >= 80
                              ? 'Looking healthy! Just a few small tweaks.'
                              : siteAuditResult.seo_score >= 60
                              ? 'Average. Follow the top 3 fixes below.'
                              : 'Needs attention to rank well on Google.'}
                          </p>
                        </div>

                        <div className="sm:col-span-2 p-5 rounded-2xl bg-emerald-400/[0.03] border border-emerald-400/20 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Strategic Advice
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {customApiKey ? `Powered by ${customProvider.toUpperCase()}` : 'Default SEO Expert'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 mt-2 whitespace-pre-line leading-relaxed font-sans">
                              {siteAuditResult.ai_summary}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Estimated CWV Card */}
                      {siteAuditResult.crux && (
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                              Estimated CWV (heuristic — not live CrUX)
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                siteAuditResult.crux.status === 'PASS'
                                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              }`}
                            >
                              {siteAuditResult.crux.status === 'PASS' ? 'Looks OK (estimate)' : 'Needs Review (estimate)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {siteAuditResult.crux.note || 'Estimated from page weight heuristics — not Chrome UX Report field data.'}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="p-3 bg-[#0C0E12] rounded-xl border border-white/[0.06]">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>LCP (Largest Paint)</span>
                                <span className={`text-[10px] font-bold uppercase ${siteAuditResult.crux.lcp_rating === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {siteAuditResult.crux.lcp_rating}
                                </span>
                              </div>
                              <p className="font-display text-xl font-bold text-white mt-1">
                                {siteAuditResult.crux.lcp}
                              </p>
                              <span className="text-[10px] text-slate-500">Google Goal: &lt; 2.5s</span>
                            </div>

                            <div className="p-3 bg-[#0C0E12] rounded-xl border border-white/[0.06]">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>FID / INP (Latency)</span>
                                <span className={`text-[10px] font-bold uppercase ${siteAuditResult.crux.fid_rating === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {siteAuditResult.crux.fid_rating}
                                </span>
                              </div>
                              <p className="font-display text-xl font-bold text-white mt-1">
                                {siteAuditResult.crux.fid}
                              </p>
                              <span className="text-[10px] text-slate-500">Google Goal: &lt; 100ms</span>
                            </div>

                            <div className="p-3 bg-[#0C0E12] rounded-xl border border-white/[0.06]">
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>CLS (Layout Shift)</span>
                                <span className={`text-[10px] font-bold uppercase ${siteAuditResult.crux.cls_rating === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {siteAuditResult.crux.cls_rating}
                                </span>
                              </div>
                              <p className="font-display text-xl font-bold text-white mt-1">
                                {siteAuditResult.crux.cls}
                              </p>
                              <span className="text-[10px] text-slate-500">Google Goal: &lt; 0.1</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Suggested Topics (heuristic) */}
                      {siteAuditResult.striking_distance_keywords && siteAuditResult.striking_distance_keywords.length > 0 && (
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-teal-950/10 border border-emerald-500/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                <Zap className="w-3.5 h-3.5" />
                                Suggested Topics (heuristic — not live ranks)
                              </span>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Inferred from title/headings for brainstorming — not verified SERP positions #11–20.
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-950 bg-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                              Heuristic
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {siteAuditResult.striking_distance_keywords.map((kw: any, kIdx: number) => (
                              <div
                                key={kIdx}
                                className="p-3.5 rounded-xl bg-[#0C0E12] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-white">{kw.keyword}</span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                      Est. #{kw.estimated_position}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">{kw.opportunity}</p>
                                </div>

                                <button
                                  onClick={() => {
                                    setSerpKeyword(kw.keyword);
                                    setSelectedTool('serp_search');
                                  }}
                                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 shrink-0"
                                >
                                  <span>Inspect SERP</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Issues list */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                          Identified Opportunities ({siteAuditResult.issues?.length || 0})
                        </h4>
                        <div className="space-y-2">
                          {siteAuditResult.issues?.map((iss: any, idx: number) => {
                            const isHigh = iss.severity === 'high';
                            const isMed = iss.severity === 'medium';
                            const isSecurity = iss.description?.includes('SECURITY_BLOCK') || iss.description?.includes('SSRF');
                            return (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                                  isSecurity
                                    ? 'bg-rose-500/10 border-rose-500/30'
                                    : 'bg-white/[0.02] border-white/[0.06]'
                                }`}
                              >
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${
                                    isSecurity || isHigh
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : isMed
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                  }`}
                                >
                                  {isSecurity ? 'OWASP BLOCK' : iss.severity}
                                </span>
                                <div className="text-xs">
                                  <p className="font-semibold text-slate-200">{iss.description}</p>
                                  {iss.recommendation && (
                                    <p className="text-slate-400 mt-1">
                                      <span className="text-emerald-400 font-medium">How to fix:</span>{' '}
                                      {iss.recommendation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL: Google Rank Search */}
              {selectedTool === 'serp_search' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
                      <span>Live Demo</span>
                      <span>·</span>
                      <span>Skill: serp_search</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mt-1">
                      Check Google search rankings
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      See the actual organic results Google shows for your target keywords. No ads, just top ranking content.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3 relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={serpKeyword}
                        onChange={(e) => setSerpKeyword(e.target.value)}
                        placeholder="Keyword to search..."
                        className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={serpLocation}
                        onChange={(e) => setSerpLocation(e.target.value)}
                        placeholder="Location (e.g. us, uk)"
                        className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-400 uppercase font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRunSerp}
                    disabled={loading || !serpKeyword}
                    className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-teal-400/10 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching Google...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search Rankings</span>
                      </>
                    )}
                  </button>

                  {/* Serp Results */}
                  {serpResult && (
                    <div className="space-y-4 pt-6 border-t border-white/[0.08]">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Top Results for "{serpResult.keyword}"</span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(serpResult, null, 2), 'serp_json')}
                          className="hover:text-teal-400 flex items-center gap-1 font-mono"
                        >
                          {copiedKey === 'serp_json' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy JSON
                        </button>
                      </div>

                      <div className="space-y-3">
                        {serpResult.results?.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-lg bg-teal-400/10 text-teal-400 text-xs font-bold flex items-center justify-center shrink-0">
                                #{item.position}
                              </span>
                              <div>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-semibold text-teal-300 hover:underline flex items-center gap-1.5"
                                >
                                  {item.title}
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-xl">
                                  {item.url}
                                </p>
                                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                                  {item.snippet}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL: Page Inspection */}
              {selectedTool === 'page_audit' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      <span>Live Demo</span>
                      <span>·</span>
                      <span>Skill: page_audit</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mt-1">
                      Look under the hood of any page
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Check your headlines, page title length, internal links, and word count.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="url"
                        value={auditUrl}
                        onChange={(e) => setAuditUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <button
                      onClick={handleRunPageAudit}
                      disabled={loading || !auditUrl}
                      className="px-6 py-2.5 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-400/10 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <FileSearch className="w-4 h-4" />
                          <span>Inspect Page</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pageAuditResult && (
                    <div className="space-y-5 pt-6 border-t border-white/[0.08]">
                      {/* Metric cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                          <span className="text-[11px] text-slate-400">Total Words</span>
                          <p className="font-display text-2xl font-bold text-white mt-1">
                            {pageAuditResult.word_count}
                          </p>
                        </div>
                        <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                          <span className="text-[11px] text-slate-400">H1 Titles</span>
                          <p className="font-display text-2xl font-bold text-white mt-1">
                            {pageAuditResult.headings?.h1?.length || 0}
                          </p>
                        </div>
                        <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                          <span className="text-[11px] text-slate-400">Internal Links</span>
                          <p className="font-display text-2xl font-bold text-white mt-1">
                            {pageAuditResult.internal_links?.length || 0}
                          </p>
                        </div>
                        <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                          <span className="text-[11px] text-slate-400">External Links</span>
                          <p className="font-display text-2xl font-bold text-white mt-1">
                            {pageAuditResult.external_links?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* Page metadata */}
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <span className="text-[11px] text-slate-400 block font-medium">Page Title</span>
                          <p className="text-sm font-semibold text-white mt-1">
                            {pageAuditResult.title || 'No title tag found'}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Meta Description
                          </span>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {pageAuditResult.meta_description || 'No description found'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TOOL: AI Visibility */}
              {selectedTool === 'ai_visibility_check' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      <span>Live Demo</span>
                      <span>·</span>
                      <span>Skill: ai_visibility_check</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mt-1">
                      Check brand visibility in AI answers
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Demo mode returns labeled fixtures so agents can practice the schema. Use the Python CLI with <code className="text-amber-300">--live</code> for SERP probes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={visibilityBrand}
                      onChange={(e) => setVisibilityBrand(e.target.value)}
                      placeholder="Brand name"
                      className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      value={visibilityDomain}
                      onChange={(e) => setVisibilityDomain(e.target.value)}
                      placeholder="example.com"
                      className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    onClick={handleRunAiVisibility}
                    disabled={loading || !visibilityBrand.trim() || !visibilityDomain.trim()}
                    className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/10 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <Radar className="w-4 h-4" />
                        <span>Run AI Visibility Check</span>
                      </>
                    )}
                  </button>

                  {visibilityResult && (
                    <div className="space-y-5 pt-6 border-t border-white/[0.08]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                          <span className="text-xs text-slate-400 font-medium">Visibility Score</span>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="font-display text-5xl font-black text-amber-400">
                              {visibilityResult.visibility_score}
                            </span>
                            <span className="text-slate-500 text-base font-semibold">/ 100</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2 uppercase tracking-wider">
                            Mode: {visibilityResult.mode}
                          </p>
                        </div>
                        <div className="sm:col-span-2 p-5 rounded-2xl bg-amber-400/[0.03] border border-amber-400/20">
                          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Summary
                          </span>
                          <div className="text-xs text-slate-200 mt-2 whitespace-pre-line leading-relaxed">
                            {visibilityResult.ai_summary}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(visibilityResult.results || []).map((row: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-[#0C0E12] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <p className="text-xs font-semibold text-white">{row.query}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{row.snippet}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${row.mentioned ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                                {row.mentioned ? 'Mentioned' : 'Not mentioned'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${row.cited_url ? 'bg-teal-400/20 text-teal-300' : 'bg-slate-700 text-slate-300'}`}>
                                {row.cited_url ? 'Cited' : 'No cite'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: FREE MODELS & WHERE TO ADD KEY GUIDE                         */}
        {/* =================================================================== */}
        {activeTab === 'free_keys' && (
          <div className="space-y-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Where to add your OpenRouter or NVIDIA NIM Key
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                You can add your key in <strong>two places</strong> depending on whether you're using this web UI or running the Python agent in your terminal.
              </p>
            </div>

            {/* The 2 Ways to Add Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WAY 1: IN THIS WEB UI */}
              <div className="p-6 rounded-3xl bg-[#12151B] border border-emerald-400/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-white">In This Web Interface</h3>
                      <p className="text-[11px] text-emerald-400">Saved in Zustand local storage</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-950 bg-emerald-400 px-2.5 py-1 rounded-full">
                    Fastest
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Click the <strong>"Enter API Key"</strong> button at the top right of this screen or the button below. Paste your key once, and it will be saved in your browser for all your site audits.
                </p>

                <div className="p-4 bg-[#0C0E12] rounded-2xl border border-white/[0.06] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Current Status:</span>
                    <span className="font-bold text-emerald-400">
                      {customApiKey ? 'Key is Connected' : 'No Key Set (Using Free Default)'}
                    </span>
                  </div>
                  {customApiKey && (
                    <div className="text-[11px] text-slate-400">
                      Provider: <code className="text-emerald-300">{customProvider.toUpperCase()}</code> · Model: <code className="text-emerald-300">{customModel}</code>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-400/10"
                >
                  <Key className="w-4 h-4" />
                  <span>Open API Key Setup Window</span>
                </button>
              </div>

              {/* WAY 2: IN YOUR PYTHON ENVIRONMENT */}
              <div className="p-6 rounded-3xl bg-[#12151B] border border-teal-400/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-400/10 text-teal-400 flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-white">In Your Terminal (MCP Server)</h3>
                      <p className="text-[11px] text-teal-400">For Claude, Cursor, Hermes</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-950 bg-teal-400 px-2.5 py-1 rounded-full">
                    For AI Agents
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  If you are connecting Claude Desktop, Cursor, or Hermes via <code className="text-teal-300">mcp_server.py</code>, set the key as an environment variable in your terminal before starting:
                </p>

                <div className="relative">
                  <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-teal-300 border border-white/[0.08] overflow-x-auto">
{`# For OpenRouter (Free models)
export OPENROUTER_API_KEY="sk-or-v1-..."
export LLM_PROVIDER="openrouter"
export LLM_MODEL="meta-llama/llama-3.3-70b-instruct:free"

# For NVIDIA NIM (Free cloud credits)
export NVIDIA_API_KEY="nvapi-..."
export LLM_PROVIDER="nvidia"`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'export OPENROUTER_API_KEY="sk-or-v1-..."\nexport LLM_PROVIDER="openrouter"\nexport LLM_MODEL="meta-llama/llama-3.3-70b-instruct:free"',
                        'env_both'
                      )
                    }
                    className="absolute right-2 top-2 text-slate-400 hover:text-white p-1 rounded bg-slate-800"
                  >
                    {copiedKey === 'env_both' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Where to get free keys */}
            <div className="p-6 rounded-3xl bg-[#12151B] border border-white/[0.08] space-y-4">
              <h3 className="font-display font-bold text-lg text-white">
                Need a free key? Get one here:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-2xl bg-[#0C0E12] border border-white/[0.06] hover:border-emerald-400/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">OpenRouter Keys (Free)</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No credit card required. Free models end in <code className="text-emerald-300">:free</code>.
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </a>

                <a
                  href="https://build.nvidia.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 rounded-2xl bg-[#0C0E12] border border-white/[0.06] hover:border-teal-400/40 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-teal-400 block">NVIDIA NIM Portal</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Instant 1,000 API calls free on signup for Llama 3 70B & Nemotron.
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONNECT AI (HERMES, GROK, OPENROUTER, CLAUDE, CURSOR)        */}
        {/* =================================================================== */}
        {activeTab === 'connect' && (
          <div className="space-y-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Connect your favorite AI agent in 60 seconds
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                OpenSEO-Lite uses the open standard <strong>Model Context Protocol (MCP)</strong>. Click on your AI tool below to see the exact setup steps written in plain English.
              </p>
            </div>

            {/* Agent Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              <button
                onClick={() => setSelectedAgent('hermes')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedAgent === 'hermes'
                    ? 'bg-white/[0.06] border-emerald-400/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center mb-2">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-display font-bold text-xs text-white">Hermes</h4>
                <p className="text-[10px] text-slate-400">Local Agent</p>
              </button>

              <button
                onClick={() => setSelectedAgent('grok')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedAgent === 'grok'
                    ? 'bg-white/[0.06] border-emerald-400/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center mb-2">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-display font-bold text-xs text-white">Grok Bot</h4>
                <p className="text-[10px] text-slate-400">xAI Script</p>
              </button>

              <button
                onClick={() => setSelectedAgent('openrouter')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedAgent === 'openrouter'
                    ? 'bg-white/[0.06] border-emerald-400/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center mb-2 font-bold text-xs">
                  OR
                </div>
                <h4 className="font-display font-bold text-xs text-white">OpenRouter</h4>
                <p className="text-[10px] text-emerald-400 font-medium">Free Models</p>
              </button>

              <button
                onClick={() => setSelectedAgent('nvidia')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedAgent === 'nvidia'
                    ? 'bg-white/[0.06] border-emerald-400/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-teal-400/10 text-teal-400 flex items-center justify-center mb-2 font-bold text-xs">
                  NV
                </div>
                <h4 className="font-display font-bold text-xs text-white">NVIDIA NIM</h4>
                <p className="text-[10px] text-teal-400 font-medium">Fast Llama 3</p>
              </button>

              <button
                onClick={() => setSelectedAgent('claude')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedAgent === 'claude'
                    ? 'bg-white/[0.06] border-emerald-400/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-2">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-display font-bold text-xs text-white">Claude</h4>
                <p className="text-[10px] text-slate-400">Desktop MCP</p>
              </button>

              <button
                onClick={() => setSelectedAgent('cursor')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedAgent === 'cursor'
                    ? 'bg-white/[0.06] border-emerald-400/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center mb-2">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-display font-bold text-xs text-white">Cursor</h4>
                <p className="text-[10px] text-slate-400">Code Editor</p>
              </button>
            </div>

            {/* Connection Detail Box */}
            <div className="bg-[#12151B] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6">
              {/* HERMES AGENT GUIDE */}
              {selectedAgent === 'hermes' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Connect with Hermes Agent
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hermes is the open-source reasoning model built for agent tasks. Here is the easiest way to hook it up.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-400">Local or Cloud</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 mb-1.5">
                        Step 1: Start OpenSEO-Lite in network mode
                      </p>
                      <div className="relative">
                        <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-indigo-300 border border-white/[0.08] overflow-x-auto">
                          python mcp_server.py --transport sse --port 8000
                        </pre>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'python mcp_server.py --transport sse --port 8000',
                              'hermes_cmd'
                            )
                          }
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'hermes_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-200 mb-1.5">
                        Step 2: Add this to your Hermes configuration
                      </p>
                      <div className="relative">
                        <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-slate-300 border border-white/[0.08] overflow-x-auto">
{`mcp_servers:
  - name: openseo-lite
    url: http://localhost:8000/sse`}
                        </pre>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'mcp_servers:\n  - name: openseo-lite\n    url: http://localhost:8000/sse',
                              'hermes_cfg'
                            )
                          }
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'hermes_cfg' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                      <button
                        onClick={() => setActiveTab('agent_prompts')}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                      >
                        <MessageSquareCode className="w-3.5 h-3.5" />
                        <span>View Hermes Agent System Prompt →</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GROK BOT / XAI GUIDE */}
              {selectedAgent === 'grok' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Connect with Grok Bot (xAI)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Hook up Grok bots or your custom xAI API script with OpenSEO skills.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-cyan-400">Python Tools</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 mb-1.5">
                        Import directly into your Grok bot script
                      </p>
                      <div className="relative">
                        <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-cyan-300 border border-white/[0.08] overflow-x-auto">
{`from skills import serp_search, page_audit, site_audit

# Example: Ask Grok to audit a site
audit_data = await site_audit("https://yourwebsite.com")
print(audit_data["seo_score"])     # e.g. 85
print(audit_data["ai_summary"])    # Top 3 actions`}
                        </pre>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'from skills import serp_search, page_audit, site_audit\n\naudit_data = await site_audit("https://yourwebsite.com")\nprint(audit_data["seo_score"])',
                              'grok_code'
                            )
                          }
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'grok_code' ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OPENROUTER FREE GUIDE */}
              {selectedAgent === 'openrouter' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Connect with OpenRouter (Free Models)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Run OpenSEO-Lite with Meta Llama 3.3 70B, Mistral, or Qwen at $0 cost.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">100% Free</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 mb-1.5">
                        Set environment variables in your terminal:
                      </p>
                      <div className="relative">
                        <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-emerald-300 border border-white/[0.08] overflow-x-auto">
{`export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
export LLM_PROVIDER="openrouter"
export LLM_MODEL="meta-llama/llama-3.3-70b-instruct:free"

# Start OpenSEO server
python mcp_server.py`}
                        </pre>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'export OPENROUTER_API_KEY="sk-or-v1-..."\nexport LLM_PROVIDER="openrouter"\nexport LLM_MODEL="meta-llama/llama-3.3-70b-instruct:free"\npython mcp_server.py',
                              'openrouter_copy'
                            )
                          }
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'openrouter_copy' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NVIDIA NIM GUIDE */}
              {selectedAgent === 'nvidia' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Connect with NVIDIA NIM
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Take advantage of free NVIDIA cloud inference credits for Llama 3.1 70B.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-teal-400">NVIDIA DGX Cloud</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 mb-1.5">
                        Set environment variables in your terminal:
                      </p>
                      <div className="relative">
                        <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-teal-300 border border-white/[0.08] overflow-x-auto">
{`export NVIDIA_API_KEY="nvapi-your-key-here"
export LLM_PROVIDER="nvidia"
export LLM_MODEL="meta/llama-3.1-70b-instruct"

# Start OpenSEO server
python mcp_server.py`}
                        </pre>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'export NVIDIA_API_KEY="nvapi-..."\nexport LLM_PROVIDER="nvidia"\nexport LLM_MODEL="meta/llama-3.1-70b-instruct"\npython mcp_server.py',
                              'nvidia_copy'
                            )
                          }
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'nvidia_copy' ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CLAUDE DESKTOP GUIDE */}
              {selectedAgent === 'claude' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Connect with Claude Desktop
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add OpenSEO-Lite tools to your official Claude app on Mac or Windows.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-400">Desktop MCP</span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-slate-300">
                      Open your Claude Desktop config file (located at <code className="text-amber-300">~/Library/Application Support/Claude/claude_desktop_config.json</code> on Mac):
                    </p>
                    <div className="relative">
                      <pre className="p-3.5 bg-[#0C0E12] rounded-xl text-xs font-mono text-amber-200 border border-white/[0.08] overflow-x-auto">
{`{
  "mcpServers": {
    "openseo-lite": {
      "command": "python",
      "args": ["/ABSOLUTE/PATH/TO/openseo-lite/mcp_server.py"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-..."
      }
    }
  }
}`}
                      </pre>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            '{\n  "mcpServers": {\n    "openseo-lite": {\n      "command": "python",\n      "args": ["/ABSOLUTE/PATH/TO/openseo-lite/mcp_server.py"]\n    }\n  }\n}',
                            'claude_json'
                          )
                        }
                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'claude_json' ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CURSOR GUIDE */}
              {selectedAgent === 'cursor' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">
                        Connect with Cursor or Windsurf
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Audit websites directly from your editor while you write code.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-purple-400">Code Editor</span>
                  </div>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <span className="font-semibold text-white block mb-1">In Cursor:</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400">
                        <li>Press <code className="text-purple-300">Cmd + Shift + J</code> to open Settings.</li>
                        <li>Click <strong>Features → MCP → + Add New MCP Server</strong>.</li>
                        <li>Select <strong>command</strong> and enter: <code className="text-purple-300">python /path/to/openseo-lite/mcp_server.py</code></li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CLEAN CODE VIEWER                                            */}
        {/* =================================================================== */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">
                  Clean, production-ready Python codebase
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Supports OpenRouter (free models), NVIDIA NIM, OpenAI, FastMCP, and browser-use.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(currentFile?.content || '', 'code_copy')}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'code_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy This File</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* File list */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-2 mb-2">
                  Files ({files.length})
                </span>
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveFile(file.path)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                      activeFile === file.path
                        ? 'bg-emerald-400/10 text-emerald-300 font-semibold border border-emerald-400/20'
                        : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{file.path}</span>
                    {activeFile === file.path && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Code window */}
              <div className="md:col-span-3 bg-[#12151B] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs">
                  <span className="font-mono text-emerald-400 font-semibold">{activeFile}</span>
                  <span className="text-slate-500 font-mono">Python 3.11+</span>
                </div>
                <pre className="p-4 bg-[#0C0E12] rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-[550px] border border-white/[0.06] leading-relaxed">
                  {currentFile?.content || 'Loading file...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: SIMPLE GUIDE (NO JARGON)                                     */}
        {/* =================================================================== */}
        {activeTab === 'docs' && (
          <div className="space-y-8 max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]">
              <img
                src="/images/hero-banner.jpg"
                alt="OpenSEO-Lite MCP network visualization"
                className="w-full h-44 sm:h-56 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E12] via-[#0C0E12]/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 sm:p-8 max-w-xl">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  How it works
                </h2>
                <p className="text-[15px] text-slate-300 mt-2 leading-relaxed">
                  Ask in plain English. The agent calls a tool. You get a score and a short list of fixes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#12151B] border border-white/[0.08] space-y-2">
                <span className="text-2xl font-bold font-display text-emerald-400">1</span>
                <h4 className="font-display font-bold text-white text-sm">Ask your agent anything</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In Claude, Hermes, Grok, or Cursor, simply type: <em>"Check my competitor's rankings for keyword X"</em> or <em>"Audit my homepage"</em>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#12151B] border border-white/[0.08] space-y-2">
                <span className="text-2xl font-bold font-display text-teal-400">2</span>
                <h4 className="font-display font-bold text-white text-sm">Browser visits the web</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The tool opens a lightweight local browser via <code>browser-use</code>, grabs the live web data, and filters out ads and noise.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#12151B] border border-white/[0.08] space-y-2">
                <span className="text-2xl font-bold font-display text-indigo-400">3</span>
                <h4 className="font-display font-bold text-white text-sm">Clear recommendations</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instead of confusing graphs, you get your top 3 prioritized action items to get more visitors from Google.
                </p>
              </div>
            </div>

            {/* Common questions */}
            <div className="bg-[#12151B] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="font-display text-lg font-bold text-white">
                Frequently Asked Questions
              </h3>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200">Where do I paste my API key?</p>
                  <p className="text-slate-400 leading-relaxed">
                    Simply click the <strong>"Add API Key"</strong> button in the top right or the <strong>"Enter API Key (1-Click)"</strong> banner above. Keys are stored securely in Zustand local storage.
                  </p>
                </div>

                <div className="space-y-1 border-t border-white/[0.06] pt-4">
                  <p className="font-semibold text-slate-200">Can I use free models with OpenRouter or NVIDIA?</p>
                  <p className="text-slate-400 leading-relaxed">
                    Yes! You can plug in your OpenRouter API key and select any model ending in <code className="text-emerald-300">:free</code> (like <code className="text-emerald-300">meta-llama/llama-3.3-70b-instruct:free</code>) or use NVIDIA NIM's free signup credits.
                  </p>
                </div>

                <div className="space-y-1 border-t border-white/[0.06] pt-4">
                  <p className="font-semibold text-slate-200">Do I need Docker or a database?</p>
                  <p className="text-slate-400 leading-relaxed">
                    No! There is zero database, zero Docker containers, and no complex setup. Just standard Python with <code className="text-emerald-400">pip install -r requirements.txt</code>.
                  </p>
                </div>

                <div className="space-y-1 border-t border-white/[0.06] pt-4">
                  <p className="font-semibold text-slate-200">Is CrUX / striking distance real field data?</p>
                  <p className="text-slate-400 leading-relaxed">
                    No — those sections are <strong>honest heuristics</strong> labeled as estimates. Real Chrome UX Report and live #11–20 ranks are on the roadmap. AI Visibility demo mode is likewise labeled fixtures unless you run the Python CLI with <code className="text-emerald-300">--live</code>.
                  </p>
                </div>

                <div className="space-y-1 border-t border-white/[0.06] pt-4">
                  <p className="font-semibold text-slate-200">How is this protected against security issues and strikes?</p>
                  <p className="text-slate-400 leading-relaxed">
                    We implement OWASP Top 10 defenses (A10 SSRF protection against loopbacks & metadata services, nosniff headers, XSS sanitization) and adhere to ethical crawl rate limits. See our <button onClick={() => setActiveTab('policy')} className="text-emerald-400 underline">Policy & OWASP page</button>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 1-CLICK API KEY MODAL DIALOG (ZUSTAND STORE POWERED)                */}
      {/* =================================================================== */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12151B] border border-white/[0.1] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Enter Your AI Key
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Use free models through OpenRouter or NVIDIA NIM
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/[0.05]"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Choose Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleProviderPresetChange('openrouter')}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                      customProvider === 'openrouter'
                        ? 'bg-emerald-400/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#0C0E12] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-bold">OpenRouter</span>
                    <span className="text-[10px] text-emerald-400">100% Free Models</span>
                  </button>

                  <button
                    onClick={() => handleProviderPresetChange('nvidia')}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                      customProvider === 'nvidia'
                        ? 'bg-teal-400/20 border-teal-400 text-teal-300'
                        : 'bg-[#0C0E12] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-bold">NVIDIA NIM</span>
                    <span className="text-[10px] text-teal-400">DGX Cloud</span>
                  </button>

                  <button
                    onClick={() => handleProviderPresetChange('openai')}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                      customProvider === 'openai'
                        ? 'bg-indigo-400/20 border-indigo-400 text-indigo-300'
                        : 'bg-[#0C0E12] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-bold">OpenAI</span>
                    <span className="text-[10px] text-indigo-300">gpt-4o-mini</span>
                  </button>
                </div>
              </div>

              {/* Paste Key Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    2. Paste Your API Key
                  </label>
                  <a
                    href={
                      customProvider === 'openrouter'
                        ? 'https://openrouter.ai/keys'
                        : customProvider === 'nvidia'
                        ? 'https://build.nvidia.com/'
                        : 'https://platform.openai.com/api-keys'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    Get free key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showKeyPassword ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder={
                      customProvider === 'openrouter'
                        ? 'sk-or-v1-...'
                        : customProvider === 'nvidia'
                        ? 'nvapi-...'
                        : 'sk-...'
                    }
                    className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showKeyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Stored securely in your local browser storage (Zustand client store).</span>
                </p>
              </div>

              {/* Model selection with curated Model List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    3. Select Model from {customProvider === 'openrouter' ? 'OpenRouter Free List' : customProvider === 'nvidia' ? 'NVIDIA NIM List' : 'OpenAI List'}
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {customProvider === 'openrouter' ? 'Free options tagged below' : 'Pre-configured'}
                  </span>
                </div>

                {/* Curated Grid of Models */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {POPULAR_MODELS[customProvider]?.map((m) => {
                    const isSelected = customModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModel(m.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-400/15 border-emerald-400/80 text-white'
                            : 'bg-[#0C0E12] border-white/[0.06] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate">{m.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                m.isFree
                                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-white/[0.06] text-slate-400'
                              }`}
                            >
                              {m.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                            {m.id}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.context}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mt-1"></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Model ID Fallback Input */}
                <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-200 text-[11px] font-medium flex items-center justify-between">
                      <span>Or type a custom model ID</span>
                      <span className="text-[10px] font-mono text-slate-500">Manual override</span>
                    </summary>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
                        className="w-full bg-[#0C0E12] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>
                  </details>
                </div>
              </div>

              {keySavedToast && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Key saved securely to Zustand local storage!</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => {
                  clearKey();
                  setTempApiKey('');
                  setIsKeyModalOpen(false);
                }}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
              >
                Clear Saved Key
              </button>

              <button
                type="button"
                onClick={() => {
                  saveKeyConfig(tempApiKey.trim(), customProvider, customModel.trim());
                  setKeySavedToast(true);
                  setTimeout(() => {
                    setKeySavedToast(false);
                    setIsKeyModalOpen(false);
                  }, 600);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-400/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Key & Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-white/[0.06] py-6 text-[12px] text-slate-500">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-slate-400">OpenSEO-Lite</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.nagacodex.cloud/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400/90 hover:text-emerald-300 transition-colors"
            >
              Naga Codex
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('policy')}
              className="hover:text-white transition-colors"
            >
              Security
            </button>
          </div>
          <p className="text-slate-600">MIT · no Docker · no database</p>
        </div>
      </footer>
    </div>
  );
}
