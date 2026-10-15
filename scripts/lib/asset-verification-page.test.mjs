import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

const html = await readFile(new URL('../../assets-gateway/public/access-check.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('verification return page only navigates to the official origin and never forwards private query parameters', () => {
    for (const [path, expectedPath] of [
        ['/mobile/ru/?room=PRIVATE#private', '/mobile/ru/'],
        ['/zh-cn/', '/zh-cn/'],
        ['https://attacker.example/', '/'],
        ['//attacker.example/', '/'],
        ['https://user:password@wardogs-artillery.com/mobile/', '/'],
        ['javascript:alert(1)', '/']
    ]) {
        let destination;
        const link = {};
        vm.runInNewContext(script, {
            URL, URLSearchParams,
            document: { getElementById: () => link },
            window: { location: { hash: '#' + new URLSearchParams({ return: path }),
                replace: value => { destination = value; } } }
        });
        const url = new URL(destination);
        assert.equal(url.origin, 'https://wardogs-artillery.com');
        assert.equal(url.pathname, expectedPath);
        assert.equal(url.search, '');
        assert.equal(url.hash, '#asset-access-verified');
        assert.equal(link.href, destination);
    }
});

test('verification page is self-contained, non-indexable and its inline script matches CSP', () => {
    const hash = createHash('sha256').update(script).digest('base64');
    assert.ok(html.includes(`script-src 'sha256-${hash}'`));
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.doesNotMatch(html, /<script[^>]*\bsrc=|goatcounter|umami|document\.cookie/i);
});
