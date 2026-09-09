## Project Structure

For the optional Cloudflare collaborative-room service, see [Collaborative lobbies](lobbies.md).

```text
wardogs-calculator/
├── .github/workflows/pages.yml
├── assets/
│   ├── flags/
│   ├── map-markers/
│   ├── favicon.png
│   └── preview.png
├── config/
├── data/
│   ├── ballistics/
│   └── terrain/
├── js/
│   ├── core/
│   ├── features/
│   ├── map/
│   ├── mobile/
│   ├── map-landing-language.js
│   └── ui/
├── locales/
│   ├── index.json
│   └── *.json
├── maps/
├── scripts/
│   ├── build-pages.mjs
│   ├── build-contours.mjs
│   ├── sync-locales.mjs
│   ├── seo-content.mjs
│   ├── map-landing-pages.mjs
│   ├── map-landing-locales.mjs
│   ├── version-assets.mjs
│   └── dev-server.mjs
├── src/pages/
│   └── maps/template.html
├── styles/
│   └── map-landing.css
├── package.json
├── style.css
├── mobile.css
├── robots.txt
├── CNAME
├── LICENSE
└── README.md
```

`dist/` is generated during the build process and is not committed to the repository.

CSS source is split into focused modules under `styles/desktop/` and `styles/mobile/`. The root `style.css` and `mobile.css` files are development entry points; production receives bundled `dist/style.css` and `dist/mobile.css`.

The application intentionally uses no frontend framework. Runtime code is HTML5, modular CSS, Vanilla JavaScript, Canvas, Pointer Events, Fetch API, JSON and browser storage. Node.js is used only for build/development scripts.

## Running Locally

The project must be served over HTTP because maps, configuration, locales, Terrain3D and other resources are loaded with `fetch()`.

### Development server

```bash
npm run dev
```

