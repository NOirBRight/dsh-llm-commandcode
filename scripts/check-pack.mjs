import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const fixtureRoot = join(root, 'fixtures', 'alpha1')
const tarballRoot = join(fixtureRoot, 'tarballs')
const toolTarballRoot = join(fixtureRoot, 'tool-tarballs')
const packageManifest = readJson(join(root, 'package.json'))
const provenance = readJson(join(fixtureRoot, 'PROVENANCE.json'))
const INVALID_REGISTRY = 'http://127.0.0.1:9'
const INHERITED_ENV_KEYS = [
  'PATH', 'HOME', 'USER', 'LANG', 'TMP', 'TMPDIR', 'TEMP', 'CI',
  'SystemRoot', 'WINDIR', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
  'COMSPEC', 'ComSpec', 'PATHEXT'
]
const PACKAGE_MANAGER_ENV_KEYS = new Set([
  'npm_config_userconfig', 'pnpm_config_userconfig',
  'npm_config_registry', 'pnpm_config_registry',
  'npm_config_@deepseek-ai:registry',
  'npm_config_@earendil-works:registry',
  'npm_config_@types:registry',
  'npm_config_offline', 'pnpm_config_offline',
  'npm_config_ignore_scripts', 'pnpm_config_ignore_scripts',
  'npm_config_strict_peer_dependencies', 'pnpm_config_strict_peer_dependencies',
  'npm_config_node_linker', 'pnpm_config_node_linker',
  'npm_config_virtual_store_dir', 'pnpm_config_virtual_store_dir',
  'npm_config_store_dir', 'pnpm_config_store_dir',
])
const OWNER_PACKAGE = 'dsh-llm-providers-ui'
const OWNER_VERSION = '0.1.1'
const OWNER_ARTIFACT_ENV = 'DSH_PROVIDERS_OWNER_ARTIFACT'
const OWNER_SHA_ENV = 'DSH_PROVIDERS_OWNER_SHA256'
const SOURCE_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'
const ALPHA_CHECKOUT = 'dsh-v0.1.2-alpha.1-cd5ef8148158'
const ALPHA_TAG = 'dsh-v0.1.2-alpha.1'
const ALPHA_COMMIT = 'cd5ef8148158c3a752a658978873241fdf8e2bbc'
const ALPHA_TREE = 'a712eec535b48badc4fefb4df5176a7002e4280b'
const LEGACY_ARTIFACTS = new Set([
  'lib/types/client/ProvidersSection.d.ts',
  'lib/types/client/SortableList.d.ts',
  'lib/types/client/provider-section.d.ts',
  'lib/types/client/shim.d.ts',
])
const TYPE_TOOL_NAMES = [
  'typescript',
  '@types/node',
  '@types/react',
  '@types/react-dom',
  '@types/prop-types',
  'csstype',
]

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function fail(message) {
  throw new Error('[pack:check] ' + message)
}

/** Build a child environment from safe host values and explicit package-manager settings. */
export function createChildEnv(source = process.env, extra = {}, allowPackageManager = false) {
  const environment = {}
  for (const key of INHERITED_ENV_KEYS) {
    const value = source[key]
    if (typeof value === 'string') environment[key] = value
  }
  environment.NODE_PATH = ''
  environment.NODE_OPTIONS = ''
  if (allowPackageManager) {
    for (const [key, value] of Object.entries(extra)) {
      if (PACKAGE_MANAGER_ENV_KEYS.has(key) && typeof value === 'string') environment[key] = value
    }
  }
  return environment
}

function command(commandName, args, options = {}) {
  const { env: extraEnv, packageManager = false, ...commandOptions } = options
  try {
    return execFileSync(commandName, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: createChildEnv(process.env, extraEnv, packageManager),
      ...commandOptions,
    })
  } catch (error) {
    const stdout = error.stdout?.toString() ?? ''
    const stderr = error.stderr?.toString() ?? ''
    fail(commandName + ' ' + args.join(' ') + ' failed\n' + stdout + stderr)
  }
}

function hash(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function archiveInfo(archive) {
  const names = command('tar', ['-tzf', archive]).split(/\r?\n/u).filter(Boolean)
  const details = command('tar', ['-tvzf', archive]).split(/\r?\n/u).filter(Boolean)
  if (names.length !== details.length) fail('archive listing is not deterministic: ' + archive)
  let archiveRoot
  const entries = []
  const seen = new Set()
  for (let index = 0; index < names.length; index += 1) {
    const raw = names[index]
    if (raw.includes('\0') || raw.includes('\\')) fail('archive has an unsafe path: ' + raw)
    const trimmed = raw.replace(/\/$/u, '')
    if (trimmed.length === 0) continue
    const parts = trimmed.split('/')
    const rootEntry = parts.length === 1 && (raw.endsWith('/') || details[index]?.[0] === 'd')
    if ((!rootEntry && parts.length < 2) || parts[0].length === 0 || parts[0] === '.' || parts[0] === '..') fail('archive has an unexpected root: ' + raw)
    if (archiveRoot === undefined) archiveRoot = parts[0]
    if (parts[0] !== archiveRoot) fail('archive has multiple roots: ' + raw)
    const file = parts.slice(1).join('/')
    if (rootEntry || file.length === 0) continue
    if (parts.slice(1).some(part => part.length === 0 || part === '..')) fail('archive has an unsafe path: ' + raw)
    const type = details[index]?.[0]
    if (type !== '-' && type !== 'd') fail('archive contains a link or special entry: ' + raw)
    if (seen.has(file)) fail('archive contains a duplicate path: ' + file)
    seen.add(file)
    entries.push(file)
  }
  if (archiveRoot === undefined) fail('archive is empty: ' + archive)
  return { root: archiveRoot + '/', entries: entries.sort() }
}

function safeEntries(archive) {
  return archiveInfo(archive).entries
}

function archivePackage(archive, entries = safeEntries(archive)) {
  if (!entries.includes('package.json')) fail('archive does not ship package.json: ' + archive)
  const rootName = archiveInfo(archive).root
  try {
    const manifest = JSON.parse(command('tar', ['-xOf', archive, rootName + 'package.json']))
    if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') fail('archive package.json has no package identity: ' + archive)
    return manifest
  } catch (error) {
    fail('archive package.json is not valid JSON: ' + archive + ' (' + (error instanceof Error ? error.message : String(error)) + ')')
  }
}

function globExpression(pattern) {
  let expression = '^'
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]
    if (char === '*' && pattern[index + 1] === '*') {
      if (pattern[index + 2] === '/') {
        expression += '(?:.*/)?'
        index += 2
      } else {
        expression += '.*'
        index += 1
      }
    } else if (char === '*') {
      expression += '[^/]*'
    } else if (char === '?') {
      expression += '[^/]'
    } else {
      expression += char.replace(/[\\^$+?.()|{}[\]]/gu, '\\$&')
    }
  }
  return new RegExp(expression + '$', 'u')
}

