import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000"/>
  <text x="256" y="290" text-anchor="middle" fill="#3dd68c" font-family="monospace" font-size="280" font-weight="700">$</text>
</svg>`

await mkdir(iconsDir, { recursive: true })
const buf = Buffer.from(svg)

for (const size of [192, 512]) {
  await sharp(buf).resize(size, size).png().toFile(join(iconsDir, `icon-${size}.png`))
}

console.log('icons generated')
