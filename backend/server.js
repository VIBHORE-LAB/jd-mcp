import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilePath = path.resolve(__dirname, '../profile.md');
const profileExamplePath = path.resolve(__dirname, '../profile.example.md');
const skillsPath = path.resolve(__dirname, '../skills.md');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function getProfileContent() {
  if (fs.existsSync(profilePath)) {
    return fs.readFileSync(profilePath, 'utf8');
  }
  if (fs.existsSync(profileExamplePath)) {
    const exampleContent = fs.readFileSync(profileExamplePath, 'utf8');
    fs.writeFileSync(profilePath, exampleContent, 'utf8');
    return exampleContent;
  }
  const defaultConfig = '# Candidate Profile\n\n- Name: Candidate\n- Title: Software Engineer\n';
  fs.writeFileSync(profilePath, defaultConfig, 'utf8');
  return defaultConfig;
}

function saveProfileContent(content) {
  fs.writeFileSync(profilePath, content, 'utf8');
}

function getSkillsContent() {
  if (fs.existsSync(skillsPath)) {
    return fs.readFileSync(skillsPath, 'utf8');
  }
  return '# AI Skill Rules\n\nNo skill rules found.';
}

function saveSkillsContent(content) {
  fs.writeFileSync(skillsPath, content, 'utf8');
}

function convertHtmlToMarkdown($) {
  $('script, style, nav, footer, svg, iframe').remove();
  
  let markdownLines = [];
  
  $('h1, h2, h3, h4, p, li').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim();
    if (!text) return;
    
    if (tag === 'h1') {
      markdownLines.push(`\n# ${text}`);
    } else if (tag === 'h2') {
      markdownLines.push(`\n## ${text}`);
    } else if (tag === 'h3') {
      markdownLines.push(`\n### ${text}`);
    } else if (tag === 'h4') {
      markdownLines.push(`\n#### ${text}`);
    } else if (tag === 'li') {
      markdownLines.push(`- ${text}`);
    } else {
      markdownLines.push(text);
    }
  });

  return markdownLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function convertLatexToMarkdown(latexText) {
  if (!latexText) return '';
  
  let lines = latexText.split('\n');
  let filteredLines = [];
  
  for (let line of lines) {
    let cleanLine = line.replace(/(?<!\\)%.*/, '').trim();
    if (!cleanLine) continue;
    
    if (/^\s*\\(documentclass|usepackage|definecolor|geometry|setlength|pagestyle|fancyhf|fancyfoot|renewcommand|newcommand|newenvironment|addtolength|hypersetup|newpage|clearpage|vfill|hfill|vspace|hspace|small|footnotesize|large|Large|LARGE|centering|indent|noindent|leftmargin|itemsep|parsep|topsep|partopsep|fancyhead|fancyfoot)\b/.test(cleanLine)) {
      continue;
    }
    
    filteredLines.push(cleanLine);
  }
  
  let cleaned = filteredLines.join('\n');
  
  cleaned = cleaned
    .replace(/\\begin\{document\}/i, '')
    .replace(/\\end\{document\}/i, '')
    .replace(/\\section\*?\{([^}]+)\}/g, '\n## $1\n')
    .replace(/\\subsection\*?\{([^}]+)\}/g, '\n### $1\n')
    .replace(/\\subsubsection\*?\{([^}]+)\}/g, '\n#### $1\n')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\textit\{([^}]+)\}/g, '*$1*')
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)')
    .replace(/\\url\{([^}]+)\}/g, '<$1>')
    .replace(/\\begin\{itemize\}/g, '')
    .replace(/\\end\{itemize\}/g, '')
    .replace(/\\begin\{enumerate\}/g, '')
    .replace(/\\end\{enumerate\}/g, '')
    .replace(/\\item\s*/g, '- ')
    .replace(/\\\\/g, '\n')
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\#/g, '#')
    .replace(/\\\$/g, '$')
    .replace(/\\[a-zA-Z]+\*?(\{.*?\})?/g, '')
    .replace(/[\{\}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

function extractJobDetails(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let jobTitle = 'Software Engineer';
  let companyName = 'Company';
  
  const titleMatch = rawText.match(/(?:Job Title|Position|Role):\s*([^\n]+)/i);
  if (titleMatch) {
    jobTitle = titleMatch[1].trim();
  } else if (lines.length > 0) {
    jobTitle = lines[0].substring(0, 60);
  }

  const companyMatch = rawText.match(/(?:Company|Organization|At):\s*([^\n]+)/i);
  if (companyMatch) {
    companyName = companyMatch[1].trim();
  } else if (lines.length > 1) {
    companyName = lines[1].substring(0, 50);
  }

  const lineArray = rawText.split('\n');
  const detectedQuestions = [];
  
  lineArray.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 15 && trimmed.length < 300) {
      if (trimmed.endsWith('?') || /^(?:question|\d+[\.\)])\s+/i.test(trimmed) || /^(?:why|how|describe|what|tell us|are you|do you|share an example)/i.test(trimmed)) {
        if (!detectedQuestions.includes(trimmed)) {
          detectedQuestions.push(trimmed);
        }
      }
    }
  });

  return {
    jobTitle,
    companyName,
    rawText,
    detectedQuestions,
    wordCount: rawText.split(/\s+/).length
  };
}

