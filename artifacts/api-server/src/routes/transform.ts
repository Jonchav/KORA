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
    "Transform this photo into a dramatic cinematic movie still. Apply teal shadows and orange highlights color grading. Add strong directional side lighting that sculpts the subject with deep shadows. Include anamorphic lens bokeh in the background, subtle 35mm film grain, and rich high-contrast professional cinematography. The result should look like a scene from a high-budget Hollywood film.",
  scifi:
    "Transform this photo into a sci-fi cyberpunk cinematic scene. Bathe the image in intense neon blue, purple and cyan lighting. Add volumetric fog, glowing light trails, and futuristic atmospheric haze. Create deep dramatic shadows with vibrant neon highlights. The result should look like a scene from a dystopian science fiction blockbuster.",
  neo_noir:
    "Transform this photo into a neo-noir film still. Dramatically desaturate the colors leaving only amber and deep shadow tones. Apply extreme chiaroscuro lighting with a single harsh light source casting venetian blind shadows. Create deep inky black shadows and bright blown-out highlights. Add film grain texture. The result should feel like a 1950s crime detective film.",
  warm_hollywood:
    "Transform this photo with warm golden Hollywood cinematic color grading. Apply a rich amber and honey warm tone across the entire image. Simulate a magic hour sunset glow with soft lens flare. Add anamorphic bokeh and a shallow depth of field. The result should feel like an epic blockbuster movie shot on Kodak Vision3 film.",
  dramatic_portrait:
    "Transform this photo into a dramatic portrait with Rembrandt-style studio lighting. Apply strong chiaroscuro with a single overhead spotlight casting half the face in deep shadow. Increase contrast dramatically. Add subtle film grain and a dark moody vignette. The result should feel like an award-winning editorial photography portrait.",
};

const NEGATIVE_PROMPT =
  "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, cartoon, anime, painting, drawing, deformed hands, deformed fingers, extra fingers, mutated hands, bad hands, fused fingers, missing fingers, deformed face, deformed body, extra limbs, floating limbs, disfigured";

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
      "black-forest-labs/flux-dev",
      {
        input: {
          image: dataUri,
          prompt,
          strength: 0.8,
          num_inference_steps: 28,
          guidance: 3.5,
          output_format: "png",
          output_quality: 95,
          go_fast: false,
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
