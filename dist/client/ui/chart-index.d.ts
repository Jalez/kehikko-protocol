/**
 * shadcn/ui's chart for every module (2.78.0): `kehikot-module-protocol/client/ui/chart`. Recharts is an
 * optional peer dependency, needed only by a module that imports this path. A module's Tailwind reads
 * this package's `dist/client` as a source (`@source`), as for `client/ui`.
 *
 * - `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`,
 *   `ChartStyle`, `ChartConfig`: shadcn's chart, unchanged.
 * - `useTip`, `showTip`, `hideTip`, `fromKeyboard`, `resetTips`, `TOUCH_MS`: one tooltip on the page at
 *   a time, hidden when the pointer leaves the frame, the window blurs or hides, the page scrolls or
 *   resizes, Escape is pressed or a press lands elsewhere — so a tooltip never sticks in a small
 *   container. Call `hideTip()` when the host says the page is not visible.
 */
export { ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent, type ChartConfig } from './chart.js';
export { TOUCH_MS, fromKeyboard, hideTip, resetTips, showTip, useTip } from './one-tip.js';
