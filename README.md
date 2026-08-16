# CoverAI - Automatic Cover Letter & Application Question Generator (MCP Enabled)

CoverAI is a full-stack monorepo tool designed to instantly parse pasted job postings, extract application questions, and generate humanized cover letters and candidate answers. It connects directly to your local AI agents (AntiGravity IDE, Claude Code, Cursor, Codex, Claude Desktop) via the **Model Context Protocol (MCP)** using your local IDE credits—**no third-party API keys required**.

---

## Key Features

- **Copy-Paste Job Parser**: Paste entire job opening pages (JD, company info, and application questions). CoverAI automatically extracts job title, company name, and specific questions.
- **Humanized Generation Engine**: Generates natural, conversational cover letters and authentic question responses without generic AI buzzwords (*banning overused clichés like "delighted", "synergy", "spearheaded"*).
- **Separation of Profile & AI Rules**:
  - `profile.md`: Strictly your candidate data (skills, work history, accomplishments, links).
  - `skills.md`: AI prompt instructions, humanization voice guidelines, and output strategies.
- **Instant PDF Exporter**: One-click downloadable PDF cover letter generation formatted for job applications.
- **Portfolio Web Scraper**: Enter your portfolio URL to fetch and learn project details directly into `profile.md`.
- **Zero API Key MCP Integration**: Exposes a local stdio MCP server (`backend/mcp-server.js`) so your AI assistant acts as your personal application manager natively.

---

## Monorepo Architecture

```text
CoverAI/
├── backend/
│   ├── server.js          # Express API server for UI, parsing, scraping & PDF streaming
│   ├── mcp-server.js     # Model Context Protocol stdio server for AntiGravity / Claude / Cursor
│   └── package.json       # Backend dependencies (Express, PDFKit, Cheerio, @modelcontextprotocol/sdk)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main interface container & tab navigation
│   │   ├── components/    # JobWorkspace, ProfileManager, MCPGuideModal
│   │   └── index.css      # Glassmorphism & dark mode styling
│   ├── vite.config.js     # Vite configuration with local proxy to port 5000
│   └── package.json       # Frontend dependencies (React, Vite, Tailwind CSS, Lucide Icons)
├── profile.example.md     # Template candidate profile file
├── skills.md              # AI humanization & voice rules
├── .gitignore             # Excludes node_modules, builds, and profile.md
└── package.json           # Monorepo root scripts
```

---

## Quick Start

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation

Clone the repository and install dependencies for both backend and frontend:

```bash
npm run install:all
```

Or install manually:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Run the Local Servers

Start the backend server (Port 5000):

```bash
npm run dev:backend
```

In a separate terminal, start the frontend dev server (Port 5174):

```bash
npm run dev:frontend
```

Open your browser to `http://localhost:5174`.

---

## How to Use CoverAI

### Step 1: Set Up Your Candidate Profile & AI Skill Rules
1. Open the **Candidate Skill (profile.md)** tab in the web interface.
2. Edit `profile.md` with your personal contact info, core technical stack, key achievements, and work history.
3. Edit `skills.md` to tweak AI humanization guidelines, tone preferences, or specific writing constraints.
4. Optionally enter your portfolio URL under **Scrape Personal Portfolio Site** to automatically import your project descriptions.

### Step 2: Paste Job Content & Generate
1. Go to a job opening page on LinkedIn, Greenhouse, Lever, Workday, etc.
2. Copy the entire page text (including the Job Description and application questions).
3. Open the **Job Application** tab in CoverAI and paste the text into the job parser box.
4. Click **Generate Cover Letter & Answer Questions**.

### Step 3: Edit & Export PDF
1. Review the generated cover letter in the live editor. Make any manual tweaks if desired.
2. Click **Export PDF** to download a clean, styled cover letter ready for submission.
3. Review the detected application questions, copy answers with one click, or edit individual responses.

---

## Connecting Local AI Agents via MCP (No API Keys Needed)

Because CoverAI includes an MCP server (`backend/mcp-server.js`), you can connect local AI clients like **AntiGravity IDE**, **Claude Code**, **Cursor**, or **Codex** directly to this repository. The AI will use your local IDE credits and act as your personal application agent.

### 1. AntiGravity IDE & Claude Code Setup

Add this configuration block to your local MCP settings (e.g., `claude_desktop_config.json` or AntiGravity IDE MCP settings):

```json
{
  "mcpServers": {
    "cover-letter-mcp": {
      "command": "node",
      "args": [
        "D:\\Projects\\Automatic Cover Letter\\backend\\mcp-server.js"
      ]
    }
  }
}
```

### 2. Cursor / Codex Setup

1. Open Cursor Settings > **Features** > **MCP Servers**.
2. Click **Add new MCP server**.
3. Set Name to `CoverLetterMCP`, Type to `command`, and enter:

```bash
node D:\Projects\Automatic Cover Letter\backend\mcp-server.js
```

### Exposed MCP Tools:

- `get_candidate_profile`: Reads candidate background from `profile.md`.
- `get_ai_skill_rules`: Reads AI humanization rules from `skills.md`.
- `analyze_job_posting`: Parses raw job post text into structured JD and question list.
- `generate_cover_letter`: Creates a tailored humanized cover letter for a given job post.
- `answer_application_questions`: Generates authentic candidate responses for application questions.
- `update_candidate_profile`: Edits `profile.md`.
- `update_ai_skill_rules`: Edits `skills.md`.

---

## License

MIT License. Built for seamless local job application management.
