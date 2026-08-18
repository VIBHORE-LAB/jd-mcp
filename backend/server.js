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
  
  const ignoredPatterns = /^(about the job|job description|job details|description|job summary|summary|location|posted|salary|compensation|on-site|remote|hybrid|experience|job type|type|about|grade|position|level|organisational|business|department|country|state|worksite|industry|function|certification|qualification|skills|date|posted on|end date)\b/i;

  const isIgnored = (text) => {
    const clean = text.trim();
    if (ignoredPatterns.test(clean)) return true;
    if (/^(business_unit|department|posted|grade|position|level)/i.test(clean)) return true;
    if (/^[a-zA-Z\s\.\-]+,\s*[a-zA-Z\s\.\-]+$/i.test(clean)) return true;
    if (/\b(remote|hybrid|on-site|mumbai|bangalore|delhi|jaipur|pune|hyderabad|india|london|singapore|usa|san francisco|new york|california|maharashtra|thane|gurgaon|noida|chennai)\b/i.test(clean)) return true;
    return false;
  };

  const titleMatch = rawText.match(/(?:Job Title|Position|Role):\s*([^\n]+)/i);
  if (titleMatch) {
    jobTitle = titleMatch[1].trim();
  } else {
    const titleKeywords = /(engineer|developer|architect|designer|manager|lead|sde|sde1|sde2|intern|analyst|specialist)/i;
    const foundTitleLine = lines.find(l => {
      const clean = l.trim();
      if (isIgnored(clean)) return false;
      return titleKeywords.test(clean);
    });
    if (foundTitleLine) {
      jobTitle = foundTitleLine.substring(0, 60);
    } else if (lines.length > 0) {
      const validTitleLine = lines.find(l => !isIgnored(l));
      if (validTitleLine) {
        jobTitle = validTitleLine.substring(0, 60);
      }
    }
  }

  const companyMatch = rawText.match(/(?:Company|Organization|At):\s*([^\n]+)/i);
  if (companyMatch) {
    companyName = companyMatch[1].trim();
  } else {
    const companyKeywords = [
      /about\s+([a-zA-Z0-9\s]+)/i,
      /why\s+join\s+([a-zA-Z0-9\s]+)/i,
      /([a-zA-Z0-9\s]+)\s+is\s+a\s+technology-first/i,
      /at\s+([a-zA-Z0-9\s]+)\b/i
    ];
    let foundCompany = '';
    for (let pattern of companyKeywords) {
      const match = rawText.match(pattern);
      if (match && match[1] && !/^(the|a|an|job|our|this|about)$/i.test(match[1].trim())) {
        foundCompany = match[1].trim();
        break;
      }
    }
    if (!foundCompany) {
      const companySuffixes = /\b(ltd|limited|inc|corp|group|capital|solutions|technologies|bank|systems|labs)\b/i;
      const foundSuffixLine = lines.find(l => {
        const clean = l.trim();
        if (clean.toLowerCase().includes(jobTitle.toLowerCase()) || jobTitle.toLowerCase().includes(clean.toLowerCase())) return false;
        if (isIgnored(clean)) return false;
        return companySuffixes.test(clean) && clean.length < 50;
      });
      if (foundSuffixLine) {
        foundCompany = foundSuffixLine.trim();
      }
    }
    if (foundCompany) {
      companyName = foundCompany;
    } else if (lines.length > 0) {
      const validCompanyLine = lines.find(l => {
        const clean = l.trim();
        if (clean.toLowerCase().includes(jobTitle.toLowerCase()) || jobTitle.toLowerCase().includes(clean.toLowerCase())) return false;
        return !isIgnored(l);
      });
      if (validCompanyLine) {
        companyName = validCompanyLine.substring(0, 50);
      }
    }
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

function parseProfileMarkdown(profileText) {
  const sections = profileText.split(/^##\s+/m);
  const accomplishments = [];
  const projects = [];

  sections.forEach(section => {
    const lines = section.split('\n');
    const header = lines[0].toLowerCase();
    
    if (header.includes('experience') || header.includes('work')) {
      let currentCompany = 'Experience';
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('###')) {
          currentCompany = trimmed.replace(/###/g, '').trim().split(' — ')[0];
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          accomplishments.push({
            text: trimmed.replace(/^[\-\*]\s+/, '').trim(),
            source: currentCompany
          });
        }
      });
    } else if (header.includes('projects') || header.includes('project')) {
      let currentProject = 'Project';
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('###')) {
          currentProject = trimmed.replace(/###/g, '').trim().split(' — ')[0];
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          projects.push({
            text: trimmed.replace(/^[\-\*]\s+/, '').trim(),
            source: currentProject
          });
        }
      });
    }
  });

  return { accomplishments, projects };
}

