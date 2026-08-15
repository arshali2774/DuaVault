"use client";

import { useState } from "react";
import { Envelope, Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthSubmit } from "@/lib/use-auth-submit";
import { AuthShell, AuthIconInput } from "@/components/auth-shell";

export default function SignupClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { error, isLoading, submit } = useAuthSubmit<{ email: string; password: string }>(
    "/api/auth/signup"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submit({ email, password }, () => setSubmitted(true));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-center max-w-sm">
          Check your inbox at <strong>{email}</strong> for a verification
          link before signing in.
        </p>
      </div>
    );
  }

  return (
    <AuthShell title="Sign up for DuaVault">
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Signing up..." : "Sign up"}
        </Button>
      </form>
    </AuthShell>
  );
}
