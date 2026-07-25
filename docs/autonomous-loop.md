# Autonomous Loop — Invocation, Safety, and State Schema

This document describes the durable autonomous development loop that runs an
OpenCode worker headlessly on every pass against the `STATE.json` record in
the repository root.  All three infrastructure pieces live at:

- **`STATE.json`** — mutable state for one autonomous pass
- **`supervisor.sh`** — the supervisor process (launched once, runs forever)
- **`docs/autonomous-loop.md`** — this file

## Invocation

```bash
# Launch in background from an external terminal:
bash -c 'terminal(background=true); bash supervisor.sh' &

# Or as a user-managed systemd unit that calls this script directly.
```

The supervisor must NOT be invoked via `nohup`, `setsid`, or similar — those
strip the signal handlers and traps we rely on for clean shutdown.  Use one of
the supported launch paths above instead.

## Safety guarantees

1. **No permission bypass.** The script never uses `--dangerously-skip-permissions`
   or any equivalent flag with `opencode`.
2. **Atomic state updates.** Each pass writes a new JSON payload to a temp file and
   renames it over `STATE.json`.  This prevents partial/invalid state between passes.
3. **PID and lock hygiene.** A dedicated PID file tracks the server process; a
   named lock (`logs/.lock`) prevents two supervisors from competing for port
   7860.  Cleanup traps remove only these files on exit/signal.
4. **Crash detection.** The supervisor polls the health endpoint every second and
   detects when opencode does not become healthy within 90 s — in that case it
   kills the child PID and retries on the next pass.
5. **No unrelated processes killed.** Cleanup traps only touch files we created;
   `kill`/`wait` target only the tracked opencode process.
6. **Idle timeout.** If `STATE.json` mtime has not changed for 10 minutes (default),
   the supervisor treats this as a stuck worker and restarts.

## State schema — `STATE.json`

```jsonc
{
  "project": "<repo-name>",                           // immutable identifier
  "target_description": "...",                        // project goal summary
  "overall_score": <float>,                           // aggregated fidelity score
  "checklist": [                                      // array of {item/score/notes}
    { "item": "...", "score": <0..1>, "notes": "..." }
  ],
  "last_test_report": {                               // {timestamp, command, status, details}
    ...
  },
  "last_commit": "<sha or null>",                     // last successful commit sha
  "next_action": "<string>",                          // what the worker should do next
  "pass_count": <int>,                                // incremented per pass
  "judge_review_due": false                           // flag for judge review gates
}
```

The supervisor **never** rewrites the schema fields it must preserve (`project`,
`target_description`, `overall_score`, `checklist`).  Only `next_action`,
`last_test_report`, `pass_count`, and `last_commit` are updated per pass.

## How every pass begins

Every new pass MUST begin by reading the current contents of `STATE.json`.
The supervisor reads only the `next_action` field and seeds its worker prompt
from that value plus the current state metadata — it does **not** replay prior
conversation history or reconstruct context from scratch.  This keeps each
pass short, focused, and independent.

## Future passes

To continue autonomous development after a manual edit to `STATE.json` (e.g.,
after a judge review), simply re-launch the supervisor:

```bash
bash -c 'terminal(background=true); bash supervisor.sh' &
```

The script will read whatever is in `STATE.json` and advance from there.  No
state migration or "catch-up" procedure is needed.
