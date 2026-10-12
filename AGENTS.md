# AGENTS.md

## Code Rules

- Follow existing patterns and conventions in the codebase
- **Functional components only** — hooks, no class components, no `connect()`
- **No comments** — code should be self-documenting; introduce named variables/functions or pattern if needed
- **No dead code, no unused imports**
- **No premature abstractions** — abstract only when a pattern repeats
- **Clean, idiomatic, readable code** — apply SOLID principles where relevant
- Drop `ik.test` convention
- Drop `IK:` comments
- **CSS files for styling** — no inline styles, no SCSS for new code; use existing `.css` files unless there's already SCSS or inline styles present; if inline styles are small and you need to add/modify them, transform to CSS stylesheet

## GitLab Review (AgentFlow)

When performing code review via GitLab (AgentFlow):
- **Do not run tooling commands** (tsc, eslint, prettier) — `node_modules` is not available in this environment

## i18n

**13 locales**: `en`, `fr`, `it`, `es`, `de`, `pt`, `sv`, `pl`, `nl`, `el`, `no`, `da`, `fi` — no other languages. Translations must be natural.

## MR / Redmine conventions

When using the `create-mr` skill, follow these rules:

### Redmine ticket reference
- If a Redmine ticket is provided by the user or found in the context:
  - **Append ` [RM-xxxx]`** to the MR title, e.g. `fix(api): Handle null response [RM-1234]`
  - **Include the full Redmine URL** in the Resources section of the MR description
- If no Redmine ticket is provided, **omit the suffix entirely** — do not add brackets with nothing inside

### GitLab MR Template
- **Template location**: `.gitlab/merge_request_templates/Default.md`
- **Always load this template first** before building the MR description

## Scope Control

- Fix **only** what is asked for
- Must not modify **any adjacent behavior**
- No side effects allowed
- Only the **minimal patch**, no explanations


---

<!-- fallow:setup-hooks:start -->
## Fallow checks

Use fallow for code-quality, cleanup, and setup tasks in this repository. Fallow checks the changed code before each `git commit` and `git push`. In Claude Code and Codex, a PreToolUse hook from `fallow agent install` runs this check and blocks the command when the verdict is `fail`. Other agents run the check themselves: `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before you try again. A JSON runtime error such as `{ "error": true, ... }` does not block.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to... | Run |
|---|---|
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| prove a TypeScript symbol's exact consumers before refactoring | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>` |
| find how one module reaches another | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.) |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| read a diff before approving it | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row) |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| check which architecture rules apply to a file before changing it | `fallow guard <files>` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |
<!-- fallow:setup-hooks:end -->

### Fallow per-developer setup (optional, global)

The committed setup is the CI gate only. The agent integration (skills, MCP server, commit hooks) is per-developer and gitignored:

- run `npx fallow agent install` in your checkout, or install it globally once, outside any repository:
  - **OpenCode**: add the `fallow` MCP server to `~/.config/opencode/opencode.json`
  - **Pi**: add it to `~/.pi/agent/mcp.json` and copy the `fallow` skills to `~/.agents/skills/`
  - **Claude Code / Codex**: `npx fallow agent install` writes their configs too

Same engine, same `.fallowrc.json`, same baselines everywhere; the gate stays in CI.
