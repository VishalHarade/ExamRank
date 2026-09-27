# ExamRank — College Coding Examination Portal

> **HackerRank-grade online programming exam platform** built for local college server deployment.  
> Stack: **Next.js 16 · Tailwind CSS v4 · Prisma ORM · MySQL**

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🖥️ Monaco Code Editor | Full VS Code editor in-browser — syntax highlighting, autocomplete |
| ⏱️ Server-Authoritative Timer | Deadline computed & locked on the server — refreshing can't extend time |
| 🛡️ Anti-Cheat Sentinel | Fullscreen enforcement, tab-switch detection, clipboard paste blocker, right-click disable |
| 🚨 Violation System | Escalating warnings → auto-terminate after configurable violation limit |
| ⚙️ Local Code Execution | C, C++, Python, JavaScript run locally via `clang/clang++/python3/node` — no paid APIs |
| ✅ Auto Judge | Hidden + visible test cases, whitespace-normalised comparison, float tolerance, partial scoring |
| 👁️ Live Proctoring | Teacher monitors all candidates in real-time: status, violations, timer, current question |
| 📊 Analytics & Reports | Class averages, pass rate, per-question accuracy, CSV grade export |
| 💾 Autosave | Code auto-saved to MySQL every 8 seconds per question — resume after page refresh |
| 🗃️ Question Bank | Build problems with hidden/sample test cases and language-specific starter code |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MySQL (or `brew install mysql`)

### 1. Install & Set Up

```bash
# Install dependencies
npm install

# Start MySQL (if using Homebrew)
brew services start mysql

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### 2. Open the App

Navigate to **http://localhost:3000**

### 3. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | `student1@college.edu` | `password123` |
| Teacher | `teacher@college.edu` | `password123` |
| Admin | `admin@college.edu` | `admin123` |

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # login / logout / me
│   │   ├── exams/          # CRUD + start / run / submit / violation
│   │   └── questions/      # Question bank CRUD
│   ├── login/              # Login page
│   ├── student/            # Student dashboard + exam workspace
│   └── teacher/            # Teacher dashboard + monitor + results
├── components/
│   ├── exam/               # ExamWorkspace (Monaco + anti-cheat)
│   └── teacher/            # LiveMonitor, ExamResultsView, QuestionBank
└── lib/
    ├── auth.ts             # JWT session management
    ├── judge.ts            # Test case evaluation engine
    ├── prisma.ts           # DB client singleton
    ├── runner.ts           # Local subprocess code executor
    └── utils.ts            # cn(), formatDate(), formatDuration()

prisma/
├── schema.prisma           # Full MySQL schema (13 models)
└── seed.ts                 # Demo data seeder
```

---

## 🔑 Key npm Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:push      # Sync Prisma schema to MySQL
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## 🌍 Environment Variables

Copy `.env.example` to `.env` and update:

```env
DATABASE_URL="mysql://root:@localhost:3306/examrank"
JWT_SECRET="your-secure-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🏫 For Production Deployment (College Server)

Use the included `docker-compose.yml`:

```bash
docker compose up -d
```

This starts a MySQL 8.4 container + the Next.js app container automatically.
