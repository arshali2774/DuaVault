"use client";

// Shared shell for the auth surface (login / signup / forgot-password /
// reset-password): centered card with a small Bismillah mark above the
// title, and icon-prefixed inputs. Winner of a /prototype A/B/C comparison
// (issue tracker: see repo history around the auth-shell prototype).

import type { ComponentType } from "react";
import { Input, type InputProps } from "@/components/ui/input";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src="/bismillah.svg"
            alt=""
            className="splash-logo h-14 w-auto opacity-70"
          />
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

// Icon-agnostic on purpose — works with lucide-react, @phosphor-icons/react,
// or anything else that renders a className-accepting SVG component.
export function AuthIconInput({
  icon: Icon,
  className,
  ...props
}: { icon: ComponentType<{ className?: string }> } & InputProps) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={`pl-9 ${className ?? ""}`} {...props} />
    </div>
  );
}
