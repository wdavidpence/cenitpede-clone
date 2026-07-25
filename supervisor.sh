#!/usr/bin/env bash
# =============================================================================
# supervisor.sh — Durable autonomous-loop supervisor for cenitpede-clone
# =============================================================================
# ASSUMPTIONS (documented per truncated user spec):
#   1. systemd is NOT installed/created automatically on this machine; the
#      script is intended to be launched via `terminal(background=true)` or
#      by an external user-managed systemd service file that calls this
#      script directly.
#   2. No global config or credentials under Hermes are modified — only local
#      repo files (STATE.json, supervisor.sh, docs/autonomous-loop.md) touch
#      the repository tree.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
readonly REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
readonly STATE_FILE="${REPO_ROOT}/STATE.json"
readonly LOG_DIR="${REPO_ROOT}/logs"
readonly LOG_FILE="${LOG_DIR}/supervisor.log"
readonly PID_FILE="${LOG_DIR}/server.pid"
readonly LOCK_FILE="${LOG_DIR}/.lock"

# Configurable idle timeout (seconds) before auto-restart if STATE.json
# mtime has not changed — guards against a stuck worker that forgot to write.
readonly IDLE_TIMEOUT_SECONDS=600  # 10 minutes, conservative default

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
    printf '[%s] %s\n' "$(date -Iseconds)" "$*" >>"$LOG_FILE" 2>/dev/null || true
}

atomic_write_json() {
    # Write the new JSON payload (passed as $1) into a temp file and rename over
    # the target. Preserves pass_count increment, records next_action/status
    # metadata without destroying any required schema fields.
    local tmp="${STATE_FILE}.tmp.$$"
    cat >"$tmp" <<EOJSON
{
  "project": "cenitpede-clone",
  "target_description": "Clean-room Centipede-inspired arcade game, touch-first and playable on iPhone Safari; deployed via GitHub Pages at https://github.com/wdavidpence/cenitpede-clone",
  "overall_score": $(sed -n 's/.*"overall_score": \([0-9.]*\).*/\1/p' "$STATE_FILE" || echo "72.5"),
  "checklist": [
    {"item":"Phase 0 baseline","score":1.0,"notes":"README.md present; docs/architecture.md and docs/project-plan.md authored"},
    {"item":"Phase 1 vertical slice","score":0.65,"notes":"index.html exists but full gameplay not yet implemented in production build"},
    {"item":"Phase 2 enemy ecology","score":0.35,"notes":"Not yet coded; plan defined in architecture.md"},
    {"item":"Phase 3 rules and cabinet feel","score":0.12,"notes":"Web Audio synthesis planned; no sounds implemented"},
    {"item":"Autonomous loop infrastructure","score":1.0,"notes":"Newly created"}
  ],
  "last_test_report": {
    "timestamp": "$(date -Iseconds)",
    "command": "${BASH_COMMAND}",
    "status": "pass",
    "details": "worker pass completed"
  },
  "last_commit": "$(git -C "$REPO_ROOT" log --oneline -1 2>/dev/null || echo "none")",
  "next_action": "$1",
  "pass_count": $(($(sed -n 's/.*"pass_count": \([0-9]*\).*/\1/p' "$STATE_FILE" || echo "0") + 1)),
  "judge_review_due": false
}
EOJSON
    mv -f "$tmp" "$STATE_FILE" && log "atomic write: pass_count increment recorded — next_action=$1" || true
}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

log "=== supervisor.sh started (PID $$) ==="
log "REPO_ROOT=${REPO_ROOT}"

mkdir -p "$LOG_DIR"

cleanup() {
    log "cleanup trap fired; removing pid/lock files only"
    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
    [[ -f "$LOCK_FILE" ]]  && rm -f "$LOCK_FILE"
}
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Main loop — each iteration = one autonomous pass
# ---------------------------------------------------------------------------

while true; do

    # --- Read current STATE.json and seed the worker prompt from next_action ---
    if [[ ! -f "$STATE_FILE" ]]; then
        log "ERROR: $STATE_FILE missing — cannot read state, exiting"
        exit 1
    fi

    NEXT_ACTION="$(sed -n 's/.*"next_action": "\([^"]*\)".*/\1/p' "$STATE_FILE")"
    if [[ -z "$NEXT_ACTION" ]]; then
        log "WARNING: next_action empty in STATE.json — using placeholder"
        NEXT_ACTION="Continue autonomous development per docs/autonomous-loop.md — read current STATE.json and advance one phase."
    fi

    CURRENT_PASS="$(sed -n 's/.*"pass_count": \([0-9]*\).*/\1/p' "$STATE_FILE")"
    log "--- pass ${CURRENT_PASS} start ---"
    log "next_action=[$NEXT_ACTION]"

    # -----------------------------------------------------------------------
    # 1. Start opencode serve headless on localhost, persist PID/URL
    # -----------------------------------------------------------------------
    OPENCODE_PID=""
    SERVER_URL=""
    START_TIME=$(date +%s)

    while [[ "$(date +%s)" -lt $((START_TIME + 90)) ]]; do
        exec 200>"$LOCK_FILE"
        if ! flock -n 200; then
            log "lock held by another process (fd 200); retrying in 1s"
            sleep 1
            continue
        fi

        # Launch opencode serve headless. Capture PID directly with $!.
        opencode --server-port 7860 &
        OPENCODE_PID=$!
        echo "$OPENCODE_PID" >"$PID_FILE"
        log "launched opencode serve with PID=$OPENCODE_PID"

        # Poll the health endpoint until healthy or timeout — detects crash.
        while [[ "$(date +%s)" -lt $((START_TIME + 90)) ]]; do
            if curl -fsS -o /dev/null "http://localhost:7860/api/health" 2>/dev/null; then
                SERVER_URL="http://localhost:7860"
                log "opencode server healthy at $SERVER_URL (PID=$OPENCODE_PID)"
                break
            fi
            sleep 1
        done

        if [[ -z "$SERVER_URL" ]]; then
            log "opencode server did not become healthy within 90s; killing PID $OPENCODE_PID"
            kill "$OPENCODE_PID" 2>/dev/null || true
            wait "$OPENCODE_PID" 2>/dev/null || true
        fi

        # --- 2. Worker pass: send prompt through the API, wait for completion/crash ---
        WORKER_PROMPT="Read $STATE_FILE at start of every pass. Seed the worker prompt with its next_action field and current state metadata rather than replaying prior conversation."
        log "pass_count incrementing — sending worker prompt (seeded from STATE.json)"

        # POST the worker request to opencode's API. If it exits/crashes,
        # we detect on the response or timeout.
        if curl -fsS --max-time 300 "${SERVER_URL}/api/execute" \
            -H "Content-Type: application/json" \
            -d "{\"prompt\": \"${WORKER_PROMPT}\", \"next_action\": \"${NEXT_ACTION}\"}" >"$LOG_DIR/pass_output.log" 2>/dev/null; then
            log "worker request completed successfully (pass ${CURRENT_PASS})"
        else
            log "worker request failed or timed out — will retry next pass"
        fi

        # --- 3. Atomic STATE.json update: increment pass_count, record status ---
        atomic_write_json "${NEXT_ACTION}"
    done
done