function generateHumanizedCoverLetter(profileText, skillsText, jobDetails) {
  const nameMatch = profileText.match(/Name:\s*([^\n]+)/i) || profileText.match(/#\s*([^\n]+)/);
  let candidateName = 'Vibhore Mathur';
  if (nameMatch) {
    const extracted = nameMatch[1].replace('Candidate Profile', '').replace('—', '').trim();
    if (extracted && extracted.length < 40) candidateName = extracted;
  }

  const titleMatch = profileText.match(/Title:\s*([^\n]+)/i);
  const candidateTitle = titleMatch ? titleMatch[1].trim() : 'Full Stack Developer';

  const emailMatch = profileText.match(/Email:\s*([^\n]+)/i) || profileText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const candidateEmail = emailMatch ? (emailMatch[1] || emailMatch[0]).trim() : 'onlyvibhore@email.com';

  const siteMatch = profileText.match(/Portfolio Website:\s*([^\n]+)/i) || profileText.match(/https?:\/\/[^\s\)]+/);
  const candidateSite = siteMatch ? siteMatch[0].trim() : 'https://vibhore.site/';

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const hooks = [
    `When I saw the ${jobDetails.jobTitle} opening at ${jobDetails.companyName}, I knew I had to reach out. Building end-to-end full-stack applications, MCP integrations, and scalable APIs is at the core of my daily engineering work, and your technical stack immediately aligned with my focus.`,
    `I'm writing because your opening for a ${jobDetails.jobTitle} at ${jobDetails.companyName} caught my attention. Over my career, I've specialized in designing high-throughput web architectures, async processing queues, and user-centric interfaces.`,
    `What pulled me toward ${jobDetails.companyName}'s ${jobDetails.jobTitle} role is your focus on engineering craftsmanship and product speed. As someone who builds Node.js, TypeScript, and custom AI tools from scratch, I thrive on solving these exact technical challenges.`
  ];
  
  const chosenHook = hooks[Math.floor(Math.random() * hooks.length)];

  const letter = `${candidateName}
${candidateTitle}
Email: ${candidateEmail} | Portfolio: ${candidateSite}

${today}

Hiring Team
${jobDetails.companyName}

Hi ${jobDetails.companyName} Hiring Team,

${chosenHook}

In my recent work, I've owned end-to-end full-stack features across SaaS platforms. For instance, I architected MCP integrations with OAuth 2.0, built a centralized async job processing engine with BullMQ and Redis that dropped task failures by 40%, and scaled a webhook delivery system to process over 15,000 events daily. I've also built distributed video transcoding tools and AI-assisted email RAG pipelines.

Here is why I believe I would be a natural fit for ${jobDetails.companyName}:

- End-to-End System Ownership: From React interfaces and TypeScript schemas to Node.js queues, MongoDB, and PostgreSQL databases, I comfortably own features from concept to production.
- Pragmatic Problem Solving: I focus on clean code and measurable outcomes—optimizing database queries, building real-time alerts, and accelerating page load times.
- Developer Craftsmanship: I prioritize maintainable architectures, robust API designs, and smooth user experiences.

I would love to set up a time to chat about how my full-stack background, MCP experience, and product focus can support ${jobDetails.companyName}'s goals. Thanks for taking the time to read this.

Best,

${candidateName}`;

  return letter;
}

