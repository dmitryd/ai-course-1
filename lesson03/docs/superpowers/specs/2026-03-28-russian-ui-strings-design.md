# Russian UI Strings Design

## Summary

Translate the app's static user-facing interface text from English to Russian by editing the existing UI components in place. The change is intentionally narrow: only hard-coded app strings are translated, while upstream provider error messages from Supadata and Gemini remain unchanged if they arrive in English.

## Goals

- Translate the static UI text currently shown in the application to Russian.
- Keep the current routing, request flow, and backend behavior unchanged.
- Avoid introducing an internationalization framework or shared translation layer.
- Preserve raw provider error messages when they are returned from external services.

## Non-Goals

- Adding multi-language support.
- Translating Supadata or Gemini error payloads.
- Refactoring the app into a reusable localization system.
- Changing API contracts or summary-generation logic.

## Affected Areas

- [`Home()`](app/page.tsx:8)
- [`SummaryContent()`](app/summary/page.tsx:51)
- Any other directly hard-coded UI text surfaced by the app itself, if discovered during implementation review.

## Design

### Architecture

Keep the existing app structure unchanged and replace hard-coded English UI strings directly where they are rendered. This preserves the current component boundaries and avoids unnecessary complexity for a single-language app.

### Components

#### [`Home()`](app/page.tsx:8)

Translate the input placeholder and submit/loading button labels to Russian.

#### [`SummaryContent()`](app/summary/page.tsx:51)

Translate static loading-state copy and action button labels that are authored by the app. Keep dynamic content such as generated summaries and external-service error messages untouched.

### Data Flow

The request flow remains the same:

1. User enters a YouTube URL on the home page.
2. The app routes to [`/summary`](app/summary/page.tsx).
3. The client starts the summarize request and polls status.
4. The UI renders translated static labels around the existing flow.

No request or response formats change.

### Error Handling

Only app-authored fallback text should be translated. If a message is received from Supadata or Gemini in English, the app should display it as-is rather than translating or rewriting it.

This means implementation should distinguish between:

- Static UI text owned by the app → translate to Russian.
- External dynamic error text → preserve exactly as received.

### Testing

Verify the following after implementation:

1. The home page placeholder and submit/loading text are Russian.
2. The summary page loading messages remain Russian.
3. The "summarize another video" action is Russian.
4. A provider-originated English error still appears in English.
5. Navigation and summary generation behavior are unchanged.

## Trade-offs

### Benefits

- Fastest path to a fully Russian UI.
- Minimal code churn.
- No new dependencies or abstractions.

### Costs

- Strings remain distributed across components.
- Future multi-language support would require follow-up refactoring.

## Decision

Proceed with direct in-place translation of app-owned static UI strings to Russian, with no i18n framework and no translation of external provider error messages.