function patternMatches(pattern, entries) {
  const relativePattern = pattern.replace(/\/$/u, '')
  return entries.some(entry => entry === relativePattern || entry.startsWith(relativePattern + '/') || globExpression(relativePattern).test(entry))
}

function assertPatterns(label, patterns, entries, requireWildcards) {
  for (const originalPattern of patterns ?? []) {
    const rawPattern = typeof originalPattern === 'string' && originalPattern.startsWith('!') ? originalPattern.slice(1) : originalPattern
    const pattern = typeof rawPattern === 'string' && rawPattern.startsWith('./') ? rawPattern.slice(2) : rawPattern
    if (typeof pattern !== 'string' || pattern.length === 0 || pattern.startsWith('/') || pattern.includes('\\') || pattern.split('/').includes('..')) fail(label + ' has an unsafe files pattern: ' + String(originalPattern))
    if (!String(originalPattern).startsWith('!') && !patternMatches(pattern, entries) && requireWildcards) fail(label + ' files target is absent: ' + originalPattern)
  }
}

function exportTargets(value, output = []) {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) for (const item of value) exportTargets(item, output)
  else if (value !== null && typeof value === 'object') for (const item of Object.values(value)) exportTargets(item, output)
  return output
}

function assertExportTarget(label, target, entries, gaps, required, extensionless = false) {
  if (!target.startsWith('./') || target.includes('\0') || target.includes('\\') || target.split('/').includes('..')) fail(label + ' has an unsafe export target: ' + target)
  const relativeTarget = target.slice(2).replace(/\/$/u, '')
  if (relativeTarget.length === 0) return
  const candidates = extensionless ? [relativeTarget, relativeTarget + '.js', relativeTarget + '.mjs', relativeTarget + '.cjs', relativeTarget + '.d.ts', relativeTarget + '/index.js', relativeTarget + '/index.d.ts'] : [relativeTarget]
  const matched = candidates.some(candidate => patternMatches(candidate, entries))
  if (matched) return
  if (gaps.has(label + '|' + target) || gaps.has(label.replace(/^fixture /u, '') + '|' + target)) return
  if (!required && target.includes('*')) return
  fail(label + ' export target is absent: ' + target)
}

function assertExports(label, manifest, entries, gaps, required) {
  if (manifest.exports !== undefined) {
    for (const target of exportTargets(manifest.exports)) assertExportTarget(label, target, entries, gaps, required)
    return
  }
  for (const field of ['main', 'types']) {
    if (typeof manifest[field] !== 'string') continue
    const target = manifest[field].startsWith('./') ? manifest[field] : './' + manifest[field]
    assertExportTarget(label, target, entries, gaps, required, true)
  }
}

function packageKey(name, version) {
  return name + '@' + version
}

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

function bareImports(text) {
  const withoutComments = text
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1')
  const imports = new Set()
  const pattern = /(?:\bexport\s+(?:\*|\{[^}]*\})\s+from\s*|\bfrom\s*|\bimport\s*(?:\(|)|\brequire\s*\(\s*)["']([^"']+)["']/gu
  for (const match of withoutComments.matchAll(pattern)) {
    const specifier = match[1]
    if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('#') && !specifier.startsWith('node:')) imports.add(packageName(specifier))
  }
  return imports
}

function parseVersion(version) {
  const match = /^(?:v)?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/u.exec(String(version).trim())
  if (match === null) return undefined
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), pre: match[4]?.split('.') ?? [] }
}

function compareVersion(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (a === undefined || b === undefined) return Number.NaN
  for (const field of ['major', 'minor', 'patch']) if (a[field] !== b[field]) return a[field] - b[field]
  if (a.pre.length === 0 && b.pre.length > 0) return 1
  if (a.pre.length > 0 && b.pre.length === 0) return -1
  for (let index = 0; index < Math.max(a.pre.length, b.pre.length); index += 1) {
    if (a.pre[index] === undefined) return -1
    if (b.pre[index] === undefined) return 1
    if (a.pre[index] === b.pre[index]) continue
    const aNumber = /^\d+$/u.test(a.pre[index])
    const bNumber = /^\d+$/u.test(b.pre[index])
    if (aNumber && bNumber) return Number(a.pre[index]) - Number(b.pre[index])
    if (aNumber !== bNumber) return aNumber ? -1 : 1
    return a.pre[index].localeCompare(b.pre[index])
  }
  return 0
}

function comparator(version, operator, target) {
  const result = compareVersion(version, target)
  if (Number.isNaN(result)) return false
  if (operator === '>') return result > 0
  if (operator === '>=') return result >= 0
  if (operator === '<') return result < 0
  if (operator === '<=') return result <= 0
  return result === 0
}

