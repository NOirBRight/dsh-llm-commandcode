/** In-memory auth services required by the delegated PiAiAdapter. */

import type { AuthContext, Credential, CredentialStore } from '@earendil-works/pi-ai'

export function createCommandCodePiAiAuth(): { credentials: CredentialStore; authContext: AuthContext } {
  const stored = new Map<string, Credential>()
  return {
    credentials: {
      read: providerId => Promise.resolve(stored.get(providerId)),
      list: () => Promise.resolve([...stored].map(([providerId, credential]) => ({ providerId, type: credential.type }))),
      async modify(providerId, mutate) {
        const next = await mutate(stored.get(providerId))
        if (next !== undefined) stored.set(providerId, next)
        return stored.get(providerId)
      },
      delete: providerId => { stored.delete(providerId); return Promise.resolve() },
    },
    authContext: { env: () => Promise.resolve(undefined), fileExists: () => Promise.resolve(false) },
  }
}
