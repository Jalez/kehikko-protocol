import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/** shadcn's own class joiner: `clsx` for the conditionals, `tailwind-merge` so a later class wins. */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
