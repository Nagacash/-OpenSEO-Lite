/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, FileText, Globe, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAppStore } from './store';

interface PolicyPageProps {
  onBack: () => void;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ onBack }) => {
  const { acceptedPolicy, acceptPolicy, policyAcceptedAt } = useAppStore();

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Top breadcrumb & back */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to App</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            OWASP & Scraping Ethics Verified
          </span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Privacy Policy, Security & Acceptable Crawling Policy
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          OpenSEO-Lite Agent is built with strict adherence to cybersecurity standards (OWASP Top 10), data privacy, and ethical search engine automation guidelines. This policy protects users, webmasters, and agent operators from penalties or policy strikes.
        </p>
      </div>

      {/* Security Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#12151B] border border-emerald-500/20 rounded-2xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            OWASP A10: SSRF Defense
          </span>
          <p className="font-semibold text-xs text-white">Active & Enforced</p>
          <p className="text-[10px] text-slate-400">
            Blocks 127.0.0.1, AWS/GCP metadata, and RFC 1918 private subnets.
          </p>
        </div>

        <div className="p-4 bg-[#12151B] border border-emerald-500/20 rounded-2xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            Client-Side Secrets
          </span>
          <p className="font-semibold text-xs text-white">Zustand LocalStorage</p>
          <p className="text-[10px] text-slate-400">
            API keys never touch external databases or third-party loggers.
          </p>
        </div>

        <div className="p-4 bg-[#12151B] border border-emerald-500/20 rounded-2xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            Anti-Strike Ethics
          </span>
          <p className="font-semibold text-xs text-white">Crawl Rate Limiting</p>
          <p className="text-[10px] text-slate-400">
            Complies with webmaster robots guidelines; no aggressive scraping.
          </p>
        </div>

        <div className="p-4 bg-[#12151B] border border-emerald-500/20 rounded-2xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
            OWASP Security Headers
          </span>
          <p className="font-semibold text-xs text-white">Harden & Sanitize</p>
          <p className="text-[10px] text-slate-400">
            nosniff, frame-ancestors, strict referrer, and XSS sanitizers.
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-6 text-xs text-slate-300">
        {/* Section 1 */}
        <div className="p-6 bg-[#12151B] border border-white/[0.08] rounded-3xl space-y-3">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            1. Zero-Telemetry & API Key Security
          </h3>
          <p className="leading-relaxed text-slate-400">
            When you enter your OpenRouter, NVIDIA NIM, OpenAI, or Anthropic API key, it is stored exclusively in your local browser’s <code className="text-emerald-300">localStorage</code> via our <strong>Zustand client store</strong>.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
            <li>We do NOT transmit your keys to any centralized server, analytics collector, or remote database.</li>
            <li>Keys are forwarded directly through secure HTTPS headers solely to your chosen provider (e.g. OpenRouter or NVIDIA) to fulfill your explicit audit requests.</li>
            <li>You can clear your key at any time with a single click using the "Clear Saved Key" option.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="p-6 bg-[#12151B] border border-white/[0.08] rounded-3xl space-y-3">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            2. Responsible Scraping & Search Engine Automation (No Strikes)
          </h3>
          <p className="leading-relaxed text-slate-400">
            To prevent search engine rate limits, IP bans, or account strikes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
            <li><strong>User-Initiated Only:</strong> Audits and SERP queries are only executed when explicitly commanded by the user or their connected agent. No background mass scrapers or automated denial-of-service loops are allowed.</li>
            <li><strong>Polite Request Throttling:</strong> Browser-use automations include natural execution delays, standard user agents, and timeout abort signals (15-second cap) to prevent server overload.</li>
            <li><strong>No Paywalled or Protected Circumvention:</strong> OpenSEO-Lite only parses publicly accessible HTML data (titles, headings, meta tags) and public SERP snippets. It does not bypass CAPTCHAs, paywalls, or authentication barriers.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="p-6 bg-[#12151B] border border-white/[0.08] rounded-3xl space-y-3">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            3. Server-Side Request Forgery (SSRF) Protection
          </h3>
          <p className="leading-relaxed text-slate-400">
            In accordance with <strong>OWASP Top 10 (A10:2021 Server-Side Request Forgery)</strong>, our server strictly filters all audit URL inputs before dispatching requests:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
            <li>Requests targeting loopback hosts (<code className="text-amber-300">127.0.0.1</code>, <code className="text-amber-300">localhost</code>, <code className="text-amber-300">::1</code>) are blocked.</li>
            <li>Cloud provider metadata endpoints (<code className="text-amber-300">169.254.169.254</code>, <code className="text-amber-300">metadata.google.internal</code>) are blocked to protect server credentials.</li>
            <li>Private RFC 1918 subnets (<code className="text-amber-300">10.0.0.0/8</code>, <code className="text-amber-300">172.16.0.0/12</code>, <code className="text-amber-300">192.168.0.0/16</code>) are blocked.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="p-6 bg-[#12151B] border border-white/[0.08] rounded-3xl space-y-3">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            4. User Agreement & Compliance Acceptance
          </h3>
          <p className="leading-relaxed text-slate-400">
            By using OpenSEO-Lite, you agree to audit only domains you own or have explicit authorization to inspect. You agree not to abuse search engine endpoints or launch automated stress tests against third-party websites.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.06]">
            <div>
              <span className="font-semibold text-white block">Acceptance Status:</span>
              <span className="text-[11px] text-slate-400">
                {acceptedPolicy
                  ? `Accepted on ${new Date(policyAcceptedAt || Date.now()).toLocaleDateString()}`
                  : 'Pending confirmation'}
              </span>
            </div>

            <button
              onClick={acceptPolicy}
              disabled={acceptedPolicy}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                acceptedPolicy
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 cursor-default'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-md shadow-emerald-400/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{acceptedPolicy ? 'Policy Acknowledged & Active' : 'I Acknowledge & Accept Policy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
