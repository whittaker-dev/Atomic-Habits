import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-md py-section">
      <div className="panel-lift max-w-md rounded-lg bg-surface-1 p-lg text-center md:p-xl">
        <h1 className="font-sans text-display-md font-bold">Sign in</h1>
        <p className="mt-sm font-sans text-body text-ink-muted">
          Email sign-in is coming in TRY-72. For now, create an account or go home.
        </p>
        <div className="mt-lg flex flex-col gap-md">
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-[14px] py-xs font-sans text-button font-medium text-on-primary hover:bg-primary-hover"
          >
            Sign up
          </Link>
          <Link href="/" className="font-sans text-body-sm text-ink-subtle hover:text-ink">
            ← Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
