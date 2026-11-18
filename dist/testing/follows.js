/**
 * 2.105.0. The check for a module that follows the place (`reacts: ['parts']` or the space the canvas points
 * at): switching to a place with nothing in it must show nothing of the place before. Browser, Slides and
 * Editor each shipped showing the previous space's page, deck or tab after a switch; this is the one test
 * that makes the mistake fail for every module that follows the place. Node-only, and no DOM or test runner
 * is imported: the module says how to draw a place and how to read what is on screen as text.
 */
import { until } from './settle.js';
/** Run the check; every failure is listed. */
export async function followsPlace(options) {
    const failures = [];
    const passed = [];
    const check = (ok, what, why) => (ok ? passed.push(what) : failures.push(`${what}: ${why}`));
    const { marker } = options.filled;
    const shown = await options.render(options.filled.place);
    try {
        const sees = () => options.text(shown).includes(marker);
        const wait = { what: `${JSON.stringify(marker)} to show for the place that has it`, ...options.wait };
        let drawn = true;
        await until(sees, wait).catch(() => void (drawn = false));
        check(drawn, 'a place with content shows it', `${JSON.stringify(marker)} never showed, so the check could not tell what a switch leaves behind. Give \`filled.marker\` text the module shows for that place.`);
        if (!drawn)
            return { failures, passed };
        await options.switchTo(shown, options.empty);
        /* Give what the module does after a switch (a fetch, a save, an effect) the time it takes; a module that is slow to clear is still shown to clear. */
        let cleared = true;
        await until(() => !sees(), { ...wait, what: `${JSON.stringify(marker)} to leave once the place is empty`, within: options.wait?.within ?? 3_000 }).catch(() => void (cleared = false));
        check(cleared, 'switching to an empty place shows nothing of the place before', `${JSON.stringify(marker)}, from the place before, is still on screen in an empty place. The module keeps what it showed when the place changed: key its state by the place and show the empty state when the place has nothing.`);
        await options.switchTo(shown, options.filled.place);
        let back = true;
        await until(sees, wait).catch(() => void (back = false));
        check(back, 'switching back shows the place’s content again', `${JSON.stringify(marker)} did not come back after switching back to the place that has it.`);
    }
    finally {
        await options.dispose?.(shown);
    }
    return { failures, passed };
}
/** `followsPlace`, throwing one error that lists every failure. For a test. */
export async function expectFollowsPlace(options) {
    const said = await followsPlace(options);
    if (said.failures.length)
        throw new Error(`The module does not follow the place:\n- ${said.failures.join('\n- ')}`);
}
