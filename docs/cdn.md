## CDN & Hosted Assets

The official application loads map tiles and Terrain3D data from:

```text
https://assets.wardogs-artillery.com/
```

This CDN is privately operated and paid for by the WARDOGS Artillery Calculator maintainer. It is provided to run the official application at `https://wardogs-artillery.com/` and to support normal, human-scale local development of contributions intended for this repository.

### Source-code license and CDN access are separate

The repository's MIT License applies to covered source code. It does not grant a right to use project-operated hosting, bandwidth, storage, domains, or other infrastructure. It also does not license WARDOGS map imagery, terrain data, icons, or other third-party material described in [License & Disclaimer](legal.md).

A URL being visible in public source code, reachable over HTTPS, or requested by a browser does not make the CDN a public asset API or give permission to reuse, mirror, redistribute, or build another service on it.

### Permitted use

Without separate written permission, CDN access is limited to:

- normal use of the official application;
- reasonable browser-based local testing while contributing to this repository, using an origin explicitly allowed by the current CORS configuration;
- maintenance and release operations performed by the project maintainer.

### Uses that are not permitted

Do not use `assets.wardogs-artillery.com` as an asset source for a fork, independent deployment, desktop application, Docker image, build pipeline, proxy, mirror, scraper, downloader, archival job, or other third-party service.

In particular, do not:

- hotlink map tiles, Terrain3D manifests, or terrain chunks from another deployed application;
- proxy CDN requests through another server or route them through the official site;
- remove, forge, or work around `Origin`, `Referer`, CORS, WAF, rate-limit, or access-control checks;
- enumerate, bulk-download, cache-warm, mirror, package, or redistribute hosted assets;
- describe the source-code license as permission to use or redistribute separately hosted assets.

Automated access may be blocked or rate-limited. CDN paths, policies, and availability may change without compatibility guarantees for third-party consumers.

### Forks and self-hosted deployments

Forks and independent applications must obtain any assets they are legally entitled to use, host them on infrastructure controlled and paid for by their operator, and replace every official CDN URL in their map and Terrain3D configuration.

At minimum, review:

```text
maps/*.json
data/ballistics/terrain-context.json
```

Map tile paths should point to the fork operator's own tile pyramid. Terrain manifest URLs should point to the operator's own manifest and chunk storage. Removing a feature is preferable to silently falling back to the official CDN.

If you want to request another form of access, contact the maintainer before implementing or publishing it. Permission must be explicit and should not be inferred from repository visibility, previous technical access, or the MIT License.

### Production asset delivery

The official service uses automated access controls and edge caching to protect
project-funded infrastructure. Production rules, thresholds and incident
procedures are not part of the public documentation. See
[Asset delivery](assets-gateway.md) for contributor guidance and security
reporting.
