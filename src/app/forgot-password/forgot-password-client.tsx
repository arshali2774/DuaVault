"use client";

import { useState } from "react";
import Link from "next/link";
import { Envelope } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthSubmit } from "@/lib/use-auth-submit";
import { AuthShell, AuthIconInput } from "@/components/auth-shell";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { error, isLoading, submit } = useAuthSubmit<{ email: string }>(
    "/api/auth/forgot-password"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submit({ email }, () => setSubmitted(true));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-center max-w-sm">
          If an account exists for <strong>{email}</strong>, a password reset
          link has been sent. Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset your password."
    >
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

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>

        <p className="text-sm text-center">
          <Link href="/login" className="underline">
            Back to log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