function satisfies(version, range) {
  if (typeof range !== 'string') return false
  let value = range.trim().replace(/^workspace:/u, '')
  if (value === '' || value === '*' || value === 'latest') return true
  if (value.includes('||')) return value.split('||').some(part => satisfies(version, part))
  if (value.startsWith('^') || value.startsWith('~')) {
    const operator = value[0]
    const base = value.slice(1).trim()
    const parsed = parseVersion(base)
    if (parsed === undefined) return false
    const upper = operator === '^'
      ? parsed.major > 0 ? (parsed.major + 1) + '.0.0' : parsed.minor > 0 ? '0.' + (parsed.minor + 1) + '.0' : '0.0.' + (parsed.patch + 1)
      : parsed.major + '.' + (parsed.minor + 1) + '.0'
    return comparator(version, '>=', base) && comparator(version, '<', upper)
  }
  const hyphen = /^(\S+)\s+-\s+(\S+)$/u.exec(value)
  if (hyphen !== null) return comparator(version, '>=', hyphen[1]) && comparator(version, '<=', hyphen[2])
  const comparators = value.match(/(?:>=|<=|>|<|=)?\s*v?\d+(?:\.(?:\d+|x|X|\*)){0,2}(?:-[0-9A-Za-z.-]+)?/gu)
  if (comparators === null || comparators.length === 0) return false
  return comparators.every(token => {
    const match = /^(>=|<=|>|<|=)?\s*v?(\d+)(?:\.(\d+|x|X|\*))?(?:\.(\d+|x|X|\*))?(?:-([0-9A-Za-z.-]+))?$/u.exec(token.trim())
    if (match === null) return false
    const operator = match[1] ?? ''
    const major = Number(match[2])
    const minor = match[3] === undefined || /^[xX*]$/u.test(match[3]) ? undefined : Number(match[3])
    const patch = match[4] === undefined || /^[xX*]$/u.test(match[4]) ? undefined : Number(match[4])
    const target = major + '.' + (minor ?? 0) + '.' + (patch ?? 0) + (match[5] === undefined ? '' : '-' + match[5])
    if (operator !== '') return comparator(version, operator, target)
    const actual = parseVersion(version)
    if (actual === undefined) return false
    if (minor === undefined) return actual.major === major
    if (patch === undefined) return actual.major === major && actual.minor === minor
    return comparator(version, '=', target)
  })
}

function dependencyEntries(manifest) {
  const result = []
  for (const [kind, dependencies] of [
    ['dependencies', manifest.dependencies ?? {}],
    ['optionalDependencies', manifest.optionalDependencies ?? {}],
    ['peerDependencies', manifest.peerDependencies ?? {}],
  ]) {
    for (const [name, specifier] of Object.entries(dependencies)) result.push({
      kind,
      name,
      specifier,
      optional: kind === 'optionalDependencies' || manifest.peerDependenciesMeta?.[name]?.optional === true,
    })
  }
  return result
}

function validatePackageArchive(label, archive, options = {}) {
  const entries = safeEntries(archive)
  const manifest = archivePackage(archive, entries)
  assertPatterns(label, manifest.files, entries, options.requireFiles === true)
  assertExports(label, manifest, entries, options.gaps ?? new Set(), options.requireExports !== false)
  if (options.requireName !== undefined && manifest.name !== options.requireName) fail(label + ' has package name ' + manifest.name + ', expected ' + options.requireName)
  if (options.requireVersion !== undefined && manifest.version !== options.requireVersion) fail(label + ' has package version ' + manifest.version + ', expected ' + options.requireVersion)
  if (options.forbidSource === true && entries.some(entry => entry.split('/').includes('src'))) fail(label + ' ships source files')
  if (entries.some(entry => entry === 'node_modules' || entry.startsWith('node_modules/'))) fail(label + ' ships node_modules')
  if (options.forbidLegacy === true) for (const legacy of LEGACY_ARTIFACTS) if (entries.includes(legacy)) fail(label + ' ships removed artifact: ' + legacy)
  return { entries, manifest }
}

function loadArchives(directory, section) {
  if (!existsSync(directory) || !lstatSync(directory).isDirectory()) fail('fixture directory is missing: ' + directory)
  const actualFiles = readdirSync(directory).sort()
  if (actualFiles.some(file => !file.endsWith('.tgz'))) fail('fixture directory contains a non-tarball entry: ' + directory)
  const records = new Map()
  for (const file of actualFiles) {
    const archive = join(directory, file)
    const stat = lstatSync(archive)
    if (!stat.isFile() || stat.isSymbolicLink()) fail('fixture is not a regular file: ' + file)
    const entries = safeEntries(archive)
    const manifest = archivePackage(archive, entries)
    const key = packageKey(manifest.name, manifest.version)
    if (records.has(key)) fail('fixture contains duplicate package identity: ' + key)
    const expected = section?.[file]
    if (expected === undefined) fail('provenance is missing fixture record: ' + file)
    if (expected.package !== manifest.name || expected.version !== manifest.version) fail('provenance package identity mismatch: ' + file)
    records.set(key, { file, archive, package: manifest, entries })
  }
  return { actualFiles, records }
}

function expectedSource(name) {
  return name.startsWith('@deepseek-ai/') ? 'alpha1-checkout' : 'registry'
}

function validateArchiveRecords(directory, section, loaded, isTool) {
  const manifestFiles = Object.keys(section ?? {}).sort()
  if (JSON.stringify(manifestFiles) !== JSON.stringify(loaded.actualFiles)) fail('provenance tarball list does not exactly match ' + directory)
  for (const record of loaded.records.values()) {
    const expected = section[record.file]
    const stat = lstatSync(record.archive)
    const actualHash = hash(record.archive)
    if (!Number.isInteger(expected.bytes) || expected.bytes !== stat.size || typeof expected.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(expected.sha256) || expected.sha256 !== actualHash) fail('provenance hash or byte count mismatch: ' + record.file)
    if (expected.source !== expectedSource(record.package.name)) fail('provenance source mismatch: ' + record.file)
    if (typeof expected.sourceUrl !== 'string' || !expected.sourceUrl.startsWith(expected.source === 'registry' ? 'https://registry.npmjs.org/' : SOURCE_REPOSITORY)) fail('provenance source URL mismatch: ' + record.file)
    if (isTool && expected.source !== 'registry') fail('typecheck fixture is not a registry artifact: ' + record.file)
  }
}

