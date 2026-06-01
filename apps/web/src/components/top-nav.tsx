import Link from 'next/link';
import { Button, TextLink } from '@/design-system/components/button';
import { PromoBanner } from '@/design-system/components/badges';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/design-system', label: 'Design system' },
];

export function TopNav() {
  return (
    <>
      <PromoBanner>
        Atomic Habits — your personal growth workspace.{' '}
        <TextLink href="/design-system">See design system →</TextLink>
      </PromoBanner>
      <header className="sticky top-0 z-50 h-nav border-b border-hairline bg-canvas/95 backdrop-blur-sm">
        <div className="container-content flex h-full items-center justify-between">
          <Link href="/" className="flex items-center gap-sm font-sans text-body-sm font-medium text-ink">
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-xs font-bold text-on-primary"
            >
              A
            </span>
            Atomic Habits
          </Link>

          <nav className="hidden items-center gap-lg md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-body-sm text-ink-subtle hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-md">
            <Button variant="secondary" className="hidden sm:inline-flex">
              Sign in
            </Button>
            <Button>Get started</Button>
          </div>
        </div>
      </header>
    </>
  );
}
