import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

// Static page — no DB, no cookies, no searchParams reading on the server.
// Served from the CDN edge with zero function invocation on initial load.
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
