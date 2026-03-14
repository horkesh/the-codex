/**
 * Downloads variable WOFF2 fonts from Google Fonts into public/fonts/
 * Run: node scripts/download-fonts.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '..', 'public', 'fonts')
mkdirSync(OUT, { recursive: true })

// Modern Chrome UA — required to get WOFF2 from Google Fonts
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FONTS = [
  {
    name: 'PlayfairDisplay-Variable',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&display=swap',
  },
  {
    name: 'PlayfairDisplay-Italic-Variable',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400..900&display=swap',
  },
  {
    // Plus Jakarta Sans — clean, modern, excellent variable support
    name: 'InstrumentSans-Variable',
    url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300..700&display=swap',
  },
  {
    name: 'JetBrainsMono-Variable',
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300..700&display=swap',
  },
]

async function fetchCSS(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Failed to fetch CSS: ${res.status} ${url}`)
  return res.text()
}

function extractWoff2Url(css) {
  // Pick last src: url(...) block (latin subset — the one we want)
  const matches = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)]
  if (!matches.length) throw new Error('No WOFF2 URL found in CSS')
  return matches[matches.length - 1][1]
}

async function downloadFont(woff2Url, outPath) {
  const res = await fetch(woff2Url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Failed to download font: ${res.status}`)
  const buf = await res.arrayBuffer()
  writeFileSync(outPath, Buffer.from(buf))
}

console.log('Downloading fonts to public/fonts/ ...\n')

for (const font of FONTS) {
  try {
    process.stdout.write(`  ${font.name}.woff2 ... `)
    const css = await fetchCSS(font.url)
    const woff2Url = extractWoff2Url(css)
    const outPath = join(OUT, `${font.name}.woff2`)
    await downloadFont(woff2Url, outPath)
    console.log('✓')
  } catch (err) {
    console.log(`✗ ${err.message}`)
    process.exitCode = 1
  }
}

console.log('\nDone.')
