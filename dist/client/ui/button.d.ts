import { type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
declare const buttonVariants: (props?: ({
    variant?: "default" | "link" | "secondary" | "destructive" | "outline" | "ghost" | null | undefined;
    size?: "default" | "icon" | "sm" | "lg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}): React.JSX.Element;
export { Button, buttonVariants };
