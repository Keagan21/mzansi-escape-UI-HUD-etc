// One-off: flood-fill white background from image edges → transparent PNG.
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.join(__dirname, '../Characters/coke-bottle.png')
const outputPath = inputPath

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height, channels } = info
const n = width * height

/** Background seed: bright, low-saturation pixels (studio white). */
function isBgSeed(idx) {
  const o = idx * channels
  const r = data[o]
  const g = data[o + 1]
  const b = data[o + 2]
  const minC = Math.min(r, g, b)
  const maxC = Math.max(r, g, b)
  return minC >= 232 && maxC - minC <= 38
}

const bg = new Uint8Array(n)
const queue = []

const push = (idx) => {
  if (idx < 0 || idx >= n || bg[idx]) return
  if (!isBgSeed(idx)) return
  bg[idx] = 1
  queue.push(idx)
}

for (let x = 0; x < width; x++) {
  push(x)
  push((height - 1) * width + x)
}
for (let y = 0; y < height; y++) {
  push(y * width)
  push(y * width + width - 1)
}

while (queue.length > 0) {
  const i = queue.pop()
  const x = i % width
  const y = (i / width) | 0
  if (x > 0) push(i - 1)
  if (x < width - 1) push(i + 1)
  if (y > 0) push(i - width)
  if (y < height - 1) push(i + width)
}

for (let i = 0; i < n; i++) {
  const o = i * channels
  if (bg[i]) {
    data[o + 3] = 0
    continue
  }
  // Defringe: lighten semi-transparent edge pixels against background.
  let alpha = data[o + 3]
  if (alpha === 0) continue
  const r = data[o]
  const g = data[o + 1]
  const b = data[o + 2]
  const minC = Math.min(r, g, b)
  const maxC = Math.max(r, g, b)
  const sat = maxC - minC
  if (minC >= 200 && sat <= 55) {
    const t = Math.min(1, (minC - 200) / 48)
    alpha = Math.round(alpha * (1 - t * t))
    data[o + 3] = alpha
  }
  if (alpha > 0 && alpha < 255) {
    const a = alpha / 255
    data[o] = Math.round(data[o] * a)
    data[o + 1] = Math.round(data[o + 1] * a)
    data[o + 2] = Math.round(data[o + 2] * a)
  }
}

await sharp(data, { raw: { width, height, channels } })
  .png()
  .toFile(outputPath)

console.log('Wrote transparent PNG:', outputPath)
