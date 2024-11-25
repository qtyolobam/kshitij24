import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
  {
    variants: {
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      variant: {
        default:
          "bg-slate-900 text-slate-50 hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90",
        destructive:
          "bg-red-500 text-slate-50 hover:bg-red-500/90 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80",
        link: "text-slate-900 underline-offset-4 hover:underline dark:text-slate-50",
        navlink:
          "rounded-[90px] px-[17px] py-[4px] pb-[6px]  font-medium text-sm text-slate-400 bg-transparent hover:text-white",
        ghost:
          "rounded-md px-[17px] py-[4px] pb-[6px] border-[1px]  border-[#27272A]  font-medium text-sm text-slate-400 bg-transparent hover:text-white ",
        checkboxmenu:
          "rounded-md px-[10px] py-[4px] pb-[6px] border-[1px] border-dashed border-[#27272A]  font-medium text-sm text-white bg-transparent hover:bg-[#27272A] ",
      },
      highlight: {
        true: "bg-[#27272A] text-white font-medium",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      highlight: false,
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, highlight, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className, highlight }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
