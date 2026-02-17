# Real-Time Task Collaboration Platform (Trello/Notion Lite)

This repo contains a working **frontend + backend** project with:
- Auth (signup/login)
- Boards → Lists → Tasks (CRUD)
- Drag & drop tasks across lists
- Assign members to tasks
- Real-time updates (Socket.IO)
- Activity history (audit log)
- Pagination + search
- PostgreSQL schema + migrations (Prisma)
- Basic tests

---

## Demo Credentials (after seeding)

- **demo1@app.com / Password@123**
- **demo2@app.com / Password@123**

---

## Prerequisites

- Node.js 18+
- Git
- Docker Desktop (recommended) OR your own PostgreSQL

---

## Run Locally (Step-by-step)

### 1) Start Postgres
From repo root:

```bash
docker compose up -d
```

### 2) Backend setup
```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend: http://localhost:8080  
Health: http://localhost:8080/health

### 3) Frontend setup
Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Verify Real-time (2 browsers)

1. Open the app in **two** browsers (or normal + incognito)
2. Login:
   - Browser 1: demo1@app.com / Password@123
   - Browser 2: demo2@app.com / Password@123
3. Open the same board
4. Drag tasks between lists → both screens update instantly.

---

# Architecture (Short)

## Frontend
- React SPA (Vite)
- RTK Query for server state caching
- Socket.IO client listens for events and patches RTK Query cache
- dnd-kit handles drag/drop

## Backend
- Express REST APIs
- JWT auth middleware
- Socket.IO rooms per board: `board:<boardId>`
- On each mutation: DB write → Activity write → emit event

## Database
- PostgreSQL
- Prisma ORM schema:
  User, Board, BoardMember, List, Task, TaskAssignee, Activity
- Indexed columns for ordering + timeline queries

---

# API Documentation (REST)

Base URL: `http://localhost:8080/api`  
Auth header: `Authorization: Bearer <token>`

## Auth
- POST `/auth/signup`
- POST `/auth/login`
- GET `/auth/me`

## Boards
- GET `/boards?page=1&limit=10&q=`
- POST `/boards`
- GET `/boards/:boardId`
- POST `/boards/:boardId/members` (owner only)
- GET `/boards/:boardId/activity?page=1&limit=20`

## Lists
- POST `/lists/board/:boardId`
- PATCH `/lists/:listId`
- DELETE `/lists/:listId`

## Tasks
- POST `/tasks/list/:listId`
- PATCH `/tasks/:taskId`
- DELETE `/tasks/:taskId`
- PATCH `/tasks/:taskId/move`
- POST `/tasks/:taskId/assignees`
- DELETE `/tasks/:taskId/assignees/:userId`

---

# WebSocket Events

Client connects with JWT in handshake. Client joins a board room:
- emit `board:join` `{ boardId }`

Server broadcasts:
- `list:created`, `list:updated`, `list:deleted`
- `task:created`, `task:updated`, `task:deleted`, `task:moved`
- `task:assignee_added`, `task:assignee_removed`

---

# Assumptions & Trade-offs

- Task ordering uses integer `position` with shifting updates (simple + correct for MVP).
- Search uses case-insensitive `contains` (upgrade to full-text/trigram later).
- DB is the source of truth; clients patch state from socket events (fallback: refetch board).

---

# Tests

Backend:
```bash
cd server
npm test
```

Frontend:
```bash
cd client
npm test
```

---

# How to Push to GitHub (Beginner steps)

See the chat instructions (I will guide you step-by-step).
