# WARDOGS Artillery Calculator

[![Live App](https://img.shields.io/badge/Live-wardogs--artillery.com-d7a452?style=flat-square)](https://wardogs-artillery.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=flat-square&logo=github)](https://pages.github.com/)

A lightweight, open-source artillery calculator and tactical map tool for **WARDOGS**.

**Live app:** https://wardogs-artillery.com/  
**Mobile UI:** https://wardogs-artillery.com/mobile/  

<table>
  <tr>
    <th width="72%">Desktop</th>
    <th width="28%">Mobile</th>
  </tr>
  <tr>
    <td align="center">
      <img src="assets/preview.png" alt="WARDOGS Artillery Calculator — Desktop">
    </td>
    <td align="center">
      <img src="assets/preview_mobile.png" alt="WARDOGS Artillery Calculator — Mobile">
    </td>
  </tr>
</table>

---

## Interfaces

The project ships two interfaces from the same repository and GitHub Pages deployment:

- **Desktop** — `/`
- **Mobile** — `/mobile/`

Phones are automatically routed from the desktop entry pages to the matching mobile route. The mobile UI is a separate map-first interface with touch panning, pinch zoom, touch-friendly point placement, Map Tools, and a bottom-sheet calculator.

Both interfaces reuse the same calculator logic, maps, tile pyramid, configuration, translations, saved targets, drawings, and browser storage.

## Localization

The shared locale system supports English, Russian, Ukrainian, German, French, Spanish, Polish, Portuguese, Simplified Chinese, Korean, Japanese, and the non-indexed Cat locale.

## Documentation

Detailed documentation is split into focused files to keep this README concise.

- [Features & weapons](docs/features.md) — calculator features, Map Tools, weapons, touch controls, and coordinate system
- [Maps](docs/maps.md) — map configuration, tile structure, bounds, marker zoom visibility, and adding new maps
- [Mobile interface](docs/mobile.md) — mobile routes, automatic routing, touch controls, and deployment architecture
- [Localization](docs/localization.md) — supported languages, shared translations, automatic language selection, localized URLs, and SEO metadata
- [Development](docs/development.md) — project structure, local development, unified build process, and GitHub Pages deployment
- [Analytics](docs/analytics.md) — Umami custom events, event payloads, debouncing, and privacy considerations
- [Message of the Day](docs/motd.md) — MOTD configuration, localization, and behavior
- [Contributing](docs/contributing.md) — contribution guidelines
- [License & Disclaimer](docs/legal.md) — MIT scope, third-party assets, and project disclaimer

## Quick Start

```bash
npm run build
cd dist
python -m http.server 8000
```

Then open:

```text
Desktop:            http://localhost:8000/
Mobile:             http://localhost:8000/mobile/
```

## Contributing

Corrections, map data improvements, localization updates, bug fixes, and QoL improvements are welcome.

See [Contributing](docs/contributing.md) for details.

## License

Original project source code is licensed under the [MIT License](LICENSE).

WARDOGS assets and other third-party materials are not covered by the MIT License. See [License & Disclaimer](docs/legal.md) for details.
