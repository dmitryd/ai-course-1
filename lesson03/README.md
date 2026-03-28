# YouTube Video Summarizer

This app accepts a YouTube URL, fetches the transcript through Supadata, summarizes the video with Gemini, and returns the summary in Russian.

## Required API Keys

Create [`.env.local`](.env.local) in the project root with:

```dotenv
SUPADATA_API_KEY=your_supadata_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
APP_JOB_TOKEN_SECRET=replace_with_a_long_random_secret
```

- `SUPADATA_API_KEY` is used only by server routes to fetch transcripts.
- `GEMINI_API_KEY` is used only by server routes to generate the summary in Russian.
- `APP_JOB_TOKEN_SECRET` is your own random secret used to sign the temporary polling token.

Do not put any of these values in client components or commit them to git.

## Local Testing

1. Copy [`.env.example`](.env.example) to [`.env.local`](.env.local).
2. Fill in your real API keys.
3. Run [`npm install`](package.json).
4. Run [`npm run dev`](package.json).
5. Open `http://localhost:3000`.
6. Test with `https://www.youtube.com/watch?v=qim8chAy7Mw`.

## Vercel Deployment Setup

Vercel does not read your local [`.env.local`](.env.local) file. For deployment, add the same variables in the Vercel project settings.

1. Open your project in the Vercel dashboard.
2. Click **Settings**.
3. In the left sidebar, open **Environment Variables**.
4. Add a variable named `SUPADATA_API_KEY` and paste your Supadata key.
5. Add a variable named `GEMINI_API_KEY` and paste your Gemini key.
6. Add a variable named `APP_JOB_TOKEN_SECRET` and paste a long random string.
7. For each variable, choose the environments where it should be available. At minimum, select **Production**. Select **Preview** too if you want preview deployments to work.
8. Save the variables.
9. Redeploy the project so the new values are available to the server routes.
10. After redeploy, submit a YouTube URL through the app and confirm the summary appears.

## How the Backend Works

- The frontend starts the workflow through [`app/api/summarize/start/route.ts`](app/api/summarize/start/route.ts).
- If Supadata returns a transcript immediately, the backend sends it to Gemini and returns the Russian summary.
- If Supadata returns an async job, the backend returns a signed job token.
- The frontend polls [`app/api/summarize/status/route.ts`](app/api/summarize/status/route.ts) until the summary is ready.

## Known Limits

- Very long videos may stay in the processing state while Supadata completes asynchronous transcription.
- The first version summarizes transcript text only and does not enrich the result with advanced metadata.
- Production requires Vercel Environment Variables even if local [`.env.local`](.env.local) works.
