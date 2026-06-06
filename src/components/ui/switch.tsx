import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer", className)}>
      <input type="checkbox" className="sr-only peer" {...props} />
      <span className="relative h-5 w-9 rounded-full bg-[var(--muted)] peer-checked:bg-[var(--primary)] transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}
