import React, { useState, useEffect } from 'react';
import { User, Sparkles, Save, Globe, FileUp, Check, RefreshCw, BookOpen, Sliders } from 'lucide-react';

export default function ProfileManager() {
  const [activeSubTab, setActiveSubTab] = useState('profile');

  const [profileText, setProfileText] = useState('');
  const [profilePath, setProfilePath] = useState('');

  const [skillsText, setSkillsText] = useState('');
  const [skillsPath, setSkillsPath] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [scraping, setScraping] = useState(false);

  const [cvText, setCvText] = useState('');
  const [parsingCv, setParsingCv] = useState(false);

  const fetchProfileAndSkills = async () => {
    setLoading(true);
    try {
      const pRes = await fetch('/api/profile');
      const pData = await pRes.json();
      if (pData.success) {
        setProfileText(pData.content);
        setProfilePath(pData.filePath);
      }

      const sRes = await fetch('/api/skills');
      const sData = await sRes.json();
      if (sData.success) {
        setSkillsText(sData.content);
        setSkillsPath(sData.filePath);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndSkills();
  }, []);

  const handleSaveActiveFile = async () => {
    setSaving(true);
    try {
      const endpoint = activeSubTab === 'profile' ? '/api/profile' : '/api/skills';
      const body = activeSubTab === 'profile' ? { content: profileText } : { content: skillsText };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleScrapePortfolio = async () => {
    if (!portfolioUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch('/api/scrape-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: portfolioUrl })
      });
      const data = await res.json();
      if (data.success) {
        setProfileText(data.updatedProfile);
        setPortfolioUrl('');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScraping(false);
    }
  };

  const handleParseAndProcessCv = async (replaceExisting) => {
    if (!cvText.trim()) return;
    setParsingCv(true);
    try {
      const parseRes = await fetch('/api/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cvText })
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok || !parseData.success) {
        throw new Error(parseData.error || 'Failed to parse CV');
      }

      const parsedMarkdown = parseData.markdown;
      let updatedProfileText = '';
      if (replaceExisting) {
        updatedProfileText = `# Candidate Profile\n\n${parsedMarkdown}`;
      } else {
        updatedProfileText = `${profileText}\n\n## Additional CV Resume Information\n${parsedMarkdown}`;
      }

      setProfileText(updatedProfileText);

      const saveRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedProfileText })
      });
      const saveData = await saveRes.json();
      if (saveRes.ok && saveData.success) {
        setCvText('');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        throw new Error(saveData.error || 'Failed to save profile');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'An error occurred during CV parsing.');
    } finally {
      setParsingCv(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <div className="glass-panel rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveSubTab('profile')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <User className="w-4 h-4" />
                Candidate Data (profile.md)
              </button>

              <button
                onClick={() => setActiveSubTab('skills')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeSubTab === 'skills'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Sliders className="w-4 h-4" />
                AI Skill Rules (skills.md)
              </button>
            </div>

            <button
              onClick={handleSaveActiveFile}
              disabled={saving || loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : savedSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              {savedSuccess ? 'Saved!' : `Save ${activeSubTab === 'profile' ? 'profile.md' : 'skills.md'}`}
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">
              Editing: {activeSubTab === 'profile' ? (profilePath || 'profile.md') : (skillsPath || 'skills.md')}
            </span>
            <span className="text-[11px] text-slate-500">
              {activeSubTab === 'profile' ? 'Candidate personal info, stack, experience' : 'AI humanization tone, voice rules, tactics'}
            </span>
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
              Loading markdown files...
            </div>
          ) : (
            <div>
              {activeSubTab === 'profile' ? (
                <textarea
                  value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  className="w-full h-[500px] bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed resize-none"
                />
              ) : (
                <textarea
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full h-[500px] bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed resize-none"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="glass-panel rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-sky-400" />
            Scrape Personal Portfolio Site
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Enter your portfolio URL to fetch and automatically append projects into candidate profile.md.
          </p>

          <div className="space-y-3">
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yourportfolio.dev"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
            />
            <button
              onClick={handleScrapePortfolio}
              disabled={scraping || !portfolioUrl.trim()}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-600/20"
            >
              {scraping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Fetch & Learn Site Context
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
            <FileUp className="w-4 h-4 text-indigo-400" />
            Import LaTeX / CV Resume
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Paste CV text or LaTeX code. The system will convert it to Markdown, save it, and update the profile.
          </p>

          <div className="space-y-3">
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste CV text or LaTeX resume section..."
              className="w-full h-36 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleParseAndProcessCv(false)}
                disabled={parsingCv || !cvText.trim()}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {parsingCv ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                Parse & Append
              </button>
              <button
                onClick={() => handleParseAndProcessCv(true)}
                disabled={parsingCv || !cvText.trim()}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {parsingCv ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Parse & Replace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
