import { Suspense } from "react";
import UnlockClient from "./unlock-client";

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <UnlockClient />
    </Suspense>
  );
}
