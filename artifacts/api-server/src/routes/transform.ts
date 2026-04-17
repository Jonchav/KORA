import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import Replicate from "replicate";
import fs from "fs";
import path from "path";
import os from "os";
import { requireAuth } from "../middleware/auth.js";
import { db, usersTable, generationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── Persistent image storage ─────────────────────────────────────────────────
// On Render: mount disk at /data. Locally: use os.tmpdir() subfolder.
const IMAGE_DIR = process.env.IMAGE_STORAGE_PATH || path.join(os.tmpdir(), "kora-images");
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

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

export type Style = "comic" | "anime" | "popart" | "watercolor" | "oilpainting" | "cyberpunk" | "pixel" | "clay" | "toy" | "vaporwave" | "fantasy" | "gtasa" | "dccomic";
export type Format = "square" | "portrait" | "story" | "landscape";

const FORMAT_RATIOS: Record<Format, string> = {
  square: "1:1",
  portrait: "4:5",
  story: "9:16",
  landscape: "16:9",
};

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
  dccomic: {
    style: "3D",
    prompt:
      "golden age DC Comics illustration, Batman #103 era 1950s style, bold flat colors with warm amber and golden yellow background, thick black ink outlines, dynamic action pose, classic 4-color printing palette of red blue green and yellow, clean cel-shaded illustration, simple halftone dot shading on clothes, vintage American comic book aesthetic, Dick Sprang Sheldon Moldoff golden age art style, heroic comic book portrait, bright and colorful",
  },
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
  dccomic:
    "Golden age DC Comics action scene, Batman and Robin in dynamic battle, warm amber and golden yellow background like Batman #103 cover, bold flat colors, thick black ink outlines, classic 4-color printing palette, cel-shaded illustration, vintage American comic book aesthetic, Dick Sprang golden age art style, heroic action composition, bright and colorful, 1950s DC Comics quality",
};

interface JobRecord {
  jobId: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageBuffer?: Buffer;
  filePath?: string;
  error?: string;
  style: Style;
  format: Format;
  mode: "transform" | "generate";
  watermark: boolean;
}

