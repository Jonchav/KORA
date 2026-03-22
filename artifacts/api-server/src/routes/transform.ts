import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
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

const TRANSFORM_PROMPTS: Record<Style, string> = {
  comic:
    "Transform this photo into a dynamic comic book illustration. Bold black ink outlines on every edge, flat vibrant cel colors, halftone dot pattern shading in shadows, action-style composition, Marvel and DC comics aesthetic, expressive faces, dramatic panel perspective, high-contrast graphic art, print-ready quality",
  anime:
    "Transform this into a beautiful Studio Ghibli anime illustration. Clean smooth linework, vibrant pastel and jewel-tone colors, large expressive eyes, detailed flowing hair with highlight streaks, cel-shaded soft shading, magical atmospheric glow, anime film quality, painterly background details",
  popart:
    "Transform into bold Andy Warhol pop art style. Flat bold primary and secondary colors, silkscreen print aesthetic, high contrast graphic shapes, CMYK halftone dot pattern, thick black contour lines, iconic 1960s commercial art movement, saturated punchy palette, graphic design poster quality",
  watercolor:
    "Transform into a loose artistic watercolor painting. Soft translucent paint washes bleeding at edges, visible wet brushstrokes, granulation texture, color blooms and bleeds, fine art cold-press paper texture, impressionistic detail loss in backgrounds, warm and cool color harmony, plein-air painting feel",
  oilpainting:
    "Transform into a classical oil painting masterpiece. Rich impasto thick brushwork with visible paint texture, deep luminous colors with strong chiaroscuro lighting, Old Masters technique reminiscent of Rembrandt and Vermeer, glazing layers giving depth, warm amber varnish tone, museum-quality fine art, dramatic baroque composition",
  cyberpunk:
    "Transform into a cyberpunk digital illustration. Intense neon pink, cyan and purple glow lighting, glitch distortion effects on edges, circuit board and holographic overlay patterns, rain-soaked reflective surfaces, futuristic urban dystopia aesthetic, Blade Runner and Ghost in the Shell visual style, ultra-detailed sci-fi art",
};

