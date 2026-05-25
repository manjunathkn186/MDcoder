import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@lib/cn";

type Variant = "primary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-hover shadow-soft disabled:opacity-50",
  ghost:
    "text-fg hover:bg-surface-2 active:bg-surface-2 disabled:opacity-50",
  outline:
    "border border-border text-fg hover:bg-surface-2 active:bg-surface-2 disabled:opacity-50",
  danger:
    "bg-danger text-white hover:opacity-90 active:opacity-100 disabled:opacity-50",
  subtle:
    "bg-accent-soft text-accent hover:bg-accent-soft/80 disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  xs: "h-6 px-1.5 text-xs gap-1",
  sm: "h-7 px-2 text-xs gap-1.5",
  md: "h-9 px-3 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

/**
 * Consistent button primitive used app-wide. Variants map to semantic
 * tokens so themes change colors without touching component code.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", className, loading, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-lg font-medium",
        "transition-colors duration-fast ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
