# Dead Code Skill Design

## Overview

A global Claude Code skill (`/dead-code`) that performs a comprehensive dead code and hygiene sweep on any React/TypeScript project. It installs tooling as needed, runs analysis, presents findings interactively by category, and cleans up approved items. Also backfills ESLint and stricter TypeScript config if missing.

## Workflow

### 1. Detect Project Context

Read `package.json` and `tsconfig.json` to understand:
- Framework (React, Next.js, Vite, Remix, etc.)
- Existing tooling (ESLint config present? TypeScript strict mode?)
- Package manager (npm, pnpm, yarn) via lockfile detection

### 2. Install Tooling

Install as devDependencies only when not already present:

- **knip** for dead code detection (unused files, exports, types, dependencies)
- **eslint** + **typescript-eslint** if no ESLint config exists in the project

Detection logic:
- ESLint: check for `eslint.config.*`, `.eslintrc.*`, or `eslintConfig` in `package.json`
- Package manager: `pnpm-lock.yaml` -> pnpm, `yarn.lock` -> yarn, otherwise npm

### 3. Run Analysis (Three Phases)

#### Phase 1: Knip

Run `npx knip --reporter json` to detect:
- Unused files (not imported anywhere)
- Unused exports (exported but never imported)
- Unused types (exported types/interfaces never referenced)
- Unused dependencies (in `dependencies` or `devDependencies`)
- Unlisted dependencies (imported but not in `package.json`)

#### Phase 2: TypeScript Strict Mode

Check `tsconfig.json` for strict flags. If `strict: true` is not enabled, identify which individual flags are missing from:
- `strictNullChecks`
- `noUnusedLocals`
- `noUnusedParameters`
- `noImplicitAny`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

For each missing flag, run `tsc --noEmit` with that flag enabled to count resulting errors. Present the error counts so the user can decide which flags to enable.

#### Phase 3: ESLint

If ESLint config exists (or was just created), run ESLint and collect violations. Focus on:
- `no-unused-vars` / `@typescript-eslint/no-unused-vars`
- `no-unreachable`

Report auto-fixable vs manual-fix counts.

### 4. Present Findings Interactively

Group results by category and present each group separately. For each group, show the findings and ask for confirmation before acting:

1. **Unused files** - list file paths, ask which to delete
2. **Unused exports** - list export names and locations, ask which to remove
3. **Unused dependencies** - list package names, ask which to uninstall
4. **Unlisted dependencies** - list package names, ask which to add
5. **TypeScript strict flags** - show error counts per flag, ask which to enable
6. **ESLint violations** - show summary, ask whether to auto-fix

The user can approve or skip each category independently.

### 5. Clean Up

Execute approved actions:
- Delete unused files
- Remove unused export keywords (or delete entirely if the symbol is also locally unused)
- Run package manager uninstall for unused deps
- Run package manager install for unlisted deps
- Update `tsconfig.json` with approved strict flags
- Run `eslint --fix` for approved auto-fixes

### 6. Verify

Run the project's build command (`npm run build`, `pnpm build`, etc.) to confirm nothing broke. If the build fails, report the errors and help fix them.

## Skill Properties

- **Location**: `~/.claude/skills/dead-code.md`
- **Type**: Rigid process skill (follows phases in order, does not skip steps)
- **Invocation**: `/dead-code`

## Behavioral Rules

- **Non-destructive by default**: always asks before deleting or modifying
- **Idempotent**: safe to run repeatedly; if tooling already exists, uses it as-is
- **No permanent config changes without asking**: enabling strict flags, adding ESLint config, etc. all require confirmation
- **Respects .gitignore**: does not analyze generated files, build output, or node_modules
- **Framework-aware**: knip has built-in support for React, Next.js, Vite, etc. The skill relies on knip's auto-detection rather than custom configuration

## Scope Boundaries

The skill does NOT:
- Set up Prettier, import sorting, or other formatting tools
- Refactor code for quality (only removes dead code)
- Modify CI/CD pipelines
- Add opinionated ESLint rules beyond `typescript-eslint` recommended
- Touch test files differently from source files (knip handles this)

## ESLint Setup (When Missing)

When no ESLint config is detected, the skill creates a minimal `eslint.config.js` using the flat config format:

```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist/", "node_modules/"] }
);
```

Installs: `eslint`, `@eslint/js`, `typescript-eslint`
