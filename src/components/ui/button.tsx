import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-[hsl(var(--primary-strong))] hover:shadow-elevated active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:-translate-y-0.5",
        outline: "border border-border bg-background text-foreground shadow-soft hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/75 hover:-translate-y-0.5",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-card hover:-translate-y-0.5 hover:shadow-elevated",
        success: "bg-success text-success-foreground shadow-soft hover:bg-success/90 hover:-translate-y-0.5",
        cyber: "border border-primary/40 bg-background text-primary shadow-soft hover:bg-primary/10 hover:border-primary",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
