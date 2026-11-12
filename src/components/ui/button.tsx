import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[15px] font-bold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-2 border-ink-2 bg-primary text-primary-foreground shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_hsl(var(--ink-2))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        destructive: "border-2 border-ink-2 bg-destructive text-destructive-foreground shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        outline: "border-2 border-ink-2 bg-white text-ink-2 hover:bg-sun-soft active:translate-y-px",
        secondary: "border-2 border-ink-2 bg-peri-soft text-ink-2 hover:bg-[hsl(251_100%_90%)]",
        ghost: "text-ink-2 hover:bg-ink-2/[0.06]",
        link: "text-ink underline-offset-4 hover:underline",
        highlight: "border-2 border-ink-2 bg-sun text-ink-2 shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_hsl(var(--ink-2))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3.5 text-sm",
        lg: "h-12 px-6 text-[15px]",
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