function matchAccomplishments(parsedProfile, jdText) {
  const jdLower = jdText.toLowerCase();
  
  const scoreItem = (item) => {
    let score = 0;
    const words = item.text.toLowerCase().split(/\W+/);
    words.forEach(word => {
      if (word.length > 3 && jdLower.includes(word)) {
        score += 1;
        if (/\b(kafka|redis|postgres|mysql|mongodb|docker|aws|kubernetes|ffmpeg|groq|llama|socket|mqtt|bullmq|react|typescript|python|c\+\+|node|express|mcp|oauth|api|microservices|webhook|webhooks|revamp|revamps|dto)\b/i.test(word)) {
          score += 2;
        }
      }
    });
    if (/\b(webhook|webhooks|15,000|15000|bullmq)\b/i.test(item.text)) {
      score += 3;
    }
    return { ...item, score };
  };

  const scoredAcc = parsedProfile.accomplishments.map(scoreItem);
  const scoredProj = parsedProfile.projects.map(scoreItem);

  scoredAcc.sort((a, b) => b.score - a.score);
  scoredProj.sort((a, b) => b.score - a.score);

  return {
    topAccomplishments: scoredAcc,
    topProjects: scoredProj
  };
}

function generateHumanizedCoverLetter(profileText, skillsText, jobDetails) {
  const nameMatch = profileText.match(/Name:\s*([^\n]+)/i) || profileText.match(/#\s*([^\n]+)/);
  let candidateName = 'Vibhore Mathur';
  if (nameMatch) {
    const extracted = nameMatch[1].replace('Candidate Profile', '').replace('—', '').replace(/[\*#]/g, '').trim();
    if (extracted && extracted.length < 40) candidateName = extracted;
  }

  const companyName = jobDetails.companyName || 'Company';
  const jobTitle = jobDetails.jobTitle || 'Software Engineer';

  const parsedProfile = parseProfileMarkdown(profileText);
  const matched = matchAccomplishments(parsedProfile, jobDetails.rawText || '');
  const topAcc = matched.topAccomplishments;
  const topProj = matched.topProjects[0];

  let hookParagraph = '';
  if (topProj) {
    const projDesc = topProj.text.charAt(0).toLowerCase() + topProj.text.slice(1);
    hookParagraph = `I'm a full-stack engineer who loves building core systems from the ground up. I thrive when working close to the metal—whether it's designing ${topProj.source} (${projDesc}) or developing scalable microservices and high-throughput communication modules.`;
  } else {
    hookParagraph = `I'm a full-stack engineer who loves building core systems from the ground up. I thrive when working close to the metal—whether it's designing custom SQL compilers, stock backtesting platforms, or distributed video transcoders.`;
  }

  let experienceParagraph = '';
  if (topAcc.length > 0) {
    const firstAccDesc = topAcc[0].text.charAt(0).toLowerCase() + topAcc[0].text.slice(1);
    experienceParagraph = `In my professional experience, I focus on system reliability and scalability. For instance, at ${topAcc[0].source}, I ${firstAccDesc}`;
    if (topAcc.length > 1) {
      const secondAccDesc = topAcc[1].text.charAt(0).toLowerCase() + topAcc[1].text.slice(1);
      experienceParagraph += ` I also ${secondAccDesc}`;
    }
    if (topAcc.length > 2) {
      const thirdAccDesc = topAcc[2].text.charAt(0).toLowerCase() + topAcc[2].text.slice(1);
      experienceParagraph += ` Additionally, I ${thirdAccDesc}`;
    }
  } else {
    experienceParagraph = `In my professional experience, I focus on system reliability and scalability. I have built centralized async job queues using BullMQ and Redis that cut failure rates by 40%, and engineered high-throughput webhook delivery pipelines handling over 15,000 events daily.`;
  }

  const letter = `Dear ${companyName} Hiring Team,

${hookParagraph}

${experienceParagraph}

What caught my attention about ${companyName} is your focus on engineering velocity and systematic resilience. Building self-healing backend systems and optimizing database layers aligns perfectly with how I think about systems. I would love to bring my full-stack background, low-level coding experience, and passion for performance to your backend engineering team.

I look forward to discussing how my experience with distributed systems and performance optimization can support what you are building. Thank you for your time.

Sincerely,

${candidateName}`;

  return letter;
}

function generateHumanizedAnswers(profileText, skillsText, questions, jobDetails) {
  const parsedProfile = parseProfileMarkdown(profileText);
  const matched = matchAccomplishments(parsedProfile, jobDetails.rawText || '');
  const topAcc = matched.topAccomplishments;
  const topProj = matched.topProjects[0];

  return questions.map(q => {
    let answer = '';
    const lowerQ = q.toLowerCase();

    if (lowerQ.includes('why') && (lowerQ.includes('work here') || lowerQ.includes('join') || lowerQ.includes('company') || lowerQ.includes('purplle') || lowerQ.includes('cisco') || lowerQ.includes('nasdaq'))) {
      answer = `I want to join ${jobDetails.companyName} because of your focus on systematic resilience, self-healing systems, and AI-native engineering lifecycle. I enjoy building systems that are robust and handle failures gracefully rather than relying on manual firefighting. Since my experience spans building distributed queues, Kafka event buses, and custom compilers, I believe I will fit right into your engineering culture and contribute to building highly stable systems.`;
    } else if (lowerQ.includes('change') || lowerQ.includes('leaving') || lowerQ.includes('leave') || lowerQ.includes('looking for a new') || lowerQ.includes('looking for new')) {
      let changeProjDesc = 'custom SQL compilers, C++ engines, and scene-aware transcoders';
      if (topProj) {
        changeProjDesc = `${topProj.source} (${topProj.text.charAt(0).toLowerCase() + topProj.text.slice(1)})`;
      }
      answer = `I am looking for a new opportunity where I can take on greater technical ownership and solve complex backend scaling challenges. I've spent my recent time building low-level systems—like a ${changeProjDesc}. I want to bring this core engineering focus to a team like ${jobDetails.companyName} where I can work on high-throughput microservices and help build unbreakable systems.`;
    } else if (lowerQ.includes('fit') || lowerQ.includes('hire') || lowerQ.includes('why you') || lowerQ.includes('strength') || lowerQ.includes('suitable') || lowerQ.includes('contribution')) {
      let fitAccDesc = 'reduced background job failures by 40% with BullMQ and designed unified DTO systems across 30+ routes';
      if (topAcc.length > 0) {
        fitAccDesc = `${topAcc[0].text.charAt(0).toLowerCase() + topAcc[0].text.slice(1)}`;
        if (topAcc.length > 1) {
          fitAccDesc += ` and ${topAcc[1].text.charAt(0).toLowerCase() + topAcc[1].text.slice(1)}`;
        }
      }
      answer = `My biggest strength is my ability to build complex backend systems from scratch. I don't just consume libraries; I understand how they work under the hood. For example, I wrote a custom SQL parser/interpreter to query CSV files directly and built a computation engine in C++ for trade backtesting. Professionally, I've ${fitAccDesc}. I bring strong debugging skills, a focus on performance, and a habit of writing clean service contracts.`;
    } else if (lowerQ.includes('challenge') || lowerQ.includes('difficult') || lowerQ.includes('conflict') || lowerQ.includes('mistake') || lowerQ.includes('failure') || lowerQ.includes('weakness')) {
      if (lowerQ.includes('weakness') || lowerQ.includes('mistake') || lowerQ.includes('failure')) {
        answer = `In my early projects, I sometimes focused too much on writing custom solutions from scratch (like building a SQL parser) when an existing library might have sufficed. While it gave me a deep understanding of compilers and ASTs, I've learned to balance this curiosity with business velocity, prioritizing pre-existing, battle-tested solutions for production features unless custom performance is strictly required.`;
      } else {
        let challengeDesc = 'building a distributed scene-aware video transcoder. Transcoding large videos is computationally expensive and slow. I engineered a pipeline that segments videos into scene clips using FFmpeg change-detection filters, routes task segments through BullMQ and Kafka, and dynamically runs CRF predictions. This achieved a 40% compression gain without quality loss. Managing concurrent workers and state synchronization across Redis and WebSockets taught me how to handle distributed coordination at scale.';
        if (topProj && topProj.source.includes('CineEncode')) {
          challengeDesc = `building CineEncode, a distributed content-aware video transcoder. ${topProj.text}`;
        } else if (topAcc.length > 0) {
          challengeDesc = `implementing ${topAcc[0].text.charAt(0).toLowerCase() + topAcc[0].text.slice(1)} under strict latency constraints.`;
        }
        answer = `One of the most interesting challenges I solved was ${challengeDesc}`;
      }
    } else if (lowerQ.includes('project') || lowerQ.includes('proud') || lowerQ.includes('accomplish') || lowerQ.includes('achievement')) {
      answer = `I've built three major projects: CSVQL (a custom 5-stage SQL interpreter written from scratch), Stratifyy (a stock backtesting platform with a high-performance C++ calculation engine), and CineEncode (a scene-based video transcoder using Groq AI and Kafka event routing). These projects demonstrate my ability to write clean code in TypeScript, Python, and C++, handle concurrent pipelines, and manage distributed messaging layers.`;
    } else if (lowerQ.includes('experience') || lowerQ.includes('years') || lowerQ.includes('background') || lowerQ.includes('skills')) {
      answer = `I am a Full Stack Developer with professional experience across React, TypeScript, Node.js, Python, PostgreSQL, and Docker. I've built end-to-end SaaS features, OAuth 2.0 MCP integrations, real-time alert systems, and AI RAG pipelines.`;
    } else if (lowerQ.includes('salary') || lowerQ.includes('compensation') || lowerQ.includes('expected')) {
      answer = `I am flexible and open to discussing market-competitive compensation aligned with the SDE role and the growth opportunities at ${jobDetails.companyName}. I'm happy to discuss specific numbers during the HR interview stage.`;
    } else if (lowerQ.includes('notice') || lowerQ.includes('start') || lowerQ.includes('available') || lowerQ.includes('how soon')) {
      answer = `I am available to join immediately, as my notice period is flexible and open to discussion. I can complete transitions quickly to start contributing to the codebase.`;
    } else {
      answer = `Based on my experience building compilers, C++ engines, and distributed job queues, I focus on writing high-performance, maintainable backend code. I'd be happy to expand on my specific experience, projects, and stack during an interview.`;
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

function generateOutreachContent(profileText, skillsText, jobDetails, targetName, targetRole) {
  const nameMatch = profileText.match(/Name:\s*([^\n]+)/i) || profileText.match(/#\s*([^\n]+)/);
  let candidateName = 'Vibhore Mathur';
  if (nameMatch) {
    const extracted = nameMatch[1].replace('Candidate Profile', '').replace('—', '').replace(/[\*#]/g, '').trim();
    if (extracted && extracted.length < 40) candidateName = extracted;
  }

  const titleMatch = profileText.match(/Title:\s*([^\n]+)/i);
  const candidateTitle = titleMatch ? titleMatch[1].trim() : 'Full Stack Developer';

  const emailMatch = profileText.match(/Email:\s*([^\n]+)/i) || profileText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const candidateEmail = emailMatch ? (emailMatch[1] || emailMatch[0]).trim() : 'onlyvibhore@email.com';

  const siteMatch = profileText.match(/Portfolio Website:\s*([^\n]+)/i) || profileText.match(/https?:\/\/[^\s\)]+/);
  const candidateSite = siteMatch ? siteMatch[0].trim() : 'https://vibhore.site/';

  const company = jobDetails.companyName || 'Company';
  const roleTitle = jobDetails.jobTitle || 'Software Engineer';
  const target = targetName ? targetName.trim() : 'Hiring Team';

  const parsedProfile = parseProfileMarkdown(profileText);
  const matched = matchAccomplishments(parsedProfile, jobDetails.rawText || '');
  const topAcc = matched.topAccomplishments;
  const topProj = matched.topProjects[0];

  let skillsSummary = 'full-stack engineering, API design, and system scalability';
  if (parsedProfile.accomplishments.length > 0) {
    const techWords = [];
    const text = profileText.toLowerCase();
    const keywords = ['react', 'typescript', 'node.js', 'python', 'c++', 'postgresql', 'redis', 'kafka', 'docker', 'aws', 'bullmq', 'mcp'];
    keywords.forEach(kw => {
      if (text.includes(kw)) techWords.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    });
    if (techWords.length > 0) {
      skillsSummary = techWords.slice(0, 4).join(', ');
    }
  }

  let accomplishmentHighlight = 'designing high-performance backend systems and managing asynchronous processing queues';
  if (topAcc.length > 0) {
    accomplishmentHighlight = topAcc[0].text.charAt(0).toLowerCase() + topAcc[0].text.slice(1);
    if (topAcc.length > 1) {
      accomplishmentHighlight += `, and ${topAcc[1].text.charAt(0).toLowerCase() + topAcc[1].text.slice(1)}`;
    }
  }

  let projectHighlight = '';
  if (topProj) {
    const projDesc = topProj.text.charAt(0).toLowerCase() + topProj.text.slice(1);
    projectHighlight = `I recently built ${topProj.source} (${projDesc}).`;
  }

  let emailSubject = '';
  let emailBody = '';
  let connectionRequest = '';
  let directMessage = '';

  const cleanRole = (targetRole || 'recruiter').toLowerCase();

  if (cleanRole === 'recruiter' || cleanRole === 'hr') {
    emailSubject = `Application for ${roleTitle} - ${candidateName}`;
    emailBody = `Hi ${target},

I hope this email finds you well.

I recently applied for the ${roleTitle} role at ${company} and wanted to reach out directly. Given my experience building full-stack applications with ${skillsSummary}, I felt my background would be a strong match for your engineering team's needs.

Specifically, I have hands-on experience ${accomplishmentHighlight}. ${projectHighlight} I focus on shipping clean, typed code where performance and stability are front and center.

I would appreciate the chance to connect for a short screening call to discuss how my full-stack skillset aligns with what ${company} is looking for. I have attached my application details, and you can view my work at ${candidateSite}.

Thank you for your time and consideration.

Best regards,

${candidateName}
${candidateTitle}
${candidateEmail}`;

    connectionRequest = `Hi ${target}, I saw the ${roleTitle} opening at ${company} and wanted to connect. I build systems using ${skillsSummary}. ${topProj ? `Lately I built ${topProj.source}.` : ''} Would love to connect and share my background if you have a moment. Thanks!`;
    if (connectionRequest.length > 299) {
      connectionRequest = connectionRequest.substring(0, 296) + '...';
    }

    directMessage = `Hi ${target},

I hope you are having a great week.

I recently applied for the ${roleTitle} role at ${company} and wanted to reach out directly. I bring strong experience in ${skillsSummary}.

Over my career, I've focused on system reliability, including ${accomplishmentHighlight}. I'm very excited about what ${company} is building and would love to chat briefly if you're open to it.

Best,
${candidateName}`;

  } else if (cleanRole === 'engineer' || cleanRole === 'peer') {
    emailSubject = `Outreach from a fellow engineer: ${candidateName} / ${roleTitle}`;
    emailBody = `Hi ${target},

I hope you're doing well.

I recently came across the ${roleTitle} opening on your team at ${company} and saw that you are working on the engineering team there. I wanted to reach out peer-to-peer to connect.

I'm a full-stack engineer with experience in ${skillsSummary}. I focus on building high-performance architectures, and I've spent my recent time ${accomplishmentHighlight}. ${projectHighlight}

I'd love to get your perspective on:
- How the team manages development velocity vs. technical debt.
- The stack's evolution and engineering culture.

If you have 10 minutes for a virtual coffee or just a quick chat, I'd really appreciate it. You can check out some of my open-source projects at ${candidateSite}.

Thanks,

${candidateName}
${candidateTitle}
${candidateEmail}`;

    connectionRequest = `Hi ${target}, I'm a full-stack Dev (specializing in ${skillsSummary}) and saw you're an engineer at ${company}. I'd love to connect to hear a bit about the dev culture and the team's tech stack. Cheers!`;
    if (connectionRequest.length > 299) {
      connectionRequest = connectionRequest.substring(0, 296) + '...';
    }

    directMessage = `Hi ${target},

I hope you're doing well.

I came across your profile and saw you're on the engineering team at ${company}. I recently applied for the ${roleTitle} opening and wanted to reach out peer-to-peer.

I focus on building high-performance architectures using ${skillsSummary}, and lately I've been ${accomplishmentHighlight}. I'd love to chat briefly to learn more about the team's engineering velocity and culture.

Best,
${candidateName}`;

  } else {
    emailSubject = `Engineering Match: ${candidateName} for ${roleTitle} - ${company}`;
    emailBody = `Hi ${target},

I hope you're having a productive week.

I noticed the ${roleTitle} opening at ${company} and wanted to reach out to you directly. Given your leadership role in engineering, I wanted to share how my background in building high-performance backend systems and scaling architectures could support your goals.

In my recent work, I have focused on solving complex technical challenges with direct business outcomes. For example, I have experience ${accomplishmentHighlight}. ${projectHighlight}

I would welcome the opportunity to discuss how my full-stack background, engineering velocity, and focus on performance can support your growth targets at ${company}. Please let me know if you have time for a brief introductory call.

Sincerely,

${candidateName}
${candidateTitle}
${candidateEmail}`;

    connectionRequest = `Hi ${target}, I saw you lead engineering at ${company}. I'm a full-stack engineer with experience in ${skillsSummary}. I specialize in ${accomplishmentHighlight.substring(0, 80)}... and wanted to connect to see if my background could help your team. Thanks!`;
    if (connectionRequest.length > 299) {
      connectionRequest = connectionRequest.substring(0, 296) + '...';
    }

    directMessage = `Hi ${target},

I hope you are doing well.

I noticed the ${roleTitle} opening on your team and wanted to reach out. I'm a full-stack engineer who specializes in building scalable backend architectures with ${skillsSummary}.

A quick snippet of my technical work: I specialize in ${accomplishmentHighlight}. I'm eager to learn about your engineering goals for the quarter and see how my skills could contribute to ${company}.

Best,
${candidateName}`;
  }

  return {
    email: {
      subject: emailSubject,
      body: emailBody
    },
    linkedin: {
      connectionRequest: connectionRequest.substring(0, 299),
      directMessage: directMessage
    }
  };
}

app.post('/api/generate-outreach', (req, res) => {
  try {
    const { rawText, targetName, targetRole, customTitle, customCompany } = req.body;
    const profile = getProfileContent();
    const skills = getSkillsContent();
    const jobDetails = extractJobDetails(rawText || '');

    if (customTitle) jobDetails.jobTitle = customTitle;
    if (customCompany) jobDetails.companyName = customCompany;

    const outreach = generateOutreachContent(profile, skills, jobDetails, targetName, targetRole);

    res.json({
      success: true,
      outreach
    });
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
