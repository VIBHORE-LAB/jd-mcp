import React, { useState } from 'react';
import { Sparkles, Download, Copy, Check, FileText, HelpCircle, Building, Briefcase, RefreshCw, Plus, Edit3, Save } from 'lucide-react';

export default function JobWorkspace() {
  const [rawText, setRawText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  
  const [jobDetails, setJobDetails] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');

  const handleAnalyzeAndGenerate = async () => {
    if (!rawText.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, customTitle, customCompany })
      });
      const data = await res.json();
      
      if (data.success) {
        setJobDetails(data.jobDetails);
        setCoverLetter(data.coverLetter);
        setQuestionsAndAnswers(data.questionsAndAnswers || []);
        if (data.jobDetails.jobTitle && !customTitle) setCustomTitle(data.jobDetails.jobTitle);
        if (data.jobDetails.companyName && !customCompany) setCustomCompany(data.jobDetails.companyName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!coverLetter) return;
    setExportingPdf(true);

    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: coverLetter,
          candidateName: 'Alex Mercer',
          jobTitle: customTitle || 'Role',
          companyName: customCompany || 'Company'
        })
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cover_Letter_${(customCompany || 'Company').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  };

  const copyToClipboard = (text, index = null) => {
    navigator.clipboard.writeText(text);
    if (index === 'letter') {
      setCopiedLetter(true);
      setTimeout(() => setCopiedLetter(false), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQa = {
      question: newQuestionText.trim(),
      answer: `Based on my background, I bring strong experience and proven technical problem-solving capabilities to address ${newQuestionText.trim()}.`
    };
    setQuestionsAndAnswers([...questionsAndAnswers, newQa]);
    setNewQuestionText('');
  };

  const handleUpdateAnswer = (idx, newAns) => {
    const updated = [...questionsAndAnswers];
    updated[idx].answer = newAns;
    setQuestionsAndAnswers(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 space-y-6">
        <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl -z-10 animate-pulse-slow"></div>
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Paste Job Page Content
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
              Auto Parser
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Copy and paste the entire job opening page (JD, company info, and application questions). AI will extract key info and match with your profile.md skill.
          </p>

          <div className="space-y-4">
            <div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste complete job text here (including questions)..."
                className="w-full h-56 bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Job Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Auto-detected or override"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  placeholder="Auto-detected or override"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyzeAndGenerate}
              disabled={loading || !rawText.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing & Matching Profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Cover Letter & Answer Questions
                </>
              )}
            </button>
          </div>
        </div>

        {jobDetails && (
          <div className="glass-card rounded-2xl p-5 border border-indigo-500/20">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Detected Job Context
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Title</span>
                <span className="font-medium text-slate-200">{jobDetails.jobTitle}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Company</span>
                <span className="font-medium text-slate-200">{jobDetails.companyName}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Questions Detected</span>
                <span className="font-medium text-indigo-400">{jobDetails.detectedQuestions.length} Found</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Word Count</span>
                <span className="font-medium text-slate-200">{jobDetails.wordCount} words</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-7 space-y-6">
        <div className="glass-panel rounded-2xl p-6 shadow-xl relative">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Generated Cover Letter
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingLetter(!isEditingLetter)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isEditingLetter ? <Save className="w-3.5 h-3.5 text-emerald-400" /> : <Edit3 className="w-3.5 h-3.5 text-indigo-400" />}
                {isEditingLetter ? 'Save Edit' : 'Edit Text'}
              </button>

              <button
                onClick={() => copyToClipboard(coverLetter, 'letter')}
                disabled={!coverLetter}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {copiedLetter ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copiedLetter ? 'Copied' : 'Copy'}
              </button>

              <button
                onClick={handleExportPdf}
                disabled={!coverLetter || exportingPdf}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {exportingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export PDF
              </button>
            </div>
          </div>

          {coverLetter ? (
            isEditingLetter ? (
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full h-96 bg-slate-900 border border-indigo-500/40 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none"
              />
            ) : (
              <div className="bg-slate-900/80 rounded-xl p-6 border border-slate-800/80 text-xs leading-relaxed text-slate-300 whitespace-pre-line font-['Plus_Jakarta_Sans',sans-serif] shadow-inner max-h-[480px] overflow-y-auto">
                {coverLetter}
              </div>
            )
          ) : (
            <div className="h-72 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6">
              <FileText className="w-10 h-10 mb-3 opacity-30 text-indigo-400" />
              Paste job content on the left and click "Generate Cover Letter" to create your tailored application document.
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-400" />
              Detected Job Application Questions ({questionsAndAnswers.length})
            </h2>
          </div>

          <div className="space-y-4 mb-4">
            {questionsAndAnswers.length > 0 ? (
              questionsAndAnswers.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-purple-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] flex items-center justify-center font-mono">
                        Q{idx + 1}
                      </span>
                      {item.question}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.answer, idx)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-md flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      {copiedIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  
                  <textarea
                    value={item.answer}
                    onChange={(e) => handleUpdateAnswer(idx, e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 resize-none font-sans"
                    rows={3}
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No custom questions detected automatically from the job paste yet. You can manually add one below.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
              placeholder="Add custom job question manually..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
