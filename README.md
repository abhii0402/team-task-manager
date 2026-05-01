# TaskFlow — Team Task Manager

A full-stack web application for team project and task management with role-based access control.

## 🚀 Features

- **Authentication** — Signup/Login with JWT tokens
- **Projects** — Create, update, delete projects
- **Team Management** — Invite members by email, assign Admin/Member roles
- **Tasks** — Create, assign, track with Kanban board (Todo → In Progress → Done)
- **Dashboard** — Stats overview, overdue tasks, recent activity
- **Role-Based Access** — Admins manage members & delete tasks; Members update status

## ⚙️ Tech Stack

| Layer | Technology |
|:---|:---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Auth | JWT + bcrypt |
| Styling | Vanilla CSS (Dark Theme) |
| Deployment | Railway |

## 📦 Project Structure

```
├── server/          # Express REST API
│   ├── config/      # Database connection
│   ├── controllers/ # Route handlers
│   ├── middleware/   # Auth & RBAC
│   ├── models/      # Mongoose schemas
│   ├── routes/      # API routes
│   └── server.js    # Entry point
│
├── client/          # React SPA
│   ├── src/
│   │   ├── api/         # Axios config
│   │   ├── components/  # Reusable UI
│   │   ├── context/     # Auth & Toast
│   │   └── pages/       # Route pages
│   └── index.html
```

## 🛠️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)

### Backend
```bash
cd server
cp .env.example .env
# Optional: Edit .env with your MongoDB URI. 
# If left empty, it will auto-start an in-memory database!
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`, API at `http://localhost:5000`.
**Note**: The backend auto-detects if you haven't set a MongoDB URI and starts a local in-memory instance for testing.

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user

### Projects
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create project
- `GET /api/projects/:id` — Get project
- `PUT /api/projects/:id` — Update (Admin)
- `DELETE /api/projects/:id` — Delete (Admin)
- `POST /api/projects/:id/members` — Add member (Admin)
- `DELETE /api/projects/:id/members/:userId` — Remove member (Admin)

### Tasks
- `GET /api/tasks/project/:projectId` — List project tasks
- `POST /api/tasks/project/:projectId` — Create task
- `PUT /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete (Admin)
- `GET /api/tasks/dashboard/stats` — Dashboard stats

## 🔐 Role-Based Access

| Action | Admin | Member |
|:---|:---|:---|
| Create project | ✅ | ✅ |
| Edit/delete project | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Update task status | ✅ | ✅ |
| Delete tasks | ✅ | ❌ |

## 🌐 Deployment (Railway)

1. Push to GitHub
2. Create Railway project
3. Add backend service (root: `server/`)
4. Add MongoDB plugin or use Atlas URI
5. Set environment variables
6. Add frontend service (root: `client/`)
7. Set `VITE_API_URL` to backend URL
8. Generate domains for both services

## 📄 License

MIT
