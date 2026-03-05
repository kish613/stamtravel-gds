'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFlights, useRevalidateResult } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plane, ArrowLeftRight, ChevronDown, CircleCheckBig } from 'lucide-react';
import { DateRangePicker } from '@/components/search/date-range';
import { AirportAutocomplete } from '@/components/search/airport-autocomplete';
import { useAppStore } from '@/stores/app-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Card as UiCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const schema = z.object({
  tripType: z.enum(['one-way', 'return', 'multi-city']),
  origin: z.string().min(3, 'origin required'),
  destination: z.string().min(3, 'destination required'),
  departure: z.date().optional().nullable(),
  returnDate: z.date().optional().nullable(),
  adults: z.number().min(1).max(9),
  children: z.number().min(0).max(9),
  infants: z.number().min(0).max(9),
  cabin: z.enum(['Economy', 'Premium Economy', 'Business', 'First']),
  maxStops: z.number().min(0).max(5),
  preferredAirline: z.string().optional(),
  alliance: z.string().optional(),
  ndcOnly: z.boolean().optional(),
  flexibleWindow: z.number().min(-3).max(3).optional().default(0),
  flexible: z.boolean().optional().default(false)
});

type FormData = z.infer<typeof schema>;

export default function AirSearchPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useFlights();
  const revalidate = useRevalidateResult();
  const setActiveFlight = useAppStore((state) => state.setActiveFlight);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState(false);

  const { register, handleSubmit, watch, setValue, setError, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tripType: 'one-way',
      origin: 'LHR',
      destination: 'JFK',
      departure: new Date(),
      returnDate: null,
      adults: 1,
      children: 0,
      infants: 0,
      cabin: 'Economy',
      maxStops: 2,
      preferredAirline: '',
      alliance: '',
      ndcOnly: false,
      flexibleWindow: 0,
      flexible: false
    }
  });

  const query = watch();
  const flexibleWindow = query.flexibleWindow ?? 0;
  const isFlexible = query.flexible ?? false;

  const fareRows = useMemo(() => {
    const flights = data || [];
    if (!searchResult) return [];
    const stops = [0, 1, 2];
    const bands = [
      { label: 'Under $500', min: 0, max: 499 },
      { label: '$500-$700', min: 500, max: 700 },
      { label: 'Over $700', min: 701, max: 5000 }
    ];

    return bands.map((band) => ({
      label: band.label,
      counts: {} as Record<number, number>,
      ...stops.reduce(
        (acc, stop) => {
          const found = flights.filter((flight) => flight.stops === stop && flight.price >= band.min && flight.price <= band.max);
          return { ...acc, [stop]: found.length };
        },
        {} as Record<number, number>
      )
    }));
  }, [searchResult, data]);

  const results = useMemo(() => {
    if (!data) return [];
    return data
      .filter((flight) => {
        if (query.origin && flight.origin !== query.origin) return false;
        if (query.destination && flight.destination !== query.destination) return false;
        if (query.cabin && query.cabin === 'Business' ? true : true) return true;
        if (query.maxStops != null && flight.stops > query.maxStops) return false;
        if (query.ndcOnly) return flight.contentType === 'NDC';
        return true;
      })
      .sort((a, b) => a.price - b.price);
  }, [data, query]);

  const onSubmit = () => {
    setSearchResult(true);
  };

  const handleSelect = (id: string) => {
    const selected = results.find((f) => f.id === id);
    if (!selected) return;
    revalidate.mutate(undefined, {
      onSuccess: () => {
        setActiveFlight(selected);
        alert('Result revalidated. Moving to booking wizard.');
        router.push('/booking/new');
      },
      onError: () => {
        setError('origin', { type: 'manual', message: 'Revalidate failed' });
      }
    });
  };

  return (
    <div className="space-y-4 text-[13px]">
      <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
          <CardTitle>Air Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label>Trip type</Label>
                <select
                  {...register('tripType')}
                  className="h-8 rounded border border-white/20 bg-white/50 backdrop-blur-sm px-2 text-[13px] transition-shadow hover:shadow-md"
                >
                  <option value="one-way">One-way</option>
                  <option value="return">Return</option>
                  <option value="multi-city">Multi-city</option>
                </select>
              </div>
              <div className="flex-1 min-w-52">
                <AirportAutocomplete
                  label="Origin"
                  value={query.origin}
                  onChange={(value) => setValue('origin', value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const o = query.origin;
                  setValue('origin', query.destination);
                  setValue('destination', o);
                }}
                className="border border-white/20 bg-white/50 backdrop-blur-sm h-8 w-8 rounded flex items-center justify-center transition-all duration-200 hover:bg-white/70 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                aria-label="swap"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-52">
                <AirportAutocomplete
                  label="Destination"
                  value={query.destination}
                  onChange={(value) => setValue('destination', value)}
                />
              </div>

              <div>
                <Label>Departure</Label>
                    <DateRangePicker
                      value={query.departure || null}
                      onChange={(range) => {
                        if (range) setValue('departure', range);
                      }}
                      label=""
                    />
              </div>
              {query.tripType === 'return' && (
                <div>
                  <Label>Return</Label>
                    <DateRangePicker
                      value={query.returnDate || null}
                      onChange={(range) => {
                        if (range) setValue('returnDate', range);
                      }}
                      label=""
                    />
                </div>
              )}
              <div className="w-36">
                <Label>Cabin class</Label>
                <Select
                  value={query.cabin}
                  onValueChange={(value: FormData['cabin']) => setValue('cabin', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Economy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Economy">Economy</SelectItem>
                    <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="First">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="inline-flex h-8 items-center gap-1 rounded border border-white/20 bg-white/50 backdrop-blur-sm px-2 text-[13px] transition-all duration-200 hover:bg-white/70 hover:shadow-md">
                      Passenger count <ChevronDown className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 space-y-2 bg-white/70 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-center">
                      <span>Adults</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setValue('adults', Math.max(1, query.adults - 1))} className="px-2 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">-</button>
                        <span>{query.adults}</span>
                        <button type="button" onClick={() => setValue('adults', Math.min(9, query.adults + 1))} className="px-2 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">+</button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Children</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setValue('children', Math.max(0, query.children - 1))} className="px-2 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">-</button>
                        <span>{query.children}</span>
                        <button type="button" onClick={() => setValue('children', Math.min(9, query.children + 1))} className="px-2 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">+</button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Infants</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setValue('infants', Math.max(0, query.infants - 1))} className="px-2 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">-</button>
                        <span>{query.infants}</span>
                        <button type="button" onClick={() => setValue('infants', Math.min(9, query.infants + 1))} className="px-2 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">+</button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Flexible dates</Label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setValue('flexibleWindow', Math.max(-3, flexibleWindow - 1))} className="h-8 w-8 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">-</button>
                  <Button variant="outline" onClick={() => setValue('flexible', !isFlexible)} type="button">
                    {isFlexible ? `±${Math.abs(flexibleWindow)}d` : 'off'}
                  </Button>
                  <button type="button" onClick={() => setValue('flexibleWindow', Math.min(3, flexibleWindow + 1))} className="h-8 w-8 border border-white/20 rounded bg-white/50 backdrop-blur-sm transition-colors hover:bg-white/80">+</button>
                </div>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger>Advanced options</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    <Input placeholder="Preferred airline" {...register('preferredAirline')} />
                    <Input placeholder="Alliance" {...register('alliance')} />
                    <div className="flex gap-2 items-center">
                      <Label>Max stops</Label>
                      <Input
                        type="number"
                        {...register('maxStops', { valueAsNumber: true })}
                        className="w-24"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" {...register('ndcOnly')} />
                      <span>NDC only</span>
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {errors.origin && <div className="text-status-danger text-sm">{errors.origin.message}</div>}

            <div className="pt-2">
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">Search</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-status-danger bg-white/60 backdrop-blur-md">
          <CardContent className="py-3 text-status-danger">
            {(error as Error)?.message}
            <Button variant="outline" size="sm" className="ml-3" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {(searchResult || isLoading || isError) && (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-3">
          <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <CardHeader className="bg-gradient-to-r from-slate-50/80 to-indigo-50/80 rounded-t-lg">
              <CardTitle>Fare matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100/60 to-blue-100/40">
                      <th className="text-left py-1.5 px-1 rounded-l">Price band</th>
                      <th className="text-center py-1.5">0 stops</th>
                      <th className="text-center py-1.5">1 stop</th>
                      <th className="text-center py-1.5 rounded-r">2+ stops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fareRows.map((row) => (
                      <tr key={row.label} className="border-t border-white/20 transition-colors hover:bg-white/40">
                        <td className="py-1">{row.label}</td>
                        <td className="text-center">{row.counts[0] || 0}</td>
                        <td className="text-center">{row.counts[1] || 0}</td>
                        <td className="text-center">{row.counts[2] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-24" />)}</div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-[#64748B]">
                  No matches. Try a broader date or airport.
                </div>
              ) : (
                results.map((flight) => {
                  const expandedState = expanded === flight.id;
                  return (
                    <UiCard key={flight.id} className="bg-white/50 backdrop-blur-sm border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{flight.airline} · {flight.flightNumber}</div>
                            <div className="text-[12px] text-[#475569]">
                              {flight.origin} to {flight.destination} · {format(new Date(flight.departure), 'MMM d, HH:mm')} · {flight.durationMinutes}m · {flight.stops} stop(s)
                            </div>
                            <div className="text-[11px] text-[#64748B]">Fare basis {flight.fareBasis}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[26px] font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent">${flight.price}</div>
                            <Badge variant={flight.contentType === 'NDC' ? 'confirmed' : flight.contentType === 'ATPCO' ? 'warning' : 'neutral'}>
                              {flight.contentType}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <button className="text-[12px] flex items-center text-[#0A1628]" onClick={() => setExpanded(expandedState ? null : flight.id)}>
                            <Plane className="h-3 w-3 mr-1" />
                            {expandedState ? 'Hide details' : 'Show details'}
                          </button>
                          <Button size="sm" onClick={() => handleSelect(flight.id)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200">
                            Select
                          </Button>
                        </div>
                        {expandedState && (
                          <div className="grid grid-cols-2 gap-3 text-[12px] bg-white/30 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                            <div>Baggage: {flight.baggageAllowance}</div>
                            <div>Refundable: {flight.refundable ? 'Yes' : 'No'}</div>
                            <div className="col-span-2">Rules: {flight.fareRulesSummary}</div>
                            <div className="text-status-good flex items-center text-sm">
                              <CircleCheckBig className="h-3 w-3 mr-1" /> NDC ready for revalidation
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </UiCard>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
