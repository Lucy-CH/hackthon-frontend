# Hong Kong Rent & Commute — Frontend

A React prototype for finding rental homes within a monthly rent budget and comparing public transport commute times, costs, and estimated carbon emissions in Hong Kong.

Built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Axios, and Google Maps.

## Requirements

- Node.js 24 and npm.
- The separate **FastAPI backend** and its PostgreSQL database, with address and rental data imported.
- Your own **Google Maps browser API key**, with **Maps JavaScript API** enabled and an active billing account.

The backend needs its own Google Routes API configuration. The frontend key does not replace it. Starting the frontend does not start the backend or initialize its data.

## Local setup

Run commands from the frontend repository directory, which contains `package.json`.

### 1. Install dependencies

If you use nvm, select Node.js 24:

```bash
nvm install 24
nvm use 24
```

If Node.js 24 is already installed, skip those two commands. Check the installation and install dependencies using the lockfile:

```bash
node --version
npm --version
npm ci
```

### 2. Configure environment variables

On macOS/Linux:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

If `.env` already exists, edit it instead of overwriting it. Fill in:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_MAPS_API_KEY=your_browser_maps_api_key
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin, without a trailing `/api`. API functions already add `/api/...`. |
| `VITE_GOOGLE_MAPS_API_KEY` | Your browser key for rendering Google Maps. |

For a restricted browser key, open Google Cloud Console → **APIs & Services → Credentials → Application restrictions → Websites** and allow `http://localhost:5173/*`. Add `http://127.0.0.1:5173/*` separately if you use that address.

Do not commit real `.env` files. `VITE_*` values are included in browser code; never put database passwords or backend-only API keys in them.

### 3. Prepare the backend

Start the backend and PostgreSQL using the backend project's setup instructions. Import address and rental data before testing recommendations.

Configure the **backend's** environment to allow the frontend origin:

```dotenv
WEB_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

Restart the backend after changing its configuration. These are exact origins: add the actual origin if your frontend uses another port.

Check the address API from your local terminal:

```bash
curl --fail-with-body --get \
  'http://127.0.0.1:8000/api/code-tables/address_list' \
  --data-urlencode 'q=Central' \
  --data-urlencode 'limit=2'
```

Expect JSON containing `data.items`. Adjust the URL if your backend runs elsewhere.

### 4. Start the frontend

```bash
npm run dev
```

Open the **Local** URL printed by Vite, normally **http://localhost:5173**. If the port is occupied, Vite may choose another port; update backend CORS and Google Maps website restrictions accordingly.

Restart the development server after editing `.env`.

## Try the application

1. Search for a work address and **select an option** from the dropdown.
2. Enter a positive whole-number monthly rent budget in HKD, such as `12000`.
3. Click **Find my home** and wait for commute calculations.
4. Select a rental card to see its map route and travel steps.
5. Compare results using **Shortest commute**, **Lowest total cost**, or **Lowest emissions**.

The map appears after recommendations return. The budget applies to rent only; transport costs are shown separately. Missing fare or emissions estimates are displayed as `Unavailable`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Check TypeScript and build production files into `dist/`. |
| `npm run preview` | Preview an existing production build locally; build first. |

The preview URL is normally `http://localhost:4173`; use the URL printed by Vite. Allow that origin in backend CORS and Google Maps website restrictions when testing API calls and maps in preview.

## Production configuration

Vite reads environment variables at **build time**. Rebuild after changing the API URL or browser Maps key.

If a web server serves the frontend and forwards `/api/*` to the backend on the same origin, create a local `.env.production`:

```dotenv
VITE_API_BASE_URL=/
```

Then run `npm run build` and deploy `dist/`. The browser Maps key can remain in your local `.env`. During production builds, `.env.production` overrides matching values in `.env`.

Use `/` only when that reverse proxy exists. `npm run preview` does not provide the production API reverse proxy; for a standalone local preview, build with a reachable backend URL instead.

