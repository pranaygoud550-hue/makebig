# Make Big

Student startup collaboration platform — find teammates, publish projects, verify skills, and get AI cofounder guidance.

**Live:** [makebig.vercel.app](https://makebig.vercel.app)

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| API (Vercel) | Next.js route handlers — OTP auth, public explore, skills |
| API (Render) | Express + Socket.io — projects, chat, AI streams, notifications |
| Database | MongoDB Atlas |
| Email | Resend (OTP) |
| Deploy | Vercel (frontend) + Render (real-time API) |

```
Browser → Vercel (Next.js)
              ↓ NEXT_PUBLIC_API_URL
         Render (Express + Socket.io)
              ↓ MONGODB_URI
         MongoDB Atlas
```

## Features

- OTP sign-in / sign-up (MongoDB-backed)
- Project wizard, explore feed, public project pages (`/p/[slug]`)
- Skill verification exam (MCQ + coding)
- AI cofounder & idea validator
- Mentors, friends, weekly leaderboard, demo day
- Real-time project chat (Socket.io on Render)

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB Atlas connection string (or local MongoDB)

### Install & run locally

```bash
npm install
cp .env.example .env   # fill MONGODB_URI, JWT_SECRET, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API server (optional — for Socket.io & legacy routes)

```bash
npm run api:dev
```

Runs Express on port **5001** by default. Set `NEXT_PUBLIC_API_URL=http://localhost:5001` in `.env`.

### Build & test

```bash
npm run build
npm test
```

## Environment

Copy `.env.example` and set at minimum:

| Variable | Where | Purpose |
|----------|-------|---------|
| `MONGODB_URI` | Vercel + Render | Database |
| `JWT_SECRET` | Vercel + Render | **Same value on both** — session cookies |
| `NEXT_PUBLIC_API_URL` | Vercel | Render API URL |
| `NEXT_PUBLIC_APP_URL` | Vercel | Canonical site URL |
| `RESEND_API_KEY` | Vercel | OTP email (optional) |
| `ANTHROPIC_API_KEY` / `GROQ_API_KEY` | Render | AI cofounder |

Generate deploy env blocks:

```bash
npm run deploy:env
```

See [DEPLOY_SPLIT.md](./DEPLOY_SPLIT.md) for full Vercel + Render setup.

## Project structure

```
app/              # Next.js routes (pages + API handlers)
components/       # UI, landing, app tabs, modals
lib/              # API client, OTP, Mongo helpers, hooks
backend/          # Express server, Mongoose models, controllers
scripts/          # Demo seed, deploy helpers
tests/            # Vitest unit tests
```

## Demo data

```bash
npm run seed:demo      # seed showcase users/projects
npm run cleanup:demo -- --confirm   # remove demo data from MongoDB
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run api:dev` | Express API + WebSocket |
| `npm run build` | Production build |
| `npm test` | Vitest test suite |
| `npm run seed:demo` | Seed demo showcase data |
| `npm run deploy:env` | Print Vercel/Render env blocks |

## License

MIT
