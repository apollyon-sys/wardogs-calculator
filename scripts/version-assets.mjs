import { createHash } from 'node:crypto';
import {
    readFile,
    readdir,
    writeFile
} from 'node:fs/promises';
import {
    dirname,
    join,
    relative,
    resolve
} from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(
    fileURLToPath(
        import.meta.url
    )
);

const root = resolve(
    __dirname,
    '..'
);

const dist = join(
    root,
    'dist'
);

const UMAMI_PRODUCTION_DOMAIN =
    'wardogs-artillery.com';

async function listFilesRecursive(directory) {
    const entries = await readdir(
        directory,
        {
            withFileTypes: true
        }
    );

    const files = [];

    for (const entry of entries) {
        const path = join(
            directory,
            entry.name
        );

        if (entry.isDirectory()) {
            files.push(
                ...await listFilesRecursive(
                    path
                )
            );
            continue;
        }

        if (entry.isFile()) {
            files.push(
                path
            );
        }
    }

    return files;
}

function normalizeAssetPath(url) {
    const withoutFragment =
        url.split('#', 1)[0];

    const withoutQuery =
        withoutFragment.split('?', 1)[0];

    return withoutQuery
        .replace(/^(?:\.\/)+/, '')
        .replace(/^(?:\.\.\/)+/, '')
        .replace(/^\/+/, '');
}

function isVersionedAsset(url) {
    const path =
        normalizeAssetPath(
            url
        );

    return (
        path === 'style.css' ||
        path === 'mobile.css' ||
        path.startsWith('js/')
    );
}

function addVersion(url, version) {
    if (
        !url ||
        /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(
            url
        ) ||
        !isVersionedAsset(url)
    ) {
        return url;
    }

    const hashIndex =
        url.indexOf('#');

    const fragment =
        hashIndex === -1
            ? ''
            : url.slice(
                hashIndex
            );

    const beforeFragment =
        hashIndex === -1
            ? url
            : url.slice(
                0,
                hashIndex
            );

    const queryIndex =
        beforeFragment.indexOf('?');

    const pathname =
        queryIndex === -1
            ? beforeFragment
            : beforeFragment.slice(
                0,
                queryIndex
            );

    const query =
        queryIndex === -1
            ? ''
            : beforeFragment.slice(
                queryIndex + 1
            );

    const params =
        new URLSearchParams(
            query
        );

    params.set(
        'v',
        version
    );

    return (
        pathname +
        '?' +
        params.toString() +
        fragment
    );
}

function versionHtml(
    html,
    version
) {
    return html.replace(
        /\b(src|href)="([^"]+)"/gi,
        (
            match,
            attribute,
            url
        ) => (
            `${attribute}="${addVersion(
                url,
                version
            )}"`
        )
    );
}

/*
 * Production analytics is configured at the final HTML build stage so every
 * generated desktop/mobile/localized page gets the exact same tracker policy.
 *
 * `data-domains` prevents an updated copy of the site from reporting to this
 * Umami website when served from localhost, GitHub Pages, a mirror, or a fork.
 *
 * `data-performance` enables Umami's real-user performance measurements.
 */
function configureProductionAnalytics(html) {
    return html.replace(
        /<script\b(?=[^>]*\bsrc=["']https:\/\/cloud\.umami\.is\/script\.js["'])[^>]*><\/script>/gi,
        tag => {
            let configured =
                tag
                    .replace(
                        /\sdata-domains=(["'])[^"']*\1/gi,
                        ''
                    )
                    .replace(
                        /\sdata-performance=(["'])[^"']*\1/gi,
                        ''
                    );

            configured =
                configured.replace(
                    /\ssrc=/i,
                    (
                        ` data-domains="${UMAMI_PRODUCTION_DOMAIN}"` +
                        ' data-performance="true" src='
                    )
                );

            return configured;
        }
    );
}

async function buildAssetFingerprint(
    files
) {
    const hash =
        createHash(
            'sha256'
        );

    for (
        const file of files
            .slice()
            .sort(
                (a, b) =>
                    relative(
                        dist,
                        a
                    ).localeCompare(
                        relative(
                            dist,
                            b
                        )
                    )
            )
    ) {
        hash.update(
            relative(
                dist,
                file
            ).replaceAll(
                '\\',
                '/'
            )
        );

        hash.update(
            '\0'
        );

        hash.update(
            await readFile(
                file
            )
        );

        hash.update(
            '\0'
        );
    }

    return hash
        .digest(
            'hex'
        )
        .slice(
            0,
            12
        );
}

const allFiles =
    await listFilesRecursive(
        dist
    );

const assetFiles =
    allFiles.filter(
        file => {
            const path =
                relative(
                    dist,
                    file
                ).replaceAll(
                    '\\',
                    '/'
                );

            return (
                path === 'style.css' ||
                path === 'mobile.css' ||
                (
                    path.startsWith(
                        'js/'
                    ) &&
                    path.endsWith(
                        '.js'
                    )
                )
            );
        }
    );

if (!assetFiles.length) {
    throw new Error(
        'No generated JS/CSS assets found in dist'
    );
}

const version =
    await buildAssetFingerprint(
        assetFiles
    );

const htmlFiles =
    allFiles.filter(
        file =>
            file
                .toLowerCase()
                .endsWith(
                    '.html'
                )
    );

let analyticsConfiguredPages = 0;

for (const file of htmlFiles) {
    const html =
        await readFile(
            file,
            'utf8'
        );

    const analyticsConfigured =
        configureProductionAnalytics(
            html
        );

    if (
        analyticsConfigured.includes(
            `data-domains="${UMAMI_PRODUCTION_DOMAIN}"`
        )
    ) {
        analyticsConfiguredPages++;
    }

    const versioned =
        versionHtml(
            analyticsConfigured,
            version
        );

    await writeFile(
        file,
        versioned,
        'utf8'
    );
}

console.log(
    `Versioned ${htmlFiles.length} HTML files with asset fingerprint ${version}`
);

console.log(
    `Configured production Umami analytics on ${analyticsConfiguredPages} HTML files`
);
