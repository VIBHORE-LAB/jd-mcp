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
  const nameMatch = profileText.match(/Name:\s*([^\n]+)/i);
  const candidateName = nameMatch ? nameMatch[1].trim() : 'Alex Mercer';

  const titleMatch = profileText.match(/Title:\s*([^\n]+)/i);
  const candidateTitle = titleMatch ? titleMatch[1].trim() : 'Senior Full-Stack & AI Engineer';

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const hooks = [
    `When I saw the ${jobDetails.jobTitle} opening at ${jobDetails.companyName}, I knew I had to reach out. I've been closely following how teams are evolving full-stack and AI workflows, and your technical trajectory immediately resonated with my day-to-day focus.`,
    `I'm writing because your opening for a ${jobDetails.jobTitle} at ${jobDetails.companyName} caught my attention. Over the past 6+ years, I've specialized in building high-throughput web architectures and developer-centric tools that solve real production friction.`,
    `What pulled me toward ${jobDetails.companyName}'s ${jobDetails.jobTitle} role is the emphasis on engineering quality and scalable product delivery. As someone who builds Node.js, React, and custom AI tools from scratch, I thrive on solving these exact engineering challenges.`
  ];
  
  const chosenHook = hooks[Math.floor(Math.random() * hooks.length)];

  const letter = `${candidateName}
${candidateTitle}
Email: alex.mercer@example.com | Portfolio: https://alexmercer.dev

${today}

Hiring Team
${jobDetails.companyName}

Hi ${jobDetails.companyName} Hiring Team,

${chosenHook}

In my previous roles, I've focused on taking complex backend services and turning them into fast, reliable software. For instance, when user traffic spiked at my last position, I led the investigation into our API bottlenecks, refactored our connection handling, and dropped response latency by 35%. I also built custom internal tooling using the Model Context Protocol (MCP) that cut our team's code review overhead by 40%.

Here is why I believe I would be a natural fit for ${jobDetails.companyName}:

- Product-Minded Engineering: I don't just write code to satisfy tickets; I care about end-user latency, clean API design, and system longevity.
- Full-Stack Ownership: From TypeScript and React interfaces to Node.js queues and PostgreSQL schemas, I comfortably own features from concept to deployment.
- Pragmatic Problem Solving: I avoid over-engineering. My focus is always on delivering measurable impact quickly while keeping codebases easy for the rest of the team to navigate.

I would love to set up a time to chat about how my background in full-stack architecture and AI workflows can support what you're building at ${jobDetails.companyName}. Thanks for taking the time to read this.

Best,

${candidateName}`;

  return letter;
}

function generateHumanizedAnswers(profileText, skillsText, questions, jobDetails) {
  return questions.map(q => {
    let answer = '';
    const lowerQ = q.toLowerCase();

    if (lowerQ.includes('why') && (lowerQ.includes('work here') || lowerQ.includes('join') || lowerQ.includes('company'))) {
      answer = `What stands out to me about ${jobDetails.companyName} is your commitment to high-performing engineering without fluff. Having spent years building full-stack platforms and AI tools, I want to work with a team that values shipping fast, clean execution, and real user value.`;
    } else if (lowerQ.includes('challenge') || lowerQ.includes('difficult') || lowerQ.includes('conflict')) {
      answer = `A key challenge was diagnosing an intermittent memory leak on our primary API during peak traffic. Instead of adding temporary server bandwidth, I profiled our event loop, identified unclosed Redis connections, and refactored our async queue layer. That fix permanently dropped response latency by 35% and stabilized production.`;
    } else if (lowerQ.includes('experience') || lowerQ.includes('years') || lowerQ.includes('background')) {
      answer = `I have over 6 years of experience building production web applications across React, TypeScript, Node.js, and Python. Recently, I've been building custom MCP server plugins and AI integrations that automate developer workflows.`;
    } else if (lowerQ.includes('salary') || lowerQ.includes('compensation') || lowerQ.includes('expected')) {
      answer = `I'm flexible and open to discussing fair market compensation aligned with the role responsibilities, equity, and remote options at ${jobDetails.companyName}.`;
    } else {
      answer = `In my experience, solving this comes down to clear communication and breaking down the problem systematically. At ${jobDetails.companyName}, I would bring that same hands-on, practical approach to ensure we deliver reliable results.`;
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

app.post('/api/scrape-portfolio', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);
    
    $('script, style, nav, footer, svg').remove();
    const extractedText = $('body').text().replace(/\s+/g, ' ').trim();
    
    const snippet = extractedText.substring(0, 3000);
    const existing = getProfileContent();
    
    const updated = `${existing}\n\n## Scraped Portfolio Summary (${url})\n${snippet}`;
    saveProfileContent(updated);

    res.json({ success: true, snippet, updatedProfile: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    const { text, candidateName = 'Alex Mercer' } = req.body;
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
