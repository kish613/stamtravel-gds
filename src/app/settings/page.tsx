'use client';

import { useState } from 'react';
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
    <div className="space-y-4 text-[13px]">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="pccs">PCCs</TabsTrigger>
              <TabsTrigger value="queues">Queues configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
              <Input value={pcc} onChange={(e) => setPcc(e.target.value)} placeholder="Default PCC" />
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Email signature" />
              <Button>Save profile</Button>
            </TabsContent>

            <TabsContent value="pccs" className="space-y-2">
              <div className="rounded border border-[#CBD5E1] p-2">PCC 901 - London Office</div>
              <div className="rounded border border-[#CBD5E1] p-2">PCC 902 - New York Office</div>
              <Button variant="outline">Add PCC</Button>
            </TabsContent>

            <TabsContent value="queues" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2">
                  <Checkbox checked={autoSeat} onCheckedChange={(value) => setAutoSeat(Boolean(value))} />
                  Auto refresh queue board every minute
                </label>
              </div>
              <Separator />
              <Button>Save queue preferences</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
