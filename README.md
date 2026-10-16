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
