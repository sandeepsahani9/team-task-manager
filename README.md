# TaskFlow — Team Task Manager

A full-stack web application for team project management with role-based access control, built with React, Express.js, Prisma, and PostgreSQL.

## Features

- **Authentication** — Signup/Login with JWT tokens
- **Projects** — Create, edit, delete projects with color themes
- **Team Management** — Add/remove members, assign Admin/Member roles
- **Tasks** — Full CRUD with status (To Do, In Progress, In Review, Done) and priority (Low, Medium, High, Urgent)
- **Kanban Board** — Drag-friendly visual task management
- **Dashboard** — Stats, charts, overdue tasks, recent activity
- **Role-Based Access** — Admins manage projects/members, Members manage tasks
- **Responsive** — Works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Charts | Recharts |
| Deployment | Railway |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd team-task-manager

# Install server dependencies
cd server
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL

# Run Prisma migrations
npx prisma migrate dev

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev
```

Visit `http://localhost:5173`

## Deployment (Railway)

1. Push code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Add PostgreSQL plugin
4. Add a service from your GitHub repo
5. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway PostgreSQL)
   - `JWT_SECRET` — your secret key
   - `NODE_ENV=production`
   - `CLIENT_URL` — your Railway app URL
6. Set build command: `cd client && npm install && npm run build && cd ../server && npm install && npx prisma generate && npx prisma migrate deploy`
7. Set start command: `cd server && node src/index.js`

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/signup | Register | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Get current user | Yes |
| GET | /api/projects | List projects | Yes |
| POST | /api/projects | Create project | Yes |
| GET | /api/projects/:id | Get project | Yes |
| PUT | /api/projects/:id | Update project | Admin |
| DELETE | /api/projects/:id | Delete project | Admin |
| GET | /api/tasks | List all tasks | Yes |
| POST | /api/tasks | Create task | Yes |
| PUT | /api/tasks/:id | Update task | Yes |
| DELETE | /api/tasks/:id | Delete task | Admin/Creator |
| POST | /api/teams/:projectId/members | Add member | Admin |
| DELETE | /api/teams/:projectId/members/:id | Remove member | Admin |
| GET | /api/dashboard | Dashboard stats | Yes |

## License

MIT
