// tools/media/run.mjs
//
// What `npm run media` actually runs. Installs the tool's own two packages
// from INSIDE this folder, then does the conversion.
//
// Not `npm --prefix tools/media install` from the project root: npm then treats
// the project root as a package to install, and links the entire project into
// tools/media/node_modules/sellapage, a folder that points back at itself.
// That happened once; installing from here is what prevents it.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const needsInstall =
  !existsSync(path.join(HERE, 'node_modules', 'sharp')) ||
  !existsSync(path.join(HERE, 'node_modules', 'ffmpeg-static'))

if (needsInstall) {
  console.log('Setting up the media tools (first run only, needs internet)...')
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
    cwd: HERE,
    stdio: 'inherit',
    shell: true,
  })
  if (r.status !== 0) {
    console.error('\nCould not install the media tools. Check your internet connection and run `npm run media` again.')
    process.exit(1)
  }
}

await import(pathToFileURL(path.join(HERE, 'build-media.mjs')).href)
