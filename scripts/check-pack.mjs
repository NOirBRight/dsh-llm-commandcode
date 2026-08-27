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
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

for (const file of pkg.files ?? []) {
  if (file.includes('*')) continue
  if (!existsSync(join(root, file))) throw new Error('missing packaged file: ' + file)
}

const temporary = mkdtempSync(join(tmpdir(), 'dsh-commandcode-pack-'))
try {
  const packedOutput = execFileSync('npm', ['pack', '--silent', '--pack-destination', temporary], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  const archive = packedOutput.split(/\r?\n/u).at(-1)
  if (archive === undefined || archive.length === 0) throw new Error('npm pack did not return an archive')

  const consumer = join(temporary, 'consumer')
  const installed = join(consumer, 'node_modules', pkg.name)
  mkdirSync(installed, { recursive: true })
  execFileSync('tar', ['-xzf', join(temporary, archive), '-C', installed, '--strip-components=1'])

  const packedPackage = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
  for (const [key, target] of Object.entries(packedPackage.exports ?? {})) {
    const values = typeof target === 'string' ? [target] : Object.values(target)
    for (const value of values) {
      if (typeof value !== 'string' || !existsSync(join(installed, value))) {
        throw new Error('packed export does not exist: ' + key + ' -> ' + String(value))
      }
    }
  }
  if (existsSync(join(installed, 'src'))) throw new Error('package unexpectedly ships source files')

  const nodeModules = join(consumer, 'node_modules')
  for (const name of ['@deepseek-ai', '@earendil-works', '@types', 'react', 'react-dom']) {
    const source = join(root, 'node_modules', name)
    if (!existsSync(source)) throw new Error('consumer fixture dependency is unavailable: ' + name)
    const destination = join(nodeModules, name)
    mkdirSync(dirname(destination), { recursive: true })
    symlinkSync(source, destination, 'junction')
  }

  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  writeFileSync(join(consumer, 'index.ts'), [
    "import * as plugin from 'dsh-llm-commandcode'",
    "import { CommandCodeAdapter, type CommandCodeModelConfig } from 'dsh-llm-commandcode'",
    "import { assertCommandCodeInvariant } from 'dsh-llm-commandcode/invariant'",
    "import * as clientPlugin from 'dsh-llm-commandcode/client'",
    "import type { CommandCodeCardFace } from 'dsh-llm-commandcode/client'",
    '',
    "const model: CommandCodeModelConfig = { id: 'gpt-5.6-luna' }",
    'const face: CommandCodeCardFace | undefined = undefined',
    'void [plugin, CommandCodeAdapter, assertCommandCodeInvariant, clientPlugin, model, face]',
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
  }))
  execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(consumer, 'tsconfig.json')], {
    cwd: consumer,
    stdio: 'inherit',
  })
  console.log('pack manifest and isolated consumer typecheck passed')
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
