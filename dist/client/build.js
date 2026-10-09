import { BUILD_ELEMENT, readBuild } from '../build.js';
/** The build printed into this page by the server that served it, or null when there is none. */
export function pageBuild() {
    if (typeof document === 'undefined')
        return null;
    const text = document.getElementById(BUILD_ELEMENT)?.textContent;
    if (!text)
        return null;
    try {
        return readBuild(JSON.parse(text));
    }
    catch {
        return null;
    }
}
