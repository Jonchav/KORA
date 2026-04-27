# Workspace

## Overview

KORA — AI Creative Social Media Studio at koraframe.com. Users upload a photo (with visible face) and transform it into 29 AI art styles (growing). 4 social media output formats. Token-based monetization: 3 plans ($1/10 tokens, $4.99/60 tokens, $9.99/150 tokens). Deployed to Render via `git push origin master`.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite, Tailwind CSS, framer-motion, react-dropzone
- **AI pipelines**:
  - `fofr/face-to-many` (InstantID) — cartoon/artistic styles
  - `black-forest-labs/flux-dev` img2img — photorealistic styles (luxury, hollywood, timetraveler, movie scenes, studio)
  - SDXL/Seedream — generate mode (no input photo)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/             # Express API server (handles image upload + Replicate AI calls)
│   └── cinematic-ai/           # React + Vite frontend
├── lib/
│   └── db/                     # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
└── package.json
```

## Style Catalog (29 total)

### Face-to-Many / InstantID pipeline (artistic/cartoon)
comic, anime, popart, watercolor, oilpainting, cyberpunk, pixel, clay, toy, vaporwave, fantasy, gtasa, dccomic, fortnite, sims

### FLUX img2img pipeline (photorealistic)
- **Lifestyle**: luxury, hollywood, timetraveler
- **Movie Scenes**: matrix, titanic, starwars, godfather, madmax, interstellar, gatsby, wonderwoman
- **Studio Session**: studiowhite, studiogray, studiodark

### Key FLUX parameters
- Movie styles: `prompt_strength=0.92`, `guidance=7.5`, `steps=40`
- Lifestyle (luxury/hollywood/timetraveler): `prompt_strength=0.60`, `guidance=3.5`, `steps=35`
- Studio styles: `prompt_strength=0.55`, `guidance=3.0`, `steps=35` (preserves identity, only changes bg/lighting)

## Pipeline Routing (transform.ts)

1. `FLUX_IMG2IMG_STYLES.has(style)` → `runFluxImg2ImgPipeline()`
2. else → `FACE_TO_MANY_CONFIG[style]` via `fofr/face-to-many`

## Image Serving

Movie style cover images are imported as JS modules (not `/examples/` public paths) so Vite bundles them with content hashes into `dist/public/assets/`.

## DB Schema Changes

When adding new style enum values:
1. Update `lib/db/src/schema/generations.ts` (styleEnum)
2. Rebuild lib/db types: `cd lib/db && npx tsc -p tsconfig.json`
3. Update `Style` type in `transform.ts`, `StyleType` in `use-transform.ts`
4. After deploying to Render: run `pnpm --filter @workspace/db run push` in the Render Shell to apply `ALTER TYPE ... ADD VALUE` to the live PostgreSQL enum

## Key Files

- `artifacts/api-server/src/routes/transform.ts` — all AI pipeline logic
- `artifacts/cinematic-ai/src/components/style-card.tsx` — style configs + cover images
- `artifacts/cinematic-ai/src/pages/home.tsx` — card patterns/decorations, main UI
- `artifacts/cinematic-ai/src/pages/gallery.tsx` — past generations gallery
- `artifacts/cinematic-ai/src/hooks/use-transform.ts` — StyleType, API calls
- `lib/db/src/schema/generations.ts` — DB schema with style enum

## Deploy

User pushes via Replit Git panel → auto-deploys to Render. After adding new DB enum values, must run `pnpm --filter @workspace/db run push` in Render Shell.
