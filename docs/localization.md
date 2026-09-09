## Localization

The application currently supports:

- English
- Russian
- Ukrainian
- German
- French
- Spanish
- Polish
- Portuguese
- Simplified Chinese
- Korean
- Japanese
- Cat 🐈

Translation data is stored once under:

```text
locales/
```

The **same locale JSON files are used by both desktop and mobile interfaces**. Mobile translations are not duplicated.

The application automatically selects a language based on the user's browser/system locale. If the user manually selects another language, that preference is stored under the shared `wardogs-language` localStorage key and takes priority on future visits.

Because desktop and mobile are served from the same origin, a language selected in one interface is immediately available to the other.

## Localized URLs

Desktop pages:

```text
/
├── ru/
├── uk/
├── de/
├── fr/
├── es/
├── pl/
├── pt/
├── zh-cn/
├── ko/
├── ja/
└── cat/
```

Mobile pages:

```text
/mobile/
├── ru/
├── uk/
├── de/
├── fr/
├── es/
├── pl/
├── pt/
├── zh-cn/
├── ko/
├── ja/
└── cat/
```

Route pattern:

```text
https://wardogs-artillery.com/<locale>/
https://wardogs-artillery.com/mobile/<locale>/
```

Localized map landing routes use the same locale segment:

```text
https://wardogs-artillery.com/maps/<map-id>/
https://wardogs-artillery.com/<locale>/maps/<map-id>/
```

Changing language from the mobile UI keeps the user inside `/mobile/`. Changing language from the desktop UI keeps the user on the desktop routes.

Automatic device routing preserves every explicit language route:

```text
/<locale>/ -> /mobile/<locale>/
```

The root entry (`/` or `/mobile/`) may still use the browser/system locale automatically when there is no saved manual preference.

## SEO localization

Normal localized desktop pages are search-indexable. The locale synchronization step keeps the following metadata aligned with `locales/index.json`:

- canonical URL;
- `hreflang` alternates and `x-default`;
- Open Graph locale and alternate locales;
- sitemap routes and `lastmod`;
- localized title and description;
- localized WebApplication structured data;
- locale-specific landing content and FAQ structured data when configured.

Desktop locale routes use the same build path and shared locale JSON. Every indexable desktop locale has a source shell under `src/pages/locales/` and receives the same SEO/metadata synchronization during production builds.

Mobile locale routes share the matching desktop canonical URL. The Cat localization remains excluded from normal search indexing.

Map landing pages have complete, server-rendered HTML translations for every language in `locales/index.json`. Each indexable page has a self-referencing canonical URL and reciprocal `hreflang` links to the other reviewed translations plus English `x-default`. Both sitemap stages publish the same localized URL clusters. Cat map pages remain available from the language selector but use `noindex, follow` and are absent from sitemap and `hreflang`.

The landing-page selector navigates between real localized routes and stores the same `wardogs-language` preference as the calculator. It does not translate the page in JavaScript and does not redirect visitors automatically. A localized CTA opens the matching calculator route with `?map=<map-id>`.

## Build pipeline

The production build is:

```text
build-pages.mjs
  -> sync-locales.mjs
  -> version-assets.mjs
```

`sync-locales.mjs` synchronizes locale metadata, language tags and the sitemap for all routes before asset fingerprinting. It does not create locale-specific runtime patches.

## Localized Page Sources

Desktop locale shells live under:

```text
src/pages/locales/
```

All desktop locales, including Simplified Chinese, are built by the same `build-pages.mjs` path and use the canonical translation registry:

```text
locales/index.json
locales/<locale>.json
scripts/seo-content.mjs
scripts/map-landing-pages.mjs
scripts/map-landing-locales.mjs
```

The mobile interface uses one HTML template:

```text
src/pages/mobile/index.html
```

Language-specific mobile routes are generated automatically from `locales/index.json`.

Map landing markup is shared in `src/pages/maps/template.html`. English map-specific copy and source URLs are defined in `scripts/map-landing-pages.mjs`; all translated visible copy, metadata and FAQ text are defined in `scripts/map-landing-locales.mjs`. Add or remove a language through the locale registry and provide its complete map translation in the same change—the build fails instead of silently publishing English fallback copy.

## Map Tools localization

Map Tools use the shared locale JSON just like the rest of the application. Localized tool labels include **Ruler**, **Pencil**, **Eraser**, **Markers**, **Coordinate search**, **Layers**, import/export actions and the cursor-coordinate layer toggle.

Any new user-visible UI string should be added to every supported locale or intentionally fall back to English. Runtime strings use the same shared localization APIs/tables as the rest of the application; there is no locale-specific monkey-patch layer.
