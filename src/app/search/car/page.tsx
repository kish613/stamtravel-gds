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
import { PageHeader } from '@/components/ui/page-header';
import { Eyebrow } from '@/components/ui/section-eyebrow';

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
  const cheapest = cars.reduce<typeof cars[number] | null>(
    (acc, c) => (acc == null || c.dailyRate < acc.dailyRate ? c : acc),
    null
  );

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Search · Car"
        title="Car"
        meta="Search and add rental cars to an active booking"
      />

      <Card variant="pro" accent="brand">
        <CardContent className="pt-3">
          <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3 flex-wrap">
            <div>
              <Eyebrow as="div" className="mb-1">Pickup location</Eyebrow>
              <Input {...register('pickup')} className="w-40" />
            </div>
            <div>
              <Eyebrow as="div" className="mb-1">Category</Eyebrow>
              <select
                value={category}
                onChange={(e) => setValue('category', e.target.value as FormData['category'])}
                className="gds-focus h-8 rounded-[8px] border border-input bg-background px-2.5 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25A5B4]/35 focus-visible:border-[#25A5B4]"
              >
                <option value="all">All</option>
                <option value="economy">Economy</option>
                <option value="compact">Compact</option>
                <option value="intermediate">Intermediate</option>
              </select>
            </div>
            <Button type="submit" variant="primary" size="lg">
              Search cars
            </Button>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card variant="pro" accent="danger">
          <CardContent className="py-3 text-destructive">
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
          <Eyebrow>{cars.length} option{cars.length === 1 ? '' : 's'}</Eyebrow>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-24" />)}
            </div>
          ) : cars.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No cars match. Adjust your filters.</div>
          ) : (
            cars.map((car) => {
              const isCheapest = cheapest?.id === car.id;
              return (
                <Card
                  key={car.id}
                  variant="pro"
                  accent={isCheapest ? 'brand' : undefined}
                  className="hover:bg-[#F6F8FB] transition-colors"
                >
                  <CardContent className="pt-3 flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-[15px] text-[var(--brand-navy-800)]">
                          {car.vendor} · {car.model}
                        </span>
                        {isCheapest && (
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-teal-500)]">
                            ★ best price
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        <span className="font-mono tabular-nums">{car.acriss}</span> · {car.category}
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">{car.inclusions.join(' · ')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-[26px] font-extrabold tabular-nums leading-tight text-[var(--brand-navy-800)]">
                        ${car.dailyRate.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">per day</div>
                      <Button
                        size="sm"
                        variant={isCheapest ? 'primary' : 'default'}
                        className="mt-2"
                        onClick={() => setBookingSession({ car, activeSearchType: 'car' })}
                      >
                        Add to booking
                      </Button>
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