function gapSet() {
  const gaps = new Set()
  for (const gap of provenance.upstreamArtifactGaps ?? []) {
    if (typeof gap.package !== 'string' || typeof gap.version !== 'string' || typeof gap.exportTarget !== 'string' || typeof gap.reason !== 'string' || gap.reason.length === 0) fail('provenance contains an invalid upstream artifact gap')
    const key = packageKey(gap.package, gap.version)
    if (gaps.has(key + '|' + gap.exportTarget)) fail('provenance contains a duplicate upstream artifact gap: ' + key + '|' + gap.exportTarget)
    gaps.add(key + '|' + gap.exportTarget)
  }
  return gaps
}

function gapSetForRecord(record) {
  const gaps = new Set()
  for (const gap of provenance.upstreamArtifactGaps ?? []) if (gap.package === record.package.name && gap.version === record.package.version) gaps.add(packageKey(gap.package, gap.version) + '|' + gap.exportTarget)
  return gaps
}

function validateDependencyGraph(records, ownerManifest) {
  const edgeValues = provenance.parentEdges
  if (!Array.isArray(edgeValues)) fail('provenance parentEdges is not an array')
  const edges = edgeValues.map(edge => {
    if (edge === null || typeof edge !== 'object' || edge.parent === null || typeof edge.parent !== 'object' || edge.child === null || typeof edge.child !== 'object' || typeof edge.parent.package !== 'string' || typeof edge.parent.version !== 'string' || typeof edge.child.package !== 'string' || typeof edge.child.version !== 'string' || typeof edge.kind !== 'string' || typeof edge.specifier !== 'string') fail('provenance contains an invalid parent edge')
    return edge
  })
  const canonical = [...edges].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  if (JSON.stringify(edges) !== JSON.stringify(canonical)) fail('provenance parentEdges are not canonical')
  const edgeKeys = new Set()
  const byParent = new Map()
  for (const edge of edges) {
    const key = JSON.stringify(edge)
    if (edgeKeys.has(key)) fail('provenance contains a duplicate parent edge')
    edgeKeys.add(key)
    const parentKey = packageKey(edge.parent.package, edge.parent.version)
    const childKey = packageKey(edge.child.package, edge.child.version)
    if (!records.has(childKey)) fail('parent edge points to a missing fixture: ' + childKey)
    const list = byParent.get(parentKey) ?? []
    list.push(edge)
    byParent.set(parentKey, list)
  }
  const rootKeys = new Set([
    packageKey(packageManifest.name, packageManifest.version),
    packageKey(OWNER_PACKAGE, ownerManifest.version),
  ])
  for (const record of records.values()) {
    const key = packageKey(record.package.name, record.package.version)
    if (rootKeys.has(key)) fail('fixture identity collides with a root package: ' + key)
  }
  const parents = new Map([
    [packageKey(packageManifest.name, packageManifest.version), packageManifest],
    [packageKey(OWNER_PACKAGE, ownerManifest.version), ownerManifest],
  ])
  for (const record of records.values()) parents.set(packageKey(record.package.name, record.package.version), record.package)
  for (const parentKey of byParent.keys()) if (!parents.has(parentKey)) fail('parent edge has an unknown parent: ' + parentKey)
  const used = new Set()
  for (const [parentKey, manifest] of parents) {
    const parentEdges = byParent.get(parentKey) ?? []
    for (const dependency of dependencyEntries(manifest)) {
      const matches = parentEdges.filter(edge => edge.kind === dependency.kind && edge.specifier === dependency.specifier && edge.child.package === dependency.name)
      if (matches.length > 1) fail('parent edge selects duplicate versions for ' + parentKey + ' > ' + dependency.name)
      if (matches.length === 0) {
        if (!dependency.optional) fail('parent edge is missing for ' + parentKey + ' > ' + dependency.name + '@' + dependency.specifier)
        continue
      }
      const edge = matches[0]
      const childKey = packageKey(edge.child.package, edge.child.version)
      if (!satisfies(edge.child.version, dependency.specifier)) fail('parent edge selects an incompatible version for ' + parentKey + ' > ' + dependency.name + '@' + dependency.specifier)
      used.add(JSON.stringify(edge))
      if (!records.has(childKey)) fail('parent edge child is not a fixture: ' + childKey)
    }
    for (const edge of parentEdges) if (!used.has(JSON.stringify(edge))) fail('parent edge does not match a declared dependency: ' + parentKey + ' > ' + edge.child.package)
  }
  const roots = [packageKey(packageManifest.name, packageManifest.version), packageKey(OWNER_PACKAGE, ownerManifest.version)]
  const reachable = new Set()
  const queue = [...roots]
  while (queue.length > 0) {
    const parentKey = queue.shift()
    for (const edge of byParent.get(parentKey) ?? []) {
      const childKey = packageKey(edge.child.package, edge.child.version)
      if (reachable.has(childKey)) continue
      reachable.add(childKey)
      queue.push(childKey)
    }
  }
  for (const key of records.keys()) if (!reachable.has(key)) fail('fixture package is not reachable from the plugin or owner roots: ' + key)
  return edges
}