Do not deploy a public frontend with `127.0.0.1:8000` as its API URL: it points to each visitor's own computer. Neither `npm run dev` nor `npm run preview` is the production web server.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Address search fails | Backend and PostgreSQL are running; API URL is correct; backend CORS allows the frontend origin. |
| Address search has no matches | Address data has been imported; try another building name or address. |
| Find my home is disabled | Select a dropdown option, enter a positive whole-number budget, and wait for any current request to finish. |
| No rentals are returned | Rental data exists, the budget covers available listings, and routes are available. |
| Recommendations fail or time out | Check backend logs and its Google Routes API key, billing, and quota. The frontend recommendation timeout is two minutes. |
| Map reports a missing key | Fill `VITE_GOOGLE_MAPS_API_KEY`, then restart dev or rebuild production files. |
| Google Maps displays an error | Read the specific error in the browser console; check Maps JavaScript API, billing, and website restrictions. |
| Environment changes have no effect | Restart Vite or rebuild production files. Check overriding `.env.local`, `.env.production`, or shell variables. |
| Large chunk warning during build | A bundle-size warning alone is not a build failure; check whether the command completed successfully. |

## Prototype limitations

- Listings are historical snapshots; current availability is not verified.
- Commutes target arrival by 9:30 AM on the next weekday selected by the backend. There is no arrival-time picker or public-holiday adjustment.
- Monthly transport estimates assume 22 return commutes and equal fares in both directions.
- Carbon estimates use UK 2026 proxy factors, not measured Hong Kong route emissions. Monthly estimates assume the same outbound and return route.
- Lowest-emissions labels compare available estimates among returned homes, not every possible home or route.
- Map bounds approximate Hong Kong with a rectangle rather than its exact administrative boundary.

References: [Vite environment variables](https://vite.dev/guide/env-and-mode), [Google Maps API key guidance](https://developers.google.com/maps/api-security-best-practices).

## DeepSeek AI picks

Use the backend `add_recommand` branch to enable AI picks. The search form sends
`include_ai`, optional `preferences` (up to 1,000 characters), and
`ai_recommendation_count` (1 or 2) to `POST /api/recommendations`.

The results panel shows `data.ai.recommendations` above the complete rental list,
matching each pick by `rental_id`. Clicking a pick selects its map and commute
route. Reasons and tradeoffs currently come from the backend in simplified
Chinese and are rendered as plain text. Sorting still applies to the full list.
Changes to AI options invalidate the displayed results until a new search.

When AI is unavailable, unconfigured, or absent on an older backend, users can
still compare all rental results. Turning off AI skips the recommendation call
on the backend. The HTTP timeout allows 180 seconds for route calculation plus
AI generation; there are no automatic retries.

Configure `DEEPSEEK_API_KEY` only in the **backend** environment. No DeepSeek key
belongs in frontend `.env` or `VITE_*` variables. The frontend continues to use
`VITE_API_BASE_URL` and its separate browser Google Maps key.

### Comparison panel

The route area now includes a side-by-side comparison of up to three homes,
backend-computed differences, per-home AI analyses, and an overall recommendation.
Users can expand “Choose homes to compare”, select 2–3 homes from the full result set, then
click “Compare selected homes with AI”. This explicitly calls the AI comparison endpoint, even
if AI was disabled on the original search. Updated comparisons recalculate
routes; they may take time and consume Routes/DeepSeek API usage.

Changing the selection hides stale analysis. The table remains usable if AI
fails; unknown values are shown as unknown. Explanations are rendered as plain
text. The first selected column is the reference for signed differences.

The comparison panel and its AI conclusion, strengths, tradeoffs and suitability
analysis are in English, including when user preferences are entered in Chinese.
Listing titles retain their original source language.

### Property details and on-demand assessment

The search results page is now compact. Open `#/homes/<rental_id>` via **View
details** for property facts, English AI assessment, comparisons and commute
steps. Browser Back preserves the current search while the app stays mounted.
A refreshed detail link loads property facts directly; session storage retains
only the last search request for optional personalized analysis. Without that
context, a direct link still works and prompts the user to search first.

The homepage no longer renders full AI reasons or the comparison table.
Comparison and individual analysis are generated on request in the details page.
Original listing titles/descriptions retain their source language. Unknown
bedrooms or area are not guessed, and zero bedrooms is displayed as Studio.
