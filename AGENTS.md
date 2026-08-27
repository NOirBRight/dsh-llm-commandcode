# dsh-llm-commandcode

This repository owns only the Command Code provider plugin. The official DSH checkout is a read-only dependency; do not patch DSH core.

Develop in this checkout, run pnpm test and pnpm run build, and verify the web plugin only in DSH_HOME=~/.dsh-lab on port 3082. Production 3080 is read-only.

The chat API is the documented Command Code Provider API. Account quota uses Host-only, best-effort calls to the undocumented account routes used by the official CLI; never send keys through the browser or logs.
