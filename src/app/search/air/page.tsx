'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFlights, useRevalidateResult } from '@/lib/query';
import type { AirSearchParams, FlightResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AirportAutocomplete } from '@/components/search/airport-autocomplete';
import { DateRangePicker } from '@/components/search/date-range';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { useRouter } from 'next/navigation';

const schema = z.object({
  tripType: z.enum(['one-way', 'return', 'multi-city']),
  origin: z.string().min(3, 'Origin required'),
  destination: z.string().min(3, 'Destination required'),
  departure: z.date().nullable().optional(),
  returnDate: z.date().nullable().optional(),
  adults: z.number().min(1).max(9),
  children: z.number().min(0).max(9),
  infants: z.number().min(0).max(9),
  cabin: z.enum(['Economy', 'Premium Economy', 'Business', 'First']),
  maxStops: z.number().min(0).max(5),
  preferredAirline: z.string().optional(),
  alliance: z.string().optional(),
  ndcOnly: z.boolean().default(false),
  flexibleWindow: z.number().min(-3).max(3).default(0),
  flexible: z.boolean().default(false)
});

type FormData = z.infer<typeof schema>;

function toSearchParams(values: FormData): AirSearchParams {
  return {
    tripType: values.tripType,
    origin: values.origin,
    destination: values.destination,
    departure: values.departure?.toISOString(),
    returnDate: values.returnDate?.toISOString(),
    adults: values.adults,
    children: values.children,
    infants: values.infants,
    cabin: values.cabin,
    maxStops: values.maxStops,
    preferredAirline: values.preferredAirline,
    alliance: values.alliance,
    ndcOnly: values.ndcOnly,
    flexibleWindow: values.flexibleWindow,
    flexible: values.flexible
  };
}

export default function AirSearchPage() {
  const router = useRouter();
  const setActiveFlight = useAppStore((state) => state.setActiveFlight);
  const setBookingSession = useAppStore((state) => state.setBookingSession);
  const [submittedSearch, setSubmittedSearch] = useState<AirSearchParams | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const flightsQuery = useFlights(submittedSearch ?? undefined, Boolean(submittedSearch));
  const revalidateResult = useRevalidateResult();

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({
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
      maxStops: 1,
      preferredAirline: '',
      alliance: '',
      ndcOnly: false,
      flexibleWindow: 0,
      flexible: false
    }
  });

  const query = watch();

  const onSubmit = (values: FormData) => {
    setSubmittedSearch(toSearchParams(values));
    setMessage(
      values.ndcOnly
        ? 'NDC-only filtering is disabled for v1 because the servicing path is classic GDS only.'
        : 'Classic GDS content only. NDC, hotel, and car booking remain out of scope in v1.'
    );
  };

  const handleSelect = (flight: FlightResult) => {
    revalidateResult.mutate(flight, {
      onSuccess: (result) => {
        setActiveFlight(flight);
        setBookingSession({
          passengers: Array.from({ length: query.adults + query.children + query.infants }).map(() => ({
            title: 'Mr',
            firstName: '',
            lastName: '',
            dob: '',
            nationality: '',
            passportNumber: '',
            passportExpiry: '',
            issuingCountry: '',
            gender: 'X' as const
          }))
        });
        setMessage(result.warnings[0] || 'Fare revalidated. Continue to booking creation.');
        router.push('/booking/new');
      },
      onError: (error) => {
        setMessage(error.message || 'Revalidation failed.');
      }
    });
  };

  return (
    <div className="space-y-6 text-[13px]">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Air Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Classic-air shopping and booking only. Unsupported content is filtered out before booking.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-3">
            Search criteria
            <Badge variant="confirmed">Classic GDS only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
              <div className="xl:col-span-1">
                <Label>Trip type</Label>
                <select
                  {...register('tripType')}
                  className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring w-full"
                >
                  <option value="one-way">One-way</option>
                  <option value="return">Return</option>
                  <option value="multi-city">Multi-city</option>
                </select>
              </div>

              <div className="xl:col-span-1">
                <AirportAutocomplete label="Origin" value={query.origin} onChange={(value) => setValue('origin', value)} />
              </div>
              <div className="xl:col-span-1">
                <AirportAutocomplete label="Destination" value={query.destination} onChange={(value) => setValue('destination', value)} />
              </div>

              <div>
                <DateRangePicker label="Departure" value={query.departure || null} onChange={(date) => setValue('departure', date ?? null)} />
              </div>
              {query.tripType === 'return' ? (
                <div>
                  <DateRangePicker label="Return" value={query.returnDate || null} onChange={(date) => setValue('returnDate', date ?? null)} />
                </div>
              ) : (
                <div>
                  <Label>Preferred airline</Label>
                  <Input {...register('preferredAirline')} placeholder="Optional" />
                </div>
              )}

              <div>
                <Label>Cabin</Label>
                <Select value={query.cabin} onValueChange={(value: FormData['cabin']) => setValue('cabin', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cabin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Economy">Economy</SelectItem>
                    <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="First">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
              <div>
                <Label>Adults</Label>
                <Input type="number" min={1} max={9} {...register('adults', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Children</Label>
                <Input type="number" min={0} max={9} {...register('children', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Infants</Label>
                <Input type="number" min={0} max={9} {...register('infants', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Max stops</Label>
                <Input type="number" min={0} max={5} {...register('maxStops', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Flexible days</Label>
                <Input type="number" min={-3} max={3} {...register('flexibleWindow', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center gap-2 h-9">
                <input id="ndcOnly" type="checkbox" {...register('ndcOnly')} className="h-4 w-4 rounded border-border" />
                <Label htmlFor="ndcOnly">Request NDC only</Label>
              </div>
            </div>

            {(errors.origin || errors.destination) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm">
                {errors.origin?.message || errors.destination?.message}
              </div>
            )}

            {message && (
              <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900 text-sm">
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={revalidateResult.isPending}>Search classic content</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {flightsQuery.isError && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-destructive">
            {(flightsQuery.error as Error)?.message || 'Unable to load flights.'}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        {flightsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-32" />)
          : flightsQuery.data?.map((flight) => (
              <Card key={flight.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{flight.airline} {flight.flightNumber}</span>
                      <Badge variant="neutral">{flight.contentType}</Badge>
                      {flight.refundable && <Badge variant="confirmed">Refundable</Badge>}
                    </div>
                    <div className="text-foreground">{flight.origin} → {flight.destination}</div>
                    <div className="text-muted-foreground text-sm">
                      {new Date(flight.departure).toLocaleString()} · {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`} · {flight.aircraft}
                    </div>
                    <div className="text-muted-foreground text-sm">{flight.fareRulesSummary}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[28px] font-bold text-foreground tracking-tight leading-none">
                      {flight.currency} {flight.price}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{flight.baggageAllowance}</div>
                    <Button className="mt-3" onClick={() => handleSelect(flight)} disabled={!flight.bookingSupported || revalidateResult.isPending}>
                      {revalidateResult.isPending ? 'Revalidating…' : 'Revalidate and book'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

        {submittedSearch && !flightsQuery.isLoading && !flightsQuery.data?.length && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No classic-air results matched this search. Remove the NDC-only filter or widen the search criteria.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
