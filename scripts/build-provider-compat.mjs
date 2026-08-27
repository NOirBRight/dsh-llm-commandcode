import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { createHash } from 'node:crypto'

const providers = [
  { name: 'dsh-llm-cursor', root: '/home/noirbright/Workstation/dsh-llm-cursor', tag: 'v0.2.6', version: '0.2.6-commandcode.1' },
  { name: 'dsh-llm-grok', root: '/home/noirbright/Workstation/dsh-llm-grok-v0.3.0', tag: 'v0.3.0', version: '0.3.0-commandcode.1' },
  { name: 'dsh-llm-codex', root: '/home/noirbright/Workstation/dsh-llm-codex-v0.3.0', tag: 'v0.3.0', version: '0.3.0-commandcode.1' },
  { name: 'dsh-llm-ollama', root: '/home/noirbright/Workstation/dsh-llm-ollama', tag: 'v0.6.7', version: '0.6.7-commandcode.1' },
]

const PATCH_FILES = ['src/client/provider-section.ts', 'src/client/ProvidersSection.tsx']
const mode = process.argv[2] ?? ''
const outDir = process.argv[3]

function run(command, args, options = {}) {
  const stdio = options.input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit']
  execFileSync(command, args, { stdio, ...options })
}

function checkoutTag(provider, destination) {
  mkdirSync(destination, { recursive: true })
  const archivePath = join(destination, '..', basename(destination) + '.tar')
  run('git', ['-C', provider.root, 'archive', '--output=' + archivePath, provider.tag])
  run('tar', ['-xf', archivePath, '-C', destination])
  rmSync(archivePath)
}

function applyTwoFilePatch(provider, destination) {
  const patchPath = join(destination, '..', basename(destination) + '.patch')
  // --output must precede the commit-ish or git treats it as a pathspec.
  run('git', ['-C', provider.root, 'diff', '--output=' + patchPath, provider.tag, '--', ...PATCH_FILES])
  const patch = readFileSync(patchPath, 'utf8')
  if (!patch.includes('llm-commandcode')) throw new Error('two-file patch for ' + provider.name + ' does not mention llm-commandcode')
  run('patch', ['-s', '-d', destination, '-p1'], { input: patch })
  const patched = readFileSync(join(destination, 'src/client/provider-section.ts'), 'utf8')
  if (!patched.includes('llm-commandcode')) throw new Error(provider.name + ': patch did not land on provider-section.ts')
}

function prepareWorkspace(provider, destination) {
  checkoutTag(provider, destination)
  applyTwoFilePatch(provider, destination)
  const manifestPath = join(destination, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.version = provider.version
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  const modules = join(provider.root, 'node_modules')
  if (!existsSync(modules)) throw new Error('missing node_modules for ' + provider.name)
  symlinkSync(modules, join(destination, 'node_modules'), 'junction')
}

function pack(dir, destination) {
  mkdirSync(destination, { recursive: true })
  const output = execFileSync('npm', ['pack', '--silent', '--pack-destination', destination, dir], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })
  const archive = output.trim().split(/\r?\n/u).at(-1)?.trim()
  if (archive === undefined || archive.length === 0) throw new Error('npm pack produced no filename for ' + dir)
  return join(destination, archive)
}

function extract(tarball, destination) {
  mkdirSync(destination, { recursive: true })
  execFileSync('tar', ['-xzf', tarball, '-C', destination])
}

function digestTree(root) {
  const entries = {}
  const files = execFileSync('find', [root, '-type', 'f']).toString().trim().split('\n').filter(Boolean).sort()
  for (const file of files) {
    const relative = file.slice(root.length + 1).replace(/^package\//u, '')
    const data = readFileSync(file)
    entries[relative] = createHash('sha256').update(data).digest('hex') + ':' + String(data.length)
  }
  return entries
}

if (mode !== 'verify') throw new Error('usage: node scripts/build-provider-compat.mjs verify <staged-output-dir>')
if (outDir === undefined || !existsSync(outDir)) throw new Error('missing staged output directory argument')

const workspace = mkdtempSync(join(tmpdir(), 'provider-compat-audit-'))
try {
  const provenance = []
  for (const provider of providers) {
    const stagedTarball = join(outDir, provider.name + '-' + provider.version + '.tgz')
    if (!existsSync(stagedTarball)) throw new Error('staged tarball missing: ' + stagedTarball)

    const compatDir = join(workspace, provider.name + '-compat')
    prepareWorkspace(provider, compatDir)
    run('pnpm', ['--dir', compatDir, 'run', 'check'])
    const rebuiltTarball = pack(compatDir, workspace)
    const rebuiltExtract = join(workspace, provider.name + '-rebuilt')
    extract(rebuiltTarball, rebuiltExtract)
    const stagedExtract = join(workspace, provider.name + '-staged')
    extract(stagedTarball, stagedExtract)
    const rebuiltFiles = digestTree(rebuiltExtract)
    const stagedFiles = digestTree(stagedExtract)
    const differingStaged = [...new Set([...Object.keys(rebuiltFiles), ...Object.keys(stagedFiles)])].filter(key => rebuiltFiles[key] !== stagedFiles[key]).sort()
    if (differingStaged.length > 0) throw new Error(provider.name + ': staged tarball is not reproducible: ' + differingStaged.join(', '))

    const baselineDir = join(workspace, provider.name + '-base')
    checkoutTag(provider, baselineDir)
    const baseManifestPath = join(baselineDir, 'package.json')
    const baseManifest = JSON.parse(readFileSync(baseManifestPath, 'utf8'))
    baseManifest.version = provider.version
    writeFileSync(baseManifestPath, JSON.stringify(baseManifest, null, 2) + '\n')
    symlinkSync(join(provider.root, 'node_modules'), join(baselineDir, 'node_modules'), 'junction')
    const baselineTarball = pack(baselineDir, workspace)
    const baselineExtract = join(workspace, provider.name + '-baseline')
    extract(baselineTarball, baselineExtract)
    const baselineFiles = digestTree(baselineExtract)
    const changedAgainstBaseline = [...new Set([...Object.keys(rebuiltFiles), ...Object.keys(baselineFiles)])].filter(key => rebuiltFiles[key] !== baselineFiles[key]).sort()

    const expected = new Set([
      'lib/client.js',
      'lib/client.js.map',
      'lib/types/client/provider-section.d.ts',
      'lib/types/client/provider-section.d.ts.map',
      'lib/types/client/ProvidersSection.d.ts',
      'lib/types/client/ProvidersSection.d.ts.map',
    ])
    const unexpected = changedAgainstBaseline.filter(file => !expected.has(file))
    if (unexpected.length > 0) throw new Error(provider.name + ': release payload exceeds the two-file fix: ' + unexpected.join(', '))

    provenance.push({
      provider: provider.name,
      tag: provider.tag,
      releaseVersion: provider.version,
      stagedTarball,
      stagedSha256: createHash('sha256').update(readFileSync(stagedTarball)).digest('hex'),
      patchScope: PATCH_FILES,
      payloadDelta: changedAgainstBaseline,
    })
  }
  const reportPath = join(outDir, 'provenance.json')
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), patchScope: PATCH_FILES, providers: provenance }, null, 2) + '\n')
  console.log('provider-compat provenance verified and written: ' + reportPath)
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