function validateProvenance(runtime, toolsRecords, ownerManifest) {
  if (provenance.source?.repository !== SOURCE_REPOSITORY) fail('provenance source repository changed')
  if (provenance.source?.checkout !== ALPHA_CHECKOUT || provenance.source?.tag !== ALPHA_TAG || provenance.source?.commit !== ALPHA_COMMIT) fail('provenance source is not the alpha.1 tag and commit')
  if (provenance.source?.clean !== true || provenance.source?.cleanVerification?.method !== 'git-commit-snapshot' || provenance.source?.cleanVerification?.tree !== ALPHA_TREE) fail('provenance source is not a verified clean alpha.1 commit snapshot')
  if (provenance.source?.packagesBuiltFromThisCheckout !== true) fail('provenance does not identify packages built from the checkout')
  validateArchiveRecords(tarballRoot, provenance.tarballs, runtime, false)
  if (provenance.toolTarballs === undefined) fail('provenance has no typecheck fixture records')
  validateArchiveRecords(toolTarballRoot, provenance.toolTarballs, toolsRecords, true)
  const gaps = gapSet()
  for (const gap of provenance.upstreamArtifactGaps ?? []) {
    const record = runtime.records.get(packageKey(gap.package, gap.version))
    if (record === undefined) fail('upstream artifact gap points to a missing fixture: ' + gap.package + '@' + gap.version)
    const declared = exportTargets(record.package.exports)
    if (!declared.includes(gap.exportTarget)) fail('upstream artifact gap is not a declared export: ' + gap.package + '@' + gap.version + ' -> ' + gap.exportTarget)
    if (patternMatches(gap.exportTarget.slice(2).replace(/\/$/u, ''), record.entries)) fail('upstream artifact gap target is shipped: ' + gap.package + '@' + gap.version + ' -> ' + gap.exportTarget)
  }
  for (const record of runtime.records.values()) validatePackageArchive('fixture ' + packageKey(record.package.name, record.package.version), record.archive, { gaps: gapSetForRecord(record), requireExports: false })
  const allRecords = [...runtime.records.values(), ...toolsRecords.records.values()]
  for (const record of toolsRecords.records.values()) {
    validatePackageArchive('typecheck fixture ' + packageKey(record.package.name, record.package.version), record.archive, { requireExports: false })
    for (const dependency of dependencyEntries(record.package)) {
      if (dependency.optional) continue
      if (!allRecords.some(candidate => candidate.package.name === dependency.name && satisfies(candidate.package.version, dependency.specifier))) fail('typecheck fixture dependency has no archive: ' + packageKey(record.package.name, record.package.version) + ' > ' + dependency.name + '@' + dependency.specifier)
    }
  }
  return validateDependencyGraph(runtime.records, ownerManifest)
}

function walkPublishedFiles(directory) {
  const files = []
  const visit = current => {
    if (!existsSync(current)) return
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = join(current, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (/(?:\.js|\.mjs|\.cjs|\.d\.ts)$/u.test(entry.name)) files.push(file)
    }
  }
  visit(join(directory, 'lib'))
  return files
}

function validateStaticClosure(installedManifest, extractedRoot, runtime) {
  const imported = new Set()
  for (const file of walkPublishedFiles(extractedRoot)) for (const name of bareImports(readFileSync(file, 'utf8'))) imported.add(name)
  const declarations = dependencyEntries(installedManifest)
  for (const name of imported) {
    const matching = declarations.filter(dependency => dependency.name === name)
    if (matching.length === 0) fail('published static import is undeclared: ' + name)
    if (!matching.some(dependency => [...runtime.records.values()].some(record => record.package.name === name && satisfies(record.package.version, dependency.specifier)))) fail('published static import has no fixture satisfying its declaration: ' + name)
  }
  for (const dependency of declarations) {
    const records = [...runtime.records.values()].filter(record => record.package.name === dependency.name)
    if (records.length === 0 && !dependency.optional) fail('plugin dependency has no fixture: ' + dependency.name)
    if (records.length > 0 && !records.some(record => satisfies(record.package.version, dependency.specifier))) fail('plugin dependency has no matching exact fixture: ' + dependency.name + '@' + dependency.specifier)
  }
  if (!imported.has('react') || !imported.has('react-dom')) fail('browser artifact does not declare both React peers')
  return imported
}

function ownerArtifact() {
  const rawArtifact = process.env[OWNER_ARTIFACT_ENV]?.trim()
  const rawSha = process.env[OWNER_SHA_ENV]?.trim()
  if (rawArtifact === undefined || rawArtifact.length === 0 || rawSha === undefined || rawSha.length === 0) fail('set ' + OWNER_ARTIFACT_ENV + ' and ' + OWNER_SHA_ENV + ' to a temporary content-addressed Providers owner artifact')
  if (!/^[0-9a-f]{64}$/u.test(rawSha)) fail('Providers owner SHA-256 must be 64 lowercase hexadecimal characters')
  const artifact = resolve(root, rawArtifact)
  if (!existsSync(artifact)) fail('Providers owner artifact does not exist: ' + artifact)
  const stat = lstatSync(artifact)
  if (!stat.isFile() || stat.isSymbolicLink()) fail('Providers owner artifact is not a regular file: ' + artifact)
  const actualHash = hash(artifact)
  if (actualHash !== rawSha) fail('Providers owner SHA-256 mismatch: ' + artifact)
  return artifact
}

