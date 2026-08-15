"use client";

import { useState } from "react";
import Link from "next/link";
import { Envelope, Lock } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthSubmit } from "@/lib/use-auth-submit";
import { AuthShell, AuthIconInput } from "@/components/auth-shell";

function safeRedirectTarget(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectTarget(searchParams.get("redirect"));
  const { error, isLoading, submit } = useAuthSubmit<{ email: string; password: string }>(
    "/api/auth/login"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submit({ email, password }, () => {
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <AuthShell title="Log in to DuaVault">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <AuthIconInput
            icon={Envelope}
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <AuthIconInput
            icon={Lock}
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Logging in..." : "Log in"}
        </Button>

        <p className="text-sm text-center">
          <Link href="/forgot-password" className="underline">
            Forgot your password?
          </Link>
        </p>

        <p className="text-sm text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
