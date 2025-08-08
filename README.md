# WhatsApp Clone - Demo (Monorepo)

This is a runnable demo project for the Full Stack Developer evaluation task: a WhatsApp Web–like interface that reads sample webhook payloads and displays conversations.

## What is included
- `server/` — Node.js + Express backend with MongoDB (Mongoose) and Socket.IO.
- `server/scripts/payloads/` — the sample payload JSON files you uploaded.
- `public/` — a simple frontend (HTML/JS) served by the backend.

## Quick start (local)
1. Ensure you have Node.js (>=16) and npm, and MongoDB available:
   - You can run a local MongoDB server (`mongod`) or use MongoDB Atlas and set `MONGO_URI`.

2. Copy env:
   ```bash
   cd server
   cp .env.example .env
   # edit .env to set MONGO_URI if needed
   ```

3. Install dependencies and start:
   ```bash
   cd server
   npm install
   npm start
   ```

   The server serves the frontend at http://localhost:4000

4. Seed the database with the included payloads:
   ```bash
   cd server
   npm run process
   ```

   This reads JSON files from `server/scripts/payloads` and inserts/updates messages in MongoDB.

5. Open the app: visit http://localhost:4000

## Endpoints
- `GET /api/conversations` — list conversations grouped by `wa_id`
- `GET /api/messages/:wa_id` — messages for a conversation
- `POST /api/messages/:wa_id/send` — create (store-only) a new outgoing message
- `POST /webhook` — webhook receiver (you can `POST` sample payloads here)

## Deployment
- Deploy `server/` to Render/Heroku/Railway. Set `MONGO_URI` env variable.
- The `public/` static frontend is served by the Express server.

## Notes and assumptions
- Status updates use `meta_msg_id` or `id` fields to match messages.
- The frontend is intentionally simple to make running locally easier. It demonstrates:
  - Conversations list
  - Message bubbles
  - Send message (saves to DB)
  - Real-time updates via Socket.IO

## Need help?
If you want, I can:
- Convert the frontend to Next.js + Tailwind for a closer WhatsApp UI.
- Provide instructions for deploying to Render/Vercel.
- Produce a GitHub-ready repo structure.

