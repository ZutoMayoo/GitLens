# 🔍 GitLens — Visual Narrative of Code History

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/D3.js-F9A03C?style=flat&logo=d3dotjs&logoColor=white" alt="D3.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
</p>

<p align="center">
  <b>Transform git commit history into an interactive visual story —<br/>understand how any codebase evolved.</b>
</p>

<p align="center">
  <em>Supports local repos and GitHub URLs · AI-powered insights (optional) · Dark/Light mode · English/中文</em>
</p>

---

## Preface
This repo can be considered as one of my practice works with vibe coding and agent assistance. However it doesn't mean this project is low-quality. I've tested by myself to made sure it's usable and solid. Of course its performance cannot reach my primitive expectation, but its functions are complete. If you have any questions or suggestions please let me know - create an issue or just send me an e-mail at ZUTOMAYO1215@outlook.com.

## ✨ Features

- ⏱ **Interactive Timeline** — D3.js-powered visual timeline showing commit clusters over time
- 🔥 **File Change Heatmap** — Treemap of which files/modules change most frequently
- 👥 **Contributor Analysis** — Bar charts and stats showing who contributed what
- 🤖 **AI Semantic Clustering** *(optional)* — LLM-powered commit grouping with human-readable labels and importance scoring
- 🔗 **GitHub URL Support** — Paste a GitHub link, auto-clone and analyze
- 🌐 **i18n** — English and 简体中文
- 🌓 **Dark/Light Mode** — Follows system preference, with manual toggle

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm

### Install & Run

```bash
# Clone
git clone https://github.com/<your-username>/gitlens.git
cd gitlens

# Install dependencies
pnpm install

# Start development (server + web)
pnpm dev
```

Open **http://localhost:5173** and enter a local repo path or a GitHub URL:

```
D:/projects/my-app
https://github.com/facebook/react
```

### Optional: Enable AI Analysis

Copy the example env file and add your API key:

```bash
cp .env.example .env
# Edit .env with your key

# Supported: Anthropic, OpenAI, or DeepSeek (Anthropic-compatible)
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the server and toggle the **AI** switch in the UI.

If no API key is configured, GitLens still works — it uses a rule-based commit grouping algorithm.

---

## 🏗 Architecture

```
gitlens/
├── packages/
│   ├── engine/              # Core analysis engine
│   │   ├── git-parser.ts    # git log → structured data
│   │   ├── commit-grouper   # Rule-based clustering (Jaccard + temporal)
│   │   ├── heatmap.ts       # File change treemap data
│   │   └── llm/             # AI clustering & narratives
│   │       ├── client.ts    # Multi-provider LLM client
│   │       ├── cluster.ts   # Semantic commit clustering
│   │       └── narrate.ts   # Milestone narrative generation
│   │
│   ├── server/              # Express API + WebSocket
│   │   ├── routes/          # REST endpoints
│   │   ├── services/        # Analysis orchestration + cloning
│   │   └── db/              # SQLite caching
│   │
│   └── web/                 # React + D3 frontend
│       └── components/
│           ├── Timeline/    # D3 interactive timeline
│           ├── HeatMap/     # D3 file treemap
│           └── Authors/     # Recharts contributor charts
```

### Data Flow

```
[Git Repo / GitHub URL]
        │
        ▼
  git clone (if URL)
        │
  git log --name-only ──→ structured commits[]
        │                        │
  rule-based grouping ◄──────────┘
        │                        │
  LLM clustering (optional) ◄────┘
        │
  SQLite cache ──→ Express API ──→ React + D3 Dashboard
        │
  WebSocket (real-time progress)
```

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Language** | TypeScript (full-stack) | Type safety, single language |
| **Git parsing** | simple-git | Fast wrapper over git CLI |
| **API** | Express + ws | REST + real-time progress |
| **Frontend** | React 18 + Vite | Modern SPA |
| **Styling** | Tailwind CSS | Utility-first, dark mode |
| **Charts** | D3.js + Recharts | Custom timeline + standard charts |
| **Cache** | better-sqlite3 | Zero-config local storage |
| **AI (opt.)** | OpenAI / Anthropic / DeepSeek | Semantic analysis |
| **Monorepo** | pnpm workspace | Simple package management |

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyze` | Start analysis `{repoPath, maxCommits?, useLLM?}` |
| `GET` | `/api/repos` | List cached analyses |
| `GET` | `/api/repos/:id` | Get cached result |
| `GET` | `/api/config` | Server config (LLM availability) |
| `GET` | `/api/health` | Health check |
| `WS` | `/ws` | Real-time progress events |

## 🎯 Key Design Decisions

### LLM is Optional
The engine works fully without any API keys. The rule-based grouper uses temporal proximity + Jaccard file similarity. AI semantic clustering is an enhancement, not a requirement.

### D3.js for Core Visuals
The timeline and treemap use D3 directly to demonstrate understanding of visualization fundamentals. Standard charts use Recharts for productivity.

### SQLite Caching
Results are cached by repo path + HEAD hash. Re-analysis of the same repo is instant. GitHub clones are cached in the system temp directory.

### `--name-only` over `--numstat`
We use `git log --name-only` instead of `--numstat` for the main parse pass. This is **5-10x faster** and the heatmap only needs file change counts, not line-level diffs.

---

## 📝 License

MIT — see [LICENSE](./LICENSE)

---

## 🙋 FAQ

**Q: Does it work without internet?**
Yes — local repo analysis works completely offline. Only GitHub URL cloning and AI features need network.

**Q: What's the largest repo it can handle?**
Tested comfortably up to ~500 commits. For larger repos, use the `maxCommits` parameter to limit. The `--name-only` optimization keeps parsing fast.

**Q: Can I use it with a self-hosted LLM?**
Yes — set `ANTHROPIC_BASE_URL` or `OPENAI_BASE_URL` in `.env` to point to any OpenAI/Anthropic-compatible endpoint (Ollama, vLLM, LiteLLM, etc.).
