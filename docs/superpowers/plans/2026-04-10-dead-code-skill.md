# /dead-code Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a global Claude Code skill at `~/.claude/skills/dead-code.md` that sweeps React/TypeScript projects for dead code using knip, ESLint, and TypeScript strict mode, then run it against the current project.

**Architecture:** The skill is a single markdown file with frontmatter and structured instructions. It tells Claude how to detect project context, install tooling, run three analysis phases (knip, TypeScript strict, ESLint), present findings interactively by category, execute approved cleanups, and verify the build. After creating the skill, we run it manually against this project.

**Tech Stack:** knip, eslint, typescript-eslint, TypeScript compiler

---

## File Structure

- **Create:** `~/.claude/skills/dead-code/SKILL.md` - the skill definition file
- **Create (conditional):** `eslint.config.js` in target project (only if no ESLint config exists)
- **Modify (conditional):** `tsconfig.json` in target project (strict flags, if user approves)
- **Modify (conditional):** `package.json` in target project (dependency changes)
- **Delete (conditional):** any unused source files knip identifies

---

### Task 1: Create the /dead-code Skill File

**Files:**
- Create: `~/.claude/skills/dead-code/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p ~/.claude/skills/dead-code
```

- [ ] **Step 2: Write the SKILL.md file**

Create `~/.claude/skills/dead-code/SKILL.md` with the following complete content:

```markdown
---
name: dead-code
description: Sweep a React/TypeScript project for dead code, unused exports, unused dependencies, and code hygiene issues. Use when the user wants to clean up dead code, find unused exports, or run a code hygiene sweep. Invoked with /dead-code.
---

# Dead Code Sweep

Perform a comprehensive dead code and hygiene sweep on a React/TypeScript project. This is a rigid process skill. Follow the phases in order. Do not skip steps.

## Phase 1: Detect Project Context

Read the project state to determine what tooling exists and which package manager to use.

1. Read `package.json` to understand dependencies and scripts
2. Read `tsconfig.json` to check current strict mode settings
3. Detect package manager:
   - If `pnpm-lock.yaml` exists: use `pnpm`
   - If `yarn.lock` exists: use `yarn`
   - Otherwise: use `npm`
4. Detect ESLint config: check for `eslint.config.*`, `.eslintrc.*`, or `eslintConfig` key in `package.json`
5. Report what you found to the user before proceeding

## Phase 2: Install Tooling

Install missing tools as devDependencies. Ask the user for confirmation before installing.

### Knip (required)

If `knip` is not in devDependencies:
```bash
{pkg_manager} install -D knip
```

### ESLint (if no config detected)

If no ESLint configuration was found in Phase 1, ask the user: "No ESLint config detected. Want me to set up a standard typescript-eslint config?"

If approved, install and create config:

```bash
{pkg_manager} install -D eslint @eslint/js typescript-eslint
```

Then create `eslint.config.js`:

```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist/", "node_modules/"] }
);
```

## Phase 3: Run Analysis

Run all three analysis phases and collect results before presenting anything to the user.

### 3A: Knip Analysis

Run knip with JSON output to get structured results:

```bash
npx knip --reporter json
```

Parse the JSON output. It contains these categories:
- `files` - completely unused files
- `dependencies` - unused dependencies
- `devDependencies` - unused devDependencies
- `unlisted` - imported but not in package.json
- `exports` - unused exports
- `types` - unused type exports
- `duplicates` - duplicate exports

### 3B: TypeScript Strict Mode Analysis

Read current `tsconfig.json` and check which strict flags are enabled. The flags to check:
- `strict` (enables all below)
- `strictNullChecks`
- `noUnusedLocals`
- `noUnusedParameters`
- `noImplicitAny`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitThis`
- `alwaysStrict`

For each flag that is NOT currently enabled, run:

```bash
npx tsc --noEmit --{flagName} 2>&1 | tail -1
```

Record the error count for each flag. Skip flags that produce zero errors (already passing).

### 3C: ESLint Analysis

If ESLint config exists (either pre-existing or just created):

```bash
npx eslint . --format json 2>/dev/null
```

Count total errors, warnings, and how many are auto-fixable.

## Phase 4: Present Findings Interactively

Present each category one at a time. For each category, show the findings and ask the user to approve, partially approve, or skip. Use AskUserQuestion for each category.

**Order of presentation:**

### Category 1: Unused Files
Show the list of file paths. Ask: "These files are not imported anywhere. Delete them? (all / pick / skip)"
- If "pick": list each file and ask yes/no

### Category 2: Unused Exports
Show export names with file:line locations. Ask: "These exports are never imported. Remove them? (all / pick / skip)"
- When removing: remove the `export` keyword. If the symbol is also unused locally (check with a grep for its name in the same file), delete the entire declaration.

### Category 3: Unused Dependencies
Show package names. Ask: "These packages are in package.json but never imported. Uninstall them? (all / pick / skip)"

