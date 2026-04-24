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

export type Style = "comic" | "anime" | "popart" | "watercolor" | "oilpainting" | "cyberpunk" | "pixel" | "clay" | "toy" | "vaporwave" | "fantasy" | "gtasa" | "dccomic" | "fortnite" | "luxury" | "hollywood" | "sims" | "timetraveler" | "matrix" | "titanic" | "starwars" | "godfather" | "madmax" | "interstellar" | "gatsby" | "wonderwoman";
export type Format = "square" | "portrait" | "story" | "landscape";

const FORMAT_RATIOS: Record<Format, string> = {
  square: "1:1",
  portrait: "4:5",
  story: "9:16",
  landscape: "16:9",
};

const FACE_TO_MANY_CONFIG: Record<Style, { style: string; prompt: string; denoising?: number; instantId?: number; depthStrength?: number; promptStrength?: number }> = {
  comic: {
    style: "3D",
    prompt:
      "comic book illustration, superhero art style, bold black ink outlines, vibrant colorful painted background with bright cyan hot pink yellow orange paint splashes, cel shaded skin, flat vivid colors, professional comic book art, dynamic and energetic, no text, no words, no speech bubbles, no captions",
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
      "GTA San Andreas video game character, PS2 era 3D graphics style, early 2000s Rockstar Games aesthetic, low-poly but detailed character model, Grove Street Los Santos gang neighborhood background, warm California golden sunlight, white tank top baggy jeans and Nikes, gang bandana and fitted cap, gritty urban street environment, CJ character style, iconic GTA San Andreas cutscene quality, no text, no words, no banners, no HUD, no subtitles",
  },
  dccomic: {
    style: "Emoji",
    prompt:
      "vintage 1950s DC Comics golden age cartoon caricature, exaggerated comic book character with big expressive eyes and bold simplified features, thick black ink outlines, bright flat cel-animation colors, warm amber yellow and red background, classic American cartoon illustration style, fun and playful caricature like Sheldon Moldoff Dick Sprang, simplified cartoon proportions, punchy saturated primary colors, retro comic charm, no text, no words, no speech bubbles, no captions, no banners",
  },
  fortnite: {
    style: "Video game",
    prompt:
      "Fortnite Battle Royale character skin, Epic Games Unreal Engine 5 art style, vibrant stylized 3D game character with bold colors and exaggerated proportions, dynamic action pose, glowing holographic backbling and weapon, Island map environment background with storm clouds, collector skin quality, ultra detailed game render",
  },
  luxury: {
    style: "3D",
    prompt:
      "GQ magazine cover, wearing elegant Tom Ford three-piece suit jacket shirt and tie, luxury Patek Philippe watch on wrist, upscale hotel rooftop or Monaco superyacht marina in background, professional editorial fashion photography, aspirational high-end lifestyle, sophisticated and polished look",
    denoising: 0.68,
    instantId: 0.70,
    depthStrength: 0.68,
    promptStrength: 6.0,
  },
  hollywood: {
    style: "3D",
    prompt:
      "Hollywood movie premiere, wearing tailored black tuxedo with bow tie, red carpet with paparazzi camera flashes in the background, dramatic spotlight lighting, Vanity Fair Oscar night editorial quality, A-list celebrity look, cinematic film noir glamour",
    denoising: 0.68,
    instantId: 0.70,
    depthStrength: 0.68,
    promptStrength: 6.0,
  },
  sims: {
    style: "3D",
    prompt:
      "The Sims 4 video game character, Maxis EA Games 3D art style, cheerful cartoon character with signature Plumbob green diamond floating above head, bright colorful suburb neighborhood house in background, quirky and fun game aesthetic, smooth stylized 3D render, expressive and playful",
  },
  timetraveler: {
    style: "3D",
    prompt:
      "steampunk time traveler costume, wearing Victorian leather coat with brass gears and cogs, leather aviator goggles, ornate pocket watch on chain, swirling luminous blue-gold time vortex portal with floating clock faces behind them, cinematic atmospheric lighting, H.G. Wells meets Doctor Who",
    denoising: 0.68,
    instantId: 0.70,
    depthStrength: 0.68,
    promptStrength: 6.0,
  },
  matrix: {
    style: "3D",
    prompt:
      "as Neo from The Matrix, wearing a long black leather trench coat and dark sunglasses, standing in bullet-time pose, surrounded by frozen green glowing code rain in mid-air, dark underground server corridor, green neon light casting dramatic shadows, sharp natural eyes, clear focused gaze, ultra realistic movie still, Wachowski brothers cinematic quality",
    denoising: 0.72,
    instantId: 0.48,
    depthStrength: 0.68,
    promptStrength: 7.0,
  },
  titanic: {
    style: "3D",
    prompt:
      "as Jack from Titanic, wearing a fitted 1912 tuxedo suit, standing at the bow of the RMS Titanic with arms wide open, golden sunset over the vast North Atlantic ocean, wind in hair, romantic cinematic moment, sharp natural eyes, clear focused gaze, James Cameron film quality, ultra realistic movie still, warm amber and blue cinematography",
    denoising: 0.70,
    instantId: 0.48,
    depthStrength: 0.68,
    promptStrength: 7.0,
  },
  starwars: {
    style: "3D",
    prompt:
      "as a Jedi Knight in Star Wars, wearing flowing brown and beige Jedi robes and tunic, holding an ignited glowing blue lightsaber in ready stance, dramatic desert planet landscape of Tatooine with twin suns setting, sharp natural eyes, clear focused gaze, Star Wars cinematic quality, George Lucas film aesthetic, heroic pose, ultra realistic movie still",
    denoising: 0.72,
    instantId: 0.48,
    depthStrength: 0.70,
    promptStrength: 7.0,
  },
  godfather: {
    style: "3D",
    prompt:
      "as Don Corleone from The Godfather, wearing a sharp Italian tailored black tuxedo with white shirt and bow tie, sitting in a leather wingback chair in a dark wood-paneled office, stroking a cat, rose in lapel, deep chiaroscuro shadows, sharp natural eyes, intense focused gaze, Francis Ford Coppola film noir lighting, 1970s cinematic quality, ultra realistic movie still",
    denoising: 0.70,
    instantId: 0.48,
    depthStrength: 0.68,
    promptStrength: 7.0,
  },
  madmax: {
    style: "3D",
    prompt:
      "as Mad Max in Fury Road, wearing torn post-apocalyptic black leather jacket with metal shoulder armor and chrome details, standing on top of a war rig in the Namibian salt flats desert, burning vehicles and dust tornado in background, blood-orange apocalyptic sky, sharp natural eyes, fierce focused gaze, George Miller cinematic quality, ultra realistic movie still",
    denoising: 0.72,
    instantId: 0.48,
    depthStrength: 0.70,
    promptStrength: 7.0,
  },
  interstellar: {
    style: "3D",
    prompt:
      "as Cooper from Interstellar, wearing a white NASA space suit with mission patches and tethering cables, floating in zero gravity beside the massive Gargantua black hole with its brilliant golden accretion disc warping spacetime, deep star-filled space, sharp natural eyes, awe-filled focused gaze, Christopher Nolan cinematic quality, ultra realistic movie still",
    denoising: 0.70,
    instantId: 0.48,
    depthStrength: 0.68,
    promptStrength: 7.0,
  },
  gatsby: {
    style: "3D",
    prompt:
      "as Jay Gatsby from The Great Gatsby, wearing a pristine white tuxedo with black bow tie, holding a champagne coupe glass with a confident charismatic smile, opulent 1920s Art Deco mansion ballroom in background with crystal chandeliers and hundreds of party guests, golden warm light, sharp natural eyes, bright clear gaze, Baz Luhrmann cinematic quality, ultra realistic movie still",
    denoising: 0.70,
    instantId: 0.48,
    depthStrength: 0.68,
    promptStrength: 7.0,
  },
  wonderwoman: {
    style: "3D",
    prompt:
      "as Wonder Woman, wearing the iconic Amazonian warrior armor with golden eagle breastplate, red and gold bracers, tiara, and dark leather skirt, holding a golden lasso and shield, dramatic WWI battlefield with smoke and debris, fierce and powerful warrior expression, sharp natural eyes, intense clear gaze, Patty Jenkins cinematic quality, ultra realistic movie still",
    denoising: 0.72,
    instantId: 0.48,
    depthStrength: 0.70,
    promptStrength: 7.0,
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
  fortnite:
    "Fortnite Island panoramic scene, aerial view of the iconic Battle Royale map, storm circle closing over lush biomes, players skydiving with colorful gliders, vibrant cartoon-stylized environment, Unreal Engine 5 quality render, dynamic action energy, Epic Games art style, ultra detailed game world",
  luxury:
    "Opulent luxury lifestyle scene, superyacht anchored in Monaco harbor at golden hour, champagne on deck, designer fashion editorial, Patek Philippe watch gleaming, distant Côte d'Azur coastline, warm cinematic light, aspirational and sophisticated, GQ magazine cover quality",
  hollywood:
    "Hollywood Boulevard at night, iconic Walk of Fame stars, grand movie premiere with searchlights and red carpet, cameras flashing, glamorous cinematic scene, film reel and clapperboard motifs, golden age of cinema atmosphere, cinematic wide shot, Vanity Fair quality",
  sims:
    "The Sims 4 neighborhood bird's-eye view, colorful suburban houses with manicured lawns and swimming pools, cheerful Plumbob diamonds floating above rooftops, Sim families going about daily life, bright sunny day, Maxis game world aesthetic, ultra detailed and charming",
  timetraveler:
    "Steampunk time machine laboratory scene, Victorian brass clockwork gears and steam pipes, multiple clocks showing different times on the walls, glowing blue-gold time vortex portal tearing through the center, scattered antique maps and blueprints, dramatic moody lighting, H.G. Wells aesthetic, ultra detailed concept art",
  matrix:
    "The Matrix digital world panorama, cascading green glowing code rain filling a dark server city skyline, holographic green numbers and symbols everywhere, black leather figures moving through frozen bullet-time, neon green ambient light, Wachowski brothers cinematic quality, ultra detailed cyberpunk scene",
  titanic:
    "RMS Titanic at sea, 1912 ocean liner at golden sunset, Edwardian passengers in period costume on the grand promenade deck, dramatic North Atlantic ocean waves, James Cameron cinematic quality, warm amber and blue color palette, epic romantic atmosphere, ultra detailed historical scene",
  starwars:
    "Epic Star Wars galaxy battle, Jedi and Sith clash with glowing lightsabers above a planet, X-Wings and TIE Fighters in deep space dogfight, twin suns of Tatooine or Death Star in background, John Williams orchestral energy, George Lucas cinematic scope, ultra detailed sci-fi fantasy scene",
  godfather:
    "The Godfather Corleone estate scene, candlelit study with rich wood paneling, leather armchair with man of power, rose petals and family portrait, Francis Ford Coppola chiaroscuro cinematography, deep amber and shadow tones, 1970s film grain quality, Nino Rota atmosphere, timeless cinematic masterpiece",
  madmax:
    "Mad Max Fury Road desert wasteland panorama, massive war rig convoy racing across cracked salt flats under blood-orange sky, flaming guitar player on massive speaker truck, chrome-painted War Boys, dust tornado and explosions, George Miller post-apocalyptic epic, ultra detailed action scene",
  interstellar:
    "Gargantua black hole from Interstellar, massive swirling accretion disc of golden and white light warping spacetime, tiny spacecraft approaching the singularity, deep space with thousand stars and nebula, Christopher Nolan cinematic quality, scientifically accurate gravitational lensing, awe-inspiring cosmic scale",
  gatsby:
    "The Great Gatsby 1920s opulent mansion ballroom panorama, Art Deco crystal chandeliers and golden confetti raining down, hundreds of glamorous Jazz Age party guests in tuxedos and flapper dresses, Jay Gatsby raising a champagne glass, warm amber and gold cinematography, Baz Luhrmann cinematic excess, ultra detailed luxury scene",
  wonderwoman:
    "Wonder Woman Themyscira Amazon island training grounds, powerful warrior goddess in full Amazonian armor standing on ancient stone ruins, lasso of truth glowing golden, shield and sword at ready, dramatic storm clouds and lightning breaking over the Aegean sea, Patty Jenkins cinematic quality, epic superhero movie still",
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
  comic:        "apply a bold comic book art style to this image, keep the same subject and composition, add thick black ink outlines and vibrant flat colors",
  anime:        "apply Studio Ghibli anime art style to this image, keep the same subject and layout, add cel shading and soft vivid colors",
  popart:       "apply Andy Warhol pop art style to this image, keep the same subject, use bold flat graphic colors and high contrast",
  watercolor:   "apply watercolor painting style to this image, keep the same subject and composition, soft wet paint washes and delicate brushstrokes",
  oilpainting:  "apply classical oil painting style to this image, keep the same subject and composition, rich amber tones and dramatic Rembrandt lighting",
  cyberpunk:    "apply cyberpunk neon art style to this image, keep the same subject, add glowing cyan and magenta neon lights and rain-soaked atmosphere",
  pixel:        "apply retro 16-bit pixel art style to this image, keep the same subject and composition in classic SNES video game aesthetic",
  clay:         "apply Aardman claymation style to this image, keep the same subject, add smooth clay texture and rounded cheerful shapes",
  toy:          "apply Funko Pop vinyl toy style to this image, keep the same subject with oversized head and glossy plastic finish",
  vaporwave:    "apply vaporwave aesthetic to this image, keep the same subject and composition, add dreamy pastel purple and pink tones with 80s nostalgia",
  fantasy:      "apply dark fantasy RPG illustration style to this image, keep the same subject and composition, add dramatic magical lighting and painterly detail",
  gtasa:        "apply GTA San Andreas PS2 video game graphics style to this image, keep the same subject and composition with early 2000s Rockstar Games look",
  dccomic:      "transform this image into a vintage 1950s DC Comics cartoon caricature, keep the same subject but make it fun and exaggerated, add thick black ink outlines, bright flat cel-animation colors, warm amber and yellow background, punchy saturated primary colors, playful caricature proportions, golden age American comic book cartoon style",
  fortnite:     "apply Fortnite Battle Royale game art style to this image, keep the same subject and composition, add bold cartoon shading and vibrant Unreal Engine game aesthetic",
  luxury:       "apply ultra-luxury fashion editorial style to this image, keep the same subject and composition, add cinematic lighting and high-end magazine aesthetic",
  hollywood:    "apply Hollywood glamour cinematic style to this image, keep the same subject and composition, add warm golden light and movie premiere atmosphere",
  sims:         "apply The Sims 4 game art style to this image, keep the same subject and composition, add cheerful Maxis game aesthetic with bright colors",
  timetraveler: "apply steampunk time traveler aesthetic to this image, keep the same subject and composition, add Victorian brass gears and golden clockwork details",
  matrix:       "apply The Matrix digital world aesthetic to this image, keep the same subject in a dark server environment with cascading green code rain and neon glow",
  titanic:      "apply 1912 Edwardian period style to this image, keep the same subject dressed in elegant period costume aboard the RMS Titanic with dramatic ocean light",
  starwars:     "apply Star Wars universe aesthetic to this image, keep the same subject in Jedi or Sith robes with a glowing lightsaber and galaxy backdrop",
  godfather:    "apply The Godfather Coppola film noir aesthetic to this image, keep the same subject in an Italian tailored suit with dramatic chiaroscuro shadow lighting",
  madmax:       "apply Mad Max Fury Road post-apocalyptic aesthetic to this image, keep the same subject in torn leather armor against a scorched desert wasteland backdrop",
  interstellar: "apply Interstellar NASA space aesthetic to this image, keep the same subject in a space suit beside the Gargantua black hole with its golden accretion disc",
  gatsby:       "transform this image into a Great Gatsby 1920s movie still, keep the same subject wearing a white tuxedo holding a champagne glass, opulent Art Deco mansion ballroom with crystal chandeliers behind them, Baz Luhrmann warm golden cinematography",
  wonderwoman:  "transform this image into a Wonder Woman movie still, keep the same subject wearing Amazonian warrior armor with golden eagle breastplate and tiara, dramatic battlefield with smoke and debris, Patty Jenkins cinematic heroic lighting",
};

/**
 * Styles that use FLUX Dev img2img instead of face-to-many.
 * These are "realistic portrait" styles where composition/framing
 * must be preserved — face-to-many regenerates the scene from scratch
 * causing tight crops and hallucinated elements.
 */
const FLUX_IMG2IMG_STYLES: Set<Style> = new Set([
  "luxury", "hollywood", "timetraveler",
]);

const FLUX_IMG2IMG_PROMPTS: Partial<Record<Style, string>> = {
  luxury:
    "photo of the exact same person: same face, same age, same gender, same skin tone, same hair, same hairstyle, same head shape — only the background and clothing change. Luxury lifestyle editorial portrait. Background: superyacht deck or Monaco Grand Prix paddock. Clothing: bespoke designer suit or outfit that matches their gender and age. Patek Philippe watch on wrist. Dramatic GQ magazine lighting. Cinematic, sophisticated, high-end fashion editorial. Do not change the face, age, hair, or identity.",
  hollywood:
    "photo of the exact same person: same face, same age, same gender, same skin tone, same hair, same hairstyle — only the background and clothing change. Hollywood A-list celebrity portrait. Background: movie premiere red carpet with camera flashes and spotlights. Clothing: polished editorial wardrobe matching their gender and age. Dramatic chiaroscuro studio lighting. Vanity Fair editorial quality. Do not change the face, age, hair, or identity.",
  timetraveler:
    "photo of the exact same person: same face, same age, same gender, same skin tone, same hair, same hairstyle — only the background and clothing change. Steampunk time traveler portrait. Background: Victorian clockwork laboratory with brass gears, copper pipes, glowing blue-gold time vortex. Add leather aviator goggles pushed up on forehead and vintage pocket watch chain. Dramatic atmospheric moody lighting. H.G. Wells cinematic style. Do not change the face, age, hair, or identity.",
  // ── Movie Scenes — FLUX photorealistic with cinematic color grading ───────────
  matrix:
    "cinematic movie still of the exact same person, same face same identity — as Neo from The Matrix. Clothing: floor-length black leather trench coat, dark sunglasses. Setting: dark underground server room, cascading green digital code rain frozen in bullet-time, green neon glow from floor and walls. Color grade: extreme teal-green monochromatic wash, shadows crushed to black, highlights blooming green. Pro-Mist 1/4 optical diffusion filter, halation around neon lights, subtle 35mm film grain, anamorphic lens slight oval bokeh, shallow depth of field with background softly out of focus. Wachowski brothers cinematography. Do not change the face or identity.",
  titanic:
    "cinematic movie still of the exact same person, same face same identity — as Jack or Rose at the bow of the RMS Titanic. Clothing: 1912 evening wear, dark fitted suit or Edwardian gown. Setting: bow of the ship, arms outstretched, vast North Atlantic ocean at magic-hour sunset, wind in hair, horizon glowing gold and rose. Color grade: warm amber and champagne highlights, deep cerulean ocean, split-tone warm shadows and cool blue water. Pro-Mist 1/2 filter, luminous soft halation on the sky, Panavision anamorphic lens flare, gentle film grain, bokeh on the ocean waves. James Cameron cinematography. Do not change the face or identity.",
  starwars:
    "cinematic movie still of the exact same person, same face same identity — as a Jedi Knight. Clothing: layered brown and tan Jedi tunic, robes, leather utility belt. Holding an ignited glowing blue lightsaber. Setting: Tatooine desert at twin-sunset, sandstone rocks and dunes, warm golden dust haze. Color grade: warm amber and sand tones, desaturated midtones, blue lightsaber glow as rim light on face, slight bleach bypass look. Pro-Mist 1/4 filter, soft halation around the lightsaber blade, Panavision anamorphic lens, subtle film grain, bokeh on the desert dunes. George Lucas cinematography. Do not change the face or identity.",
  godfather:
    "cinematic movie still of the exact same person, same face same identity — as Don Corleone. Clothing: perfectly tailored black tuxedo, white shirt, black bow tie, rose in lapel. Seated in a large dark leather armchair. Setting: dim candlelit Corleone estate study, wood paneling, single narrow shaft of amber key light from the left cutting across the face, 80% of frame in deep shadow. Color grade: extremely low-key amber and black, warm candlelight, near-black shadows with no detail, Kodak 5218 film stock look. Pro-Mist 1/2 filter, glowing skin highlights, 35mm anamorphic grain, very shallow depth of field. Coppola 1972 cinematography by Gordon Willis. Do not change the face or identity.",
  madmax:
    "cinematic movie still of the exact same person, same face same identity — as Furiosa in Mad Max Fury Road. Clothing: sleeveless worn linen shirt, black grease war paint across the eyes, dusty skin. Setting: narrow rocky canyon in Namibia, huge rusted metal war vehicle parts in foreground, towering ochre sandstone walls, sky visible above with clouds. Color grade: extreme orange-teal split, warm burnt-sienna rocks, cool teal sky, bleach bypass desaturated midtones, crushed blacks. Pro-Mist 1/4 filter, bright sky blooming into highlights, anamorphic widescreen 2.39:1, sharp face with soft desert background bokeh, Kodak 35mm grain. George Miller cinematography. Do not change the face or identity.",
  interstellar:
    "cinematic movie still of the exact same person, same face same identity — as Cooper in Interstellar. Clothing: white NASA flight suit with mission patches, helmet ring collar. Setting: zero-gravity interior of the Endurance spacecraft, massive circular window showing the Gargantua black hole — its golden-white accretion disc warping spacetime across half the frame. Color grade: cold grey-blue spacecraft interior contrasting with warm golden disc light, deep black space, anamorphic lens flare from the accretion disc. Pro-Mist 1/4 filter, luminous glow on the face from the black hole light, IMAX quality grain, 65mm film stock look. Nolan and van Hoytema cinematography. Do not change the face or identity.",
  gatsby:
    "cinematic movie still of the exact same person, same face same identity — as Jay Gatsby. Clothing: pristine white tuxedo jacket, black bow tie, white pocket square, or pearl-beaded 1920s flapper dress if female. Holding a crystal champagne coupe glass, charismatic smile. Setting: opulent Art Deco mansion ballroom, enormous crystal chandeliers, gold and ivory columns, hundreds of glamorous Jazz Age guests blurred in background, golden confetti raining. Color grade: warm champagne and amber glow, rich gold highlights, soft cream and ivory tones, slight overexposed dreamy look. Pro-Mist 1/2 filter, bloom on chandeliers and champagne glass, anamorphic lens soft oval bokeh on crowd, fine grain. Baz Luhrmann cinematography. Do not change the face or identity.",
  wonderwoman:
    "cinematic movie still of the exact same person, same face same identity — as Wonder Woman. Clothing: Amazonian warrior armor with golden eagle-shaped breastplate, articulated red and gold bracers, golden tiara, dark leather pleated battle skirt, armored boots. Setting: WWI Belgian battlefield at dramatic sunrise, ruined stone walls and barbed wire, smoke and golden dust in the air, warm shaft of sunlight breaking through grey storm clouds as a hero light. Color grade: desaturated teal shadows, warm amber hero light on face and armor, golden rim light on the breastplate. Pro-Mist 1/4 filter, anamorphic oval bokeh on background smoke, soft halation on armor gold, 35mm grain. Patty Jenkins cinematography. Do not change the face or identity.",
};

const MOVIE_SCENE_STYLES: Set<Style> = new Set([
  "matrix", "titanic", "starwars", "godfather", "madmax", "interstellar", "gatsby", "wonderwoman",
]);

async function runFluxImg2ImgPipeline(jobId: string, buf: Buffer, style: Style): Promise<Buffer> {
  const prompt = FLUX_IMG2IMG_PROMPTS[style];
  if (!prompt) throw new Error(`No FLUX prompt for style: ${style}`);

  const meta = await sharp(buf).metadata();
  const srcW = meta.width ?? 1024;
  const srcH = meta.height ?? 1024;
  // FLUX works best with dimensions that are multiples of 16, capped at 1280px
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const targetW = Math.round((srcW * scale) / 16) * 16;
  const targetH = Math.round((srcH * scale) / 16) * 16;

  const resized = await sharp(buf)
    .resize(targetW, targetH, { fit: "fill" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const dataUri = `data:image/jpeg;base64,${resized.toString("base64")}`;
  console.log(`[${jobId}] FLUX img2img (style=${style}, size=${targetW}x${targetH})...`);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const output = await replicate.run(
        "black-forest-labs/flux-dev" as `${string}/${string}`,
        {
          input: {
            image: dataUri,
            prompt,
            prompt_strength: MOVIE_SCENE_STYLES.has(style) ? 0.92 : 0.60,
            num_inference_steps: MOVIE_SCENE_STYLES.has(style) ? 40 : 35,
            guidance: MOVIE_SCENE_STYLES.has(style) ? 7.5 : 3.5,
            output_format: "jpg",
            output_quality: 92,
          },
        }
      );
      const rawUrl = extractUrl(Array.isArray(output) ? output[0] : output);
      console.log(`[${jobId}] FLUX img2img result: ${rawUrl}`);
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error(`FLUX img2img fetch failed: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (isRetriableError(err) && attempt < 2) {
        const wait = (attempt + 1) * 12;
        console.log(`[${jobId}] FLUX rate limit — waiting ${wait}s...`);
        await new Promise(r => setTimeout(r, wait * 1000));
      } else break;
    }
  }
  throw lastErr;
}

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

/**
 * Dedicated face-to-many pipeline for DC Clásico style.
 * Uses "Emoji" style base (more cartoonish/caricatured than "3D") with
 * lower instant_id_strength and higher denoising to push further from
 * photorealism toward golden-age DC comic illustration.
 */
async function runComicCartoonPipeline(jobId: string, buf: Buffer, dataUri: string): Promise<Buffer> {
  console.log(`[${jobId}] DC Clásico: running face-to-many (3D base, comic tuning)...`);

  const prompt =
    "vintage 1950s DC Comics golden age illustration, one person, bold graphic novel art style, thick black ink outlines, flat bold colors, dynamic superhero pose, bright primary colors red blue yellow green, classic comic book shading, strong identity preserved, no text, no speech bubbles, no captions";

  const output = await replicateRunWithRetry(
    "fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
    {
        image: dataUri,
        style: "3D",
        prompt,
        negative_prompt:
          "multiple characters, floating figures, random characters, photorealistic, ugly, deformed, noisy, blurry, distorted, bad anatomy, extra people, extra figures, watermark, signature, text, logo, words, letters, typography, caption, banner, speech bubble",
        denoising_strength: 0.62,
        instant_id_strength: 0.75,
        control_depth_strength: 0.75,
        prompt_strength: 5.0,
    },
    jobId,
  );

  const rawUrl = Array.isArray(output) ? output[0] : output;
  if (rawUrl == null || rawUrl === "null") throw new Error("No face detected in the image");
  const resultUrl = extractUrl(rawUrl);
  console.log(`[${jobId}] DC Clásico cartoon result: ${resultUrl}`);

  const response = await fetch(resultUrl);
  if (!response.ok) throw new Error(`DC comic fetch failed: ${response.status}`);
  const rawBuffer = Buffer.from(await response.arrayBuffer());

  // Handle side-by-side comparison output (crop right half)
  const meta = await sharp(rawBuffer).metadata();
  if (meta.width && meta.height && meta.width > meta.height * 1.3) {
    const halfW = Math.floor(meta.width / 2);
    const rightHalf = await sharp(rawBuffer)
      .extract({ left: halfW, top: 0, width: halfW, height: meta.height })
      .png().toBuffer();
    return cropToContent(rightHalf);
  }
  return rawBuffer;
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
        negative_prompt: "ugly, deformed, noisy, blurry, distorted, watermark, text, signature, logo, words, letters, typography, caption, subtitle, banner, label, writing, garbled text, random text, nonsense text",
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

  // Compute canvas size: use the largest dimension that fits without upscaling,
  // then build the canvas at the target aspect ratio.
  const inputRatio = w / h;
  const targetRatio = rw / rh;
  let canvasW: number, canvasH: number;
  if (inputRatio > targetRatio) {
    // Image is wider than target → match width, letterbox top/bottom
    canvasW = w;
    canvasH = Math.round(w * rh / rw);
  } else {
    // Image is taller than target → match height, pillarbox left/right
    canvasH = h;
    canvasW = Math.round(h * rw / rh);
  }

  // Fit the image inside the canvas (no crop, no upscale) and composite
  // it centered on a black background.
  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([{
      input: await sharp(buf)
        .resize(canvasW, canvasH, { fit: "inside", withoutEnlargement: true })
        .toBuffer(),
      gravity: "centre",
    }])
    .jpeg({ quality: 92 })
    .toBuffer();
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
async function smartCropForFace(buf: Buffer, _jobId: string): Promise<{ buf: Buffer; cropped: boolean }> {
  // Smart-crop disabled: always pass the original image to preserve composition.
  return { buf, cropped: false };
}

/**
 * Pad the image with a neutral dark border (20% each side) before sending to
 * face-to-many.  This makes the subject appear smaller in the model's field of
 * view, producing a less zoomed-in / tighter-cropped output.
 */
async function padImageForFacePipeline(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;
  const padX = Math.round(w * 0.20);
  const padY = Math.round(h * 0.20);
  const newW = w + padX * 2;
  const newH = h + padY * 2;
  return sharp(buf)
    .extend({ top: padY, bottom: padY, left: padX, right: padX, background: { r: 20, g: 20, b: 20, alpha: 1 } })
    .resize(newW, newH, { fit: "fill" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function runTransformJob(jobId: string, imagePath: string, style: Style, format: Format) {
  const job = jobs.get(jobId)!;
  job.status = "processing";

  try {
    const rawBuf = fs.readFileSync(imagePath);

    // ── DC Clásico: dedicated face-to-many cartoon pipeline ──────────────────
    if (style === "dccomic") {
      const { buf: dcBuf, cropped: dcCropped } = await smartCropForFace(rawBuf, jobId);
      if (dcCropped) console.log(`[${jobId}] DC Clásico: applied smart face-crop`);
      const dcExt = path.extname(imagePath).replace(".", "") || "jpeg";
      const dcContentType = dcCropped ? "image/jpeg" : (dcExt === "png" ? "image/png" : "image/jpeg");
      const dcDataUri = `data:${dcContentType};base64,${dcBuf.toString("base64")}`;
      let processed = await runComicCartoonPipeline(jobId, dcBuf, dcDataUri);
      processed = await applyFormat(processed, format);
      processed = await sharp(processed).jpeg({ quality: 92 }).toBuffer();
      job.imageBuffer = processed;
      job.status = "completed";
      try {
        const filePath = await saveImageToDisk(jobId, job.userId, processed);
        job.filePath = filePath;
        await db.insert(generationsTable).values({
          id: jobId, userId: job.userId, style: job.style, format: job.format,
          mode: job.mode, filePath, watermark: 0,
        }).onConflictDoUpdate({ target: generationsTable.id, set: { filePath } });
      } catch (saveErr) {
        console.error(`[${jobId}] GALLERY SAVE FAILED (DC comic):`, saveErr);
      }
      try { fs.unlinkSync(imagePath); } catch {}
      return;
    }

    // ── FLUX img2img: photorealistic styles (movie scenes + luxury/hollywood/timetraveler) ─
    if (FLUX_IMG2IMG_STYLES.has(style)) {
      console.log(`[${jobId}] FLUX img2img path (style=${style})...`);
      let processed = await runFluxImg2ImgPipeline(jobId, rawBuf, style);
      processed = await applyFormat(processed, format);
      if (job.watermark) {
        processed = await applyWatermark(processed);
        console.log(`[${jobId}] Watermark applied.`);
      }
      job.imageBuffer = processed;
      job.status = "completed";
      console.log(`[${jobId}] FLUX transform complete.`);
      try {
        const filePath = await saveImageToDisk(jobId, job.userId, processed);
        job.filePath = filePath;
        await db.insert(generationsTable).values({
          id: jobId, userId: job.userId, style: job.style, format: job.format,
          mode: job.mode, filePath, watermark: job.watermark ? 1 : 0,
        }).onConflictDoUpdate({ target: generationsTable.id, set: { filePath } });
        console.log(`[${jobId}] FLUX result saved to disk and DB: ${filePath}`);
      } catch (saveErr) {
        console.error(`[${jobId}] GALLERY SAVE FAILED (FLUX):`, saveErr);
      }
      try { fs.unlinkSync(imagePath); } catch {}
      return;
    }

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
              "ugly, deformed, noisy, blurry, distorted, disfigured, bad anatomy, extra limbs, six fingers, seven fingers, too many fingers, extra fingers, fused fingers, mutated hands, bad hands, poorly drawn hands, poorly drawn face, cloned hands, missing fingers, dead eyes, glazed eyes, lifeless eyes, dull eyes, unfocused eyes, cross-eyed, asymmetrical eyes, closed eyes, half-closed eyes, white eyes, milky eyes, plastic eyes, glass eyes, watermark, signature, text, logo, words, letters, typography, caption, subtitle, banner, label, writing, font, alphabet, characters, readable text, illegible text, garbled text, random text, nonsense text",
            denoising_strength: config.denoising ?? 0.65,
            instant_id_strength: config.instantId ?? 0.65,
            control_depth_strength: config.depthStrength ?? 0.65,
            prompt_strength: config.promptStrength ?? 5.5,
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
              face_upsample: false,
              background_enhance: true,
              codeformer_fidelity: 0.82,
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
      console.error(`[${jobId}] GALLERY SAVE FAILED:`, saveErr);
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
    let generated = Buffer.from(await response.arrayBuffer()) as Buffer;

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
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa", "dccomic", "fortnite", "luxury", "hollywood", "sims", "timetraveler", "matrix", "titanic", "starwars", "godfather", "madmax", "interstellar", "gatsby", "wonderwoman"];
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
  const validStyles: Style[] = ["comic", "anime", "popart", "watercolor", "oilpainting", "cyberpunk", "pixel", "clay", "toy", "vaporwave", "fantasy", "gtasa", "dccomic", "fortnite", "luxury", "hollywood", "sims", "timetraveler", "matrix", "titanic", "starwars", "godfather", "madmax", "interstellar", "gatsby", "wonderwoman"];
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

// ── DELETE /api/gallery/:id — delete a generation ─────────────────────────────
router.delete("/gallery/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const [row] = await db
      .select()
      .from(generationsTable)
      .where(eq(generationsTable.id, id))
      .limit(1);

    if (!row) { res.status(404).json({ message: "Not found" }); return; }
    if (row.userId !== req.user!.sub) { res.status(403).json({ message: "Forbidden" }); return; }

    // Delete file from disk if it exists
    if (row.filePath && fs.existsSync(row.filePath)) {
      fs.unlinkSync(row.filePath);
    }

    await db.delete(generationsTable).where(eq(generationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("delete generation error:", err);
    res.status(500).json({ message: "Failed to delete" });
  }
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
