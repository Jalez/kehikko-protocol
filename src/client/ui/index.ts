/**
 * shadcn/ui components, vendored once for every module (2.72.0): the standard new-york sources on
 * Radix primitives, the same class names and CSS variables a module's own `components/ui` uses,
 * so a protocol component looks like the module's. A module's Tailwind reads this package's
 * `dist/client` as a source (`@source`), and its theme (`--primary`, `--border`, `--ring`…) is the
 * theme they draw with. `kehikot-module-protocol/client/proposals` is built from them.
 */

export { cn } from './utils.js'
export { Button, buttonVariants } from './button.js'
export { Badge, badgeVariants } from './badge.js'
export { Textarea } from './textarea.js'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js'
export { ScrollArea, ScrollBar } from './scroll-area.js'
export { Separator } from './separator.js'
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible.js'
