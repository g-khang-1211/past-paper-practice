import { AuthPage } from "@/features/auth/auth-page";
import { loginAction } from "@/features/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AuthPage
      action={loginAction}
      alternateCta="Create one"
      alternateHref="/signup"
      alternateLabel="Need an account?"
      message={resolvedSearchParams.error ?? resolvedSearchParams.message}
      nextPath={resolvedSearchParams.next}
      submitLabel="Sign in"
      subtitle="Return to your past papers, practice runs, and grading history."
      title="Welcome back"
    />
  );
}
