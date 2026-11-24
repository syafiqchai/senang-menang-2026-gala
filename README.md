# Event Review Helper

Guests scan a QR code, tap a star rating and a few highlights, and an AI drafts a short Google review in their own words. They edit the text if they like, tap **Copy review and open Google**, paste, and press Post.

## What it can and cannot do

Google does not let any app post a review for a customer, and a review link cannot be pre-filled with text. So the last step (paste and Post) always happens on Google, by the guest. This project makes everything before that step quick.

## How it works

```
QR code -> public/index.html (rating, highlights, language)
        -> POST /api/generate (your server, holds the OpenAI key)
        -> OpenAI writes a 2-4 sentence draft
        -> guest edits, copies, opens your Google review link
```

Files you will touch:

| File | Purpose |
| --- | --- |
| `public/config.js` | Event name, Google review link, highlight options, languages |
| `.env` / Vercel settings | `OPENAI_API_KEY`, optional `OPENAI_MODEL` |

## 1. Get your Google review link

Google Business Profile > your event or venue profile > **Get more reviews** > copy the link (looks like `https://g.page/r/XXXXXXXX/review`). Paste it into `googleReviewUrl` in `public/config.js`, and set `eventName` there too.

## 2. Try it on your computer (optional)

Needs Node 18 or newer.

```bash
npm install
cp .env.example .env      # then put your OpenAI key in .env
npm run dev               # open http://localhost:3000
npm test                  # runs the API tests (no key needed)
```

Without a key the page still works and uses a basic English template, so you can check the layout first.

## 3. Put it online (Vercel, free plan is enough)

1. Put this folder in a GitHub repository.
2. In Vercel choose **Add New > Project** and import the repository. No build settings are needed.
3. Under **Settings > Environment Variables** add ONE key, then Redeploy:
   - **Free:** `GEMINI_API_KEY` (from Google AI Studio; there is a free tier with usage limits, check the limits shown in AI Studio for your key).
   - **Paid:** `OPENAI_API_KEY` (from platform.openai.com, needs prepaid credit).
   If both are set, Gemini is used first. Set `AI_PROVIDER` to `openai` to override.
4. Open the Vercel address on your phone and run through the whole flow once.

Any host that runs Node serverless functions (Netlify, Cloudflare Pages Functions) also works with small changes to `api/generate.js`.

## 4. Make the QR code and poster

```bash
npm run qr -- https://your-site.vercel.app --event "Annual Dinner 2026"
```

This creates `out/qr.png`, `out/qr.svg` and `out/poster.html` (A5, open in a browser and print). Scan the printed poster with two different phones before the event.

## Cost and abuse protection

- A draft is one small API call, usually a fraction of a cent.
- The server limits each visitor to 8 drafts per 10 minutes (`RATE_LIMIT_MAX`). This counter is per server instance, so for a large public event also set a monthly spending limit in your OpenAI account.
- Guest comments are cut to 300 characters and treated as data, not instructions.

## Keeping within Google's rules

- Send every guest to Google, whatever their rating. Showing the link only to happy guests ("review gating") is against Google's policy. This page does not do it.
- Do not give rewards or discounts in exchange for reviews.
- The draft only uses what the guest selected or typed, and the guest reads and can change it before posting. Keep it that way. Posting reviews the guest did not write or approve can get them removed.
- Reviews from many guests on one device or one network in a short time can look suspicious to Google. Let guests use their own phones.

## Customizing

- Highlights and languages: `public/config.js`. Language values must be one of `English`, `Bahasa Melayu`, `Chinese`, `Tamil`, or add more to `ALLOWED_LANGUAGES` in `api/generate.js`.
- Look and feel: `public/style.css` (colors are variables at the top).
- Writing style of the drafts: the rules in `buildMessages()` in `api/generate.js`.

## Why each review reads differently

- Every draft gets its own random voice (casual, warm, chatty, plain, thoughtful), length (one line to four sentences) and opening, so guests do not get the same pattern.
- The guest can pick a tone, say who they came with, and write their best moment in their own words. The AI builds the review around those real details.
- A list of stock phrases ("highly recommend", "exceeded expectations", and so on) is banned in `CLICHES` in `api/generate.js`. Add any phrases you keep seeing.
- "Write another version" gives a fresh draft with a different style.

## Updating a site that is already online

Upload the changed files to the same GitHub repository (Add file > Upload files, same names). Vercel redeploys by itself in about a minute. Your `config.js` and Vercel settings stay as they are, so do not overwrite `public/config.js` unless you re-enter your event name and Google link.
