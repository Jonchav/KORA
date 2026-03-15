import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed"));
    }
  },
});

type Preset = "cinematic" | "scifi" | "neo_noir" | "warm_hollywood" | "dramatic_portrait";

interface JobRecord {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageBuffer?: Buffer;
  error?: string;
  preset: string;
}

const jobs = new Map<string, JobRecord>();

async function createVignette(width: number, height: number, opacity: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="v" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="65%" stop-color="black" stop-opacity="${(opacity * 0.35).toFixed(2)}"/>
        <stop offset="100%" stop-color="black" stop-opacity="${opacity.toFixed(2)}"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#v)"/>
  </svg>`;
  return Buffer.from(svg);
}

async function createGrain(width: number, height: number, intensity: number): Promise<Buffer> {
  const pixels = width * height;
  const data = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const noise = Math.floor(128 + (Math.random() - 0.5) * 255);
    data[i * 4] = noise;
    data[i * 4 + 1] = noise;
    data[i * 4 + 2] = noise;
    data[i * 4 + 3] = Math.floor(intensity);
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function createLetterboxOverlay(width: number, height: number): Buffer {
  const barH = Math.round(height * 0.105);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${barH}" fill="black"/>
    <rect x="0" y="${height - barH}" width="${width}" height="${barH}" fill="black"/>
  </svg>`;
  return Buffer.from(svg);
}

async function applyCinematic(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const grain = await createGrain(width, height, 18);
  const vignette = await createVignette(width, height, 0.55);
  return sharp(buf)
    .recomb([
      [1.12, 0.0, -0.05],
      [-0.03, 1.02, 0.03],
      [-0.1,  0.06, 1.15],
    ])
    .modulate({ brightness: 0.97, saturation: 1.15 })
    .linear(1.18, -18)
    .composite([
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png()
    .toBuffer();
}

async function applyScifi(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const grain = await createGrain(width, height, 22);
  const vignette = await createVignette(width, height, 0.65);
  const glowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="g" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#001aff" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#001aff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
  </svg>`;
  return sharp(buf)
    .recomb([
      [0.65, 0.08, 0.18],
      [0.0,  0.82, 0.3 ],
      [0.12, 0.12, 1.45],
    ])
    .modulate({ brightness: 0.88, saturation: 1.9 })
    .linear(1.25, -22)
    .composite([
      { input: Buffer.from(glowSvg), blend: "screen" },
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png()
    .toBuffer();
}

async function applyNeoNoir(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const grain = await createGrain(width, height, 30);
  const vignette = await createVignette(width, height, 0.7);
  const amberSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#ff8800" opacity="0.07"/>
  </svg>`;
  return sharp(buf)
    .recomb([
      [0.5, 0.35, 0.15],
      [0.5, 0.35, 0.15],
      [0.35, 0.25, 0.4],
    ])
    .modulate({ brightness: 0.88, saturation: 0.12 })
    .linear(1.45, -30)
    .gamma(1.1)
    .composite([
      { input: Buffer.from(amberSvg), blend: "screen" },
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png()
    .toBuffer();
}

async function applyWarmHollywood(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const grain = await createGrain(width, height, 14);
  const vignette = await createVignette(width, height, 0.4);
  const warmSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="w" cx="60%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#ffbb44" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#ff6600" stop-opacity="0.05"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#w)"/>
  </svg>`;
  return sharp(buf)
    .recomb([
      [1.25, 0.1, -0.08],
      [0.0,  1.06, 0.0 ],
      [-0.12, 0.0, 0.82],
    ])
    .modulate({ brightness: 1.05, saturation: 1.25 })
    .linear(1.08, 8)
    .composite([
      { input: Buffer.from(warmSvg), blend: "screen" },
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png()
    .toBuffer();
}

async function applyDramaticPortrait(buf: Buffer, width: number, height: number): Promise<Buffer> {
  const grain = await createGrain(width, height, 28);
  const vignette = await createVignette(width, height, 0.78);
  return sharp(buf)
    .recomb([
      [0.55, 0.33, 0.12],
      [0.55, 0.33, 0.12],
      [0.45, 0.28, 0.27],
    ])
    .modulate({ brightness: 0.82, saturation: 0.08 })
    .linear(1.55, -38)
    .gamma(0.88)
    .composite([
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .png()
    .toBuffer();
}

async function runTransformation(
  jobId: string,
  imagePath: string,
  preset: Preset,
  letterbox: boolean
) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const inputBuffer = fs.readFileSync(imagePath);
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width ?? 1024;
    const height = metadata.height ?? 768;

    let result: Buffer;
    switch (preset) {
      case "cinematic":
        result = await applyCinematic(inputBuffer, width, height);
        break;
      case "scifi":
        result = await applyScifi(inputBuffer, width, height);
        break;
      case "neo_noir":
        result = await applyNeoNoir(inputBuffer, width, height);
        break;
      case "warm_hollywood":
        result = await applyWarmHollywood(inputBuffer, width, height);
        break;
      case "dramatic_portrait":
        result = await applyDramaticPortrait(inputBuffer, width, height);
        break;
    }

    if (letterbox) {
      const lbOverlay = createLetterboxOverlay(width, height);
      result = await sharp(result)
        .composite([{ input: lbOverlay, blend: "over" }])
        .png()
        .toBuffer();
    }

    console.log(`Job ${jobId} completed (${preset}, ${width}x${height})`);
    job.status = "completed";
    job.imageBuffer = result;
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error occurred";
    console.error(`Job ${jobId} failed:`, err);
  } finally {
    try { fs.unlinkSync(imagePath); } catch { }
  }
}

router.post(
  "/transform",
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "missing_file", message: "No image file uploaded" });
      return;
    }

    const preset = req.body.preset as Preset;
    const validPresets: Preset[] = [
      "cinematic", "scifi", "neo_noir", "warm_hollywood", "dramatic_portrait",
    ];

    if (!preset || !validPresets.includes(preset)) {
      res.status(400).json({ error: "invalid_preset", message: "Invalid or missing preset" });
      return;
    }

    const letterbox = req.body.letterbox === "true" || req.body.letterbox === true;
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const job: JobRecord = { jobId, status: "pending", preset };
    jobs.set(jobId, job);

    runTransformation(jobId, req.file.path, preset, letterbox);

    res.json({ jobId, status: "pending", preset });
  }
);

router.get("/transform/:jobId/status", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    imageUrl: job.status === "completed" ? `/api/transform/${jobId}/download` : undefined,
    error: job.error,
    preset: job.preset,
  });
});

router.get("/transform/:jobId/download", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  if (job.status !== "completed" || !job.imageBuffer) {
    res.status(400).json({ error: "not_ready", message: "Image not ready yet" });
    return;
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="cinematic-${job.preset}.png"`);
  res.setHeader("Content-Length", job.imageBuffer.length);
  res.end(job.imageBuffer);
});

export default router;