### Category 4: Unlisted Dependencies
Show package names. Ask: "These packages are imported but not in package.json. Add them? (all / pick / skip)"

### Category 5: TypeScript Strict Flags
Show a table: flag name, error count. Ask: "Which strict flags do you want to enable? (all / pick / skip)"
- Only show flags that are not already enabled
- For flags with zero errors, recommend enabling them (free wins)

### Category 6: ESLint Violations
Show summary: X errors, Y warnings, Z auto-fixable. Ask: "Run eslint --fix for auto-fixable issues? (yes / skip)"

If there are NO findings for a category, skip it silently. Do not ask about empty categories.

## Phase 5: Execute Approved Cleanups

Execute the approved actions from Phase 4. Work through them in order.

1. **Delete unused files:** `rm` each approved file
2. **Remove unused exports:** Edit each file to remove the export keyword or delete the declaration
3. **Uninstall unused deps:** `{pkg_manager} uninstall {package_names}`
4. **Install unlisted deps:** `{pkg_manager} install {package_names}`
5. **Enable strict flags:** Edit `tsconfig.json` to add approved flags. Then run `npx tsc --noEmit` and fix any resulting errors.
6. **ESLint auto-fix:** `npx eslint . --fix`

## Phase 6: Verify

Run the project build to confirm nothing broke:

```bash
{pkg_manager} run build
```

If the build fails:
1. Show the errors to the user
2. Attempt to fix them
3. Re-run the build
4. If still failing after two attempts, report the remaining errors and stop

If the build succeeds, report a summary of everything that was cleaned up:
- Files deleted
- Exports removed
- Dependencies changed
- Strict flags enabled
- ESLint fixes applied
```

- [ ] **Step 3: Verify the skill file was created correctly**

```bash
cat ~/.claude/skills/dead-code/SKILL.md | head -5
```

Expected: the frontmatter header with `name: dead-code`

- [ ] **Step 4: Commit the skill file**

```bash
git add -A && git commit -m "feat: add /dead-code global Claude Code skill"
```

Note: The skill lives at `~/.claude/skills/dead-code/SKILL.md` which is outside the repo. If git doesn't pick it up, that's fine. Commit any in-repo changes instead (like this plan doc).

---

### Task 2: Run Knip on the Current Project

**Files:**
- Modify: `package.json` (add knip devDependency)

- [ ] **Step 1: Install knip**

```bash
npm install -D knip
```

- [ ] **Step 2: Run knip with JSON reporter**

```bash
npx knip --reporter json 2>/dev/null
```

- [ ] **Step 3: Run knip with default reporter for readable output**

```bash
npx knip 2>/dev/null
```

- [ ] **Step 4: Present findings to user by category**

Parse the knip output and present each category (unused files, unused exports, unused deps, unlisted deps) one at a time. Ask for approval before each category.

- [ ] **Step 5: Execute approved cleanups**

Delete/modify files and dependencies as approved by the user.

---

### Task 3: Run TypeScript Strict Mode Analysis

**Files:**
- Modify: `tsconfig.json` (if user approves strict flag changes)

- [ ] **Step 1: Check current tsconfig strict settings**

Read `tsconfig.json` and identify which strict flags are missing.

- [ ] **Step 2: Test each missing flag**

For each missing flag, run `npx tsc --noEmit --{flag}` and count errors.

- [ ] **Step 3: Present findings to user**

Show a table of flag name + error count. Recommend enabling zero-error flags as free wins.

- [ ] **Step 4: Enable approved flags**

Edit `tsconfig.json` to add the approved flags.

- [ ] **Step 5: Fix any resulting TypeScript errors**

Run `npx tsc --noEmit` and fix errors introduced by the new flags.

---

### Task 4: Set Up and Run ESLint

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (add eslint devDependencies)

- [ ] **Step 1: Install ESLint and typescript-eslint**

```bash
npm install -D eslint @eslint/js typescript-eslint
```

- [ ] **Step 2: Create eslint.config.js**

```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist/", "node_modules/"] }
);
```

- [ ] **Step 3: Run ESLint and review output**

```bash
npx eslint . 2>/dev/null
```

- [ ] **Step 4: Present findings to user**

Show error/warning counts and auto-fixable count. Ask whether to auto-fix.

- [ ] **Step 5: Run auto-fix if approved**

```bash
npx eslint . --fix
```

- [ ] **Step 6: Fix remaining manual issues**

Address any non-auto-fixable issues that the user wants fixed.

---

### Task 5: Verify and Commit

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: clean build with no errors.

- [ ] **Step 2: Fix any build failures**

If the build fails, fix the errors and re-run.

- [ ] **Step 3: Commit all changes**

```bash
git add -A
git commit -m "chore: dead code sweep - remove unused files, exports, and dependencies"
```
