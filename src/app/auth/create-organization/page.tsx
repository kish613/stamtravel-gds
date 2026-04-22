'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const finalSlug = slug || slugify(name);
    const { error } = await authClient.organization.create({ name, slug: finalSlug });
    setSubmitting(false);
    if (error) {
      setError(error.message ?? 'Could not create organization');
      return;
    }
    router.push('/settings/credentials');
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your agency</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            One organization per agency. You can invite colleagues after setup.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Agency name</Label>
              <Input
                id="org-name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create agency'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
