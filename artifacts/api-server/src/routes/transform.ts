import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import Replicate from "replicate";
import fs from "fs";
import path from "path";
import os from "os";

const router: IRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `upload-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
  },
});

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export type Style = "comic" | "anime" | "popart" | "watercolor" | "oilpainting" | "cyberpunk";
export type Format = "square" | "portrait" | "story" | "landscape";

const FORMAT_RATIOS: Record<Format, string> = {
  square: "1:1",
  portrait: "4:5",
  story: "9:16",
  landscape: "16:9",
};

const SEEDREAM_PROMPTS: Record<Style, string> = {
  comic:
    "Epic comic book splash page, dynamic superhero battle scene above a neon city skyline, bold black ink outlines, halftone dot shading, vibrant primary colors, lightning and energy beams, action debris, dramatic upward angle, Marvel Comics quality, ultra detailed, 4K resolution",
  anime:
    "Breathtaking Studio Ghibli anime landscape, magical floating islands with waterfalls and cherry blossoms, golden hour sunlight through clouds, a small village on the cliffs, flying creatures in the distance, lush green valleys, painted sky with volumetric light, ultra detailed masterpiece",
  popart:
    "Andy Warhol style pop art gallery installation, bold colorful grid of repeated iconic images, silkscreen print aesthetic, hot pink electric blue and lime green palette, graphic geometric shapes, 1960s commercial art, ultra vibrant and energetic, high resolution poster art",
  watercolor:
    "Romantic European cobblestone street in rain, watercolor painting, blossoming flower stalls, warm cafe lights, umbrellas, impressionist brushwork, bleeding color washes, soft atmospheric haze, moody and beautiful, award-winning fine art illustration",
  oilpainting:
    "Grand baroque oil painting of a mythological golden hall, dramatic chiaroscuro lighting from a cathedral window, rich velvet curtains and marble columns, angelic figures in motion, Caravaggio and Rembrandt influence, deep warm amber tones, thick impasto brushwork, museum quality masterpiece",
  cyberpunk:
    "Futuristic mega-city at night, towering holographic neon billboards in Japanese and English, flying vehicles in rain, chrome and glass skyscrapers, neon-lit street markets below, purple and cyan atmospheric glow, Blade Runner 2049 cinematic quality, ultra-detailed 8K sci-fi concept art",
};

interface JobRecord {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageBuffer?: Buffer;
  error?: string;
  style: string;
  mode: "transform" | "generate";
}

const jobs = new Map<string, JobRecord>();

function extractUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof (value as any).url === "function") return (value as any).url().toString();
  if (value && typeof (value as any).url === "string") return (value as any).url;
  return String(value);
}

// ── Manual posterize via raw pixel manipulation ───────────────────────────────
async function posterize(buf: Buffer, levels: number): Promise<Buffer> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const step = 255 / (levels - 1);
  const out = Buffer.from(data);
  for (let i = 0; i < info.width * info.height; i++) {
    const base = i * 4;
    out[base]     = Math.round(Math.round(data[base]     / step) * step);
    out[base + 1] = Math.round(Math.round(data[base + 1] / step) * step);
    out[base + 2] = Math.round(Math.round(data[base + 2] / step) * step);
    // keep alpha
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// ── Edge detection overlay (black outlines) ───────────────────────────────────
async function getEdgeOverlay(buf: Buffer, threshold: number, strength: number): Promise<Buffer> {
  const { data: edgeData, info } = await sharp(buf)
    .greyscale()
    .convolve({
      width: 3, height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      scale: 1, offset: 0,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build RGBA buffer: dark where edge detected, transparent elsewhere
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const v = Math.min(255, edgeData[i] * strength);
    const alpha = v > threshold ? Math.min(255, (v - threshold) * 2) : 0;
    out[i * 4] = 0;
    out[i * 4 + 1] = 0;
    out[i * 4 + 2] = 0;
    out[i * 4 + 3] = alpha;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function svgRect(w: number, h: number, fill: string, opacity: number): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${fill}" opacity="${opacity}"/></svg>`);
}

