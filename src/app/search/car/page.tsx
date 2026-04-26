'use client';

import { useCars } from '@/lib/query';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <p className="gds-eyebrow mb-2">Search</p>
        <h1 className="font-display text-[28px] font-extrabold text-foreground tracking-tight leading-tight">Car</h1>
        <p className="text-sm text-muted-foreground mt-1">Search and add rental cars to an active booking</p>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Pickup Location</label>
              <Input {...register('pickup')} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setValue('category', e.target.value as FormData['category'])}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                <option value="economy">Economy</option>
                <option value="compact">Compact</option>
                <option value="intermediate">Intermediate</option>
              </select>
            </div>
            <Button type="submit" variant="primary" size="lg">Search cars</Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-destructive">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-28" />)
          : cars.map((car) => (
              <Card key={car.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="pt-4 flex justify-between items-center gap-4">
                  <div>
                    <div className="font-semibold text-foreground">{car.vendor} · {car.model}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">
                      <span className="font-mono">{car.acriss}</span> · {car.category}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{car.inclusions.join(' · ')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[28px] font-bold text-foreground tracking-tight leading-none">${car.dailyRate}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">per day</div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setBookingSession({ car, activeSearchType: 'car' })}
                    >
                      Add to booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
      </section>
    </div>
  );
}
