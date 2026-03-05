'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHotels } from '@/lib/query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  return (
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Hotel Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Search and add hotel rooms to an active booking</p>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">City</label>
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Guests</label>
              <Input type="number" min={1} max={8} {...register('guests', { valueAsNumber: true })} className="w-24" />
            </div>
            <Button type="submit">Search hotels</Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-destructive">
          <CardContent className="text-destructive py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-32" />)
          : (data || []).map((hotel) => (
              <Card key={hotel.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="pt-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{hotel.name}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{hotel.address}</div>
                    <div className="text-[12px] text-muted-foreground">{hotel.distanceKm} km from center · {hotel.description}</div>
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
                    <div className="text-[28px] font-bold text-foreground tracking-tight leading-none">${hotel.nightlyRate}</div>
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
            ))}
      </section>
    </div>
  );
}