function writeConsumer(consumer, pluginArchive, ownerArchive, runtime, toolsRecords, edges) {
  const dependencies = {
    [packageManifest.name]: 'file:' + pluginArchive,
    [OWNER_PACKAGE]: 'file:' + ownerArchive,
  }
  const rootParents = new Set([
    packageKey(packageManifest.name, packageManifest.version),
    packageKey(OWNER_PACKAGE, OWNER_VERSION),
  ])
  for (const edge of edges) {
    if (!rootParents.has(packageKey(edge.parent.package, edge.parent.version))) continue
    const record = runtime.records.get(packageKey(edge.child.package, edge.child.version))
    if (record === undefined) fail('root edge has no fixture archive: ' + edge.child.package + '@' + edge.child.version)
    const value = 'file:' + record.archive
    if (dependencies[edge.child.package] !== undefined && dependencies[edge.child.package] !== value) fail('roots select conflicting fixture versions for ' + edge.child.package)
    dependencies[edge.child.package] = value
  }
  const rootProviderNames = new Set(Object.keys(dependencies))
  for (const parent of runtime.records.values()) {
    const parentKey = packageKey(parent.package.name, parent.package.version)
    for (const dependency of dependencyEntries(parent.package)) {
      if (dependency.kind !== 'peerDependencies' || dependency.optional || rootProviderNames.has(dependency.name)) continue
      const edge = edges.find(candidate => packageKey(candidate.parent.package, candidate.parent.version) === parentKey && candidate.child.package === dependency.name && candidate.specifier === dependency.specifier)
      if (edge === undefined) fail('required peer has no selected fixture: ' + parentKey + ' > ' + dependency.name)
      const record = runtime.records.get(packageKey(edge.child.package, edge.child.version))
      if (record === undefined) fail('required peer has no fixture archive: ' + edge.child.package + '@' + edge.child.version)
      dependencies[dependency.name] = 'file:' + record.archive
      rootProviderNames.add(dependency.name)
    }
  }
  const devDependencies = {}
  for (const name of TYPE_TOOL_NAMES) {
    const record = [...toolsRecords.values()].find(candidate => candidate.package.name === name)
    if (record === undefined) fail('typecheck fixture is missing: ' + name)
    devDependencies[name] = 'file:' + record.archive
  }
  const overrides = {}
  const allRecords = [...runtime.records.values(), ...toolsRecords.values()]
  for (const edge of edges) {
    const record = runtime.records.get(packageKey(edge.child.package, edge.child.version))
    if (record === undefined) fail('cannot override missing fixture: ' + edge.child.package + '@' + edge.child.version)
    overrides[edge.parent.package + '@' + edge.parent.version + '>' + edge.child.package] = 'file:' + record.archive
  }
  for (const parent of toolsRecords.values()) {
    for (const dependency of dependencyEntries(parent.package)) {
      if (dependency.optional) continue
      const child = allRecords.find(record => record.package.name === dependency.name && satisfies(record.package.version, dependency.specifier))
      if (child !== undefined) overrides[parent.package.name + '@' + parent.package.version + '>' + dependency.name] = 'file:' + child.archive
    }
  }
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({
    name: 'dsh-commandcode-offline-consumer',
    private: true,
    type: 'module',
    dependencies,
    devDependencies,
    pnpm: { overrides },
  }, null, 2) + '\n')
  writeFileSync(join(consumer, '.npmrc'), [
    'registry=' + INVALID_REGISTRY,
    '@deepseek-ai:registry=' + INVALID_REGISTRY,
    '@earendil-works:registry=' + INVALID_REGISTRY,
    '@types:registry=' + INVALID_REGISTRY,
    'strict-peer-dependencies=true',
    'auto-install-peers=false',
    'node-linker=isolated',
    'virtual-store-dir=node_modules/.pnpm',
    'ignore-scripts=true',
  ].join('\n') + '\n')
  writeFileSync(join(consumer, 'index.ts'), [
    "import * as host from 'dsh-llm-commandcode'",
    "import { CommandCodeAdapter, type CommandCodeModelConfig } from 'dsh-llm-commandcode'",
    "import * as owner from 'dsh-llm-providers-ui'",
    "const model: CommandCodeModelConfig = { id: 'gpt-5.6-luna' }",
    'void [host, owner, CommandCodeAdapter, model]',
    '',
  ].join('\n'))
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      skipLibCheck: false,
      noEmit: true,
    },
    include: ['index.ts'],
  }, null, 2) + '\n')
}

function assertInside(child, parent, label) {
  const childReal = realpathSync(child)
  const parentReal = realpathSync(parent)
  const path = relative(parentReal, childReal)
  if (path === '' || path === '..' || path.startsWith('../') || isAbsolute(path)) fail(label + ' escapes its isolated parent: ' + childReal)
  return childReal
}

function packageLeafPath(path, virtualStore, installed) {
  const real = realpathSync(path)
  assertInside(real, virtualStore, 'installed package')
  if (real.startsWith(root + '/') || real.startsWith(fixtureRoot + '/')) fail('installed package resolves into the source or fixture tree: ' + real)
  const manifestPath = join(real, 'package.json')
  if (!existsSync(manifestPath)) fail('installed package has no package.json: ' + real)
  const manifest = readJson(manifestPath)
  if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') fail('installed package has no identity: ' + real)
  installed.add(packageKey(manifest.name, manifest.version))
  return real
}

function inspectNodeModules(directory, virtualStore, installed, visited) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.bin' || entry.name === '.pnpm' || entry.name === '.modules.yaml' || entry.name === '.pnpm-workspace-state-v1.json') continue
    const path = join(directory, entry.name)
    const stat = lstatSync(path)
    if (entry.name.startsWith('@') && stat.isDirectory() && !stat.isSymbolicLink()) {
      inspectNodeModules(path, virtualStore, installed, visited)
      continue
    }
    if (!stat.isSymbolicLink() && !stat.isDirectory()) fail('installed node_modules leaf is not a directory or link: ' + path)
    const real = packageLeafPath(path, virtualStore, installed)
    inspectPackageTree(real, virtualStore, installed, visited)
  }
}

