'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const [name, setName] = useState('Jordan Ellis');
  const [pcc, setPcc] = useState('901');
  const [signature, setSignature] = useState('Best Regards');
  const [autoSeat, setAutoSeat] = useState(false);

  return (
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <p className="gds-eyebrow mb-2">Workspace</p>
        <h1 className="font-display text-[28px] font-extrabold text-foreground tracking-tight leading-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your agent profile, PCCs, and queue preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sabre credentials</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            Connect your agency&apos;s Sabre account. Bookings, ticketing, and PNR retrieval
            will run under your credentials and bill to your Sabre contract.
          </p>
          <Link
            href="/settings/credentials"
            className="inline-flex h-8 items-center justify-center rounded-[10px] border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
          >
            Manage credentials
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="pccs">PCCs</TabsTrigger>
              <TabsTrigger value="queues">Queues configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-2 mt-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
              <Input value={pcc} onChange={(e) => setPcc(e.target.value)} placeholder="Default PCC" />
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Email signature" />
              <Button variant="primary">Save profile</Button>
            </TabsContent>

            <TabsContent value="pccs" className="space-y-2 mt-3">
              <div className="rounded-md border border-border bg-muted/40 p-2.5 hover:bg-muted transition-colors">PCC 901 - London Office</div>
              <div className="rounded-md border border-border bg-muted/40 p-2.5 hover:bg-muted transition-colors">PCC 902 - New York Office</div>
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
