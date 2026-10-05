/**
 * Optimize close-up game GLBs (cars, collectibles) in place.
 *
 * Same chain as optimize-monuments.mjs, but with milder defaults: these
 * models are seen from a few metres, not as hazed silhouettes. Draco alone
 * is not enough — the 4K PNG textures are the VRAM / ArrayBuffer problem.
 *
 * Usage:
 *   node scripts/optimize-glbs.mjs <directory> <file.glb> ...
 *   node scripts/optimize-glbs.mjs --ratio=0.1 --error=0.01 --tex=1024 [--join] <dir> <file.glb> ...
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'

function parseArgs(argv) {
  let ratio = '0.1'
  let error = '0.01'
  let tex = '1024'
  let join = false
  const rest = []
  for (const arg of argv) {
    if (arg.startsWith('--ratio=')) ratio = arg.slice('--ratio='.length)
    else if (arg.startsWith('--error=')) error = arg.slice('--error='.length)
    else if (arg.startsWith('--tex=')) tex = arg.slice('--tex='.length)
    else if (arg === '--join') join = true
    else if (arg === '--ratio' || arg === '--error' || arg === '--tex') {
      console.error('Use --ratio=0.1, --error=0.01, --tex=1024 (equals form).')
      process.exit(1)
    } else rest.push(arg)
  }
  return { ratio, error, tex, join, rest }
}

const { ratio, error, tex, join, rest } = parseArgs(process.argv.slice(2))
const dir = rest[0]
const names = rest.slice(1)
if (!dir || names.length === 0) {
  console.error(
    'Usage: node optimize-glbs.mjs [--ratio=0.1] [--error=0.01] [--tex=1024] [--join] <directory> <file.glb> ...'
  )
  process.exit(1)
}

const STAGES = [
  { name: 'weld', args: ['weld'] },
  ...(join
    ? [
        { name: 'flatten', args: ['flatten'] },
        { name: 'join', args: ['join'] },
      ]
    : []),
  { name: 'simplify', args: ['simplify', '--ratio', ratio, '--error', error] },
  { name: 'prune', args: ['prune'] },
  { name: 'dedup', args: ['dedup'] },
  { name: 'resize', kind: 'sharp-resize' },
  { name: 'webp', args: ['webp', '--quality', '80'] },
  { name: 'draco', args: ['draco'] },
]

function isBinaryGlb(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(4)
  fs.readSync(fd, buf, 0, 4, 0)
  fs.closeSync(fd)
  return buf.toString('ascii') === 'glTF'
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function cleanup(files) {
  for (const f of files) {
    if (fs.existsSync(f)) fs.rmSync(f, { force: true })
  }
}

/** CLI resize crashes on some Windows + 4K texture GLBs; Sharp handles them one at a time. */
async function resizeGlbTextures(inputPath, outputPath, maxSize) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const document = await io.read(inputPath)
  const max = Number(maxSize)
  let resized = 0
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage()
    if (!image) continue
    try {
      const buf = Buffer.from(image)
      const meta = await sharp(buf).metadata()
      const w = meta.width ?? 0
      const h = meta.height ?? 0
      if (w <= max && h <= max) continue
      const format = meta.format === 'jpeg' ? 'jpeg' : meta.format === 'webp' ? 'webp' : 'png'
      const out = await sharp(buf)
        .resize(max, max, { fit: 'inside', withoutEnlargement: true })
        .toFormat(format)
        .toBuffer()
      texture.setImage(out)
      resized += 1
    } catch (err) {
      console.warn(`    skip texture: ${err.message}`)
    }
  }
  await io.write(outputPath, document)
  console.log(`    resized ${resized} textures to <=${max}px`)
}

function runCliStage(stage, current, out) {
  const result = spawnSync(
    'npx',
    ['--yes', '@gltf-transform/cli', ...stage.args, current, out],
    { stdio: 'inherit', shell: true }
  )
  return result.status === 0 && fs.existsSync(out) && isBinaryGlb(out)
}

console.log(`Profile: ratio=${ratio} error=${error} tex=${tex} join=${join}`)

async function main() {
  for (const name of names) {
    const input = path.join(dir, name)
    if (!fs.existsSync(input)) {
      console.error(`Missing: ${input}`)
      process.exit(1)
    }

    const before = fs.statSync(input).size
    console.log(`\n=== Optimizing ${name} (${mb(before)}) ===`)

    const backup = `${input}.bak`
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(input, backup)
      console.log(`  backup -> ${path.basename(backup)}`)
    } else {
      console.log(`  backup exists, leaving ${path.basename(backup)} untouched`)
    }

    const temps = []
    let current = input

    for (const [i, stage] of STAGES.entries()) {
      const out = path.join(dir, name.replace(/\.glb$/i, `-stage${i}-${stage.name}.glb`))
      temps.push(out)

      if (stage.kind === 'sharp-resize') {
        try {
          await resizeGlbTextures(current, out, tex)
        } catch (err) {
          console.error(`Failed at stage '${stage.name}' for ${name}: ${err.message}`)
          cleanup(temps)
          process.exit(1)
        }
      } else if (!runCliStage(stage, current, out)) {
        console.error(`Failed at stage '${stage.name}' for ${name}`)
        cleanup(temps)
        process.exit(1)
      }

      if (!fs.existsSync(out) || !isBinaryGlb(out)) {
        console.error(`Failed at stage '${stage.name}' for ${name}`)
        cleanup(temps)
        process.exit(1)
      }

      console.log(`  ${stage.name}: ${mb(fs.statSync(out).size)}`)
      current = out
    }

    const after = fs.statSync(current).size
    if (after < 1024) {
      console.error(`Suspiciously small output (${after} bytes), aborting.`)
      cleanup(temps)
      process.exit(1)
    }

    fs.copyFileSync(current, input)
    cleanup(temps)

    const pct = ((1 - after / before) * 100).toFixed(1)
    console.log(`OK ${name}: ${mb(before)} -> ${mb(after)} (${pct}% smaller)`)
  }

  console.log('\nAll GLBs optimized.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
