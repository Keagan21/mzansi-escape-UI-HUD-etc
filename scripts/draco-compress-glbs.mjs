/**
 * Draco-compress GLB files in place. Output must use a .glb extension or
 * gltf-transform writes split .gltf + .bin instead of a binary GLB.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const names = process.argv.slice(3)
if (!dir || names.length === 0) {
  console.error('Usage: node draco-compress-glbs.mjs <directory> <file.glb> ...')
  process.exit(1)
}

function isBinaryGlb(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(4)
  fs.readSync(fd, buf, 0, 4, 0)
  fs.closeSync(fd)
  return buf.toString('ascii') === 'glTF'
}

for (const name of names) {
  const input = path.join(dir, name)
  const temp = path.join(dir, name.replace(/\.glb$/i, '-draco.glb'))
  if (!fs.existsSync(input)) {
    console.error(`Missing: ${input}`)
    process.exit(1)
  }
  const before = fs.statSync(input).size
  console.log(`\n=== Draco: ${name} (${(before / 1024 / 1024).toFixed(1)} MB) ===`)
  const result = spawnSync(
    'npx',
    ['--yes', '@gltf-transform/cli', 'draco', input, temp],
    { stdio: 'inherit', shell: true }
  )
  if (result.status !== 0) {
    console.error(`Failed: ${name}`)
    process.exit(result.status ?? 1)
  }
  if (!fs.existsSync(temp) || !isBinaryGlb(temp)) {
    console.error(`Output is not a valid GLB: ${temp}`)
    process.exit(1)
  }
  const after = fs.statSync(temp).size
  if (after < before * 0.05) {
    console.error(`Suspiciously small output (${after} bytes), aborting.`)
    process.exit(1)
  }
  fs.renameSync(temp, input)
  const pct = ((1 - after / before) * 100).toFixed(1)
  console.log(
    `OK ${name}: ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB (${pct}% smaller)`
  )
}

console.log('\nAll files compressed.')
