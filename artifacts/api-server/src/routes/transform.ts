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

// face-to-many uses InstantID to preserve the person's identity perfectly
// style is one of: "3D" | "Emoji" | "Video game" | "Pixels" | "Clay" | "Toy"
// We use "3D" for smooth cel-shaded cartoon look, "Clay" for painterly styles
const FACE_TO_MANY_CONFIG: Record<Style, { style: string; prompt: string }> = {
  comic: {
    style: "3D",
    prompt:
      "comic book illustration, superhero art style, bold black ink outlines, vibrant colorful painted background with bright cyan hot pink yellow orange paint splashes, cel shaded skin, flat vivid colors, professional comic book art, dynamic and energetic",
  },
  anime: {
    style: "3D",
    prompt:
      "anime character, Studio Ghibli and Makoto Shinkai style, beautiful smooth cel shading, large expressive eyes, vibrant soft gradient background in pastel colors with light bokeh, Japanese animation film quality, graceful and detailed",
  },
  popart: {
    style: "3D",
    prompt:
      "pop art illustration, Andy Warhol style, bold flat graphic background with hot pink electric blue lime green yellow color blocks, thick black outlines, saturated vibrant colors, 1960s commercial graphic art, punchy and iconic",
  },
  watercolor: {
    style: "Clay",
    prompt:
      "watercolor painting portrait, soft wet-on-wet paint washes, impressionist brushstrokes background in warm peachy tones and soft blues, delicate translucent colors, fine art illustration, painted with care",
  },
  oilpainting: {
    style: "Clay",
    prompt:
      "classical oil painting portrait, Rembrandt baroque style, rich warm amber and ochre background with dramatic chiaroscuro lighting, thick impasto brushwork, Old Masters technique, deep saturated tones, museum quality fine art",
  },
  cyberpunk: {
    style: "3D",
    prompt:
      "cyberpunk character portrait, neon punk style, dark futuristic city background with glowing neon lights in electric cyan and magenta pink, holographic elements, rain reflections, Blade Runner 2049 aesthetic, ultra detailed sci-fi illustration",
  },
};

// Seedream 3 — standalone scene generation (no input image needed)
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

// ── Smart content-aware crop ─────────────────────────────────────────────────
// Scans edge rows/cols to find where the neutral frame ends and content begins
async function cropToContent(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // Detect if a pixel matches the neutral peach/cream frame background
  function isFrame(i: number): boolean {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 200 && g > 170 && b > 140 && r > g && g > b && (r - b) > 25;
  }

  // Count non-frame pixels in a row
  function rowContent(y: number): number {
    let n = 0;
    for (let x = 0; x < w; x++) if (!isFrame((y * w + x) * 4)) n++;
    return n;
  }

  // Count non-frame pixels in a column
  function colContent(x: number): number {
    let n = 0;
    for (let y = 0; y < h; y++) if (!isFrame((y * w + x) * 4)) n++;
    return n;
  }

  const threshold = 0.25;
  let top = 0, bottom = h - 1, left = 0, right = w - 1;

  for (let y = 0; y < h; y++) { if (rowContent(y) > w * threshold) { top = y; break; } }
  for (let y = h - 1; y >= 0; y--) { if (rowContent(y) > w * threshold) { bottom = y; break; } }
  for (let x = 0; x < w; x++) { if (colContent(x) > h * threshold) { left = x; break; } }
  for (let x = w - 1; x >= 0; x--) { if (colContent(x) > h * threshold) { right = x; break; } }

  return sharp(buf)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png().toBuffer();
}

// ── PHOTO TRANSFORM — face-to-many with InstantID ───────────────────────────
async function runTransformJob(jobId: string, imagePath: string, style: Style, _format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const buf = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).replace(".", "") || "jpeg";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const dataUri = `data:${contentType};base64,${buf.toString("base64")}`;

    const config = FACE_TO_MANY_CONFIG[style];
    console.log(`[${jobId}] Running face-to-many (style=${style}, render="${config.style}")...`);

    const output = await replicate.run(
      "fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
      {
        input: {
          image: dataUri,
          style: config.style,
          prompt: config.prompt,
          negative_prompt:
            "ugly, deformed, noisy, blurry, distorted, disfigured, bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, missing fingers, extra fingers, watermark, signature, text",
          denoising_strength: 0.65,
          instant_id_strength: 0.9,
          control_depth_strength: 0.8,
          prompt_strength: 5.5,
        },
      }
    );

    const rawUrl = Array.isArray(output) ? output[0] : output;
    const resultUrl = extractUrl(rawUrl);
    console.log(`[${jobId}] face-to-many result: ${resultUrl}`);

    const response = await fetch(resultUrl);
    if (!response.ok) throw new Error(`Failed to fetch result: ${response.status}`);
    const rawBuffer = Buffer.from(await response.arrayBuffer());

    // face-to-many outputs a wide comparison image (original | transformed)
    // Extract just the right half (the stylized result) and trim the frame border
    const meta = await sharp(rawBuffer).metadata();
    let processed = rawBuffer;
    if (meta.width && meta.height && meta.width > meta.height * 1.3) {
      console.log(`[${jobId}] Detected comparison image (${meta.width}x${meta.height}) — cropping right half...`);
      const halfW = Math.floor(meta.width / 2);
      const rightHalf = await sharp(rawBuffer)
        .extract({ left: halfW, top: 0, width: halfW, height: meta.height })
        .png().toBuffer();
      // Smart crop: scan pixel rows/cols to detect exact content boundaries
      processed = await cropToContent(rightHalf);
    }

    // Upscale 3x with Lanczos + unsharp mask for crisp HD output (no watermarks)
    const upMeta = await sharp(processed).metadata();
    const targetW = Math.min((upMeta.width ?? 512) * 3, 2048);
    processed = await sharp(processed)
      .resize(targetW, null, { kernel: "lanczos3", fastShrinkOnLoad: false })
      .sharpen({ sigma: 0.6, m1: 1.5, m2: 2.5 })
      .png().toBuffer();
    const finalMeta = await sharp(processed).metadata();
    console.log(`[${jobId}] Upscaled to ${finalMeta.width}x${finalMeta.height}`);

    job.imageBuffer = processed;
    job.status = "completed";
    console.log(`[${jobId}] Transform complete.`);
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${jobId}] Transform failed:`, err);
  } finally {
    try { fs.unlinkSync(imagePath); } catch { }
  }
}

// ── AI SCENE GENERATION — Seedream 3 ────────────────────────────────────────
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