Open `http://localhost:8000/`. Map imagery and Terrain3D elevation load from the R2 custom domain, so an
Internet connection and an R2 CORS rule allowing this exact origin are required.
If you use `http://127.0.0.1:8000` or a LAN address, allow that origin as well.
See [Tile hosting](maps.md#tile-hosting) and
[Terrain3D hosting](terrain.md#terrain3d-hosting) for asset paths and releases.

Production analytics are disabled by default in the development server. Set `WARDOGS_DISABLE_ANALYTICS=false` only when explicitly testing the Umami integration. See [Analytics](analytics.md#development-analytics-switch) for the full local-testing behavior.

The lightweight map landing pages are available from the source server at `/maps/bakurani/`, `/maps/ozeti/` and `/maps/zestafona/`, with translated variants such as `/ru/maps/bakurani/` and `/zh-cn/maps/zestafona/`. Restart the server after editing `scripts/map-landing-pages.mjs` or `scripts/map-landing-locales.mjs`; template, selector JavaScript and CSS edits continue to use live reload.

To test on another device:

```bash
npm run dev -- --host 0.0.0.0
```

The source dev server continues to serve legacy static desktop locale shells. **Generated production locale routes should be validated from a production build**, because their route files and SEO metadata are intentionally created by the locale synchronization step.

### Production build

Before committing or deploying, run:

```bash
npm run build
```

The build pipeline is:

```text
scripts/build-pages.mjs
        ↓
scripts/sync-locales.mjs
        ↓
scripts/version-assets.mjs
```

Responsibilities:

1. `build-pages.mjs`
   - clears `dist/`;
   - copies shared assets, JS, locales, map JSON, config and data;
   - excludes `maps/tiles/` because map imagery is served from R2;
   - excludes `data/terrain/**/*.bin` because terrain binaries are served from R2;
   - keeps local terrain manifests and generated contours;
   - bundles desktop/mobile CSS;
   - creates the normal desktop routes;
   - creates lightweight English and localized map landing routes from the shared template and reviewed content registries;
   - creates mobile locale routes from `locales/index.json`.
2. `sync-locales.mjs`
   - creates or synchronizes generated locale routes from the canonical page shells and locale registry;
   - synchronizes canonical, `hreflang`, Open Graph locale metadata and sitemap data from the locale registry;
   - applies locale-specific SEO content and structured data when configured;
   - localizes generated mobile-route metadata;
   - injects the shared locale runtime override before the app initializes.
3. `version-assets.mjs`
   - fingerprints the final JS/CSS assets, including the map landing stylesheet, and updates every generated HTML route.

The final artifact includes:

```text
dist/
├── index.html
├── <locale>/
│   └── index.html
├── maps/
│   ├── bakurani/index.html
│   ├── ozeti/index.html
│   └── zestafona/index.html
├── <locale>/maps/
│   ├── bakurani/index.html
│   ├── ozeti/index.html
│   └── zestafona/index.html
├── mobile/
│   ├── index.html
│   └── <locale>/
│       └── index.html
├── assets/
├── js/
├── locales/
├── maps/
├── config/
├── data/
└── sitemap.xml
```

Map tiles and Terrain3D chunks are loaded from `assets.wardogs-artillery.com`
and are absent from `dist/`. The shared terrain registry points at versioned
R2 manifests; chunk URLs resolve relative to each remote manifest. Local
manifest copies and `contours.json` remain in `dist/data/terrain/`.

Before deploying, finish and verify both the tile and terrain uploads. Every
registered terrain map, including locally added maps such as Zestafona, needs a
remote `terrainManifest` URL once its binaries are excluded from the build.

### Localized route validation

After `npm run build`, serve `dist/` and verify:

```text
http://localhost:8000/<locale>/
http://localhost:8000/mobile/<locale>/
http://localhost:8000/<locale>/maps/<map-id>/
```

Repeat the check for every supported locale. Check the UI, language selector, flag, weapon naming, mobile menu, footer/legal copy, Terrain3D status and SPH-2 warning. Inspect generated HTML to confirm:

```text
lang matches the locale registry
canonical points to the matching desktop route
hreflang matches the locale registry
og:locale matches the locale registry
locale-specific JSON-LD is present when configured
```

Also confirm `dist/sitemap.xml` contains every indexable desktop locale and that each indexable route advertises all registered alternates.

For map landing pages, `npm run test:build` checks every language/map combination, unique metadata, self-referencing canonical URLs, reciprocal `hreflang`, crawlable translated copy, language navigation, internal links, sitemap inclusion or exclusion, structured data, lightweight resource loading and the validated localized `?map=` calculator handoff.

## Terrain3D verification

Terrain3D remains a release resource and should be verified independently of localization work. The public safety contract remains:

```text
Terrain3D available   -> show elevation / ΔZ context
Terrain3D unavailable -> keep normal firing solution
MIL                   -> existing firing tables remain authoritative
```

Localization changes must not change the terrain calibration, firing tables, release safety flags, or automatic-correction behavior.

## Development Workflow

```text
npm run dev
    ↓
Edit shared source / locale JSON
    ↓
Browser reloads automatically for normal source routes
    ↓
npm run build
    ↓
Validate generated locale routes + SEO
    ↓
verify Terrain3D if terrain/release data changed
    ↓
Deploy
```

## Deployment

Production:

```text
https://wardogs-artillery.com/
https://wardogs-artillery.com/mobile/
https://wardogs-artillery.com/<locale>/
https://wardogs-artillery.com/mobile/<locale>/
```

GitHub Actions runs `npm run build`, uploads the single `dist/` artifact and
deploys it to GitHub Pages at `wardogs-artillery.com`. Map imagery and Terrain3D
manifests/binaries are published separately to R2 and served through
`assets.wardogs-artillery.com`; deploying the site does not upload them. Verify
the complete asset release before deploying registry URLs that reference it.

Do not manually edit files inside `dist/`; they are regenerated on every build.
