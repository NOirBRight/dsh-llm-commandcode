# Official DSH alpha.1 fixtures

The tarballs in this directory are packed from `dsh-v0.1.2-alpha.1` at commit `cd5ef8148158c3a752a658978873241fdf8e2bbc`. `PROVENANCE.json` records every archive byte size and SHA-256.

Use these fixtures only for isolated offline verification. Do not replace them with alpha.2, release-candidate, source-tree, or symlink inputs. Regenerate them only from the recorded official checkout with the published build and pack commands.

The Providers UI owner is supplied separately as a validated content-addressed artifact to `scripts/check-pack.mjs`; its path and expected SHA-256 are command inputs, not release metadata in this repository. Pin both canonical inputs before running the gate:

~~~sh
export DSH_PROVIDERS_OWNER_ARTIFACT=/absolute/path/to/dsh-llm-providers-ui-0.1.1.tgz
export DSH_PROVIDERS_OWNER_SHA256=...
sha256sum "$DSH_PROVIDERS_OWNER_ARTIFACT"
pnpm test
pnpm exec tsc -p tsconfig.json --noEmit
pnpm run build
pnpm run pack:check
~~~

The required order is test, no-emit typecheck, build, then the environment-pinned `pack:check`; the final command installs and validates the isolated offline artifact graph.