const SEEDREAM_PROMPTS: Record<Style, string> = {
  comic:
    "Epic comic book splash page, dynamic superhero battle scene above a neon city skyline, bold black ink outlines, halftone dot shading, vibrant primary colors, lightning and energy beams, action debris, dramatic upward angle, Marvel Comics quality, ultra detailed, 4K resolution",
  anime:
    "Breathtaking Studio Ghibli anime landscape, magical floating islands with waterfalls and cherry blossoms, golden hour sunlight through clouds, a small village on the cliffs, flying creatures in the distance, lush green valleys, painted sky with volumetric light, ultra detailed masterpiece",
  popart:
    "Andy Warhol style pop art gallery installation, bold colorful grid of repeated iconic images, silkscreen print aesthetic, hot pink, electric blue and lime green palette, graphic geometric shapes, 1960s commercial art, ultra vibrant and energetic, high resolution poster art",
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

async function uploadToReplicate(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const blob = new Blob([buffer], { type: contentType });
  const file = await replicate.files.create(blob as any, { filename } as any);
  return (file as any).urls?.get ?? (file as any).url ?? String(file);
}

async function runTransformJob(jobId: string, imagePath: string, style: Style, format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const ext = path.extname(imagePath).replace(".", "") || "jpeg";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const buffer = fs.readFileSync(imagePath);

    console.log(`[${jobId}] Uploading image to Replicate...`);
    const imageUrl = await uploadToReplicate(buffer, `input.${ext}`, contentType);
    console.log(`[${jobId}] Image uploaded: ${imageUrl}`);

    console.log(`[${jobId}] Running FLUX 2 Flex (style=${style}, format=${format})...`);
    const output = await replicate.run(
      "black-forest-labs/flux-2-flex:51d0412f4874be5ad0fc559a9174a33b24927cb12729d4e3abf5a4f98ba1a4bc",
      {
        input: {
          prompt: TRANSFORM_PROMPTS[style],
          input_images: [imageUrl],
          aspect_ratio: FORMAT_RATIOS[format] ?? "match_input_image",
          steps: 30,
          guidance: 5.0,
          output_format: "png",
          output_quality: 95,
          prompt_upsampling: false,
        },
      }
    );

    const rawUrl = Array.isArray(output) ? output[0] : output;
    const resultUrl = extractUrl(rawUrl);
    console.log(`[${jobId}] FLUX result: ${resultUrl}`);

    const response = await fetch(resultUrl);
    if (!response.ok) throw new Error(`Failed to fetch result: ${response.status}`);
    job.imageBuffer = Buffer.from(await response.arrayBuffer());
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

async function runGenerateJob(jobId: string, style: Style, format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    console.log(`[${jobId}] Running Seedream 3 (style=${style}, format=${format})...`);
    const aspectRatio = FORMAT_RATIOS[format] ?? "16:9";

    const output = await replicate.run(
      "bytedance/seedream-3:ed344813bc9f4996be6de4febd8b9c14c7849ad7b21ab047572e3620ee374ee7",
      {
        input: {
          prompt: SEEDREAM_PROMPTS[style],
          aspect_ratio: aspectRatio,
          size: "big",
          guidance_scale: 3.0,
        },
      }
    );

    const rawUrl = Array.isArray(output) ? output[0] : output;
    const resultUrl = extractUrl(rawUrl);
    console.log(`[${jobId}] Seedream result: ${resultUrl}`);

    const response = await fetch(resultUrl);
    if (!response.ok) throw new Error(`Failed to fetch result: ${response.status}`);
    job.imageBuffer = Buffer.from(await response.arrayBuffer());
    job.status = "completed";
    console.log(`[${jobId}] Generate complete.`);
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${jobId}] Generate failed:`, err);
  }
}

// POST /transform — photo style transfer using FLUX 2 Flex
router.post(
  "/transform",
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "missing_file", message: "No image file uploaded" });
      return;
    }

    const style = req.body.style as Style;
    const format = (req.body.format as Format) ?? "square";
    const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk"];
    const validFormats: Format[] = ["square", "portrait", "story", "landscape"];

    if (!style || !validStyles.includes(style)) {
      res.status(400).json({ error: "invalid_style", message: "Invalid style" });
      return;
    }
    if (!validFormats.includes(format)) {
      res.status(400).json({ error: "invalid_format", message: "Invalid format" });
      return;
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: JobRecord = { jobId, status: "pending", style, mode: "transform" };
    jobs.set(jobId, job);

    runTransformJob(jobId, req.file.path, style, format);
    res.json({ jobId, status: "pending", style, mode: "transform" });
  }
);

// POST /generate — standalone scene generation using Seedream 3
router.post("/generate", async (req: Request, res: Response) => {
  const style = req.body.style as Style;
  const format = (req.body.format as Format) ?? "landscape";
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk"];
  const validFormats: Format[] = ["square", "portrait", "story", "landscape"];

  if (!style || !validStyles.includes(style)) {
    res.status(400).json({ error: "invalid_style", message: "Invalid style" });
    return;
  }
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: "invalid_format", message: "Invalid format" });
    return;
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: JobRecord = { jobId, status: "pending", style, mode: "generate" };
  jobs.set(jobId, job);

  runGenerateJob(jobId, style, format);
  res.json({ jobId, status: "pending", style, mode: "generate" });
});

// GET /transform/:jobId/status
router.get("/transform/:jobId/status", (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ error: "not_found" }); return; }
  res.json({
    jobId: job.jobId,
    status: job.status,
    imageUrl: job.status === "completed" ? `/api/transform/${job.jobId}/download` : undefined,
    error: job.error,
    style: job.style,
    mode: job.mode,
  });
});

// GET /transform/:jobId/download
router.get("/transform/:jobId/download", (req: Request, res: Response) => {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ error: "not_found" }); return; }
  if (job.status !== "completed" || !job.imageBuffer) {
    res.status(400).json({ error: "not_ready" }); return;
  }
  const suffix = job.mode === "generate" ? "seedream" : "transformed";
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="${job.style}-${suffix}.png"`);
  res.setHeader("Content-Length", job.imageBuffer.length);
  res.end(job.imageBuffer);
});

export default router;
