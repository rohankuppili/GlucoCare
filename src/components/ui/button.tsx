import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-lg font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-glow hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Healthcare-specific variants
        hero: "bg-gradient-primary text-primary-foreground shadow-xl hover:shadow-glow hover:-translate-y-1 hover:scale-[1.02]",
        glass: "glass-card bg-card/80 text-foreground hover:bg-card/90 border border-border/50",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg",
        danger: "bg-danger text-danger-foreground hover:bg-danger/90 shadow-lg hover:shadow-glow-accent",
        // Elderly-friendly large button
        elderly: "bg-primary text-primary-foreground text-xl py-6 px-8 rounded-2xl shadow-xl hover:shadow-glow hover:-translate-y-1",
        sos: "bg-gradient-accent text-accent-foreground text-2xl py-8 px-10 rounded-3xl shadow-xl hover:shadow-glow-accent animate-pulse-soft",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4 text-base",
        lg: "h-14 rounded-xl px-8 text-xl",
        xl: "h-16 rounded-2xl px-10 text-2xl",
        icon: "h-12 w-12",
        "icon-lg": "h-14 w-14",
        "icon-xl": "h-16 w-16",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
