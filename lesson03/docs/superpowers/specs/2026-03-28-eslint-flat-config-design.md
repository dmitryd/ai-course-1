# ESLint Flat Config Design

## Summary

Restore the broken lint workflow in [`lesson03`](.) by adding a minimal local [`eslint.config.js`](eslint.config.js) that works with ESLint 10 and validates only the current app code. The change is intentionally narrow: it should make [`npm run lint`](package.json:9) executable without introducing repo-wide lint policy changes or affecting directories outside the current workspace.

## Goals

- Make [`npm run lint`](package.json:9) run successfully inside [`lesson03`](.).
- Keep the change scoped to the current workspace directory only.
- Lint the active application source under [`app`](app), [`components`](components), [`hooks`](hooks), and [`lib`](lib).
- Avoid broad new rule enforcement that would create unrelated cleanup work.
- Make the verification steps in [`docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md`](docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md) accurate and reproducible.

## Non-Goals

- Defining a repository-wide ESLint policy.
- Linting unrelated directories outside [`lesson03`](.).
- Migrating the project to a comprehensive Next.js lint setup.
- Tightening stylistic rules beyond what is required to restore execution.

## Affected Areas

- [`eslint.config.js`](eslint.config.js)
- [`package.json`](package.json)
- Source coverage rooted in [`app`](app), [`components`](components), [`hooks`](hooks), and [`lib`](lib)

## Design

### Architecture

Add a single flat-config entrypoint at [`eslint.config.js`](eslint.config.js). ESLint 10 will auto-discover this file when [`npm run lint`](package.json:9) runs. The config will live only in the current workspace, so it cannot affect sibling directories elsewhere in the repository.

### Components

#### [`eslint.config.js`](eslint.config.js)

The config should:

- Ignore generated or irrelevant paths such as Next build output, dependency folders, screenshots, and TypeScript build artifacts.
- Target application source files with JavaScript and TypeScript extensions in [`app`](app), [`components`](components), [`hooks`](hooks), and [`lib`](lib).
- Use a minimal parser/configuration setup that supports the existing React and TypeScript codebase.
- Prefer a small baseline of recommended checks over an aggressive rule set.

#### [`package.json`](package.json)

Keep [`npm run lint`](package.json:9) unchanged if the new config is sufficient. This preserves the command already referenced by the implementation plan and avoids unnecessary command churn.

### Data Flow

1. A developer runs [`npm run lint`](package.json:9).
2. ESLint discovers [`eslint.config.js`](eslint.config.js).
3. The flat config filters the lint target set down to current application code in [`lesson03`](.).
4. ESLint reports real config, parser, or source-level issues for those files.

### Error Handling

The configuration should fail only for meaningful reasons:

- Invalid ESLint flat-config syntax.
- Missing parser or plugin dependencies required by the minimal setup.
- Actual issues in the targeted app source files.

It should not fail because ESLint has no config file, nor because it is scanning unrelated paths that are outside the intended scope.

### Testing

Verify the design by confirming:

1. [`npm run lint`](package.json:9) starts and completes using [`eslint.config.js`](eslint.config.js).
2. Linting is scoped to the current workspace and does not rely on files outside [`lesson03`](.).
3. The Russian UI implementation plan at [`docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md`](docs/superpowers/plans/2026-03-28-russian-ui-strings-implementation-plan.md) now references a working verification command.

## Trade-offs

### Benefits

- Smallest change that restores linting.
- Low risk of unrelated lint churn.
- Keeps the documented workflow stable.

### Costs

- The initial rule set may be conservative.
- A fuller Next.js-specific lint configuration may still be desirable later.

## Decision

Proceed with a minimal local flat ESLint configuration in [`eslint.config.js`](eslint.config.js), scoped to the current workspace and current app source only, while keeping [`npm run lint`](package.json:9) unchanged unless implementation proves that impossible.
