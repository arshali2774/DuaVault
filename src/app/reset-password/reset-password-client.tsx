"use client";

import { useState } from "react";
import { Lock } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthSubmit } from "@/lib/use-auth-submit";
import { AuthShell, AuthIconInput } from "@/components/auth-shell";

export default function ResetPasswordClient() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { error, isLoading, submit, setError } = useAuthSubmit<{
    code: string | null;
    password: string;
  }>("/api/auth/reset-password");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submit({ code, password }, () => {
      router.push("/");
      router.refresh();
    });
  };

  if (!code) {
    return (
      <AuthShell title="Reset link invalid">
        <p className="text-center text-sm text-destructive">
          This reset link is invalid or has expired. Please request a new
          one from the login page.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <AuthIconInput
            icon={Lock}
            id="password"
            type="password"
            required
            autoFocus
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <AuthIconInput
            icon={Lock}
            id="confirmPassword"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </AuthShell>
  );
}
