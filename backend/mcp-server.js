import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilePath = path.resolve(__dirname, '../profile.md');
const profileExamplePath = path.resolve(__dirname, '../profile.example.md');
const skillsPath = path.resolve(__dirname, '../skills.md');

function readProfile() {
  if (fs.existsSync(profilePath)) {
    return fs.readFileSync(profilePath, 'utf8');
  }
  if (fs.existsSync(profileExamplePath)) {
    const exampleContent = fs.readFileSync(profileExamplePath, 'utf8');
    fs.writeFileSync(profilePath, exampleContent, 'utf8');
    return exampleContent;
  }
  const defaultConfig = '# Candidate Profile\n\n- Name: Vibhore Mathur\n- Title: Full Stack Developer\n';
  fs.writeFileSync(profilePath, defaultConfig, 'utf8');
  return defaultConfig;
}

function writeProfile(content) {
  fs.writeFileSync(profilePath, content, 'utf8');
}

function readSkills() {
  if (fs.existsSync(skillsPath)) {
    return fs.readFileSync(skillsPath, 'utf8');
  }
  return 'No AI skill rules found.';
}

function writeSkills(content) {
  fs.writeFileSync(skillsPath, content, 'utf8');
}

const server = new Server(
  {
    name: 'automatic-cover-letter-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_candidate_profile',
        description: 'Get candidate personal background, technical skills, work experience and education from profile.md',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_ai_skill_rules',
        description: 'Get AI humanization rules, tone & voice guidelines, and prompt strategy from skills.md',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'analyze_job_posting',
        description: 'Parse raw pasted job posting content to extract company, title, requirements, and application questions',
        inputSchema: {
          type: 'object',
          properties: {
            raw_text: {
              type: 'string',
              description: 'Full pasted content of the job post page'
            }
          },
          required: ['raw_text']
        }
      },
      {
        name: 'generate_cover_letter',
        description: 'Generate a humanized, natural cover letter matching profile.md background with skills.md rules',
        inputSchema: {
          type: 'object',
          properties: {
            job_title: { type: 'string' },
            company_name: { type: 'string' },
            job_description: { type: 'string' }
          },
          required: ['job_title', 'company_name', 'job_description']
        }
      },
      {
        name: 'answer_application_questions',
        description: 'Generate authentic, humanized candidate answers for application questions based on profile.md & skills.md',
        inputSchema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: { type: 'string' }
            },
            job_description: { type: 'string' }
          },
          required: ['questions']
        }
      },
      {
        name: 'update_candidate_profile',
        description: 'Update the candidate profile.md file',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Updated markdown content'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'update_ai_skill_rules',
        description: 'Update the AI skill rules skills.md file',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Updated markdown content'
            }
          },
          required: ['content']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_candidate_profile') {
    const profile = readProfile();
    return {
      content: [{ type: 'text', text: profile }]
    };
  }

  if (name === 'get_ai_skill_rules') {
    const skills = readSkills();
    return {
      content: [{ type: 'text', text: skills }]
    };
  }

  if (name === 'analyze_job_posting') {
    const raw = args.raw_text || '';
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const questions = lines.filter(l => l.includes('?') || /^(?:why|how|describe|what|tell us)/i.test(l.trim()));

    const ignoredPatterns = /^(about the job|job description|job details|description|job summary|summary|location|posted|salary|compensation|on-site|remote|hybrid|experience|job type|type|about|grade|position|level|organisational|business|department|country|state|worksite|industry|function|certification|qualification|skills|date|posted on|end date)\b/i;

    const isIgnored = (text) => {
      const clean = text.trim();
      if (ignoredPatterns.test(clean)) return true;
      if (/^(business_unit|department|posted|grade|position|level)/i.test(clean)) return true;
      if (/^[a-zA-Z\s\.\-]+,\s*[a-zA-Z\s\.\-]+$/i.test(clean)) return true;
      if (/\b(remote|hybrid|on-site|mumbai|bangalore|delhi|jaipur|pune|hyderabad|india|london|singapore|usa|san francisco|new york|california|maharashtra|thane|gurgaon|noida|chennai)\b/i.test(clean)) return true;
      return false;
    };

    let detectedTitle = 'Software Engineer';
    let detectedCompany = 'Company';

    const titleMatch = raw.match(/(?:Job Title|Position|Role):\s*([^\n]+)/i);
    if (titleMatch) {
      detectedTitle = titleMatch[1].trim();
    } else {
      const titleKeywords = /(engineer|developer|architect|designer|manager|lead|sde|sde1|sde2|intern|analyst|specialist)/i;
      const foundTitleLine = lines.find(l => {
        const clean = l.trim();
        if (isIgnored(clean)) return false;
        return titleKeywords.test(clean);
      });
      if (foundTitleLine) {
        detectedTitle = foundTitleLine.substring(0, 60);
      } else if (lines.length > 0) {
        const validTitleLine = lines.find(l => !isIgnored(l));
        if (validTitleLine) {
          detectedTitle = validTitleLine.substring(0, 60);
        }
      }
    }

    const companyMatch = raw.match(/(?:Company|Organization|At):\s*([^\n]+)/i);
    if (companyMatch) {
      detectedCompany = companyMatch[1].trim();
    } else {
      const companyKeywords = [
        /about\s+([a-zA-Z0-9\s]+)/i,
        /why\s+join\s+([a-zA-Z0-9\s]+)/i,
        /([a-zA-Z0-9\s]+)\s+is\s+a\s+technology-first/i,
        /at\s+([a-zA-Z0-9\s]+)\b/i
      ];
      let foundCompany = '';
      for (let pattern of companyKeywords) {
        const match = raw.match(pattern);
        if (match && match[1] && !/^(the|a|an|job|our|this|about)$/i.test(match[1].trim())) {
          foundCompany = match[1].trim();
          break;
        }
      }
      if (!foundCompany) {
        const companySuffixes = /\b(ltd|limited|inc|corp|group|capital|solutions|technologies|bank|systems|labs)\b/i;
        const foundSuffixLine = lines.find(l => {
          const clean = l.trim();
          if (clean.toLowerCase().includes(detectedTitle.toLowerCase()) || detectedTitle.toLowerCase().includes(clean.toLowerCase())) return false;
          if (isIgnored(clean)) return false;
          return companySuffixes.test(clean) && clean.length < 50;
        });
        if (foundSuffixLine) {
          foundCompany = foundSuffixLine.trim();
        }
      }
      if (foundCompany) {
        detectedCompany = foundCompany;
      } else if (lines.length > 0) {
        const validCompanyLine = lines.find(l => {
          const clean = l.trim();
          if (clean.toLowerCase().includes(detectedTitle.toLowerCase()) || detectedTitle.toLowerCase().includes(clean.toLowerCase())) return false;
          return !isIgnored(l);
        });
        if (validCompanyLine) {
          detectedCompany = validCompanyLine.substring(0, 50);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            detectedTitle,
            detectedCompany,
            questionsFound: questions,
            rawSnippet: raw.substring(0, 500)
          }, null, 2)
        }
      ]
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

  if (name === 'generate_cover_letter') {
    const profile = readProfile();
    const skills = readSkills();
    
    const nameMatch = profile.match(/Name:\s*([^\n]+)/i) || profile.match(/#\s*([^\n]+)/);
    let candidateName = 'Vibhore Mathur';
    if (nameMatch) {
      const extracted = nameMatch[1].replace('Candidate Profile', '').replace('—', '').replace(/[\*#]/g, '').trim();
      if (extracted && extracted.length < 40) candidateName = extracted;
    }

    const companyName = args.company_name || 'Company';
    const jobTitle = args.job_title || 'Software Engineer';
    const rawText = args.job_description || '';

    const parsedProfile = parseProfileMarkdown(profile);
    const matched = matchAccomplishments(parsedProfile, rawText);
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

    const coverLetter = `Dear ${companyName} Hiring Team,

${hookParagraph}

${experienceParagraph}

What caught my attention about ${companyName} is your focus on engineering velocity and systematic resilience. Building self-healing backend systems and optimizing database layers aligns perfectly with how I think about systems. I would love to bring my full-stack background, low-level coding experience, and passion for performance to your backend engineering team.

I look forward to discussing how my experience with distributed systems and performance optimization can support what you are building. Thank you for your time.

Sincerely,

${candidateName}`;
    
    return {
      content: [{ type: 'text', text: coverLetter }]
    };
  }

  if (name === 'answer_application_questions') {
    const profile = readProfile();
    const questionsList = args.questions || [];
    const companyName = args.company_name || 'Company';
    const rawText = args.job_description || '';

    const parsedProfile = parseProfileMarkdown(profile);
    const matched = matchAccomplishments(parsedProfile, rawText);
    const topAcc = matched.topAccomplishments;
    const topProj = matched.topProjects[0];

    const answers = questionsList.map(q => {
      let answer = '';
      const lowerQ = q.toLowerCase();

      if (lowerQ.includes('why') && (lowerQ.includes('work here') || lowerQ.includes('join') || lowerQ.includes('company') || lowerQ.includes('purplle') || lowerQ.includes('cisco') || lowerQ.includes('nasdaq'))) {
        answer = `I want to join ${companyName} because of your focus on systematic resilience, self-healing systems, and AI-native engineering lifecycle. I enjoy building systems that are robust and handle failures gracefully rather than relying on manual firefighting. Since my experience spans building distributed queues, Kafka event buses, and custom compilers, I believe I will fit right into your engineering culture and contribute to building highly stable systems.`;
      } else if (lowerQ.includes('change') || lowerQ.includes('leaving') || lowerQ.includes('leave') || lowerQ.includes('looking for a new') || lowerQ.includes('looking for new')) {
        let changeProjDesc = 'custom SQL compilers, C++ engines, and scene-aware transcoders';
        if (topProj) {
          changeProjDesc = `${topProj.source} (${topProj.text.charAt(0).toLowerCase() + topProj.text.slice(1)})`;
        }
        answer = `I am looking for a new opportunity where I can take on greater technical ownership and solve complex backend scaling challenges. I've spent my recent time building low-level systems—like a ${changeProjDesc}. I want to bring this core engineering focus to a team like ${companyName} where I can work on high-throughput microservices and help build unbreakable systems.`;
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
        answer = `I am flexible and open to discussing market-competitive compensation aligned with the SDE role and the growth opportunities at ${companyName}. I'm happy to discuss specific numbers during the HR interview stage.`;
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

    return {
      content: [{ type: 'text', text: JSON.stringify(answers, null, 2) }]
    };
  }

  if (name === 'update_candidate_profile') {
    writeProfile(args.content);
    return {
      content: [{ type: 'text', text: 'Successfully updated candidate profile.md' }]
    };
  }

  if (name === 'update_ai_skill_rules') {
    writeSkills(args.content);
    return {
      content: [{ type: 'text', text: 'Successfully updated AI skill rules skills.md' }]
    };
  }

  throw new Error(`Unknown tool name: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.exit(1);
});