function svgVignette(w: number, h: number, opacity: number): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="v" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="65%" stop-color="black" stop-opacity="${(opacity * 0.25).toFixed(2)}"/>
      <stop offset="100%" stop-color="black" stop-opacity="${opacity.toFixed(2)}"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#v)"/>
  </svg>`);
}

// ── COMIC BOOK ────────────────────────────────────────────────────────────────
async function applyComic(buf: Buffer, w: number, h: number): Promise<Buffer> {
  // Step 1: Boost saturation + contrast for base
  const base = await sharp(buf)
    .modulate({ saturation: 2.8, brightness: 1.05 })
    .linear(1.35, -22)
    .png().toBuffer();

  // Step 2: Posterize to flat comic colors
  const flatColors = await posterize(base, 6);

  // Step 3: Strong edge outlines
  const edges = await getEdgeOverlay(buf, 20, 5);
  const vignette = svgVignette(w, h, 0.45);
  const yellowTint = svgRect(w, h, "#ffee44", 0.05);

  return sharp(flatColors)
    .composite([
      { input: edges, blend: "over" },
      { input: yellowTint, blend: "screen" },
      { input: vignette, blend: "over" },
    ])
    .png().toBuffer();
}

// ── ANIME ─────────────────────────────────────────────────────────────────────
async function applyAnime(buf: Buffer, w: number, h: number): Promise<Buffer> {
  const base = await sharp(buf)
    .blur(0.5)
    .modulate({ saturation: 2.2, brightness: 1.1 })
    .recomb([
      [1.04, 0.0, 0.0],
      [0.0, 1.01, 0.06],
      [0.0, 0.04, 1.12],
    ])
    .linear(1.1, 10)
    .png().toBuffer();

  // Light cel edges
  const edges = await getEdgeOverlay(buf, 35, 3.5);
  const glow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ffccff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffccff" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`);

  return sharp(base)
    .composite([
      { input: edges, blend: "over" },
      { input: glow, blend: "screen" },
    ])
    .png().toBuffer();
}

// ── POP ART ───────────────────────────────────────────────────────────────────
async function applyPopart(buf: Buffer, w: number, h: number): Promise<Buffer> {
  const boosted = await sharp(buf)
    .modulate({ saturation: 3.8, brightness: 1.12 })
    .linear(1.6, -45)
    .recomb([
      [1.3, 0.0, 0.0],
      [0.0, 1.1, 0.0],
      [0.0, 0.0, 0.85],
    ])
    .png().toBuffer();

  const flatColors = await posterize(boosted, 5);
  const edges = await getEdgeOverlay(buf, 18, 6);
  const vignette = svgVignette(w, h, 0.35);
  const pinkTint = svgRect(w, h, "#ff0088", 0.05);

  return sharp(flatColors)
    .composite([
      { input: edges, blend: "over" },
      { input: pinkTint, blend: "screen" },
      { input: vignette, blend: "over" },
    ])
    .png().toBuffer();
}

