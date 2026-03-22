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

export type Style = "comic" | "anime" | "popart" | "watercolor" | "oilpainting" | "cyberpunk" | "pixel" | "clay" | "toy" | "vaporwave" | "fantasy" | "gtasa";
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
  pixel: {
    style: "Pixels",
    prompt:
      "16-bit pixel art character portrait, retro video game sprite style, vivid pixelated background with pixel art city or dungeon scenery, clean sharp pixel edges, vibrant saturated colors, classic SNES and Mega Drive era aesthetic, charming and nostalgic",
  },
  clay: {
    style: "Clay",
    prompt:
      "Aardman stop-motion claymation character, soft smooth clay texture with visible fingerprint impressions, warm cheerful colorful background in muted clay tones, large friendly eyes, rounded shapes, handcrafted feel, Wallace and Gromit quality",
  },
  toy: {
    style: "Toy",
    prompt:
      "Funko Pop vinyl collectible figure, oversized rounded head with tiny body, hard glossy plastic surface, bold stylized features, displayed on a clean collector shelf with soft studio lighting, vibrant collector toy aesthetic, ultra detailed product render",
  },
  vaporwave: {
    style: "3D",
    prompt:
      "vaporwave aesthetic portrait, synthwave and retrowave 80s and 90s style, dreamy pastel purple pink teal gradient background with floating Greek statues palm trees and pixel grid, soft neon glow, chromatic aberration, nostalgic retro-futuristic mood",
  },
  fantasy: {
    style: "Video game",
    prompt:
      "epic dark fantasy RPG character portrait, legendary hero or warrior, dramatic painterly background with ancient ruins glowing runes and magical aurora, ornate armor and flowing cape, cinematic lighting, Artstation concept art quality, heroic and majestic",
  },
  gtasa: {
    style: "Video game",
    prompt:
      "GTA San Andreas video game character, PS2 era 3D graphics style, early 2000s Rockstar Games aesthetic, low-poly but detailed character model, Grove Street Los Santos gang neighborhood background, warm California golden sunlight, white tank top baggy jeans and Nikes, gang bandana and fitted cap, gritty urban street environment, CJ character style, iconic GTA San Andreas cutscene quality",
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
  pixel:
    "Epic 16-bit pixel art fantasy world map scene, retro SNES-era RPG overworld, villages castles dungeons and mountains rendered in vibrant pixel art, detailed sprite characters adventuring on the map, classic video game UI elements, nostalgic and charming, high resolution pixel masterpiece",
  clay:
    "Aardman Animations claymation world, cheerful colorful stop-motion village with clay houses rolling hills and fluffy clouds, cute clay animals and characters with fingerprint textures, warm handcrafted feel, soft diffused lighting, playful and joyful, award-winning animation quality",
  toy:
    "Funko Pop collectible display shelf, rows of vinyl toy figures from beloved pop culture franchises, hard plastic sheen with studio lighting, collector's dream arrangement with glowing backdrop, ultra detailed product photography aesthetic, 8K resolution",
  vaporwave:
    "Vaporwave dream landscape, endless neon purple and pink grid floor stretching to the horizon, giant glowing sun half-submerged behind the horizon, Greek marble busts floating in pastel clouds, retro computer windows with old-school graphics, retrowave nostalgia, ultra detailed digital art",
  fantasy:
    "Epic dark fantasy world panorama, ancient kingdom under a dramatic stormy sky with twin moons, glowing magical runes on massive stone gates, an armored hero silhouetted against a burning horizon, dragons in the sky, volumetric god rays, Artstation fantasy concept art, cinematic and breathtaking",
  gtasa:
    "GTA San Andreas game world panorama, aerial view of Los Santos city circa 2004, Grove Street neighborhood with low-rider cars and palm trees, warm smoggy California sunset, PS2 era 3D graphics aesthetic, Rockstar Games style urban sprawl, iconic green-and-purple gang territory, early 2000s hip-hop culture street scene, cinematic wide shot",
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
    .jpeg({ quality: 92 }).toBuffer();
}

