import React, { useState, useEffect } from 'react';
import { Cpu, Copy, Check, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';

export default function MCPGuideModal() {
  const [copiedKey, setCopiedKey] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/mcp-status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error(err));
  }, []);

  const copySnippet = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const claudeConfig = JSON.stringify({
    mcpServers: {
      "cover-letter-mcp": {
        command: "node",
        args: [
          "d:\\Projects\\Automatic Cover Letter\\backend\\mcp-server.js"
        ]
      }
    }
  }, null, 2);

  const cursorConfig = JSON.stringify({
    name: "CoverLetterMCP",
    type: "command",
    command: "node d:\\Projects\\Automatic Cover Letter\\backend\\mcp-server.js"
  }, null, 2);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Model Context Protocol (MCP) Integration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                No external API keys required. Connect AntiGravity IDE, Claude Code, Cursor, or Codex directly to candidate profile.md & skills.md.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            Local MCP Server Active
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Candidate Data</span>
            <code className="text-[11px] text-indigo-300 font-mono block truncate">
              {status?.profilePath || 'profile.md'}
            </code>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">AI Humanization Rules</span>
            <code className="text-[11px] text-purple-300 font-mono block truncate">
              {status?.skillsPath || 'skills.md'}
            </code>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Exposed MCP Tools</span>
            <span className="text-xs font-semibold text-emerald-400">
              7 Registered Tools Available
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                1. AntiGravity IDE & Claude Code Setup
              </h3>
              <button
                onClick={() => copySnippet(claudeConfig, 'claude')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedKey === 'claude' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copiedKey === 'claude' ? 'Copied' : 'Copy Config'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Add this block to your local MCP settings file (e.g., <code className="text-indigo-300">claude_desktop_config.json</code> or AntiGravity MCP settings):
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto">
              {claudeConfig}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                2. Cursor / Codex Integration
              </h3>
              <button
                onClick={() => copySnippet(cursorConfig, 'cursor')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedKey === 'cursor' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copiedKey === 'cursor' ? 'Copied' : 'Copy Config'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              In Cursor Settings &gt; Features &gt; MCP Servers, click "Add new MCP server" and enter:
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-purple-200 overflow-x-auto">
              {cursorConfig}
            </pre>
          </div>

          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4">
            <h4 className="text-xs font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Separation of Candidate Data & AI Skill Rules:
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <code className="text-indigo-200 font-mono">profile.md</code> is strictly reserved for your personal work history, stack, and metrics. <code className="text-purple-200 font-mono">skills.md</code> contains the AI prompt instructions, humanization guidelines, and writing tactics. Connected local agents automatically call both tools!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
