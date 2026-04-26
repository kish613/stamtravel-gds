import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CredentialsForm } from '@/components/settings/credentials-form';

export const dynamic = 'force-dynamic';

export default function CredentialsSettingsPage() {
  return (
    <div className="space-y-6 text-[13px]">
      <div>
        <p className="gds-eyebrow mb-2">Settings · Integrations</p>
        <h1 className="font-display text-foreground text-[28px] font-extrabold tracking-tight leading-tight">Sabre credentials</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect your agency&apos;s Sabre account. These credentials are used for bookings,
          ticketing, PNR retrieval, and queue operations.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Credentials</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <CredentialsForm />
        </CardContent>
      </Card>
    </div>
  );
}
