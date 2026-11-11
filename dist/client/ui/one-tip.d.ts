/**
 * One chart tooltip on the page at a time, and none once the pointer or the page has gone.
 *
 * Every chart that draws a tooltip asks here before showing it (`showTip`): showing one hides any
 * other. The page hides it whatever chart owns it when the pointer leaves the document (the frame),
 * the window loses focus or is hidden, the page scrolls or is resized, Escape is pressed, or a press
 * lands outside the chart. The host saying this page is off screen (`kehikot.visible` false) hides it
 * too, through `hideTip()` called where the host is read.
 *
 * Focus shows a tooltip only when it came from the keyboard (`fromKeyboard`): a click that focuses a
 * chart leaves no tooltip pinned once the pointer goes. A tap shows one for `TOUCH_MS`, or until a tap
 * elsewhere.
 */
export declare const TOUCH_MS = 4000;
/** Show `key`'s tooltip, hiding any other. `touch` hides it again after `TOUCH_MS`. */
export declare function showTip(key: symbol, el: Element | null, how?: {
    touch?: boolean;
    keyboard?: boolean;
}): void;
/** Hide `key`'s tooltip, or with no key whichever is shown. */
export declare function hideTip(key?: symbol): void;
/** Whether the last input was a key rather than a pointer: focus shows a tooltip only then. */
export declare const fromKeyboard: () => boolean;
/** For tests: nothing shown, the keyboard last. */
export declare function resetTips(): void;
/** A chart's own key, and whether its tooltip is the one shown. It is hidden when the chart goes. */
export declare function useTip(): {
    key: symbol;
    mine: boolean;
};
