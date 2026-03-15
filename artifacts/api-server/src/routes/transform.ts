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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed"));
    }
  },
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

type Preset = "cinematic" | "scifi" | "neo_noir" | "warm_hollywood" | "dramatic_portrait";

const STYLE_PROMPTS: Record<Preset, string> = {
  cinematic:
    "cinematic movie still, dramatic lighting, high dynamic range, shallow depth of field, film grain, professional color grading, teal and orange color palette, 35mm film look, anamorphic lens flare, masterful composition",
  scifi:
    "sci-fi cinematic movie still, neon lighting, cyberpunk atmosphere, volumetric light, film grain, futuristic environment, holographic elements, cool blue and purple tones, dramatic shadows",
  neo_noir:
    "neo noir cinematic lighting, deep shadows, dramatic contrast, film still, rain-soaked streets, neon reflections, high contrast black and white with selective color, detective story atmosphere",
  warm_hollywood:
    "warm Hollywood cinematic still, golden hour lighting, warm tones, professional color grading, shallow depth of field, anamorphic bokeh, epic wide shot, blockbuster feel, soft bloom highlights",
  dramatic_portrait:
    "dramatic cinematic portrait, rembrandt lighting, deep shadows, high contrast, film grain, close-up shot, expressive, moody atmosphere, shallow depth of field, professional photography",
};

const NEGATIVE_PROMPT =
  "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, cartoon, anime, painting, drawing";

interface JobRecord {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
  preset: string;
}

const jobs = new Map<string, JobRecord>();

// Safely extract a plain string URL from Replicate output
// The SDK may return FileOutput objects (ReadableStream-like) or plain strings
function extractUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof (value as any).url === "function") {
    return (value as any).url().toString();
  }
  if (value && typeof (value as any).url === "string") {
    return (value as any).url;
  }
  return String(value);
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
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const ext = path.extname(imagePath).replace(".", "") || "jpeg";
    const dataUri = `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${base64Image}`;

    let prompt = STYLE_PROMPTS[preset];
    if (letterbox) {
      prompt += ", letterbox format, 2.39:1 aspect ratio, black bars";
    }

    const output = await replicate.run(
      "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      {
        input: {
          image: dataUri,
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          prompt_strength: 0.65,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          scheduler: "K_EULER",
        },
      }
    );

    // Handle array or single output, plus FileOutput objects
    const rawUrl = Array.isArray(output) ? output[0] : output;
    const imageUrl = extractUrl(rawUrl);

    console.log(`Job ${jobId} completed. Image URL: ${imageUrl}`);
    job.status = "completed";
    job.imageUrl = imageUrl;
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error occurred";
    console.error(`Job ${jobId} failed:`, err);
  } finally {
    try {
      fs.unlinkSync(imagePath);
    } catch {
      // ignore cleanup errors
    }
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
      "cinematic",
      "scifi",
      "neo_noir",
      "warm_hollywood",
      "dramatic_portrait",
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
    imageUrl: job.imageUrl,
    error: job.error,
    preset: job.preset,
  });
});

// Proxy endpoint: downloads the remote image and streams it to the client
// This avoids CORS issues when the frontend tries to fetch and download the image
router.get("/transform/:jobId/download", async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ error: "not_found", message: "Job not found" });
    return;
  }

  if (job.status !== "completed" || !job.imageUrl) {
    res.status(400).json({ error: "not_ready", message: "Image not ready yet" });
    return;
  }

  try {
    const response = await fetch(job.imageUrl);
    if (!response.ok) {
      res.status(502).json({ error: "upstream_error", message: "Failed to fetch image" });
      return;
    }

    const contentType = response.headers.get("content-type") || "image/png";
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cinematic-${job.preset}.png"`
    );

    // Stream the image body directly to the response
    const reader = response.body!.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  } catch (err) {
    console.error(`Download proxy failed for job ${jobId}:`, err);
    res.status(500).json({ error: "proxy_error", message: "Failed to proxy image download" });
  }
});

export default router;
