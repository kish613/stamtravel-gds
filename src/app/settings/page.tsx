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
      <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList className="bg-white/40 backdrop-blur-sm border border-white/20 p-1">
              <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/90 data-[state=active]:to-indigo-500/90 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">Profile</TabsTrigger>
              <TabsTrigger value="pccs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/90 data-[state=active]:to-indigo-500/90 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">PCCs</TabsTrigger>
              <TabsTrigger value="queues" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/90 data-[state=active]:to-indigo-500/90 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">Queues configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
              <Input value={pcc} onChange={(e) => setPcc(e.target.value)} placeholder="Default PCC" />
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Email signature" />
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200">Save profile</Button>
            </TabsContent>

            <TabsContent value="pccs" className="space-y-2">
              <div className="rounded border border-white/20 bg-white/50 backdrop-blur-sm p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">PCC 901 - London Office</div>
              <div className="rounded border border-white/20 bg-white/50 backdrop-blur-sm p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">PCC 902 - New York Office</div>
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
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200">Save queue preferences</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
