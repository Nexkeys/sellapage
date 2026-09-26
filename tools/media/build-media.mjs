// tools/media/build-media.mjs
//
// Turns whatever is dropped into media-src/<slot>/ into small, fast files in
// public/media/<slot>/, and writes src/media/media-manifest.json, which is the
// list the site reads to decide what to show.
//
// Run from the project root:   npm run media
//
// WHY THE LIMITS ARE WHAT THEY ARE
// Nigerian visitors pay for data by the megabyte, often on low-end Android
// phones over 3G. On 25 September 2026 the two homepage hero images alone were
// 2.6 MB of uncompressed PNG. Everything here is sized for that visitor:
//   images  WebP, a large version and a phone version
//   videos  MP4 (H.264, plays on every phone), no sound, longest side 1280px,
//           capped at 20 seconds, re-squeezed if it comes out over 1.5 MB
//
// SAFE TO RUN ANY NUMBER OF TIMES
// Files are named by a fingerprint of their content, so unchanged files are
// skipped, a replaced file gets a new name (so no visitor is ever shown a
// stale cached copy), and outputs nobody uses any more are deleted.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const SRC = path.join(ROOT, 'media-src')
const OUT = path.join(ROOT, 'public', 'media')
const MANIFEST = path.join(ROOT, 'src', 'media', 'media-manifest.json')

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.3gp', '.mkv'])

// Width of the large and phone versions, by the shape of the frame on the page.
const SIZES = {
  landscape: { lg: 1280, sm: 640 },
  portrait: { lg: 720, sm: 380 },
  square: { lg: 400, sm: 200 },
}

const MAX_VIDEO_SECONDS = 20
const VIDEO_SOFT_LIMIT = 1.5 * 1024 * 1024

let sharp
let ffmpegPath
try {
  sharp = (await import('sharp')).default
  ffmpegPath = (await import('ffmpeg-static')).default
} catch (err) {
  console.error('\nThe media tools are not installed. Run this from the project root instead:\n\n  npm run media\n')
  console.error(String(err?.message || err))
  process.exit(1)
}

const { MEDIA_SLOTS } = await import(pathToFileURL(path.join(ROOT, 'src', 'media', 'slots.js')).href)

const kb = (n) => `${Math.round(n / 1024)} KB`
const fingerprint = (file) =>
  crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10)

function newestOf(dir, exts) {
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.') && exts.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null
}

async function makeImage(source, outDir, shape, hash) {
  const size = SIZES[shape] || SIZES.landscape
  const lgName = `${hash}-lg.webp`
  const smName = `${hash}-sm.webp`
  const lg = path.join(outDir, lgName)
  const sm = path.join(outDir, smName)

  if (!fs.existsSync(lg)) {
    // rotate() with no argument applies the phone's EXIF orientation, so a
    // photo taken sideways is not published sideways.
    await sharp(source).rotate().resize({ width: size.lg, withoutEnlargement: true }).webp({ quality: 78 }).toFile(lg)
  }
  if (!fs.existsSync(sm)) {
    await sharp(source).rotate().resize({ width: size.sm, withoutEnlargement: true }).webp({ quality: 72 }).toFile(sm)
  }

  const meta = await sharp(lg).metadata()
  return {
    src: `/media/${path.basename(outDir)}/${lgName}`,
    srcSmall: `/media/${path.basename(outDir)}/${smName}`,
    width: meta.width,
    height: meta.height,
    bytes: fs.statSync(lg).size,
    files: [lgName, smName],
  }
}

/**
 * Finds black bars baked into a recording (common with screen recordings and
 * phone clips) and returns an ffmpeg crop that removes them, or '' when there
 * is nothing worth trimming. Samples the first few seconds only.
 */
