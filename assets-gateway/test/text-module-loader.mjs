import { readFile } from 'node:fs/promises';

const privateMenu = new URL('../private/developer-menu.txt', import.meta.url).href;

// Node's tests load the same Text module that Wrangler embeds in the Worker.
export async function load(url, context, nextLoad) {
    if (url !== privateMenu) return nextLoad(url, context);
    return {
        format: 'module',
        source: `export default ${JSON.stringify(await readFile(new URL(url), 'utf8'))};`,
        shortCircuit: true
    };
}