function inspectPackageTree(directory, virtualStore, installed, visited) {
  const real = realpathSync(directory)
  if (visited.has(real)) return
  visited.add(real)
  for (const entry of readdirSync(real, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue
    const path = join(real, entry.name)
    if (entry.name === 'node_modules') inspectNodeModules(path, virtualStore, installed, visited)
    else inspectPackageTree(path, virtualStore, installed, visited)
  }
}

function assertPnpmInstall(consumer, store, expectedRecords) {
  const modules = join(consumer, 'node_modules')
  const virtualStore = join(modules, '.pnpm')
  if (!existsSync(modules) || !lstatSync(modules).isDirectory() || lstatSync(modules).isSymbolicLink()) fail('offline install did not create a real node_modules directory')
  if (!existsSync(virtualStore) || !lstatSync(virtualStore).isDirectory() || lstatSync(virtualStore).isSymbolicLink()) fail('offline install did not create an isolated virtual store directory')
  if (!existsSync(store) || !lstatSync(store).isDirectory() || lstatSync(store).isSymbolicLink()) fail('offline install did not use a fresh real pnpm store')
  assertInside(virtualStore, consumer, 'virtual store')
  const installed = new Set()
  const visited = new Set()
  inspectNodeModules(modules, virtualStore, installed, visited)
  for (const entry of readdirSync(virtualStore, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lock.yaml' || entry.name.startsWith('.')) continue
    const path = join(virtualStore, entry.name)
    if (!entry.isDirectory() || entry.isSymbolicLink()) fail('virtual store package entry is not a real directory: ' + path)
    const packageNodeModules = join(path, 'node_modules')
    if (existsSync(packageNodeModules)) inspectNodeModules(packageNodeModules, virtualStore, installed, visited)
  }
  for (const key of expectedRecords) if (!installed.has(key)) fail('offline install omitted fixture package: ' + key)
  for (const key of installed) if (!expectedRecords.has(key)) fail('offline install contains an unrecorded package: ' + key)
}

function installedPath(consumer, name) {
  const path = join(consumer, 'node_modules', ...name.split('/'))
  if (!existsSync(path)) fail('offline install did not install ' + name)
  return path
}

function isMissingPathError(error) {
  return typeof error === 'object' && error !== null && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

function tryLstat(path) {
  try {
    return lstatSync(path, { throwIfNoEntry: false })
  } catch (error) {
    if (isMissingPathError(error)) return undefined
    throw error
  }
}

function tryRealpath(path) {
  try {
    return realpathSync(path)
  } catch (error) {
    if (isMissingPathError(error)) return undefined
    throw error
  }
}

function isWithinOrSame(parent, child) {
  const childPath = relative(parent, child)
  return childPath === '' || (childPath !== '..' && !childPath.startsWith('..' + sep) && !isAbsolute(childPath))
}

function removeTemporaryTreeRecursively(path, root) {
  const stat = tryLstat(path)
  if (stat === undefined) return
  if (stat.isSymbolicLink()) {
    rmSync(path, { force: false })
    return
  }
  if (!stat.isDirectory()) {
    rmSync(path, { force: false })
    return
  }
  const real = tryRealpath(path)
  if (real === undefined || !isWithinOrSame(root, real)) throw new Error('temporary cleanup path escaped its root: ' + path)
  for (const entry of readdirSync(path)) removeTemporaryTreeRecursively(join(path, entry), root)
  rmdirSync(path)
}

/** Remove a temporary tree without following symlinks or escaping its root. */
export function removeTemporaryTree(directory) {
  const requested = resolve(directory)
  const stat = tryLstat(requested)
  if (stat === undefined || stat.isSymbolicLink() || !stat.isDirectory()) return false
  const real = tryRealpath(requested)
  const parent = tryRealpath(dirname(requested))
  if (real === undefined || parent === undefined || dirname(real) !== parent) return false
  removeTemporaryTreeRecursively(real, real)
  return true
}

/** Run work and cleanup while rethrowing the work failure unchanged. */
export function withCleanup(work, cleanup) {
  let result
  let primary
  let failed = false
  try {
    result = work()
  } catch (error) {
    failed = true
    primary = error
  }
  let cleanupFailure
  let cleanupFailed = false
  try {
    cleanup()
  } catch (error) {
    cleanupFailed = true
    cleanupFailure = error
  }
  if (failed) throw primary
  if (cleanupFailed) throw cleanupFailure
  return result
}

function checkInstalledRuntime(consumer) {
  const runtimeFile = join(consumer, 'runtime-check.mjs')
  writeFileSync(runtimeFile, [
    "import { createRequire } from 'node:module'",
    "import { join } from 'node:path'",
    "import { pathToFileURL } from 'node:url'",
    "if (process.env.NODE_PATH !== '' || process.env.NODE_OPTIONS !== '') throw new Error('pack-gate child Node preload environment was not cleared')",
    "const leaked = Object.keys(process.env).filter(key => /(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH|CLOUD)/iu.test(key) || /^(?:NPM|PNPM|YARN|COREPACK)(?:_|$)/iu.test(key) || key === 'DSH_PACK_GATE_SENTINEL')",
    "if (leaked.length > 0) throw new Error('pack-gate child environment leaked sensitive or package-manager keys: ' + leaked.join(', '))",
    "const host = await import('dsh-llm-commandcode')",
    "if (typeof host.apply !== 'function' || typeof host.CommandCodeAdapter !== 'function') throw new Error('installed Host entry is incomplete')",
    "const adapter = new host.CommandCodeAdapter({ options: () => ({}), resolveApiKey: async () => undefined })",
    "if (!Object.prototype.hasOwnProperty.call(Object.getPrototypeOf(adapter), 'imageRequestPricing') || adapter.imageRequestPricing('commandcode', 'gpt-5.6-luna') !== undefined) throw new Error('installed Host adapter pricing compatibility is incomplete')",
    'const hostContext = { logger: { error() {} }, llm: { registerConfigurableProviders() {}, registerAdapter() { return { replace() {} } }, registerModelDiscovery() {} }, get() { return undefined }, inject() { return { dispose() {} } }, effect(callback) { return callback() ?? (() => {}) } }',
    "if (host.apply(hostContext, {}) !== undefined) throw new Error('installed Host apply did not return void')",
    'const registrations = []',
    'globalThis.window = { __ModuleLoader__: { load(value) { registrations.push(value) } } }',
    "await import('dsh-llm-commandcode/client')",
    "if (registrations.length !== 1) throw new Error('installed browser factory registered zero or duplicate ModuleLoader rows')",
    "const registration = registrations[0]",
    "if (registration?.id !== 'dsh-llm-commandcode' || typeof registration.factory !== 'function') throw new Error('installed browser factory registration is incomplete')",
    "const require = createRequire(pathToFileURL(join(process.cwd(), 'runtime-check.mjs')))",
    'const browser = registration.factory(require)',
    "if (browser === null || typeof browser !== 'object' || typeof browser.apply !== 'function') throw new Error('installed browser factory exports are incomplete')",
    'const browserContext = { effect(callback) { return callback() ?? (() => {}) }, locale: { register() {}, bind() { return key => key } }, get() { return { rpc: { call: async () => ({ ok: false }) } } }, slots: { inject(name, callback) { callback(); return () => {} }, register(value) { return value }, entries() { return [] }, subscribe() { return () => {} } } }',
    "if (browser.apply(browserContext) !== undefined) throw new Error('installed browser apply did not return void')",
    'await new Promise(resolve => queueMicrotask(resolve))',
  ].join('\n') + '\n')
  command(process.execPath, [runtimeFile], { cwd: consumer, stdio: 'inherit' })
}

function parsePackReport(output) {
  try {
    let report = JSON.parse(output.trim())
    if (Array.isArray(report)) report = report[0]
    return report
  } catch (error) {
    fail('pnpm pack did not return its JSON tar report (' + (error instanceof Error ? error.message : String(error)) + ')')
  }
}

function main() {
  const ownerArchive = ownerArtifact()
  const temporary = mkdtempSync(join(tmpdir(), 'dsh-commandcode-pack-'))
  return withCleanup(() => {
    const userconfig = join(temporary, 'empty-npmrc')
    const store = join(temporary, 'pnpm-store')
    writeFileSync(userconfig, '')
    mkdirSync(store, { recursive: true })
    if (readdirSync(store).length !== 0) fail('consumer pnpm store was not fresh')
    const packageManagerEnv = {
      npm_config_userconfig: userconfig,
      pnpm_config_userconfig: userconfig,
      npm_config_registry: INVALID_REGISTRY,
      pnpm_config_registry: INVALID_REGISTRY,
      'npm_config_@deepseek-ai:registry': INVALID_REGISTRY,
      'npm_config_@earendil-works:registry': INVALID_REGISTRY,
      'npm_config_@types:registry': INVALID_REGISTRY,
      npm_config_offline: 'true',
      pnpm_config_offline: 'true',
      npm_config_ignore_scripts: 'true',
      pnpm_config_ignore_scripts: 'true',
      npm_config_strict_peer_dependencies: 'true',
      pnpm_config_strict_peer_dependencies: 'true',
      npm_config_node_linker: 'isolated',
      pnpm_config_node_linker: 'isolated',
      npm_config_virtual_store_dir: 'node_modules/.pnpm',
      pnpm_config_virtual_store_dir: 'node_modules/.pnpm',
      npm_config_store_dir: store,
      pnpm_config_store_dir: store,
      npm_config_audit: 'false',
      pnpm_config_audit: 'false',
      npm_config_fund: 'false',
      pnpm_config_fund: 'false',
    }
    const runtime = loadArchives(tarballRoot, provenance.tarballs)
    const toolsRecords = loadArchives(toolTarballRoot, provenance.toolTarballs)
    const owner = validatePackageArchive('Providers owner', ownerArchive, { requireName: OWNER_PACKAGE, requireVersion: OWNER_VERSION, forbidSource: true, requireFiles: true })
    const edges = validateProvenance(runtime, toolsRecords, owner.manifest)
    const pluginOutput = command('pnpm', ['pack', '--json', '--pack-destination', temporary], { packageManager: true, env: packageManagerEnv })
    const report = parsePackReport(pluginOutput)
    if (report?.name !== packageManifest.name || report?.version !== packageManifest.version) fail('tar report package identity does not match package.json')
    if (typeof report?.filename !== 'string' || !existsSync(report.filename)) fail('tar report does not identify its archive')
    const pluginArchive = report.filename
    const plugin = validatePackageArchive('published plugin', pluginArchive, { forbidSource: true, forbidLegacy: true, requireFiles: true })
    const reportFiles = (report.files ?? []).map(file => file.path).sort()
    if (JSON.stringify(reportFiles) !== JSON.stringify(plugin.entries)) fail('tar report file list differs from archive contents')
    const extractedPlugin = join(temporary, 'plugin')
    mkdirSync(extractedPlugin, { recursive: true })
    command('tar', ['-xzf', pluginArchive, '-C', extractedPlugin, '--strip-components=1'])
    validateStaticClosure(plugin.manifest, extractedPlugin, runtime)
    const extractedOwner = join(temporary, 'owner')
    mkdirSync(extractedOwner, { recursive: true })
    command('tar', ['-xzf', ownerArchive, '-C', extractedOwner, '--strip-components=1'])
    validateStaticClosure(owner.manifest, extractedOwner, runtime)
    const expectedRecords = new Set([...runtime.records.keys(), ...toolsRecords.records.keys()])
    expectedRecords.add(packageKey(packageManifest.name, packageManifest.version))
    expectedRecords.add(packageKey(OWNER_PACKAGE, OWNER_VERSION))
    const consumer = join(temporary, 'consumer')
    mkdirSync(consumer, { recursive: true })
    writeConsumer(consumer, pluginArchive, ownerArchive, runtime, toolsRecords.records, edges)
    command('pnpm', ['install', '--offline', '--ignore-scripts', '--strict-peer-dependencies', '--node-linker=isolated', '--virtual-store-dir=node_modules/.pnpm', '--store-dir=' + store], {
      cwd: consumer,
      packageManager: true,
      env: packageManagerEnv,
      stdio: 'inherit',
    })
    assertPnpmInstall(consumer, store, expectedRecords)
    installedPath(consumer, packageManifest.name)
    installedPath(consumer, OWNER_PACKAGE)
    command('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], { cwd: consumer, packageManager: true, env: packageManagerEnv, stdio: 'inherit' })
    checkInstalledRuntime(consumer)
    console.log('strict tar report, fixture provenance, reachable offline install, static closure, typecheck, and installed entry checks passed')
  }, () => {
    removeTemporaryTree(temporary)
  })
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
