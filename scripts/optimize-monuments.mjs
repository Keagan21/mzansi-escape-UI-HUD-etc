/**
 * Optimize far-horizon landmark GLBs for Level 3.
 *
 * These models are exported at photogrammetry density (~1.5M triangles and
 * three 4096x4096 PNGs each, ~90 MB on disk and ~270 MB of VRAM per model).
 * They are only ever seen as hazed silhouettes 300-450 world units away, so
 * nearly all of that detail is wasted. Draco alone is not enough — it only
 * touches geometry and leaves the textures, which are the VRAM problem.
 *
 * Each stage writes to a temp file and the chain is applied in sequence.
 * Originals are copied to <name>.glb.bak before anything is overwritten,
 * matching the existing ParkStation.glb.bak convention.
 *
 * Usage: node scripts/optimize-monuments.mjs <directory> <file.glb> ...
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const names = process.argv.slice(3)
if (!dir || names.length === 0) {
  console.error('Usage: node optimize-monuments.mjs <directory> <file.glb> ...')
  process.exit(1)
}

/**
 * Ordered pipeline. `weld` must precede `simplify` or the decimator cannot
 * collapse across split vertices and barely reduces anything.
 */
const STAGES = [
  { name: 'weld', args: ['weld'] },
  { name: 'simplify', args: ['simplify', '--ratio', '0.02', '--error', '0.01'] },
  { name: 'prune', args: ['prune'] },
  { name: 'dedup', args: ['dedup'] },
  { name: 'resize', args: ['resize', '--width', '512', '--height', '512'] },
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
    // Output must keep the .glb extension or gltf-transform emits a split
    // .gltf + .bin pair instead of a binary GLB.
    const out = path.join(dir, name.replace(/\.glb$/i, `-stage${i}-${stage.name}.glb`))
    temps.push(out)

    const result = spawnSync(
      'npx',
      ['--yes', '@gltf-transform/cli', ...stage.args, current, out],
      { stdio: 'inherit', shell: true }
    )

    if (result.status !== 0 || !fs.existsSync(out) || !isBinaryGlb(out)) {
      console.error(`Failed at stage '${stage.name}' for ${name}`)
      cleanup(temps)
      process.exit(result.status || 1)
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

console.log('\nAll monuments optimized.')
