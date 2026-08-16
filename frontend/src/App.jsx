import React, { useState, useEffect } from 'react';
import { Briefcase, User, Cpu, Sparkles, CheckCircle2, FileText, Bot } from 'lucide-react';
import JobWorkspace from './components/JobWorkspace.jsx';
import ProfileManager from './components/ProfileManager.jsx';
import MCPGuideModal from './components/MCPGuideModal.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  CoverAI
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-semibold border border-purple-500/30">
                  MCP Monorepo
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Automatic Cover Letter & Question Answerer</p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'workspace'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Job Application
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              Candidate Skill (profile.md)
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'mcp'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-4 h-4" />
              MCP & AI Setup
            </button>
          </nav>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 font-medium">{backendOnline ? 'Backend & MCP Ready' : 'Connecting Server...'}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'workspace' && <JobWorkspace />}
        {activeTab === 'profile' && <ProfileManager />}
        {activeTab === 'mcp' && <MCPGuideModal />}
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <p>CoverAI Monorepo • Powered by Local Model Context Protocol (MCP) & Candidate Skill Engine</p>
      </footer>
    </div>
  );
}
