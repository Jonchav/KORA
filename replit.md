# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Cinematic AI Photo Transformer application — users upload a photo and AI transforms it into a cinematic-style image using Replicate's Stable Diffusion img2img model.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Replicate API (stability-ai/stable-diffusion-img2img)
- **Frontend**: React + Vite, Tailwind CSS, framer-motion, react-dropzone

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/             # Express API server (handles image upload + Replicate AI calls)
│   └── cinematic-ai/           # React + Vite frontend (drag-and-drop, presets, results)
├── lib/
│   ├── api-spec/               # OpenAPI spec + Orval codegen config
│   ├── api-client-react/       # Generated React Query hooks
│   ├── api-zod/                # Generated Zod schemas from OpenAPI
│   └── db/                     # Drizzle ORM schema + DB connection
├── scripts/                    # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

- Upload JPG/PNG photos (up to 10MB) via drag-and-drop or file browser
- 5 cinematic style presets: Classic Cinematic, Sci-Fi, Neo-Noir, Warm Hollywood, Dramatic Portrait
- Optional letterbox bars (2.39:1 aspect ratio)
- Real-time progress polling (every 3 seconds) until AI result is ready
- Download the transformed image in high resolution

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Environment Variables / Secrets

- `REPLICATE_API_TOKEN` — Required. Replicate API key for Stable Diffusion img2img.

## API Routes

- `POST /api/transform` — multipart/form-data with `image`, `preset`, `letterbox`
- `GET /api/transform/:jobId/status` — poll job status (pending/processing/completed/failed)
- `GET /api/healthz` — health check

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API types from OpenAPI spec
