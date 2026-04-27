'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHotels } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app-store';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/search/date-range';
import { Star } from 'lucide-react';

const schema = z.object({
  city: z.string().min(2),
  checkIn: z.date(),
  checkOut: z.date(),
  guests: z.number().min(1).max(8)
});

type FormData = z.infer<typeof schema>;

export default function HotelSearchPage() {
  const { data, isLoading, isError, error, refetch } = useHotels();
  const setBookingSession = useAppStore((state) => state.setBookingSession);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      city: 'New York',
      checkIn: new Date(),
      checkOut: new Date(),
      guests: 2
    }
  });

  const onSubmit = () => {};

  const cheapestId = (data || []).reduce<string | null>(
    (acc, h) => (acc == null || h.nightlyRate < (data || []).find((x) => x.id === acc)!.nightlyRate ? h.id : acc),
    null
  );

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Search · Hotel"
        title="Hotel"
        meta="Search and add hotel rooms to an active booking"
      />

      <Card variant="pro" accent="brand">
        <CardContent className="pt-3">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-3 items-end">
            <div>
              <Eyebrow as="div" className="mb-1">City</Eyebrow>
              <Input {...register('city')} className="w-52" />
            </div>
            <DateRangePicker
              value={watch('checkIn')}
              onChange={(date) => { if (!date) return; setValue('checkIn', date); }}
              label="Check-in"
            />
            <DateRangePicker
              value={watch('checkOut')}
              onChange={(date) => { if (!date) return; setValue('checkOut', date); }}
              label="Check-out"
            />
            <div>
              <Eyebrow as="div" className="mb-1">Guests</Eyebrow>
              <Input type="number" min={1} max={8} {...register('guests', { valueAsNumber: true })} className="w-24" />
            </div>
            <Button type="submit" variant="primary" size="lg">
              Search hotels
            </Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card variant="pro" accent="danger">
          <CardContent className="text-destructive py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card variant="pro">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <Eyebrow>{(data || []).length} propert{(data || []).length === 1 ? 'y' : 'ies'}</Eyebrow>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-32" />)}
            </div>
          ) : (data || []).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hotels match. Adjust your filters.</div>
          ) : (
            (data || []).map((hotel) => {
              const isCheapest = hotel.id === cheapestId;
              return (
              <Card
                key={hotel.id}
                variant="pro"
                accent={isCheapest ? 'brand' : undefined}
                className="hover:bg-[#F6F8FB] transition-colors"
              >
                <CardContent className="pt-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-[15px] text-[var(--brand-navy-800)]">
                        {hotel.name}
                      </span>
                      {isCheapest && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-teal-500)]">
                          ★ best price
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{hotel.address}</div>
                    <div className="text-[12px] text-muted-foreground tabular-nums">
                      {hotel.distanceKm} km from center · {hotel.description}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: hotel.starRating }).map((_, idx) => (
                          <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <Badge variant={hotel.refundable ? 'confirmed' : 'neutral'}>
                        {hotel.refundable ? 'Refundable' : 'Non-refundable'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-[26px] font-extrabold text-[var(--brand-navy-800)] tabular-nums leading-tight">
                      ${hotel.nightlyRate.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">per night</div>
                    <Dialog
                      open={open && selected?.id === hotel.id}
                      onOpenChange={(value) => { setOpen(value); if (!value) setSelected(null); }}
                    >
                      <DialogTrigger asChild>
                        <Button className="mt-2" size="sm" onClick={() => { setSelected(hotel); setOpen(true); }}>
                          View rooms
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{hotel.name}</DialogTitle>
                          <DialogDescription>New York · ${hotel.nightlyRate}/night · {hotel.starRating}★</DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="overview">
                          <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="rooms">Rooms</TabsTrigger>
                            <TabsTrigger value="policies">Policies</TabsTrigger>
                          </TabsList>
                          <TabsContent value="overview" className="mt-3 space-y-2 text-[13px]">
                            <p className="text-foreground">{hotel.description}</p>
                            <p className="text-muted-foreground">{hotel.address}</p>
                          </TabsContent>
                          <TabsContent value="rooms" className="mt-3">
                            <div className="space-y-2">
                              {hotel.rooms.map((room) => (
                                <div key={room.name} className="rounded-md border border-border bg-muted/30 p-2.5">
                                  <div className="font-medium text-foreground">{room.name}</div>
                                  <div className="text-[12px] text-muted-foreground mt-0.5">
                                    Capacity {room.capacity} · ${room.rate}/night
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                          <TabsContent value="policies" className="mt-3">
                            <ul className="list-disc pl-4 space-y-1 text-[13px] text-foreground">
                              {hotel.policies.map((policy) => (
                                <li key={policy}>{policy}</li>
                              ))}
                            </ul>
                          </TabsContent>
                        </Tabs>
                        <div className="mt-3 flex justify-end">
                          <Button
                            onClick={() => {
                              setBookingSession({ hotel, activeSearchType: 'hotel' });
                              setOpen(false);
                            }}
                          >
                            Add to booking
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
