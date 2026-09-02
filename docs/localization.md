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

Examples:

```text
https://wardogs-artillery.com/zh-cn/
https://wardogs-artillery.com/mobile/zh-cn/
```

Changing language from the mobile UI keeps the user inside `/mobile/`. Changing language from the desktop UI keeps the user on the desktop routes.

Automatic device routing preserves explicit language routes:

```text
/de/     -> /mobile/de/
/zh-cn/  -> /mobile/zh-cn/
```

The root entry (`/` or `/mobile/`) may still use the browser/system locale automatically when there is no saved manual preference.

## SEO localization

Normal localized desktop pages are search-indexable. The locale synchronization step keeps the following metadata aligned with `locales/index.json`:

- canonical URL;
- `hreflang` alternates and `x-default`;
- Open Graph locale and alternate locales;
- sitemap routes and `lastmod`;
- localized Chinese title / description;
- Chinese WebApplication structured data;
- Chinese product-intent content and FAQ structured data.

The Chinese desktop route is generated from the canonical desktop shell during the build, then translated and enriched with Chinese SEO content. This avoids maintaining a separate copy of the full application HTML and prevents UI markup from drifting between English and Chinese.

Mobile locale routes share the matching desktop canonical URL. The Cat localization remains excluded from normal search indexing.

## Build pipeline

The production build is:

```text
build-pages.mjs
  -> sync-locales.mjs
  -> version-assets.mjs
```

`sync-locales.mjs` creates/synchronizes the Simplified Chinese routes, locale metadata, sitemap and shared locale-runtime override script before asset fingerprinting.

## Localized Page Sources

Existing legacy desktop locale shells remain under:

```text
src/pages/locales/
```

Simplified Chinese does **not** duplicate the full desktop shell there. Its production route is generated from `dist/index.html` by `scripts/sync-locales.mjs` using:

```text
locales/zh-cn.json
scripts/zh-cn-seo.mjs
```

The mobile interface still uses one HTML template:

```text
src/pages/mobile/index.html
```

Language-specific mobile routes are generated automatically from `locales/index.json`.

## Map Tools localization

Map Tools use the shared locale JSON just like the rest of the application. Localized tool labels include **Ruler**, **Pencil**, **Eraser**, **Markers**, **Coordinate search**, **Layers**, import/export actions and the cursor-coordinate layer toggle.

Any new user-visible UI string should be added to every supported locale or intentionally fall back to English. Chinese-specific runtime strings that live outside normal `data-i18n` nodes are centralized through `js/ui/locale-overrides.js` and `locales/zh-cn.json`.
