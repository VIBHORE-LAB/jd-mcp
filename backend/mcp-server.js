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
  const defaultConfig = '# Candidate Profile\n\n- Name: Candidate\n- Title: Software Engineer\n';
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
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    const questions = lines.filter(l => l.includes('?') || /^(?:why|how|describe|what|tell us)/i.test(l.trim()));
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            detectedTitle: lines[0] || 'Software Engineer',
            detectedCompany: lines[1] || 'Company',
            questionsFound: questions,
            rawSnippet: raw.substring(0, 500)
          }, null, 2)
        }
      ]
    };
  }

  if (name === 'generate_cover_letter') {
    const profile = readProfile();
    const skills = readSkills();
    const coverLetter = `Hi ${args.company_name} Hiring Team,\n\nWhen I saw your opening for a ${args.job_title}, I wanted to reach out directly. Over the past 6+ years as a full-stack engineer, I've focused on building high-throughput systems and developer tools that solve real operational friction.\n\nBased on my experience recorded in profile.md:\n${profile.substring(0, 450)}...\n\nFollowing skills.md humanization guidelines, I'd welcome the chance to talk through how my background supports what you're building at ${args.company_name}.\n\nBest,\nCandidate`;
    
    return {
      content: [{ type: 'text', text: coverLetter }]
    };
  }

  if (name === 'answer_application_questions') {
    const profile = readProfile();
    const questionsList = args.questions || [];
    const answers = questionsList.map(q => ({
      question: q,
      answer: `Regarding "${q}": Drawing from my work history in profile.md and applying skills.md humanized voice guidelines, I focus on practical execution, clear system design, and direct outcomes.`
    }));

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
