'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await authClient.signIn.email({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message ?? 'Sign-in failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <Image src="/brand/logomark.svg" alt="GDSimple" width={40} height={40} className="h-10 w-10" priority />
          <div className="space-y-1">
            <p className="gds-eyebrow">Welcome back</p>
            <CardTitle className="font-display text-[22px] font-extrabold tracking-tight">
              Sign in to GDS<span className="text-[#25A5B4] font-medium">imple</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" variant="primary" size="lg" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              New here?{' '}
              <Link href="/auth/sign-up" className="text-[#25A5B4] hover:text-[#0A8A98] font-medium transition-colors">
                Create an account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
