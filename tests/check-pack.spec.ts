import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createChildEnv, removeTemporaryTree, withCleanup } from '../scripts/check-pack.mjs'

const temporaryRoots: string[] = []
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('pack gate child isolation', () => {
  it('drops credential-like and inherited package-manager configuration keys', () => {
    const source = {
      PATH: '/bin',
      HOME: '/home/test',
      USER: 'tester',
      LANG: 'C',
      TMP: '/tmp',
      CI: '1',
      SystemRoot: 'C\\Windows',
      WINDIR: 'C:\\Windows',
      DEEPSEEK_API_KEY: 'secret',
      AWS_SECRET_ACCESS_KEY: 'secret',
      AUTH_TOKEN: 'secret',
      DB_PASSWORD: 'secret',
      SSH_CREDENTIAL: 'secret',
      NPM_CONFIG_USERCONFIG: '/secret/npmrc',
      npm_config_userconfig: '/secret/npmrc',
      NODE_PATH: '/secret/node-path',
      NODE_OPTIONS: '--require /secret/hook.cjs',
    }
    const child = createChildEnv(source, {
      DSH_PACK_GATE_SENTINEL: 'secret',
      npm_config_userconfig: '/secret/npmrc',
    })

    expect(child).toMatchObject({ PATH: '/bin', HOME: '/home/test', USER: 'tester', LANG: 'C', TMP: '/tmp', CI: '1', NODE_PATH: '', NODE_OPTIONS: '' })
    for (const key of ['DEEPSEEK_API_KEY', 'AWS_SECRET_ACCESS_KEY', 'AUTH_TOKEN', 'DB_PASSWORD', 'SSH_CREDENTIAL', 'NPM_CONFIG_USERCONFIG', 'npm_config_userconfig', 'DSH_PACK_GATE_SENTINEL']) {
      expect(child[key]).toBeUndefined()
    }
  })

  it('allows only explicit isolated package-manager settings', () => {
    const child = createChildEnv({}, {
      npm_config_userconfig: '/tmp/empty.npmrc',
      pnpm_config_userconfig: '/tmp/empty.npmrc',
      npm_config_registry: 'http://127.0.0.1:9',
      pnpm_config_registry: 'http://127.0.0.1:9',
    }, true)

    expect(child.npm_config_userconfig).toBe('/tmp/empty.npmrc')
    expect(child.pnpm_config_userconfig).toBe('/tmp/empty.npmrc')
    expect(child.npm_config_registry).toBe('http://127.0.0.1:9')
    expect(child.pnpm_config_registry).toBe('http://127.0.0.1:9')
  })
})

describe('pack gate cleanup', () => {
  it('removes nested trees without following links and preserves primary failures', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-commandcode-cleanup-test-'))
    temporaryRoots.push(root)
    const tree = join(root, 'tree')
    const outside = join(root, 'outside')
    mkdirSync(join(tree, 'nested'), { recursive: true })
    mkdirSync(outside)
    writeFileSync(join(tree, 'nested', 'file.txt'), 'content')
    writeFileSync(join(outside, 'keep.txt'), 'keep')
    symlinkSync(outside, join(tree, 'outside-link'), 'dir')

    expect(removeTemporaryTree(tree)).toBe(true)
    expect(existsSync(tree)).toBe(false)
    expect(readFileSync(join(outside, 'keep.txt'), 'utf8')).toBe('keep')

    const primary = new Error('primary failure')
    const cleanup = new Error('cleanup failure')
    expect(() => withCleanup(() => { throw primary }, () => { throw cleanup })).toThrow(primary)
  })
})