function detectCrop(source) {
  let out = ''
  try {
    execFileSync(ffmpegPath, ['-hide_banner', '-t', '6', '-i', source, '-vf', 'cropdetect=24:2:0', '-f', 'null', '-'], {
      stdio: ['ignore', 'ignore', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch (err) {
    out = String(err?.stderr || '')
  }
  // ffmpeg writes its log to stderr even on success, which execFileSync only
  // surfaces on failure, so run once more capturing it explicitly.
  if (!out) {
    const r = spawnSync(ffmpegPath, ['-hide_banner', '-t', '6', '-i', source, '-vf', 'cropdetect=24:2:0', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    out = String(r.stderr || '')
  }
  const matches = [...out.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)]
  const size = out.match(/Stream.*Video.*?, (\d{2,5})x(\d{2,5})/)
  if (!matches.length || !size) return ''
  const [, w, h, x, y] = matches[matches.length - 1].map(Number)
  const [W, H] = [Number(size[1]), Number(size[2])]
  // Only trim real bars. A few pixels is noise, and a crop that removes most
  // of the picture means the clip is mostly dark, not that it has bars.
  const trimmed = 1 - (w * h) / (W * H)
  if (trimmed < 0.04 || trimmed > 0.5) return ''
  return `crop=${w}:${h}:${x}:${y},`
}

function encodeVideo(source, target, crf, crop = '') {
  execFileSync(
    ffmpegPath,
    [
      '-y', '-loglevel', 'error',
      '-i', source,
      '-t', String(MAX_VIDEO_SECONDS),
      '-an',
      // Black bars trimmed first, then the longest side at most 1280 and the
      // other side even (H.264 requires it).
      '-vf', `${crop}scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
      '-pix_fmt', 'yuv420p',
      // Puts the index at the front of the file so playback starts before the
      // whole video has downloaded.
      '-movflags', '+faststart',
      target,
    ],
    { stdio: 'inherit' },
  )
}

async function makeVideo(source, outDir, hash) {
  const name = `${hash}.mp4`
  const target = path.join(outDir, name)

  if (!fs.existsSync(target)) {
    const crop = detectCrop(source)
    if (crop) console.log(`      trimming black bars (${crop.slice(5, -1)})`)
    encodeVideo(source, target, 30, crop)
    if (fs.statSync(target).size > VIDEO_SOFT_LIMIT) {
      console.log(`      over ${kb(VIDEO_SOFT_LIMIT)}, squeezing harder`)
      encodeVideo(source, target, 35, crop)
    }
  }
  return { src: `/media/${path.basename(outDir)}/${name}`, bytes: fs.statSync(target).size, files: [name] }
}

async function posterFromVideo(videoFile, outDir, hash) {
  const png = path.join(outDir, `${hash}-frame.png`)
  const webpName = `${hash}-poster.webp`
  const webp = path.join(outDir, webpName)
  if (!fs.existsSync(webp)) {
    execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-ss', '1', '-i', videoFile, '-frames:v', '1', png])
    await sharp(png).webp({ quality: 72 }).toFile(webp)
    fs.rmSync(png, { force: true })
  }
  const meta = await sharp(webp).metadata()
  return { src: `/media/${path.basename(outDir)}/${webpName}`, width: meta.width, height: meta.height, files: [webpName] }
}

function writeReadme() {
  const lines = [
    '# Sellapage media',
    '',
    'Each folder here is one spot on the website. Drop a photo or a video into',
    'a folder, then run this from the project root:',
    '',
    '    npm run media',
    '',
    'It compresses everything for phones and slow connections and puts it on',
    'the site. An empty folder means that spot keeps its current design.',
    '',
    'Photos: JPG, PNG or WebP. iPhone HEIC photos will not work; save them as',
    'JPG first. Videos: MP4 or MOV, 10 to 15 seconds, no sound needed. Anything',
    'longer than 20 seconds is cut at 20.',
    '',
    'If a folder has a photo AND a video, the photo is shown while the video',
    'loads. Newest file wins if you put in more than one of the same kind.',
    '',
    'The files you put here stay on your computer (they are not uploaded to',
    'GitHub). Only the small compressed copies are.',
    '',
    '| Folder | Where it shows | Shape | Suggestion |',
    '|---|---|---|---|',
    ...MEDIA_SLOTS.map((s) => `| \`${s.name}\` | ${s.where} | ${s.shape} | ${s.tip} |`),
    '',
  ]
  fs.writeFileSync(path.join(SRC, 'README.md'), lines.join('\n'))
}

// ─────────────────────────────────────────────────────────────────────────────

fs.mkdirSync(SRC, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })
for (const slot of MEDIA_SLOTS) fs.mkdirSync(path.join(SRC, slot.name), { recursive: true })
writeReadme()

const known = new Set(MEDIA_SLOTS.map((s) => s.name))
for (const dir of fs.readdirSync(SRC)) {
  if (fs.statSync(path.join(SRC, dir)).isDirectory() && !known.has(dir)) {
    console.warn(`  ! media-src/${dir} is not a known spot on the site and was skipped. Check the spelling against media-src/README.md.`)
  }
}

const manifest = {}
const rows = []

for (const slot of MEDIA_SLOTS) {
  const dir = path.join(SRC, slot.name)
  const outDir = path.join(OUT, slot.name)
  const image = slot.accepts === 'video' ? null : newestOf(dir, IMAGE_EXT)
  const video = slot.accepts === 'image' ? null : newestOf(dir, VIDEO_EXT)

  const heic = fs.readdirSync(dir).find((f) => /\.hei[cf]$/i.test(f))
  if (heic) console.warn(`  ! media-src/${slot.name}/${heic} is an iPhone HEIC photo. Save it as JPG and try again.`)

  if (!image && !video) {
    // Empty: the page shows its current design. Clear any old output.
    fs.rmSync(outDir, { recursive: true, force: true })
    continue
  }

  fs.mkdirSync(outDir, { recursive: true })
  const keep = new Set()

  try {
    if (video) {
      const vHash = fingerprint(video)
      console.log(`  ${slot.name}: video ${path.basename(video)}`)
      const v = await makeVideo(video, outDir, vHash)
      v.files.forEach((f) => keep.add(f))

      let poster
      if (image) {
        const img = await makeImage(image, outDir, slot.shape, fingerprint(image))
        img.files.forEach((f) => keep.add(f))
        poster = { src: img.src, width: img.width, height: img.height }
      } else {
        // From the COMPRESSED video, not the original: a phone recording is
        // 1920px tall, and a still frame that size would outweigh the clip.
        const p = await posterFromVideo(path.join(ROOT, 'public', v.src), outDir, vHash)
        p.files.forEach((f) => keep.add(f))
        poster = { src: p.src, width: p.width, height: p.height }
      }

      // A widescreen clip in a phone-shaped frame shows as a thin strip, and
      // the reverse wastes most of the frame. Say so rather than publish it.
      const clipShape = poster.width > poster.height * 1.15 ? 'landscape' : poster.height > poster.width * 1.15 ? 'portrait' : 'square'
      if (clipShape !== slot.shape) {
        console.warn(`      ! this video is ${clipShape} (${poster.width}x${poster.height}) but ${slot.name} is a ${slot.shape} frame: ${slot.where}.`)
        console.warn(`        It will look wrong there. See media-src/README.md for a ${clipShape} spot that fits.`)
      }

      manifest[slot.name] = { type: 'video', src: v.src, poster: poster.src, width: poster.width, height: poster.height }
      rows.push([slot.name, 'video', kb(v.bytes)])
    } else {
      console.log(`  ${slot.name}: photo ${path.basename(image)}`)
      const img = await makeImage(image, outDir, slot.shape, fingerprint(image))
      img.files.forEach((f) => keep.add(f))
      manifest[slot.name] = { type: 'image', src: img.src, srcSmall: img.srcSmall, width: img.width, height: img.height }
      rows.push([slot.name, 'photo', kb(img.bytes)])
    }
  } catch (err) {
    // One bad file must not stop the rest. The spot keeps its current design.
    console.error(`  ✗ ${slot.name}: could not process (${err?.message || err}). This spot keeps its current design.`)
    continue
  }

  // Anything left from an earlier version of this spot.
  for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) fs.rmSync(path.join(outDir, f), { force: true })
}

// Output folders for spots that no longer exist in the list.
for (const dir of fs.readdirSync(OUT)) {
  if (!known.has(dir)) fs.rmSync(path.join(OUT, dir), { recursive: true, force: true })
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n')

console.log('')
if (!rows.length) {
  console.log('No photos or videos found yet. Drop files into the folders in media-src/ (see media-src/README.md).')
} else {
  console.log('On the site now:')
  for (const [name, kind, size] of rows) console.log(`  ${name.padEnd(22)} ${kind.padEnd(6)} ${size}`)
  console.log(`\n${rows.length} of ${MEDIA_SLOTS.length} spots filled. Commit public/media and src/media/media-manifest.json, then push.`)
}
