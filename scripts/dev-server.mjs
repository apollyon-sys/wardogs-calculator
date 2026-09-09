import {
    createReadStream,
    statSync,
    watch
} from 'node:fs';
import {
    readFile,
    realpath,
    stat
} from 'node:fs/promises';
import {
    createServer
} from 'node:http';
import {
    isIP
} from 'node:net';
import {
    dirname,
    extname,
    join,
    normalize,
    resolve,
    sep
} from 'node:path';
import {
    fileURLToPath
} from 'node:url';
import {
    hasMapLandingLanguage,
    mapLandingPageById,
    renderMapLandingPage
} from './map-landing-pages.mjs';

const __dirname = dirname(
    fileURLToPath(import.meta.url)
);

const root = resolve(
    __dirname,
    '..'
);

const DEFAULT_HOST =
    '127.0.0.1';

const DEFAULT_PORT =
    8000;

const PUBLIC_STATIC_ROOT_FILES =
    new Set([
        '/style.css',
        '/mobile.css',
        '/robots.txt',
        '/sitemap.xml',
        '/favicon.ico'
    ]);

const PUBLIC_STATIC_PREFIXES = [
    '/assets/',
    '/config/',
    '/data/',
    '/js/',
    '/locales/',
    '/maps/',
    '/styles/'
];

function parseBooleanEnvironment(
    value,
    fallback
) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ''
    ) {
        return fallback;
    }

    const normalized =
        String(value)
            .trim()
            .toLowerCase();

    if (
        ['1', 'true', 'yes', 'on'].includes(
            normalized
        )
    ) {
        return true;
    }

    if (
        ['0', 'false', 'no', 'off'].includes(
            normalized
        )
    ) {
        return false;
    }

    throw new Error(
        `Invalid boolean environment value: ${value}`
    );
}

const DISABLE_DEV_ANALYTICS =
    parseBooleanEnvironment(
        process.env.WARDOGS_DISABLE_ANALYTICS,
        true
    );

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8'
};

const LIVE_RELOAD_CLIENT = `
<script data-wardogs-dev-reload>
(() => {
    const source = new EventSource('/__dev/reload');

    source.onmessage = event => {
        if (event.data === 'reload') {
            window.location.reload();
        }
    };
})();
</script>`;

function getArgument(name) {
    const args =
        process.argv.slice(2);

    const equalsPrefix =
        `${name}=`;

    for (
        let index = 0;
        index < args.length;
        index++
    ) {
        const argument =
            args[index];

        if (
            argument.startsWith(
                equalsPrefix
            )
        ) {
            return argument.slice(
                equalsPrefix.length
            );
        }

        if (
            argument === name
        ) {
            return args[index + 1];
        }
    }

    return null;
}

function resolveHost() {
    return (
        getArgument('--host') ||
        process.env.HOST ||
        DEFAULT_HOST
    );
}

function resolvePort() {
    const raw =
        getArgument('--port') ||
        process.env.PORT ||
        String(DEFAULT_PORT);

    const port =
        Number(raw);

    if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
    ) {
        throw new Error(
            `Invalid dev server port: ${raw}`
        );
    }

    return port;
}

async function exists(path) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

function directoryExists(path) {
    try {
        return statSync(path)
            .isDirectory();
    } catch {
        return false;
    }
}

function renderMobileLocale(
    template,
    language
) {
    const isDefault =
        language === 'en';

    const desktopCanonical =
        isDefault
            ? 'https://wardogs-artillery.com/'
            : `https://wardogs-artillery.com/${language}/`;

    const baseHref =
        isDefault
            ? '../'
            : '../../';

    return template
        .replace(
            '<html data-page-language="en" lang="en">',
            `<html data-page-language="${language}" lang="${language}">`
        )
        .replace(
            '<base href="../"/>',
            `<base href="${baseHref}"/>`
        )
        .replace(
            '<link href="https://wardogs-artillery.com/" rel="canonical"/>',
            `<link href="${desktopCanonical}" rel="canonical"/>`
        )
        .replace(
            'href="../?desktop=1"',
            `href="${desktopCanonical}?desktop=1"`
        );
}