function generateHumanizedAnswers(profileText, skillsText, questions, jobDetails) {
  return questions.map(q => {
    let answer = '';
    const lowerQ = q.toLowerCase();

    if (lowerQ.includes('why') && (lowerQ.includes('work here') || lowerQ.includes('join') || lowerQ.includes('company'))) {
      answer = `What stands out to me about ${jobDetails.companyName} is your emphasis on high-caliber software engineering. Having built SaaS platforms, MCP integrations, and async job queues with BullMQ/Redis, I want to collaborate with a team that values clean architecture, performance, and shipping great products.`;
    } else if (lowerQ.includes('challenge') || lowerQ.includes('difficult') || lowerQ.includes('conflict')) {
      answer = `A key challenge was reducing background job failure rates across our SaaS platform. I designed a centralized async processing pipeline using BullMQ and Redis, implemented exponential backoff retries, and optimized queue concurrency. This cut task failure rates by 40% while handling over 15,000 webhook events daily.`;
    } else if (lowerQ.includes('experience') || lowerQ.includes('years') || lowerQ.includes('background')) {
      answer = `I am a Full Stack Developer with professional experience across React, TypeScript, Node.js, Python, PostgreSQL, and Docker. I've built end-to-end SaaS features, OAuth 2.0 MCP integrations, real-time alert systems, and AI RAG pipelines.`;
    } else if (lowerQ.includes('salary') || lowerQ.includes('compensation') || lowerQ.includes('expected')) {
      answer = `I am flexible and open to discussing market-competitive compensation aligned with the role responsibilities and growth opportunities at ${jobDetails.companyName}.`;
    } else {
      answer = `Drawing from my full-stack background detailed in my profile, I address technical challenges by breaking them down into modular components, ensuring strong API contracts, and measuring performance metrics at every step.`;
    }

    return {
      question: q,
      answer
    };
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/profile', (req, res) => {
  try {
    const content = getProfileContent();
    res.json({ success: true, content, filePath: profilePath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/profile', (req, res) => {
  try {
    const { content } = req.body;
    saveProfileContent(content);
    res.json({ success: true, message: 'Candidate profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/skills', (req, res) => {
  try {
    const content = getSkillsContent();
    res.json({ success: true, content, filePath: skillsPath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/skills', (req, res) => {
  try {
    const { content } = req.body;
    saveSkillsContent(content);
    res.json({ success: true, message: 'AI skill rules updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parse-cv', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'CV or LaTeX text is required' });
    }
    const markdown = convertLatexToMarkdown(text);
    res.json({ success: true, markdown });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/scrape-portfolio', async (req, res) => {
  try {
    let { url, replaceExisting = false } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const cleanMarkdown = convertHtmlToMarkdown($);
    
    if (!cleanMarkdown) {
      return res.status(400).json({ success: false, error: 'No readable text content found on the specified page.' });
    }

    let updated = '';
    if (replaceExisting) {
      updated = `# Candidate Profile\n\n${cleanMarkdown}`;
    } else {
      const existing = getProfileContent();
      updated = `${existing}\n\n## Scraped Portfolio Context (${url})\n${cleanMarkdown}`;
    }

    saveProfileContent(updated);

    res.json({ success: true, snippet: cleanMarkdown, updatedProfile: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: `Failed to scrape website: ${err.message}` });
  }
});

app.post('/api/analyze-job', (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'Job text is required' });
    }
    const jobDetails = extractJobDetails(rawText);
    res.json({ success: true, jobDetails });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/generate', (req, res) => {
  try {
    const { rawText, customTitle, customCompany } = req.body;
    const profile = getProfileContent();
    const skills = getSkillsContent();
    const jobDetails = extractJobDetails(rawText || '');

    if (customTitle) jobDetails.jobTitle = customTitle;
    if (customCompany) jobDetails.companyName = customCompany;

    const coverLetter = generateHumanizedCoverLetter(profile, skills, jobDetails);
    const questionsAndAnswers = generateHumanizedAnswers(profile, skills, jobDetails.detectedQuestions, jobDetails);

    res.json({
      success: true,
      humanized: true,
      jobDetails,
      coverLetter,
      questionsAndAnswers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/export-pdf', (req, res) => {
  try {
    const { text, candidateName = 'Vibhore Mathur' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cover_Letter_${candidateName.replace(/\s+/g, '_')}.pdf"`);

    doc.pipe(res);

    doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text(candidateName);
    doc.fillColor('#64748b').fontSize(11).font('Helvetica').text('Professional Cover Letter', { underline: false });
    doc.moveDown(0.5);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#1e293b').fontSize(10.5).font('Helvetica').lineGap(4);

    const paragraphs = text.split('\n\n');
    paragraphs.forEach(para => {
      const trimmed = para.trim();
      if (trimmed) {
        if (trimmed.startsWith('- ')) {
          const bulletPoints = trimmed.split('\n');
          bulletPoints.forEach(bp => {
            doc.text(bp.trim(), { indent: 15 });
          });
        } else {
          doc.text(trimmed, { align: 'justify' });
        }
        doc.moveDown(0.8);
      }
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/mcp-status', (req, res) => {
  res.json({
    success: true,
    mcpConnected: true,
    mcpServerPath: path.resolve(__dirname, 'mcp-server.js'),
    profilePath,
    skillsPath,
    tools: [
      'get_candidate_profile',
      'get_ai_skill_rules',
      'analyze_job_posting',
      'generate_cover_letter',
      'answer_application_questions',
      'update_candidate_profile',
      'update_ai_skill_rules'
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
