import { AuthPage } from "@/features/auth/auth-page";
import { signupAction } from "@/features/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <AuthPage
      action={signupAction}
      alternateCta="Sign in"
      alternateHref="/login"
      alternateLabel="Already have an account?"
      message={resolvedSearchParams.error}
      showDisplayName
      submitLabel="Create account"
      subtitle="Set up your student account and keep your uploads, attempts, and mistake archive private."
      title="Create your account"
    />
  );
}
