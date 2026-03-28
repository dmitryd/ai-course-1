# ESLint Flat Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a working local lint workflow in [`lesson03`](.) by adding a minimal ESLint flat config and the smallest required local lint dependencies.

**Architecture:** Keep the existing [`npm run lint`](package.json:9) command unchanged and make it work by adding a workspace-local [`eslint.config.js`](eslint.config.js). Scope linting to the current application source only so the change does not affect sibling directories or create unrelated cleanup work.

**Tech Stack:** ESLint flat config, TypeScript, React, Next.js App Router, npm

---

## File Structure

### Existing files to modify

- Modify [`package.json`](package.json) by adding the local lint dependencies through [`npm install -D`](package.json:63).
- Modify [`package-lock.json`](package-lock.json) as a result of dependency installation.

### New files to create

- Create [`eslint.config.js`](eslint.config.js) to provide the flat-config entrypoint required by ESLint 10.

### Files to inspect during verification

- Inspect [`app/layout.tsx`](app/layout.tsx) to confirm underscore-prefixed variables remain lint-safe.
- Inspect [`app/page.tsx`](app/page.tsx) to confirm the config parses client-side TSX correctly.
- Inspect [`app/summary/page.tsx`](app/summary/page.tsx) to confirm the config parses browser APIs and JSX correctly.
- Inspect [`components/ui/slider.tsx`](components/ui/slider.tsx) to confirm underscore-prefixed locals remain lint-safe outside [`app`](app).

## Task 1: Add the minimal local ESLint toolchain and flat config

**Files:**
- Create: [`eslint.config.js`](eslint.config.js)
- Modify: [`package.json`](package.json)
- Modify: [`package-lock.json`](package-lock.json)
- Verify: [`app/layout.tsx`](app/layout.tsx)
- Verify: [`app/page.tsx`](app/page.tsx)
- Verify: [`app/summary/page.tsx`](app/summary/page.tsx)
- Verify: [`components/ui/slider.tsx`](components/ui/slider.tsx)

- [ ] **Step 1: Run the current lint command to capture the failing baseline**

Run: [`npm run lint`](package.json:9)

Expected: FAIL with ESLint 10 reporting that it cannot find [`eslint.config.js`](eslint.config.js).

- [ ] **Step 2: Install the smallest local dependency set needed for flat-config linting of the current app code**

Run:

```bash
npm install -D eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin globals
```

Expected: [`package.json`](package.json) gains the new devDependencies, [`package-lock.json`](package-lock.json) is updated, and [`npm run lint`](package.json:9) can resolve a local ESLint binary instead of depending on a global installation.

- [ ] **Step 3: Create the minimal flat config in [`eslint.config.js`](eslint.config.js)**

```js
const js = require("@eslint/js")
const globals = require("globals")
const tsParser = require("@typescript-eslint/parser")
const tsPlugin = require("@typescript-eslint/eslint-plugin")

module.exports = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "screenshots/**",
      "docs/**",
      "plans/**",
      "tsconfig.tsbuildinfo",
      "next-env.d.ts",
      "next.config.mjs",
      "postcss.config.mjs",
    ],
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]
```

This keeps lint coverage inside the current workspace code paths and avoids flagging underscore-prefixed variables already present in [`app/layout.tsx`](app/layout.tsx) and [`components/ui/slider.tsx`](components/ui/slider.tsx).

- [ ] **Step 4: Run lint again to verify the config works and the targeted code passes**

Run: [`npm run lint`](package.json:9)

Expected: PASS with no "missing [`eslint.config.js`](eslint.config.js)" error and no parsing failures for [`app/page.tsx`](app/page.tsx) or [`app/summary/page.tsx`](app/summary/page.tsx).

- [ ] **Step 5: Commit the working lint setup**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: add local eslint flat config"
```

Expected: one commit containing the new local lint toolchain and flat config, scoped to [`lesson03`](.).

## Task 2: Verify the restored lint workflow matches the documented Russian UI plan

**Files:**
- Verify: [`docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md`](docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md)
- Verify: [`package.json`](package.json)
- Verify: [`eslint.config.js`](eslint.config.js)

- [ ] **Step 1: Confirm the documented lint command is still the same command the plan references**

Run:

```bash
grep -n "lint" package.json docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md
```

Expected: both files still reference [`npm run lint`](package.json:9), so the implementation fixes the workflow without requiring plan edits.

- [ ] **Step 2: Re-run the lint command after the verification check**

Run: [`npm run lint`](package.json:9)

Expected: PASS again, confirming the verification command documented in [`docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md`](docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md) is now executable as written.
