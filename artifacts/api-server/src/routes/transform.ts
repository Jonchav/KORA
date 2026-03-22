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

// PhotoMaker style_name values + prompts — preserves person identity
const PHOTOMAKER_CONFIG: Record<Style, { style_name: string; prompt: string }> = {
  comic: {
    style_name: "Comic book",
    prompt: "a person img as comic book hero, bold black ink outlines, flat vibrant cel colors, halftone dot shading, Marvel and DC comics aesthetic, dynamic action pose, high contrast graphic art",
  },
  anime: {
    style_name: "Disney Charactor",
    prompt: "a person img as anime character, Studio Ghibli style, smooth clean linework, large expressive eyes, vibrant colors, cel-shaded illustration, beautiful anime film quality",
  },
  popart: {
    style_name: "Digital Art",
    prompt: "a person img in Andy Warhol pop art style, bold flat primary colors, silkscreen print aesthetic, CMYK halftone dot pattern, thick black contour lines, iconic 1960s commercial art, vibrant saturated palette",
  },
  watercolor: {
    style_name: "Fantasy art",
    prompt: "a person img painted in loose artistic watercolor, soft translucent washes, visible wet brushstrokes, color blooms and bleeds, fine art paper texture, impressionistic and painterly feel",
  },
  oilpainting: {
    style_name: "Cinematic",
    prompt: "a person img as a classical oil painting portrait, Old Masters technique, Rembrandt chiaroscuro lighting, rich impasto brushwork, deep luminous colors, museum-quality baroque fine art",
  },
  cyberpunk: {
    style_name: "Neonpunk",
    prompt: "a person img in cyberpunk neonpunk style, intense neon pink and cyan glow, holographic elements, glitch distortion effects, futuristic urban dystopia, Blade Runner aesthetic, ultra-detailed sci-fi art",
  },
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

async function runTransformJob(jobId: string, imagePath: string, style: Style, _format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const ext = path.extname(imagePath).replace(".", "") || "jpeg";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const buffer = fs.readFileSync(imagePath);

    // Build data URI so PhotoMaker can receive the image directly
    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;

    const config = PHOTOMAKER_CONFIG[style];
    console.log(`[${jobId}] Running PhotoMaker (style=${style}, style_name="${config.style_name}")...`);

    const output = await replicate.run(
      "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      {
        input: {
          input_image: dataUri,
          prompt: config.prompt,
          style_name: config.style_name,
          style_strength_ratio: 35,
          num_steps: 20,
          guidance_scale: 5,
          negative_prompt: "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
          num_outputs: 1,
          disable_safety_checker: false,
        },
      }
    );

    const rawUrl = Array.isArray(output) ? output[0] : output;
    const resultUrl = extractUrl(rawUrl);
    console.log(`[${jobId}] PhotoMaker result: ${resultUrl}`);

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
