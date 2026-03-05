'use client';

import { useCars } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/stores/app-store';
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
  pickup: z.string().min(3),
  category: z.enum(['all', 'economy', 'compact', 'intermediate'])
});

type FormData = z.infer<typeof schema>;

export default function CarSearchPage() {
  const { data, isLoading, isError, error, refetch } = useCars();
  const setBookingSession = useAppStore((state) => state.setBookingSession);
  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pickup: 'JFK', category: 'all' }
  });

  const category = watch('category');

  const cars = (data || []).filter((car) => (category === 'all' ? true : car.category === category));

  const onSubmit = () => {};

  return (
    <div className="space-y-4 text-[13px]">
      <Card>
        <CardHeader>
          <CardTitle>Car Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
            <Input {...register('pickup')} className="w-40" />
            <select
              value={category}
              onChange={(e) => setValue('category', e.target.value as 'all' | 'economy' | 'compact' | 'intermediate')}
              className="h-8 rounded border border-[#CBD5E1] px-2 text-[13px]"
            >
              <option value="all">All</option>
              <option value="economy">Economy</option>
              <option value="compact">Compact</option>
              <option value="intermediate">Intermediate</option>
            </select>
            <Button type="submit">Search cars</Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-status-danger">
          <CardContent className="py-3 text-status-danger">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-28" />)
          : cars.map((car) => (
              <Card key={car.id}>
                <CardContent className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{car.vendor} · {car.model}</div>
                    <div className="text-[12px] text-[#475569]">{car.acriss} · {car.category}</div>
                    <div className="text-[12px]">{car.inclusions.join(' · ')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-semibold">${car.dailyRate}</div>
                    <div className="text-[12px]">per day</div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setBookingSession({ car, activeSearchType: 'car' })}
                    >
                      Add to active booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </section>
    </div>
  );
}
