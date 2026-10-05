# Asset delivery

WARDOGS Artillery Calculator loads map tiles and Terrain3D data through a
separate asset service. The service is operated for the official application
and is not a public mirror or general-purpose asset API.

## Usage policy

The project source code and the separately hosted game assets have different
usage constraints. Access to the source repository does not grant permission
to bypass CDN controls, hotlink the production asset service, mirror it with an
automated downloader, or use it as a build dependency for another project.

Independent tools and forks should obtain any required game data independently
and serve it from infrastructure controlled by their maintainers. Do not point
third-party applications, Docker images, installers or preparation scripts at
the production WARDOGS asset domains.

WARDOGS game content remains the property of its respective rights holders,
including BULKHEAD. This repository does not grant additional rights to extract,
redistribute or republish game assets.

See [CDN and hosted assets](cdn.md) for the repository-wide asset policy.

## Architecture overview

The official browser client obtains temporary access before loading protected
resources. Requests are validated and cached at the edge, and automated traffic
controls protect the service from hotlinking, excessive traversal and bulk
retrieval. Exact production rules and operational thresholds are intentionally
maintained outside the public repository.

These controls reduce infrastructure abuse; they do not make resources already
displayed in a user's browser confidential.

The browser integration lives in `js/core/asset-access.js`. Public client
configuration lives in `config/app.json`. Server-side implementation is under
`assets-gateway/`.

The client can recover temporary access after a connection change and resume
loading without a page reload. Browser compatibility differences alone are not
treated as proof of automated downloading. Usage controls remain enforced when
access is renewed.

## Development

Install and run the gateway unit tests from the repository root:

```powershell
npm --prefix assets-gateway ci
npm run test:assets-gateway
```

Run the complete application verification before submitting changes:

```powershell
npm run check
```

Local development settings belong in `assets-gateway/.dev.vars`, which is
ignored by Git. Never commit production secrets, session material, private
deployment configuration, cookies, challenge responses or CDN credentials.

Production deployment, edge rules, rate thresholds, monitoring signatures and
incident procedures are maintained in a private operator runbook. Contributors
do not need them to build or test the application.

## Privacy and logging

The asset service may temporarily process request metadata required for
authentication, reliability and abuse prevention. Security events use derived
or shortened identifiers where practical. Session cookies, validation tokens,
request bodies and secrets must never be written to application logs.

Client diagnostics distinguish access failures from the first successful map
tile load. These events contain coarse error codes and loading stages, not
session material, player coordinates or raw server responses.

## Expected responses

| Status | Meaning |
| ---: | --- |
| `200` | Asset delivered |
| `201` | Temporary browser access created |
| `400` | Unsupported request shape |
| `401` | Valid access is required |
| `403` | Request validation failed |
| `404` | Resource is unavailable |
| `429` | Request temporarily limited |
| `503` | Service is temporarily unavailable |

## Security reports

Report suspected bypasses, leaked credentials or infrastructure weaknesses
privately through the repository's GitHub Security reporting interface. Do not
publish reproduction details, production indicators or working bypass scripts
in a public issue.
