import type { LucideIcon } from "lucide-react";
import { cn } from "@lib/cn";

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  "aria-label"?: string;
}

export function Icon({ icon: I, size = 16, className, ...rest }: IconProps): JSX.Element {
  return <I size={size} className={cn("shrink-0", className)} aria-hidden={!rest["aria-label"]} {...rest} />;
}
