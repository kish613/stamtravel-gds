'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { LiveDot } from '@/components/ui/live-dot';
import { useAppStore } from '@/stores/app-store';
import type { AgencyCredentialsPublic } from '@/lib/sabre';

export default function SettingsPage() {
  const [name, setName] = useState('Jordan Ellis');
  const [pcc, setPcc] = useState('901');
  const [signature, setSignature] = useState('Best Regards');
  const [autoSeat, setAutoSeat] = useState(false);
  const [credStatus, setCredStatus] = useState<AgencyCredentialsPublic | null | undefined>(undefined);
  const router = useRouter();
  const setEditingLayout = useAppStore((s) => s.setEditingLayout);
  const resetDashboardLayouts = useAppStore((s) => s.resetDashboardLayouts);

  useEffect(() => {
    fetch('/api/credentials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AgencyCredentialsPublic | null) => setCredStatus(data ?? null))
      .catch(() => setCredStatus(null));
  }, []);

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        meta="Manage your agent profile, PCCs, and queue preferences"
      />

      <Card variant="pro">
        <CardHeader>
          <CardTitle>Dashboard layout</CardTitle>
          <Eyebrow>Mission Control</Eyebrow>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Drag tiles to rearrange your dashboard, and resize them wider, thinner, taller,
            or shorter to suit how you work. Each tile has a minimum size so its contents
            stay readable. Your layout is saved per user across devices.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setEditingLayout(true);
                router.push('/mission-control');
              }}
            >
              Customize dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetDashboardLayouts();
                fetch('/api/dashboard-layout', { method: 'DELETE' }).catch(() => {});
              }}
            >
              Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="pro" accent="brand">
        <CardHeader>
          <CardTitle>Sabre credentials</CardTitle>
          <Eyebrow>Connection</Eyebrow>
        </CardHeader>
        <CardContent>
          {credStatus !== undefined && (
            <div className="flex items-center gap-2 mb-3 text-[13px]">
              <LiveDot tone={credStatus ? 'good' : 'warn'} pulse={!!credStatus} />
              <span className={credStatus ? 'text-foreground' : 'text-muted-foreground'}>
                {credStatus
                  ? `Connected · PCC ${credStatus.pcc} · ${credStatus.env}${credStatus.verifiedAt ? ` · verified ${new Date(credStatus.verifiedAt).toLocaleString()}` : ''}`
                  : 'Not connected — setup required'}
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-3">
            Connect your agency&apos;s Sabre account. Bookings, ticketing, and PNR retrieval
            will run under your credentials and bill to your Sabre contract.
          </p>
          <Link
            href="/settings/credentials"
            className="gds-focus inline-flex h-8 items-center justify-center rounded-[10px] border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
          >
            Manage credentials
          </Link>
        </CardContent>
      </Card>

      <Card variant="pro">
        <CardContent className="pt-3">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="pccs">PCCs</TabsTrigger>
              <TabsTrigger value="queues">Queues configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-2 mt-3">
              <div>
                <Eyebrow as="div" className="mb-1">Agent name</Eyebrow>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
              </div>
              <div>
                <Eyebrow as="div" className="mb-1">Default PCC</Eyebrow>
                <Input value={pcc} onChange={(e) => setPcc(e.target.value)} placeholder="Default PCC" />
              </div>
              <div>
                <Eyebrow as="div" className="mb-1">Email signature</Eyebrow>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Email signature" />
              </div>
              <Button variant="primary">Save profile</Button>
            </TabsContent>

            <TabsContent value="pccs" className="space-y-2 mt-3">
              {[
                { code: '901', label: 'London Office' },
                { code: '902', label: 'New York Office' }
              ].map((p) => (
                <div
                  key={p.code}
                  className="rounded-[10px] border bg-[#F6F8FB] px-3 py-2.5 hover:bg-[#EEF2F7] transition-colors flex items-center justify-between"
                  style={{
                    borderColor: '#E2E8F0',
                    borderLeft: '3px solid var(--brand-teal-500)'
                  }}
                >
                  <span>
                    <span className="font-mono font-bold tabular-nums text-[var(--brand-navy-800)]">PCC {p.code}</span>{' '}
                    — {p.label}
                  </span>
                </div>
              ))}
              <Button variant="outline">Add PCC</Button>
            </TabsContent>

            <TabsContent value="queues" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2">
                  <Checkbox checked={autoSeat} onCheckedChange={(value) => setAutoSeat(Boolean(value))} />
                  Auto refresh queue board every minute
                </label>
              </div>
              <Separator />
              <Button variant="primary">Save queue preferences</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
