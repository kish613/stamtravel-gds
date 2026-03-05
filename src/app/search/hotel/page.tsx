'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHotels } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-4 text-[13px]">
      <Card>
        <CardHeader>
          <CardTitle>Hotel Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-3 items-end">
            <Input {...register('city')} className="w-52" />
            <DateRangePicker
              value={watch('checkIn')}
              onChange={(date) => {
                if (!date) return;
                setValue('checkIn', date);
              }}
              label="Check-in"
            />
            <DateRangePicker
              value={watch('checkOut')}
              onChange={(date) => {
                if (!date) return;
                setValue('checkOut', date);
              }}
              label="Check-out"
            />
            <Input type="number" min={1} max={8} {...register('guests', { valueAsNumber: true })} className="w-24" />
            <Button type="submit">Search hotels</Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-status-danger">
          <CardContent className="text-status-danger py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-32" />)
          : (data || []).map((hotel) => (
              <Card key={hotel.id}>
                <CardContent className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{hotel.name}</div>
                    <div className="text-[12px] text-[#475569]">{hotel.address}</div>
                    <div className="text-[12px] text-[#64748B]">{hotel.distanceKm} km from center · {hotel.description}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center text-[12px]">{Array.from({ length: hotel.starRating }).map((_, idx) => <Star key={idx} className="h-3 w-3 text-status-warn" />)}</div>
                      <Badge variant={hotel.refundable ? 'confirmed' : 'neutral'}>{hotel.refundable ? 'Refundable' : 'Non-refundable'}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-semibold">${hotel.nightlyRate}</div>
                    <div className="text-[12px]">per night</div>
                    <Dialog open={open && selected?.id === hotel.id} onOpenChange={(value) => {
                      setOpen(value);
                      if (!value) setSelected(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button className="mt-2" size="sm" onClick={() => {
                          setSelected(hotel);
                          setOpen(true);
                        }}>
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{hotel.name}</DialogTitle>
                          <DialogDescription>New York · {hotel.nightlyRate} · {hotel.starRating}★</DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="overview">
                          <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="rooms">Rooms</TabsTrigger>
                            <TabsTrigger value="policies">Policies</TabsTrigger>
                          </TabsList>
                          <TabsContent value="overview">
                            <p>{hotel.description}</p>
                            <div className="mt-2">{hotel.address}</div>
                          </TabsContent>
                          <TabsContent value="rooms">
                            <div className="space-y-2">
                              {hotel.rooms.map((room) => (
                                <div key={room.name} className="rounded border p-2">
                                  <div>{room.name}</div>
                                  <div className="text-[12px] text-[#475569]">capacity {room.capacity} · ${room.rate}</div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                          <TabsContent value="policies">
                            <ul className="list-disc pl-4 space-y-1">
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
