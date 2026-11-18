/**
 * 2.105.0. The check for a module that follows the place (`reacts: ['parts']` or the space the canvas points
 * at): switching to a place with nothing in it must show nothing of the place before. Browser, Slides and
 * Editor each shipped showing the previous space's page, deck or tab after a switch; this is the one test
 * that makes the mistake fail for every module that follows the place. Node-only, and no DOM or test runner
 * is imported: the module says how to draw a place and how to read what is on screen as text.
 */
import { type WaitOptions } from './settle.js';
export interface FollowsPlace<Place, Shown> {
    /** Draw the module for `place` (a mounted page, a handle to a started server): the thing `switchTo` moves. */
    render: (place: Place) => Shown | Promise<Shown>;
    /** Move the same drawn module to `place`, the way the canvas does (the host's place changes; the page is not reloaded). */
    switchTo: (shown: Shown, place: Place) => void | Promise<void>;
    /** Everything the person can see of the module, as text (`document.body.textContent`, a list of tab names, a deck title). */
    text: (shown: Shown) => string;
    /** A place that has content, and a string that is on screen only because of it (a page's address, a deck's title, a file name). */
    filled: {
        place: Place;
        marker: string;
    };
    /** A place with nothing in it: no page, no deck, no file. */
    empty: Place;
    /** Undraw it. */
    dispose?: (shown: Shown) => void | Promise<void>;
    wait?: WaitOptions;
}
export interface FollowsPlaceResult {
    failures: string[];
    passed: string[];
}
/** Run the check; every failure is listed. */
export declare function followsPlace<Place, Shown>(options: FollowsPlace<Place, Shown>): Promise<FollowsPlaceResult>;
/** `followsPlace`, throwing one error that lists every failure. For a test. */
export declare function expectFollowsPlace<Place, Shown>(options: FollowsPlace<Place, Shown>): Promise<void>;