// ── Watermark for free tier ───────────────────────────────────────────────────
async function applyWatermark(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 800;
  const h = meta.height ?? 800;

  const fontSize = Math.max(13, Math.round(w * 0.022));
  const label = "Koraframe.com";
  const charW = fontSize * 0.52;
  const textW = Math.round(label.length * charW);
  const padX = Math.round(fontSize * 0.7);
  const padY = Math.round(fontSize * 0.45);
  const margin = Math.round(w * 0.022);
  const bgW = textW + padX * 2;
  const bgH = fontSize + padY * 2;
  const bgX = w - bgW - margin;
  const bgY = h - bgH - margin;
  const textX = bgX + padX;
  const textY = bgY + padY + Math.round(fontSize * 0.82);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" rx="4" fill="black" fill-opacity="0.50"/>
    <text x="${textX}" y="${textY}"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700"
      fill="white" fill-opacity="0.88" letter-spacing="0.3">${label}</text>
  </svg>`;

  return sharp(buf)
    .composite([{ input: Buffer.from(svg), gravity: "northwest" }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

const jobs = new Map<string, JobRecord>();

function extractUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof (value as any).url === "function") return (value as any).url().toString();
  if (value && typeof (value as any).url === "string") return (value as any).url;
  return String(value);
}

async function cropToContent(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  function isFrame(i: number): boolean {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 200 && g > 170 && b > 140 && r > g && g > b && (r - b) > 25;
  }

  function rowContent(y: number): number {
    let n = 0;
    for (let x = 0; x < w; x++) if (!isFrame((y * w + x) * 4)) n++;
    return n;
  }

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

const IMG2IMG_INSTRUCTIONS: Record<Style, string> = {
  comic:       "apply a bold comic book art style to this image, keep the same subject and composition, add thick black ink outlines and vibrant flat colors",
  anime:       "apply Studio Ghibli anime art style to this image, keep the same subject and layout, add cel shading and soft vivid colors",
  popart:      "apply Andy Warhol pop art style to this image, keep the same subject, use bold flat graphic colors and high contrast",
  watercolor:  "apply watercolor painting style to this image, keep the same subject and composition, soft wet paint washes and delicate brushstrokes",
  oilpainting: "apply classical oil painting style to this image, keep the same subject and composition, rich amber tones and dramatic Rembrandt lighting",
  cyberpunk:   "apply cyberpunk neon art style to this image, keep the same subject, add glowing cyan and magenta neon lights and rain-soaked atmosphere",
  pixel:       "apply retro 16-bit pixel art style to this image, keep the same subject and composition in classic SNES video game aesthetic",
  clay:        "apply Aardman claymation style to this image, keep the same subject, add smooth clay texture and rounded cheerful shapes",
  toy:         "apply Funko Pop vinyl toy style to this image, keep the same subject with oversized head and glossy plastic finish",
  vaporwave:   "apply vaporwave aesthetic to this image, keep the same subject and composition, add dreamy pastel purple and pink tones with 80s nostalgia",
  fantasy:     "apply dark fantasy RPG illustration style to this image, keep the same subject and composition, add dramatic magical lighting and painterly detail",
  gtasa:       "apply GTA San Andreas PS2 video game graphics style to this image, keep the same subject and composition with early 2000s Rockstar Games look",
  dccomic:     "transform this image into a golden age DC Comics illustration like a 1950s Batman comic book cover, keep the same subject, add thick black ink outlines, bold flat cel-shaded colors, warm amber and golden yellow background tones, simple halftone dot shading, bright classic 4-color printing palette, Dick Sprang golden age DC style",
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

function isRetriableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err));
  const lower = msg.toLowerCase();
  return (
    msg.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("throttled") ||
    lower.includes("cuda out of memory") ||
    lower.includes("out of memory") ||
    lower.includes("prediction failed")
  );
}

async function replicateRunWithRetry(
  model: `${string}/${string}:${string}`,
  input: Record<string, unknown>,
  jobId: string,
  maxRetries = 2,
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await replicate.run(model, { input });
    } catch (err) {
      if (isRetriableError(err) && attempt < maxRetries) {
        const waitSec = (attempt + 1) * 12;
        const reason = String(err).toLowerCase().includes("memory") ? "CUDA OOM" : "rate limit";
        console.log(`[${jobId}] ${reason} — waiting ${waitSec}s before retry (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

async function runNoFaceFallback(jobId: string, buf: Buffer, style: Style): Promise<Buffer> {
  console.log(`[${jobId}] ↳ No face detected — running img2img fallback (instruct-pix2pix, style=${style})...`);

  const resized = await sharp(buf)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  console.log(`[${jobId}] img2img input resized to ${meta.width}x${meta.height}`);
  const dataUri = `data:image/jpeg;base64,${resized.toString("base64")}`;

  const output = await replicateRunWithRetry(
    "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
    {
        image: dataUri,
        prompt: IMG2IMG_INSTRUCTIONS[style],
        negative_prompt: "ugly, deformed, noisy, blurry, distorted, watermark, text, signature, logo",
        num_steps: 20,
        guidance_scale: 9.0,
        image_guidance_scale: 2.0,
    },
    jobId,
  );

  const rawUrl = extractUrl(Array.isArray(output) ? output[0] : output);
  console.log(`[${jobId}] img2img fallback result: ${rawUrl}`);
  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error(`img2img fallback fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function applyFormat(buf: Buffer, format: Format): Promise<Buffer> {
  const { width: w = 512, height: h = 512 } = await sharp(buf).metadata();
  const ratios: Record<Format, [number, number]> = {
    square:    [1, 1],
    portrait:  [4, 5],
    story:     [9, 16],
    landscape: [16, 9],
  };
  const [rw, rh] = ratios[format];
  let targetW: number, targetH: number;
  if (w / h > rw / rh) {
    targetH = h;
    targetW = Math.round(h * rw / rh);
  } else {
    targetW = w;
    targetH = Math.round(w * rh / rw);
  }
  return sharp(buf)
    .resize(targetW, targetH, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 }).toBuffer();
}

// ── Save image to persistent disk ────────────────────────────────────────────
async function saveImageToDisk(jobId: string, userId: string, buf: Buffer): Promise<string> {
  const userDir = path.join(IMAGE_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  const filePath = path.join(userDir, `${jobId}.jpg`);
  fs.writeFileSync(filePath, buf);
  return filePath;
}

/**
 * Smart face-crop: cuts a portrait-oriented region from the image centered
 * horizontally and biased toward the upper area where faces appear in photos.
 * This prevents the face-to-many model from focusing on arms, phones or other
 * foreground objects when the composition is awkward (e.g. selfies with a
 * raised arm).
 */
async function smartCropForFace(buf: Buffer, jobId: string): Promise<{ buf: Buffer; cropped: boolean }> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  // If the image is already roughly square and ≤ 900px, no crop needed
  const ratio = w / h;
  if (ratio >= 0.7 && ratio <= 1.4 && w <= 900) {
    return { buf, cropped: false };
  }

  // Target: a square crop whose side = 85% of the shorter dimension,
  // placed at horizontal center and starting 5% from the top.
  const side = Math.round(Math.min(w, h) * 0.85);
  const left = Math.max(0, Math.round((w - side) / 2));
  // Bias toward top: start at 5% of height (not center) so faces in
  // portraits and selfies land inside the crop area.
  const top = Math.max(0, Math.round(h * 0.05));
  const clampedSide = Math.min(side, w - left, h - top);

  console.log(`[${jobId}] smartCrop ${w}x${h} → ${clampedSide}x${clampedSide} at (${left},${top})`);

  const cropped = await sharp(buf)
    .extract({ left, top, width: clampedSide, height: clampedSide })
    .jpeg({ quality: 92 })
    .toBuffer();

  return { buf: cropped, cropped: true };
}

async function runTransformJob(jobId: string, imagePath: string, style: Style, format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const rawBuf = fs.readFileSync(imagePath);

    // Always pre-crop to face region before sending to face-to-many
    const { buf, cropped } = await smartCropForFace(rawBuf, jobId);
    if (cropped) console.log(`[${jobId}] Applied smart face-crop before face-to-many`);

    const ext = path.extname(imagePath).replace(".", "") || "jpeg";
    const contentType = cropped ? "image/jpeg" : (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
    const dataUri = `data:${contentType};base64,${buf.toString("base64")}`;

    const config = FACE_TO_MANY_CONFIG[style];
    console.log(`[${jobId}] Running face-to-many (style=${style}, render="${config.style}")...`);

    let processed: Buffer;
    let usedFacePipeline = true;

    try {
      const output = await replicateRunWithRetry(
        "fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
        {
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
        jobId,
      );

      const rawUrl = Array.isArray(output) ? output[0] : output;
      if (rawUrl == null || rawUrl === "null") {
        throw new Error("No face detected in the image");
      }
      const resultUrl = extractUrl(rawUrl);
      console.log(`[${jobId}] face-to-many result: ${resultUrl}`);

      const response = await fetch(resultUrl);
      if (!response.ok) throw new Error(`Failed to fetch result: ${response.status}`);
      const rawBuffer = Buffer.from(await response.arrayBuffer());

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

      try {
        await new Promise(r => setTimeout(r, 3000));
        const rawMeta = await sharp(processed).metadata();
        console.log(`[${jobId}] Running CodeFormer on ${rawMeta.width}x${rawMeta.height} image...`);
        const cfDataUri = `data:image/png;base64,${processed.toString("base64")}`;
        const cfOut = await replicateRunWithRetry(
          "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2",
          {
              image: cfDataUri,
              upscale: 2,
              face_upsample: true,
              background_enhance: true,
              codeformer_fidelity: 0.75,
          },
          jobId,
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
      if (isFaceDetectionError(faceErr)) {
        usedFacePipeline = false;
        console.log(`[${jobId}] Waiting 8s for rate-limit reset before img2img fallback...`);
        await new Promise(r => setTimeout(r, 8000));
        // Use rawBuf (original full image) for img2img — it handles any composition
        processed = await runNoFaceFallback(jobId, rawBuf, style);
      } else {
        throw faceErr;
      }
    }

    // ── Shared finishing pipeline ─────────────────────────────────────────────
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

    if (job.watermark) {
      processed = await applyWatermark(processed);
      console.log(`[${jobId}] Watermark applied (free tier).`);
    }

    job.imageBuffer = processed;
    job.status = "completed";
    console.log(`[${jobId}] ${usedFacePipeline ? "Transform (face pipeline)" : "Transform (img2img fallback)"} complete.`);

    // ── Save to persistent disk + record in DB (non-fatal) ───────────────────
    try {
      const filePath = await saveImageToDisk(jobId, job.userId, processed);
      job.filePath = filePath;
      await db.insert(generationsTable).values({
        id: jobId,
        userId: job.userId,
        style: job.style,
        format: job.format,
        mode: job.mode,
        filePath,
        watermark: job.watermark ? 1 : 0,
      }).onConflictDoUpdate({
        target: generationsTable.id,
        set: { filePath },
      });
      console.log(`[${jobId}] Saved to disk and DB: ${filePath}`);
    } catch (saveErr) {
      console.warn(`[${jobId}] Could not save to gallery (non-fatal):`, saveErr);
    }
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
    let generated = Buffer.from(await response.arrayBuffer());

    if (job.watermark) {
      generated = await applyWatermark(generated);
      console.log(`[${jobId}] Watermark applied (free tier).`);
    }

    // ── Save to persistent disk ───────────────────────────────────────────────
    const filePath = await saveImageToDisk(jobId, job.userId, generated);
    job.filePath = filePath;

    // ── Record in DB ──────────────────────────────────────────────────────────
    await db.insert(generationsTable).values({
      id: jobId,
      userId: job.userId,
      style: job.style,
      format: job.format,
      mode: job.mode,
      filePath,
      watermark: job.watermark ? 1 : 0,
    }).onConflictDoUpdate({
      target: generationsTable.id,
      set: { filePath },
    });

    job.imageBuffer = generated;
    job.status = "completed";
    console.log(`[${jobId}] Seedream done. Saved: ${filePath}`);
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error";
    console.error(`[${jobId}] Generate failed:`, err);
  }
}

async function checkAndDeductCredit(userId: string): Promise<{ ok: boolean; credits?: number; tier?: string; message?: string }> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!rows.length) return { ok: false, message: "User account not found. Please sign in again." };
  const user = rows[0];

  if (user.credits <= 0) {
    return { ok: false, credits: 0, message: "No credits remaining. Purchase a credit pack to continue." };
  }

  const now = new Date();
  await db.update(usersTable)
    .set({ credits: user.credits - 1, updatedAt: now })
    .where(eq(usersTable.id, userId));

  return { ok: true, credits: user.credits - 1, tier: user.tier };
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
router.post("/transform", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "missing_file", message: "No image file uploaded" }); return;
  }
  const style = req.body.style as Style;
  const format = (req.body.format as Format) ?? "square";
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa", "dccomic"];
  const validFormats: Format[] = ["square", "portrait", "story", "landscape"];

  if (!style || !validStyles.includes(style)) {
    res.status(400).json({ error: "invalid_style" }); return;
  }
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: "invalid_format" }); return;
  }

  const creditResult = await checkAndDeductCredit(req.user!.sub);
  if (!creditResult.ok) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(402).json({ error: "no_credits", message: creditResult.message });
    return;
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const watermark = false;
  jobs.set(jobId, { jobId, userId: req.user!.sub, status: "pending", style, format, mode: "transform", watermark });
  runTransformJob(jobId, req.file.path, style, format);
  res.json({ jobId, status: "pending", style, mode: "transform", creditsRemaining: creditResult.credits });
});

router.post("/generate", requireAuth, async (req: Request, res: Response) => {
  const style = req.body.style as Style;
  const format = (req.body.format as Format) ?? "landscape";
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa", "dccomic"];
  const validFormats: Format[] = ["square", "portrait", "story", "landscape"];

  if (!style || !validStyles.includes(style)) {
    res.status(400).json({ error: "invalid_style" }); return;
  }
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: "invalid_format" }); return;
  }

  const creditResult = await checkAndDeductCredit(req.user!.sub);
  if (!creditResult.ok) {
    res.status(402).json({ error: "no_credits", message: creditResult.message });
    return;
  }

  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const watermark = false;
  jobs.set(jobId, { jobId, userId: req.user!.sub, status: "pending", style, format, mode: "generate", watermark });
  runGenerateJob(jobId, style, format);
  res.json({ jobId, status: "pending", style, mode: "generate", creditsRemaining: creditResult.credits });
});

router.get("/transform/:jobId/status", (req: Request, res: Response) => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = jobs.get(jobId);
  if (!job) { res.status(404).json({ error: "not_found" }); return; }
  res.json({
    jobId: job.jobId, status: job.status,
    imageUrl: job.status === "completed" ? `/api/transform/${job.jobId}/download` : undefined,
    error: job.error, style: job.style, mode: job.mode,
  });
});

router.get("/transform/:jobId/download", requireAuth, (req: Request, res: Response) => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const userId = req.user!.sub;

  // First try in-memory (recent jobs — verify ownership)
  const job = jobs.get(jobId);
  if (job?.status === "completed" && job.imageBuffer) {
    if (job.userId !== userId) { res.status(403).json({ error: "forbidden" }); return; }
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `inline; filename="${job.style}-${job.mode}.jpg"`);
    res.setHeader("Content-Length", job.imageBuffer.length);
    res.setHeader("Cache-Control", "no-store");
    res.end(job.imageBuffer);
    return;
  }

  // Fall back to disk (older jobs after server restart)
  // Ownership is enforced: the file must be under the user's own directory
  const filePath = path.join(IMAGE_DIR, userId, `${jobId}.jpg`);
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `inline; filename="${jobId}.jpg"`);
    res.setHeader("Cache-Control", "private, max-age=31536000");
    res.sendFile(filePath);
    return;
  }

  res.status(404).json({ error: "not_found" });
});

// ── GET /api/gallery — user's generation history ──────────────────────────────
router.get("/gallery", requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const rows = await db
      .select()
      .from(generationsTable)
      .where(eq(generationsTable.userId, req.user!.sub))
      .orderBy(desc(generationsTable.createdAt))
      .limit(limit);

    const items = rows.map(r => ({
      id: r.id,
      style: r.style,
      format: r.format,
      mode: r.mode,
      watermark: r.watermark === 1,
      createdAt: r.createdAt,
      // Only expose download URL if the file still exists on disk
      downloadUrl: r.filePath && fs.existsSync(r.filePath)
        ? `/api/transform/${r.id}/download`
        : null,
    }));

    res.json({ items });
  } catch (err) {
    console.error("gallery error:", err);
    res.status(500).json({ message: "Failed to load gallery" });
  }
});

export default router;
