import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CredentialsForm } from '@/components/settings/credentials-form';
import { PageHeader } from '@/components/ui/page-header';
import { Eyebrow } from '@/components/ui/section-eyebrow';

export const dynamic = 'force-dynamic';

export default function CredentialsSettingsPage() {
  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Settings · Integrations"
        title="Sabre credentials"
        meta="Connect your agency's Sabre account. These credentials are used for bookings, ticketing, PNR retrieval, and queue operations."
      />
      <Card variant="pro" accent="brand">
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <Eyebrow>Sabre · CERT / PROD</Eyebrow>
        </CardHeader>
        <CardContent>
          <CredentialsForm />
        </CardContent>
      </Card>
    </div>
  );
}
