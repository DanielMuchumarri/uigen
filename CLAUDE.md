# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator. Users describe components in a chat interface; Claude Haiku generates React/JSX code into a virtual file system that is live-previewed in a sandboxed iframe.

## Commands

```bash
npm run setup        # First-time setup: install + prisma generate + migrate
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (run once)
npm run db:reset     # Wipe and recreate SQLite dev database
```

Run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

Environment: copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` (optional — app works without it using a mock provider).

## Architecture

### Data Flow

1. User types in chat → `ChatProvider` (`lib/contexts/chat-context.tsx`) submits messages + serialized VFS to `POST /api/chat`
2. `/api/chat/route.ts` calls Claude Haiku via Vercel AI SDK `streamText()`, exposing two tools: `str_replace_editor` (create/view/modify files) and `file_manager` (rename/delete)
3. Tool calls stream back to the client and are processed by `FileSystemProvider` (`lib/contexts/file-system-context.tsx`), which updates the in-memory VFS
4. `PreviewFrame` (`components/preview/PreviewFrame.tsx`) detects VFS changes, transpiles JSX via Babel standalone, and re-renders the component in a sandboxed iframe using import maps (third-party packages resolved via esm.sh)

### Virtual File System

`lib/file-system.ts` — a fully in-memory FS. No files are written to disk; everything lives in a `Map<string, string>` serialized as JSON and sent with each chat request. `App.jsx` is the required entry point.

### AI Provider

`lib/provider.ts` — uses `claude-haiku-4-5` when `ANTHROPIC_API_KEY` is set. Falls back to `MockLanguageModel` which generates a simple Counter/Form/Card component in a scripted multi-step fashion for demo purposes.

### Layout

`components/main-content.tsx` drives a split-panel UI (react-resizable-panels):
- Left panel: Chat (`components/chat/`)
- Right panel: toggles between Preview (`components/preview/PreviewFrame.tsx`) and Code view (file tree + Monaco editor from `components/editor/`)

### Auth & Persistence

- JWT sessions via JOSE, stored in HTTP-only cookies (7-day expiry)
- `middleware.ts` guards `/api/projects` and `/api/filesystem`
- Prisma + SQLite (`prisma/dev.db`): `User` and `Project` models; project messages and VFS state stored as JSON strings
- After Claude finishes responding, `/api/chat` saves the project to the database (authenticated users only)
- Anonymous users: work is tracked in memory/localStorage; saved on sign-in

### Key Conventions

- Path alias `@/` maps to `src/`; use it for all internal imports
- Tailwind CSS 4 for styling; Radix UI primitives wrapped in `components/ui/`
- Server Actions in `actions/` handle auth and project CRUD (Next.js `"use server"`)
- The generation system prompt lives in `lib/prompts/generation.tsx`
- Tests use Vitest + Testing Library with a jsdom environment
- Use comments sparingly — only for non-obvious, complex logic where intent cannot be inferred from the code itself