// ── IMG2IMG FALLBACK — instruct-pix2pix ──────────────────────────────────────
// Used when face-to-many can't detect a face. Works on any image type:
// landscapes, objects, pets, illustrations, back-turned people, etc.
const IMG2IMG_INSTRUCTIONS: Record<Style, string> = {
  comic:       "make this a bold comic book illustration with vibrant colors and thick black ink outlines",
  anime:       "transform this into a Studio Ghibli anime style illustration with cel shading and vivid colors",
  popart:      "turn this into an Andy Warhol pop art piece with bold flat graphic colors and high contrast",
  watercolor:  "render this as a delicate watercolor painting with soft wet paint washes and impressionist brushstrokes",
  oilpainting: "transform this into a classical oil painting like Rembrandt with rich amber tones and dramatic chiaroscuro lighting",
  cyberpunk:   "make this a futuristic cyberpunk scene with glowing neon electric cyan and magenta, rain-soaked atmosphere",
  pixel:       "convert this into retro 16-bit pixel art with a classic SNES video game aesthetic",
  clay:        "transform this into Aardman claymation style with smooth clay texture, rounded shapes, and cheerful colors",
  toy:         "make this look like a Funko Pop vinyl collectible figure with oversized proportions and glossy plastic finish",
  vaporwave:   "apply vaporwave aesthetic with dreamy pastel purple and pink, retro grid lines, and 80s nostalgia",
  fantasy:     "transform this into an epic dark fantasy RPG illustration with dramatic magical lighting and ancient ruins",
  gtasa:       "make this look like a GTA San Andreas PS2-era video game scene with early 2000s Rockstar Games graphics style",
};

function isFaceDetectionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("no face") ||
    msg.includes("face not") ||
    msg.includes("no faces") ||
    msg.includes("face_detection") ||
    msg.includes("could not find face") ||
    msg.includes("face detection failed") ||
    msg.includes("input image must contain a face")
  );
}

async function runNoFaceFallback(jobId: string, buf: Buffer, style: Style): Promise<Buffer> {
  console.log(`[${jobId}] ↳ No face detected — running img2img fallback (instruct-pix2pix, style=${style})...`);
  const dataUri = `data:image/jpeg;base64,${buf.toString("base64")}`;

  const output = await replicate.run(
    "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23d",
    {
      input: {
        image: dataUri,
        prompt: IMG2IMG_INSTRUCTIONS[style],
        negative_prompt: "ugly, deformed, noisy, blurry, distorted, watermark, text, signature, logo",
        num_steps: 50,
        guidance_scale: 8.0,
        image_guidance_scale: 1.2,
      },
    }
  );

  const rawUrl = extractUrl(Array.isArray(output) ? output[0] : output);
  console.log(`[${jobId}] img2img fallback result: ${rawUrl}`);
  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error(`img2img fallback fetch failed: ${res.status}`);
  // Return as-is; the shared finishing pipeline (Lanczos + applyFormat) handles upscaling
  return Buffer.from(await res.arrayBuffer());
}

// ── PHOTO TRANSFORM — face-to-many with InstantID ───────────────────────────
// Apply the target aspect ratio by center-cropping
async function applyFormat(buf: Buffer, format: Format): Promise<Buffer> {
  const { width: w = 512, height: h = 512 } = await sharp(buf).metadata();
  const ratios: Record<Format, [number, number]> = {
    square:    [1, 1],
    portrait:  [4, 5],
    story:     [9, 16],
    landscape: [16, 9],
  };
  const [rw, rh] = ratios[format];
  // Compute target dimensions that fit inside the image preserving ratio
  let targetW: number, targetH: number;
  if (w / h > rw / rh) {
    // Image is wider than target ratio — constrain by height
    targetH = h;
    targetW = Math.round(h * rw / rh);
  } else {
    // Image is taller than target ratio — constrain by width
    targetW = w;
    targetH = Math.round(w * rh / rw);
  }
  return sharp(buf)
    .resize(targetW, targetH, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 }).toBuffer();
}

