import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "default" | "small";
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ className, variant = "primary", size = "default", loading, icon, children, disabled, ...props }: Props) {
  return (
    <button
      className={twMerge("btn", `btn-${variant}`, size === "small" && "btn-small", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle size={18} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
