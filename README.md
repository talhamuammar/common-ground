# Common Ground

A deliberately small social app prototype with exactly three capabilities: registering, logging in, and creating/viewing posts.

## Stack

- `frontend/`: Next.js and TypeScript
- `backend/`: NestJS, Prisma, PostgreSQL, JWT, and Argon2
- PostgreSQL runs locally; Docker is not used by this project.

## Prerequisites

- Node.js 20+
- PostgreSQL running locally
- A PostgreSQL database named `socialdb` and a user that can access it

For the example credentials, run the following in `psql` as a PostgreSQL administrator:

```sql
CREATE USER social WITH PASSWORD 'socialpass';
CREATE DATABASE socialdb OWNER social;
```

## Set up the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

Change `JWT_SECRET` in `backend/.env` before using the app beyond local development. The API runs at `http://localhost:3001` and exposes:

- `POST /auth/register`
- `POST /auth/login`
- `POST /posts` (Bearer token required)
- `GET /posts`
- `GET /posts/:id`

## Set up the frontend

In a second terminal:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

The browser stores the prototype access token in local storage. This keeps the first version simple; a production app should prefer a secure, HTTP-only cookie and a fuller session design.