async function runTransformJob(jobId: string, imagePath: string, style: Style, format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const buf = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).replace(".", "") || "jpeg";
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const dataUri = `data:${contentType};base64,${buf.toString("base64")}`;

    const config = FACE_TO_MANY_CONFIG[style];
    console.log(`[${jobId}] Running face-to-many (style=${style}, render="${config.style}")...`);

    let processed: Buffer;
    let usedFacePipeline = true;

    // ── Primary: face-to-many (InstantID — preserves identity) ───────────────
    try {
      const output = await replicate.run(
        "fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
        {
          input: {
            image: dataUri,
            style: config.style,
            prompt: config.prompt,
            negative_prompt:
              "ugly, deformed, noisy, blurry, distorted, disfigured, bad anatomy, extra limbs, six fingers, seven fingers, too many fingers, extra fingers, fused fingers, mutated hands, bad hands, poorly drawn hands, poorly drawn face, cloned hands, missing fingers, watermark, signature, text, logo",
            denoising_strength: 0.6,
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
      processed = rawBuffer;
      if (meta.width && meta.height && meta.width > meta.height * 1.3) {
        console.log(`[${jobId}] Detected comparison image (${meta.width}x${meta.height}) — cropping right half...`);
        const halfW = Math.floor(meta.width / 2);
        const rightHalf = await sharp(rawBuffer)
          .extract({ left: halfW, top: 0, width: halfW, height: meta.height })
          .png().toBuffer();
        processed = await cropToContent(rightHalf);
      }

      // CodeFormer: AI face restoration + 2x upscale (face pipeline only)
      try {
        await new Promise(r => setTimeout(r, 3000));
        const rawMeta = await sharp(processed).metadata();
        console.log(`[${jobId}] Running CodeFormer on ${rawMeta.width}x${rawMeta.height} image...`);
        const cfDataUri = `data:image/png;base64,${processed.toString("base64")}`;
        const cfOut = await replicate.run(
          "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
          {
            input: {
              image: cfDataUri,
              upscale: 2,
              face_upsample: true,
              background_enhance: true,
              codeformer_fidelity: 0.75,
            },
          }
        );
        const cfUrl = extractUrl(cfOut);
        const cfResponse = await fetch(cfUrl);
        if (cfResponse.ok) {
          processed = Buffer.from(await cfResponse.arrayBuffer());
          const cfMeta = await sharp(processed).metadata();
          console.log(`[${jobId}] CodeFormer done → ${cfMeta.width}x${cfMeta.height}`);
        }
      } catch (cfErr) {
        console.warn(`[${jobId}] CodeFormer failed, continuing with Lanczos:`, cfErr);
      }

    } catch (faceErr) {
      // ── Fallback: img2img for images without detectable faces ─────────────
      if (isFaceDetectionError(faceErr)) {
        usedFacePipeline = false;
        // Brief pause before calling another model (rate limit)
        await new Promise(r => setTimeout(r, 2000));
        processed = await runNoFaceFallback(jobId, buf, style);
      } else {
        throw faceErr;
      }
    }

    // ── Shared finishing pipeline ─────────────────────────────────────────────
    // Lanczos 2x upscale (applied to both face and no-face paths)
    const upMeta = await sharp(processed).metadata();
    const srcW = upMeta.width ?? 512;
    const targetW = Math.min(srcW * 2, 2048);
    processed = await sharp(processed)
      .resize(targetW, null, { kernel: "lanczos3", fastShrinkOnLoad: false })
      .sharpen({ sigma: 0.6, m1: 1.5, m2: 2.5 })
      .jpeg({ quality: 92 }).toBuffer();
    const finalMeta = await sharp(processed).metadata();
    console.log(`[${jobId}] Final upscale → ${finalMeta.width}x${finalMeta.height}`);

    processed = await applyFormat(processed, format);
    const fmtMeta = await sharp(processed).metadata();
    console.log(`[${jobId}] Format "${format}" applied → ${fmtMeta.width}x${fmtMeta.height}`);

    job.imageBuffer = processed;
    job.status = "completed";
    console.log(`[${jobId}] ${usedFacePipeline ? "Transform (face pipeline)" : "Transform (img2img fallback)"} complete.`);
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
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa"];
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
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa"];
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
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Content-Disposition", `attachment; filename="${job.style}-${job.mode}.jpg"`);
  res.setHeader("Content-Length", job.imageBuffer.length);
  res.end(job.imageBuffer);
});

export default router;