async function getLanguageDefinitions() {
    const index =
        JSON.parse(
            await readFile(
                join(
                    root,
                    'locales',
                    'index.json'
                ),
                'utf8'
            )
        );

    const configured =
        Array.isArray(
            index.languages
        )
            ? index.languages
                .filter(item => item?.id && item?.file)
                .map(item => ({
                    ...item,
                    id: String(item.id).toLowerCase(),
                    hreflang: item.hreflang || item.id,
                    ogLocale: item.ogLocale || null,
                    indexable: item.indexable !== false
                }))
            : [];

    return configured;
}

async function getLanguages() {
    return new Set(
        (await getLanguageDefinitions())
            .map(definition => definition.id)
    );
}

function prepareDevHTML(html) {
    let prepared = html;

    if (DISABLE_DEV_ANALYTICS) {
        /*
         * Keep local development out of production analytics and tell
         * the application wrapper not to queue events while disabled.
         */
        prepared = prepared.replace(
            /\s*<script[^>]*src=["']https:\/\/cloud\.umami\.is\/script\.js["'][^>]*><\/script>/gi,
            ''
        );

        prepared = prepared.replace(
            '<head>',
            '<head>\n<script>window.__WARDOGS_ANALYTICS_DISABLED__ = true;</script>'
        );
    }

    if (prepared.includes('</body>')) {
        return prepared.replace(
            '</body>',
            `${LIVE_RELOAD_CLIENT}\n</body>`
        );
    }

    return (
        `${prepared}\n` +
        LIVE_RELOAD_CLIENT
    );
}

function sendText(
    response,
    statusCode,
    body,
    contentType =
        'text/plain; charset=utf-8'
) {
    response.writeHead(
        statusCode,
        {
            'Content-Type':
                contentType,

            'Cache-Control':
                'no-store, max-age=0',

            'X-Content-Type-Options':
                'nosniff',

            'Referrer-Policy':
                'no-referrer'
        }
    );

    response.end(body);
}

async function sendHTML(
    response,
    path,
    transform = null
) {
    let html =
        await readFile(
            path,
            'utf8'
        );

    if (transform) {
        html =
            transform(html);
    }

    sendText(
        response,
        200,
        prepareDevHTML(html),
        'text/html; charset=utf-8'
    );
}

function publicStaticPathname(pathname) {
    let decoded;

    try {
        decoded =
            decodeURIComponent(
                pathname
            );
    } catch {
        return null;
    }

    if (
        decoded.includes('\\') ||
        decoded.includes('\0')
    ) {
        return null;
    }

    const segments =
        decoded
            .split('/')
            .filter(Boolean);

    if (
        segments.some(
            segment =>
                segment === '.' ||
                segment === '..' ||
                segment.startsWith('.')
        )
    ) {
        return null;
    }

    const normalizedPathname =
        `/${segments.join('/')}`;

    if (
        !PUBLIC_STATIC_ROOT_FILES.has(
            normalizedPathname
        ) &&
        !PUBLIC_STATIC_PREFIXES.some(
            prefix =>
                normalizedPathname.startsWith(
                    prefix
                )
        )
    ) {
        return null;
    }

    return normalizedPathname;
}

function safeStaticPath(pathname) {
    const publicPathname =
        publicStaticPathname(
            pathname
        );

    if (!publicPathname) {
        return null;
    }

    const relative =
        normalize(
            publicPathname.replace(
                /^\/+/, 
                ''
            )
        );

    const absolute =
        resolve(
            root,
            relative
        );

    if (
        absolute !== root &&
        !absolute.startsWith(
            `${root}${sep}`
        )
    ) {
        return null;
    }

    return absolute;
}

async function sendStatic(
    response,
    pathname
) {
    const path =
        safeStaticPath(
            pathname
        );

    if (
        !path ||
        !(await exists(path))
    ) {
        return false;
    }

    const info =
        await stat(path);

    if (!info.isFile()) {
        return false;
    }

    const canonicalRoot =
        await realpath(root);

    const canonicalPath =
        await realpath(path);

    if (
        canonicalPath !== canonicalRoot &&
        !canonicalPath.startsWith(
            `${canonicalRoot}${sep}`
        )
    ) {
        return false;
    }

    const contentType =
        MIME_TYPES[
            extname(path)
                .toLowerCase()
        ] ||
        'application/octet-stream';

    response.writeHead(
        200,
        {
            'Content-Type':
                contentType,

            'Content-Length':
                info.size,

            'Cache-Control':
                'no-store, max-age=0',

            'X-Content-Type-Options':
                'nosniff',

            'Referrer-Policy':
                'no-referrer'
        }
    );

    createReadStream(path)
        .pipe(response);

    return true;
}

function requestHostAllowed(request) {
    const value =
        request.headers.host;

    if (!value) {
        return false;
    }

    try {
        const parsed =
            new URL(
                `http://${value}`
            );

        const hostname =
            parsed.hostname.replace(
                /^\[|\]$/g,
                ''
            );

        if (
            parsed.username ||
            parsed.password
        ) {
            return false;
        }

        if (
            parsed.port &&
            Number(parsed.port) !== port
        ) {
            return false;
        }

        const wildcard =
            host === '0.0.0.0' ||
            host === '::';

        if (wildcard) {
            return (
                hostname === 'localhost' ||
                Boolean(isIP(hostname))
            );
        }

        if (hostname === host) {
            return true;
        }

        return (
            hostname === 'localhost' &&
            ['127.0.0.1', '::1', 'localhost']
                .includes(host)
        );
    } catch {
        return false;
    }
}

const reloadClients =
    new Set();

function connectReloadClient(
    request,
    response
) {
    response.writeHead(
        200,
        {
            'Content-Type':
                'text/event-stream',

            'Cache-Control':
                'no-cache, no-transform',

            'Connection':
                'keep-alive'
        }
    );

    response.write(
        'retry: 500\n'
    );

    response.write(
        'data: connected\n\n'
    );

    reloadClients.add(
        response
    );

    request.on(
        'close',
        () => {
            reloadClients.delete(
                response
            );
        }
    );
}

let reloadTimer =
    null;

function queueReload(changedPath) {
    clearTimeout(
        reloadTimer
    );

    reloadTimer =
        setTimeout(
            () => {
                console.log(
                    `[reload] ${changedPath}`
                );

                for (
                    const client
                    of reloadClients
                ) {
                    client.write(
                        'data: reload\n\n'
                    );
                }
            },
            80
        );
}

function watchDirectory(
    relativePath,
    recursive = true
) {
    const target =
        join(
            root,
            relativePath
        );

    if (
        !directoryExists(target)
    ) {
        return null;
    }

    try {
        return watch(
            target,
            { recursive },
            (
                _eventType,
                filename
            ) => {
                const changed =
                    filename
                        ? `${relativePath}/${filename}`
                        : relativePath;

                queueReload(
                    changed.replaceAll(
                        '\\',
                        '/'
                    )
                );
            }
        );
    } catch (error) {
        console.warn(
            `[dev] Unable to watch ${relativePath}: ${error.message}`
        );

        return null;
    }
}

function watchRootFiles() {
    const watched =
        new Set([
            'style.css',
            'mobile.css'
        ]);

    try {
        return watch(
            root,
            {
                recursive: false
            },
            (
                _eventType,
                filename
            ) => {
                if (
                    filename &&
                    watched.has(
                        filename.toString()
                    )
                ) {
                    queueReload(
                        filename.toString()
                    );
                }
            }
        );
    } catch (error) {
        console.warn(
            `[dev] Unable to watch root CSS entry points: ${error.message}`
        );

        return null;
    }
}

async function createRequestHandler() {
    const mobileTemplatePath =
        join(
            root,
            'src',
            'pages',
            'mobile',
            'index.html'
        );

    const mapTemplatePath =
        join(
            root,
            'src',
            'pages',
            'maps',
            'template.html'
        );

    return async (
        request,
        response
    ) => {
        try {
            if (!requestHostAllowed(request)) {
                sendText(
                    response,
                    403,
                    'Forbidden host.'
                );

                return;
            }

            if (request.method !== 'GET') {
                sendText(
                    response,
                    405,
                    'Method not allowed.'
                );

                return;
            }

            const url =
                new URL(
                    request.url,
                    'http://localhost'
                );

            const pathname =
                url.pathname;

            if (
                pathname ===
                '/__dev/reload'
            ) {
                connectReloadClient(
                    request,
                    response
                );

                return;
            }

            if (
                pathname === '/' ||
                pathname === '/index.html'
            ) {
                await sendHTML(
                    response,
                    join(
                        root,
                        'src',
                        'pages',
                        'index.html'
                    )
                );

                return;
            }

            const mapLandingMatch =
                pathname.match(
                    /^\/(?:(?<language>[a-z-]+)\/)?maps\/(?<map>[a-z0-9-]+)(?:\/index\.html)?\/?$/i
                );

            if (mapLandingMatch) {
                const language = (mapLandingMatch.groups.language || 'en')
                    .toLowerCase();
                const mapId = mapLandingMatch.groups.map.toLowerCase();
                const definitions = await getLanguageDefinitions();
                const definition = definitions.find(item => item.id === language);
                const page = definition && hasMapLandingLanguage(language)
                    ? mapLandingPageById(mapId, language)
                    : null;

                if (page) {
                    await sendHTML(
                        response,
                        mapTemplatePath,
                        template =>
                            renderMapLandingPage(
                                template,
                                page,
                                {
                                    languageDefinition: definition,
                                    languages: definitions
                                }
                            )
                    );

                    return;
                }
            }

            const mobileMatch =
                pathname.match(
                    /^\/mobile(?:\/([a-z-]+))?\/?$/i
                );

            const mobileIndexMatch =
                pathname.match(
                    /^\/mobile(?:\/([a-z-]+))?\/index\.html$/i
                );

            const matchedMobileRoute =
                mobileMatch ||
                mobileIndexMatch;

            if (matchedMobileRoute) {
                const language =
                    matchedMobileRoute[1] ||
                    'en';

                const languages =
                    await getLanguages();

                if (
                    !languages.has(
                        language
                    )
                ) {
                    sendText(
                        response,
                        404,
                        'Unknown mobile language.'
                    );

                    return;
                }

                await sendHTML(
                    response,
                    mobileTemplatePath,
                    template =>
                        renderMobileLocale(
                            template,
                            language
                        )
                );

                return;
            }

            const desktopMatch =
                pathname.match(
                    /^\/([a-z-]+)(?:\/index\.html)?\/?$/i
                );

            if (desktopMatch) {
                const language =
                    desktopMatch[1];

                const languages =
                    await getLanguages();

                if (
                    language !== 'en' &&
                    languages.has(language)
                ) {
                    const localePath =
                        join(
                            root,
                            'src',
                            'pages',
                            'locales',
                            `${language}.html`
                        );

                    if (
                        await exists(
                            localePath
                        )
                    ) {
                        await sendHTML(
                            response,
                            localePath
                        );

                        return;
                    }
                }
            }

            if (
                await sendStatic(
                    response,
                    pathname
                )
            ) {
                return;
            }

            sendText(
                response,
                404,
                'Not found.'
            );
        } catch (error) {
            console.error(error);

            sendText(
                response,
                500,
                'Development server error.'
            );
        }
    };
}

const host =
    resolveHost();

const port =
    resolvePort();

const requestHandler =
    await createRequestHandler();

const server =
    createServer(
        requestHandler
    );

const watchers = [
    watchDirectory('js'),
    watchDirectory('styles'),
    watchDirectory('src/pages'),
    watchDirectory('locales'),
    watchDirectory('config'),
    watchDirectory('data'),
    watchDirectory('assets'),

    /*
     * Watch only the top-level map config directory.
     * The huge tile pyramid is intentionally not watched.
     * Tile files are still served directly from disk and are visible
     * immediately after a manual page refresh.
     */
    watchDirectory(
        'maps',
        false
    ),

    watchRootFiles()
].filter(Boolean);

function shutdown() {
    for (
        const watcher
        of watchers
    ) {
        watcher.close();
    }

    for (
        const client
        of reloadClients
    ) {
        client.end();
    }

    server.close(
        () => process.exit(0)
    );
}

process.on(
    'SIGINT',
    shutdown
);

process.on(
    'SIGTERM',
    shutdown
);

server.listen(
    port,
    host,
    () => {
        const displayHost =
            host === '0.0.0.0'
                ? 'localhost'
                : host;

        console.log('');
        console.log(
            'WARDOGS development server'
        );
        console.log(
            `Desktop: http://${displayHost}:${port}/`
        );
        console.log(
            `Mobile:  http://${displayHost}:${port}/mobile/`
        );
        console.log('');
        console.log(
            DISABLE_DEV_ANALYTICS
                ? 'Live reload enabled. Production Umami analytics disabled.'
                : 'Live reload enabled. Production Umami analytics ENABLED for this dev session.'
        );
        console.log(
            'Map tiles are served directly and are not watched for changes.'
        );
        console.log(
            'Press Ctrl+C to stop.'
        );
        console.log('');
    }
);
