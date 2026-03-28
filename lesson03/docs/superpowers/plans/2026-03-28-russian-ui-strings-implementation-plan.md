# Russian UI Strings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the app's hard-coded UI strings to Russian while leaving external Supadata and Gemini error messages untouched.

**Architecture:** Keep the existing Next.js App Router structure and translate strings directly in the files that render them. Static labels, placeholders, loading text, and app-authored metadata are replaced in place, while dynamic provider error payloads continue to pass through unchanged.

**Tech Stack:** Next.js App Router, TypeScript, React, existing UI components from [`components/ui`](components/ui), manual browser verification through [`npm run dev`](package.json#L6).

---

## File Structure

### Existing files to modify

- Modify [`app/layout.tsx:9-30`](app/layout.tsx#L9) to translate app metadata and switch the document language to Russian.
- Modify [`app/page.tsx:22-40`](app/page.tsx#L22) to translate the home page placeholder and button labels.
- Modify [`app/summary/page.tsx:96-198`](app/summary/page.tsx#L96) to translate only app-owned fallback strings, loading copy, and action labels while preserving provider-originated error text.

### Files to inspect during verification

- Inspect [`app/api/summarize/start/route.ts:11-23`](app/api/summarize/start/route.ts#L11) only to confirm its English error messages remain untouched.
- Inspect [`app/api/summarize/status/route.ts:12-24`](app/api/summarize/status/route.ts#L12) only to confirm its English error messages remain untouched.

## Task 1: Translate app metadata and homepage labels

**Files:**
- Modify: [`app/layout.tsx:9-30`](app/layout.tsx#L9)
- Modify: [`app/page.tsx:22-40`](app/page.tsx#L22)

- [ ] **Step 1: Update the metadata strings and document language in [`app/layout.tsx`](app/layout.tsx)**

```tsx
export const metadata: Metadata = {
  title: 'Краткое содержание видео',
  description: 'Получайте AI-сводки по видео на YouTube',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Translate the home page placeholder and submit/loading button in [`app/page.tsx`](app/page.tsx)**

```tsx
return (
  <main className="min-h-screen flex items-center justify-center bg-background px-4">
    <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
      <Input
        type="url"
        placeholder="Вставьте ссылку на видео YouTube"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-12 text-base"
        required
      />
      <Button
        type="submit"
        className="h-12 text-base"
        disabled={isLoading || !url.trim()}
      >
        {isLoading ? "Загрузка..." : "Сделать краткое содержание"}
      </Button>
    </form>
  </main>
)
```

- [ ] **Step 3: Run lint to catch syntax or formatting mistakes after the first set of edits**

Run: [`npm run lint`](package.json#L9)

Expected: lint completes without TypeScript or ESLint errors related to [`app/layout.tsx`](app/layout.tsx) or [`app/page.tsx`](app/page.tsx).

- [ ] **Step 4: Commit the metadata and homepage translation changes**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: translate homepage ui to russian"
```

## Task 2: Translate summary-page static UI and preserve provider error text

**Files:**
- Modify: [`app/summary/page.tsx:96-198`](app/summary/page.tsx#L96)
- Inspect only: [`app/api/summarize/start/route.ts:11-23`](app/api/summarize/start/route.ts#L11)
- Inspect only: [`app/api/summarize/status/route.ts:12-24`](app/api/summarize/status/route.ts#L12)

- [ ] **Step 1: Replace only app-authored fallback strings in [`app/summary/page.tsx`](app/summary/page.tsx)**

```tsx
throw new Error(data.error.message || "Не удалось подготовить краткое содержание видео")
```

```tsx
throw new Error(data.status === "error" ? data.error.message : "Не удалось подготовить краткое содержание видео")
```

```tsx
setError(err instanceof Error ? err.message : "Что-то пошло не так")
```

This keeps [`data.error.message`](app/summary/page.tsx#L96) and [`err.message`](app/summary/page.tsx#L154) untouched when they come from Supadata or Gemini.

- [ ] **Step 2: Translate the remaining static loading and action labels in [`app/summary/page.tsx`](app/summary/page.tsx)**

```tsx
if (error) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
      <p className="text-destructive text-center">{error}</p>
      <Button onClick={() => router.push("/")} variant="outline">
        Попробовать другое видео
      </Button>
    </main>
  )
}
```

```tsx
<p className="text-muted-foreground">
  {status === "starting"
    ? "Запрашиваем расшифровку видео..."
    : "Видео обрабатывается. Это может занять до минуты..."}
</p>
```

```tsx
<Button
  onClick={() => router.push("/")}
  variant="outline"
  className="self-start"
>
  Сделать краткое содержание другого видео
</Button>
```

- [ ] **Step 3: Verify that provider error sources remain unchanged**

Check that no edits were made to the English provider-facing strings in [`app/api/summarize/start/route.ts`](app/api/summarize/start/route.ts) and [`app/api/summarize/status/route.ts`](app/api/summarize/status/route.ts). The implementation is correct only if the UI preserves incoming provider error text instead of translating those routes.

- [ ] **Step 4: Run lint again after finishing the summary page edits**

Run: [`npm run lint`](package.json#L9)

Expected: lint completes without errors in [`app/summary/page.tsx`](app/summary/page.tsx).

- [ ] **Step 5: Commit the summary page translation changes**

```bash
git add app/summary/page.tsx
git commit -m "feat: translate summary ui to russian"
```

## Task 3: Manually verify the translated UI in the browser

**Files:**
- Verify: [`app/page.tsx`](app/page.tsx)
- Verify: [`app/summary/page.tsx`](app/summary/page.tsx)

- [ ] **Step 1: Open the home page and verify translated static strings**

Run: [`npm run dev`](package.json#L6)

Expected on [`/`](app/page.tsx): the input placeholder reads `Вставьте ссылку на видео YouTube` and the submit button reads `Сделать краткое содержание`.

- [ ] **Step 2: Submit a valid YouTube URL and verify the summary page labels**

Manual action: paste a working YouTube URL into the home page and submit the form.

Expected on [`/summary`](app/summary/page.tsx): the loading copy is Russian, and the post-result action button reads `Сделать краткое содержание другого видео`.

- [ ] **Step 3: Verify fallback versus provider-originated errors**

Manual action: trigger one app-owned fallback path if possible, then trigger one provider-originated error path if available.

Expected:
- App-owned fallback copy appears in Russian: `Не удалось подготовить краткое содержание видео` or `Что-то пошло не так`.
- Provider-originated Supadata or Gemini messages still appear in English because the UI renders them via [`err.message`](app/summary/page.tsx#L154).

- [ ] **Step 4: Commit the final verified state**

```bash
git add app/layout.tsx app/page.tsx app/summary/page.tsx
git commit -m "chore: verify russian ui translation"
```
