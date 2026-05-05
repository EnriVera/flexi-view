# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:\Users\enriv\.claude\skills\go-testing\SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:\Users\enriv\.claude\skills\skill-creator\SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:\Users\enriv\.claude\skills\branch-pr\SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:\Users\enriv\.claude\skills\issue-creation\SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:\Users\enriv\.claude\skills\judgment-day\SKILL.md |
| When user says "guardá lo que hicimos", "sync context", "save session", "actualizá los md", or at the natural close of a coding conversation | context-sync | C:\Users\enriv\.claude\skills\context-sync\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### go-testing
- Table-driven tests: `tests := []struct{ name, input, expected string }{...}` — iterate with `t.Run(tt.name, ...)`
- TUI state changes: test `Model.Update(tea.KeyMsg{...})` directly, cast result back to Model
- Full TUI flows: use `teatest.NewTestModel(t, m)` + `tm.Send()` + `tm.WaitFinished()`
- Visual output: golden files in `testdata/*.golden` — update with `-update` flag
- Mock system dependencies via interfaces, not os/exec directly
- File operations: always use `t.TempDir()` — never write to real paths
- Skip integration tests: `go test -short ./...`
- Coverage: `go test -cover ./...`

### skill-creator
- Frontmatter MUST have: name, description (include "Trigger:" text), license: Apache-2.0, metadata.author, metadata.version
- Structure: `skills/{skill-name}/SKILL.md` + optional `assets/` (templates/schemas) + `references/` (local paths only)
- `references/` → local file paths only, NEVER web URLs
- Compact rules block = 5-15 lines, actionable only — no motivation, no full examples
- Skip sdd-*, _shared, skill-registry when scanning for skills
- Add entry to AGENTS.md after creation
- Don't create if pattern is trivial or one-off

### branch-pr
- Every PR MUST link an approved issue: `Closes #N` in body — no exceptions
- Branch naming: `type/description` — regex `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- PR MUST have exactly one `type:*` label
- Commit format: `type(scope): description` (conventional commits) — no `Co-Authored-By` trailers
- Run `shellcheck scripts/*.sh` before pushing
- Linked issue MUST have `status:approved` label before PR can be opened

### issue-creation
- No blank issues — MUST use a template (bug report or feature request)
- Questions → GitHub Discussions, NOT issues
- Issues auto-get `status:needs-review` on creation
- MUST wait for maintainer to add `status:approved` before opening any PR
- Always search for duplicates (`gh issue list --search "keyword"`) before creating

### judgment-day
- Launch TWO judge sub-agents in parallel (async) — never sequential, never self-review
- Judges are fully BLIND to each other — identical prompts, no cross-contamination
- Synthesize: Confirmed = both found; Suspect A/B = one found; Contradiction = disagree on same thing
- WARNING must be classified: real (normal user can trigger) vs theoretical (contrived/malicious scenario)
- Theoretical warnings → report as INFO only, never fix, never trigger re-judgment
- After Round 1: present verdict table, ASK user before applying fixes
- After 2 fix iterations: ASK user whether to continue — never auto-escalate
- APPROVED only when: 0 confirmed CRITICALs + 0 confirmed real WARNINGs
- Fix Agent is a SEPARATE delegation — never reuse a judge as fixer

### context-sync
- Extract from conversation into buckets: bugfix, decision, pattern, discovery, config
- Save each to engram: `mem_save(title="Verb + what", topic_key="category/slug", ...)`
- Call `mem_session_summary` at conversation end — mandatory
- Update CLAUDE.md only for modules actually touched; max 100 lines per file, 300 total across project
- Never put code history ("we changed X to Y") in .md — that belongs in engram
- Keep parent→child cross-references intact (`<!-- parent: ../CLAUDE.md -->`)
- Never create a new child CLAUDE.md unless user explicitly asks

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| — | — | No project-level convention files found (CLAUDE.md, .cursorrules, AGENTS.md) |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
