# CourseUp LMS

CourseUp is the Next.js application for the LMS. It keeps the existing MySQL schema and Laravel bcrypt password hashes; the Next.js server connects to the current cPanel database through `mysql2`.

## Local setup

Use Node.js 20.16+ or 22.3+ (Node 24 is supported), then run these commands from `lms-learning-next`:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set the database values in `.env.local` to the existing cPanel MySQL host, port, database, username, and the newly rotated password. Set `DB_SSL=true` only if the database host requires TLS. Generate a separate session key with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set that value as `APP_SESSION_SECRET`. Do not commit `.env.local` or expose any `DB_*` value to browser code.

Run `npm run dev` and open `http://localhost:3000`.

## Database and Vercel

- Keep the existing database and tables; this app does not run migrations or modify the Laravel database schema.
- In cPanel, enable Remote MySQL and grant the database user access to the existing database. The host must permit connections from Vercel; confirm any firewall, outbound IP, and TLS requirements with the hosting provider.
- Add `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SSL`, and `APP_SESSION_SECRET` in the Vercel project's Environment Variables for each environment.
- Create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN` in Vercel. New material PDFs and profile photos are stored in Blob, not on the deployment filesystem.
- Code workspaces use private Vercel Blob storage at `code-workspaces/{userId}/workspace.json`; students must be signed in for cross-device sync. Anonymous workspaces remain in the current browser. The server allows up to 50 files, 1 MB per file, and 20 MB per account. Supported extensions are `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.tsx`, `.php`, and `.json`.
- PHP execution is forwarded to a separate isolated runner using `PHP_RUNNER_URL`; set `PHP_RUNNER_TOKEN` if the runner requires a bearer token. The runner accepts `POST` JSON `{ "files": [{ "name": "index.php", "content": "..." }], "entryFile": "index.php", "userId": 123 }` and must return `{ "html": "...", "output": "..." }`. Run untrusted PHP in a sandbox with CPU, memory, process, filesystem, network, and execution-time limits; never execute it in the Next.js process. The Next.js proxy requires HTTPS in production, allows 10 seconds, and caps the response at 2 MB.
- The React Native TSX preview compiles client-side and renders through React Native Web in an isolated iframe. It supports the built-in `react` and `react-native` imports; arbitrary npm packages and network access from student code are intentionally blocked.
- The CourseUp AI tab defaults to Groq using `GROQ_API_KEY` and `GROQ_MODEL`; `GROQ_MODELS` can list additional admin-approved models. An optional OpenAI-compatible provider can be added with `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` (or `AI_MODELS`). Keep all keys server-only. The assistant requires a signed-in user, reads up to 48 KB of project context, responds in rendered Markdown, and proposes changes only to existing project files. Students explicitly apply proposed changes.
- The React Native terminal is intentionally simulated, not a shell. It accepts only `npm run dev`, then runs the in-browser TSX transform and React Native Web preview; arbitrary commands and package installation are not executed.
- Existing PDFs under `public/Materi` are static files bundled with the app. Their URLs are served through the authenticated course endpoint, but, like any file in a public directory, the underlying static URL can also be requested directly.
- Laravel bcrypt hashes are checked by `bcryptjs`, so current user accounts remain usable after the password is rotated at the database-credential level.

## API

Each resource has its own Route Handler under `app/api/v1/`, for example `faq/route.ts`, `profile/route.ts`, and `auth/login/route.ts`. Shared database logic lives in the private `_handlers/route.ts` module; IDs use resource-specific dynamic segments. Session cookies are HTTP-only and role checks happen on the server.

Course materials keep the original PDF and expose an authenticated Markdown-reading endpoint at `/api/v1/courses/[id]/markdown`. Text is extracted when requested, so no database migration is needed. Scanned/image-only or invalid PDFs fall back to the original PDF viewer with an explanation.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