// ── WATERCOLOR ────────────────────────────────────────────────────────────────
async function applyWatercolor(buf: Buffer, w: number, h: number): Promise<Buffer> {
  // Multiple blur passes to simulate watercolor diffusion
  const soft = await sharp(buf).blur(1.2).png().toBuffer();
  const base = await sharp(soft)
    .modulate({ saturation: 1.55, brightness: 1.07 })
    .recomb([
      [0.96, 0.04, 0.0],
      [0.0, 0.94, 0.06],
      [0.0, 0.04, 1.04],
    ])
    .linear(1.08, 12)
    .png().toBuffer();

  // Add grain for paper texture
  const { info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const grainData = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const n = 128 + Math.floor((Math.random() - 0.5) * 60);
    grainData[i * 4] = n; grainData[i * 4 + 1] = n; grainData[i * 4 + 2] = n;
    grainData[i * 4 + 3] = 12;
  }
  const grain = await sharp(grainData, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();

  const paper = svgRect(w, h, "#f0e8d8", 0.12);
  const vignette = svgVignette(w, h, 0.42);

  return sharp(base)
    .composite([
      { input: paper, blend: "soft-light" },
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png().toBuffer();
}

// ── OIL PAINTING ──────────────────────────────────────────────────────────────
async function applyOilpainting(buf: Buffer, w: number, h: number): Promise<Buffer> {
  const base = await sharp(buf)
    .sharpen({ sigma: 1.4, m1: 4, m2: 10 })
    .modulate({ saturation: 1.65, brightness: 0.94 })
    .recomb([
      [1.18, 0.08, -0.06],
      [0.02, 1.0, 0.0],
      [-0.06, 0.0, 0.88],
    ])
    .linear(1.28, -24)
    .png().toBuffer();

  const { info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const grainData = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const n = 128 + Math.floor((Math.random() - 0.5) * 80);
    grainData[i * 4] = n; grainData[i * 4 + 1] = n; grainData[i * 4 + 2] = n;
    grainData[i * 4 + 3] = 24;
  }
  const grain = await sharp(grainData, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();

  const warmTone = svgRect(w, h, "#6a2a00", 0.1);
  const vignette = svgVignette(w, h, 0.65);

  return sharp(base)
    .composite([
      { input: warmTone, blend: "soft-light" },
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png().toBuffer();
}

// ── CYBERPUNK ─────────────────────────────────────────────────────────────────
async function applyCyberpunk(buf: Buffer, w: number, h: number): Promise<Buffer> {
  const base = await sharp(buf)
    .recomb([
      [0.65, 0.1, 0.25],
      [0.0, 0.75, 0.35],
      [0.12, 0.1, 1.55],
    ])
    .modulate({ saturation: 2.4, brightness: 0.86 })
    .linear(1.32, -25)
    .png().toBuffer();

  const { info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const grainData = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const n = 128 + Math.floor((Math.random() - 0.5) * 70);
    grainData[i * 4] = n; grainData[i * 4 + 1] = n; grainData[i * 4 + 2] = n;
    grainData[i * 4 + 3] = 18;
  }
  const grain = await sharp(grainData, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();

  const neonGlow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="n" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#00ffe7" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#cc00ff" stop-opacity="0.1"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#n)"/>
  </svg>`);
  const vignette = svgVignette(w, h, 0.7);

  return sharp(base)
    .composite([
      { input: neonGlow, blend: "screen" },
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png().toBuffer();
}

// ── JOB RUNNER ────────────────────────────────────────────────────────────────
async function runTransformJob(jobId: string, imagePath: string, style: Style, _format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const buf = fs.readFileSync(imagePath);
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 1024;
    const h = meta.height ?? 768;

    console.log(`[${jobId}] Applying ${style} effect (${w}x${h})...`);
    let result: Buffer;

    switch (style) {
      case "comic":       result = await applyComic(buf, w, h);       break;
      case "anime":       result = await applyAnime(buf, w, h);       break;
      case "popart":      result = await applyPopart(buf, w, h);      break;
      case "watercolor":  result = await applyWatercolor(buf, w, h);  break;
      case "oilpainting": result = await applyOilpainting(buf, w, h); break;
      case "cyberpunk":   result = await applyCyberpunk(buf, w, h);   break;
    }

    job.imageBuffer = result!;
    job.status = "completed";
    console.log(`[${jobId}] Done — ${result!.length} bytes`);
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${jobId}] Failed:`, err);
  } finally {
    try { fs.unlinkSync(imagePath); } catch { }
  }
}

async function runGenerateJob(jobId: string, style: Style, format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    console.log(`[${jobId}] Running Seedream 3 (style=${style}, format=${format})...`);
    const output = await replicate.run(
      "bytedance/seedream-3:ed344813bc9f4996be6de4febd8b9c14c7849ad7b21ab047572e3620ee374ee7",
      {
        input: {
          prompt: SEEDREAM_PROMPTS[style],
          aspect_ratio: FORMAT_RATIOS[format] ?? "16:9",
          size: "big",
          guidance_scale: 3.0,
        },
      }
    );

    const rawUrl = Array.isArray(output) ? output[0] : output;
    const resultUrl = extractUrl(rawUrl);
    const response = await fetch(resultUrl);
    if (!response.ok) throw new Error(`Failed to fetch result: ${response.status}`);
    job.imageBuffer = Buffer.from(await response.arrayBuffer());
    job.status = "completed";
    console.log(`[${jobId}] Seedream done.`);
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${jobId}] Generate failed:`, err);
  }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
router.post("/transform", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "missing_file", message: "No image file uploaded" }); return;
  }
  const style = req.body.style as Style;
  const format = (req.body.format as Format) ?? "square";
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk"];
  const validFormats: Format[] = ["square", "portrait", "story", "landscape"];

  if (!style || !validStyles.includes(style)) {
    res.status(400).json({ error: "invalid_style" }); return;
  }
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: "invalid_format" }); return;
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { jobId, status: "pending", style, mode: "transform" });
  runTransformJob(jobId, req.file.path, style, format);
  res.json({ jobId, status: "pending", style, mode: "transform" });
});

router.post("/generate", async (req: Request, res: Response) => {
  const style = req.body.style as Style;
  const format = (req.body.format as Format) ?? "landscape";
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk"];
  const validFormats: Format[] = ["square", "portrait", "story", "landscape"];

  if (!style || !validStyles.includes(style)) {
    res.status(400).json({ error: "invalid_style" }); return;
  }
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: "invalid_format" }); return;
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, { jobId, status: "pending", style, mode: "generate" });
  runGenerateJob(jobId, style, format);
  res.json({ jobId, status: "pending", style, mode: "generate" });
});

router.get("/transform/:jobId/status", (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ error: "not_found" }); return; }
  res.json({
    jobId: job.jobId, status: job.status,
    imageUrl: job.status === "completed" ? `/api/transform/${job.jobId}/download` : undefined,
    error: job.error, style: job.style, mode: job.mode,
  });
});

router.get("/transform/:jobId/download", (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ error: "not_found" }); return; }
  if (job.status !== "completed" || !job.imageBuffer) {
    res.status(400).json({ error: "not_ready" }); return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="${job.style}-${job.mode}.png"`);
  res.setHeader("Content-Length", job.imageBuffer.length);
  res.end(job.imageBuffer);
});

export default router;
