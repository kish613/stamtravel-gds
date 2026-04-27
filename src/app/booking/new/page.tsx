'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/stores/app-store';
import { useCreatePnr } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card as UiCard } from '@/components/ui/card';
import { AlertCircle, Plus, Minus, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { ActionBar } from '@/components/ui/action-bar';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { KpiTile } from '@/components/ui/kpi-tile';
import { KpiStrip } from '@/components/ui/kpi-strip';

const ssrCodes = [
  ['WCHR', 'Wheelchair', 'Passenger requires wheelchair'],
  ['AVIH', 'Aviation handling', 'Special meal and handling'],
  ['BLND', 'Blind assistance', 'Visual impairment support'],
  ['SEAT', 'Seat preference', 'Window/Aisle preference'],
  ['CHD', 'Child seat', 'Child seat request']
];

const contactStepSchema = z.object({
  passengers: z
    .array(
      z.object({
        title: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dob: z.string().min(1),
        nationality: z.string().min(1),
        passportNumber: z.string().min(1),
        passportExpiry: z.string().min(1),
        issuingCountry: z.string().min(1),
        gender: z.string().optional()
      })
    )
    .min(1)
    .max(9),
  phone: z.string().min(1),
  phoneType: z.enum(['Office', 'Mobile']),
  email: z.string().email(),
  agencyIata: z.string().min(3),
  ticketingArrangement: z.enum(['Ticket At Will', 'Ticket By Date']),
  ticketByDate: z.string().optional(),
  ssrs: z.array(z.string()),
  remarks: z.string().optional(),
  seatRequests: z.record(z.string(), z.boolean()).optional()
});

const steps = ['Passengers', 'Itinerary', 'Contact', 'Special requests', 'Review'];

export default function BookingWizardPage() {
  const router = useRouter();
  const booking = useAppStore((state) => state.booking);
  const setBookingSession = useAppStore((state) => state.setBookingSession);
  const addAirSegment = useAppStore((state) => state.addAirSegment);
  const removeAirSegment = useAppStore((state) => state.removeAirSegment);
  const resetBookingSession = useAppStore((state) => state.resetBookingSession);

  const createPnr = useCreatePnr();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdLocator, setCreatedLocator] = useState<string | null>(null);

  const passengerCount = Math.max(1, booking.passengers.length || 1);
  const needsUsaTsa = useMemo(() => {
    return booking.airSegments.some((segment) => segment.from === 'JFK' || segment.to === 'JFK' || segment.from === 'EWR' || segment.to === 'EWR');
  }, [booking.airSegments]);

  const { control, register, handleSubmit, watch, setValue } = useForm<z.infer<typeof contactStepSchema>>({
    resolver: zodResolver(contactStepSchema),
    defaultValues: {
      passengers: Array.from({ length: passengerCount }).map((_, idx) => {
        const existing = booking.passengers[idx];
        return {
          title: existing?.title || 'Mr',
          firstName: existing?.firstName || '',
          lastName: existing?.lastName || '',
          dob: existing?.dob || '',
          nationality: existing?.nationality || '',
          passportNumber: existing?.passportNumber || '',
          passportExpiry: existing?.passportExpiry || '',
          issuingCountry: existing?.issuingCountry || '',
          gender: existing?.gender || 'X'
        };
      }),
      phone: booking.contact?.phone || '',
      phoneType: booking.contact?.phoneType || 'Office',
      email: booking.contact?.email || '',
      agencyIata: booking.contact?.agencyIata || '',
      ticketingArrangement: booking.contact?.ticketingArrangement || 'Ticket At Will',
      ticketByDate: booking.contact?.ticketByDate || '',
      ssrs: booking.ssrs || [],
      remarks: booking.remarks || '',
      seatRequests: booking.specialRequestSeatMap
    }
  });

  useFieldArray({ control, name: 'passengers' });

  const selectedSSR = watch('ssrs') || [];

  const activeFlightPrice = booking.activeFlight?.price || 0;
  const totalPrice = activeFlightPrice;
  const ttlMinutes = booking.airSegments.reduce((acc, seg) => {
    const deadline = new Date(seg.deadlineAt).getTime();
    const now = Date.now();
    const minutes = Math.max(0, Math.ceil((deadline - now) / 60000));
    return Math.min(acc, minutes);
  }, 999);

  const onSubmit = (payload: z.infer<typeof contactStepSchema>) => {
    const finalPayload = {
      payload: {
        segments: booking.airSegments,
        passengers: payload.passengers,
        contact: {
          phone: `${payload.phoneType}: ${payload.phone}`,
          email: payload.email,
          agencyIata: payload.agencyIata
        },
        pricing: {
          total: totalPrice,
          taxes: Math.round(totalPrice * 0.15),
          fees: Math.round(totalPrice * 0.05),
          currency: 'USD'
        }
      }
    };

    createPnr.mutate(finalPayload, {
      onSuccess: (result: any) => {
        setCreatedLocator(result.locator);
        setBookingSession({
          ...booking,
          contact: {
            phone: payload.phone,
            phoneType: payload.phoneType,
            email: payload.email,
            agencyIata: payload.agencyIata,
            ticketingArrangement: payload.ticketingArrangement,
            ticketByDate: payload.ticketByDate
          },
          ssrs: payload.ssrs,
          remarks: payload.remarks,
          specialRequestSeatMap: booking.specialRequestSeatMap
        });
      }
    });
  };

  const stepContent = () => {
    if (createdLocator && currentStep === 5) {
      return (
        <Card variant="pro" accent="good">
          <CardHeader>
            <CardTitle>PNR Created</CardTitle>
            <Eyebrow className="text-[var(--color-status-good)]">Success</Eyebrow>
          </CardHeader>
          <CardContent>
            <Eyebrow as="div" className="mb-2">Record Locator</Eyebrow>
            <div className="font-display text-[32px] font-extrabold text-[var(--brand-navy-800)] tracking-tight tabular-nums font-mono">
              {createdLocator}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={() => { navigator.clipboard.writeText(createdLocator).catch(() => undefined); }}>
                Copy locator
              </Button>
              <Button variant="outline" onClick={() => router.push(`/bookings/${createdLocator}`)}>
                View PNR
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 1) {
      return (
        <Card variant="pro" accent="brand">
          <CardHeader>
            <CardTitle>Passenger Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={`p-${0}`}>
              <TabsList>
                {Array.from({ length: passengerCount }).map((_, idx) => (
                  <TabsTrigger key={idx} value={`p-${idx}`}>Traveller {idx + 1}</TabsTrigger>
                ))}
              </TabsList>
              {Array.from({ length: passengerCount }).map((_, idx) => (
                <TabsContent key={idx} value={`p-${idx}`} className="space-y-2 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input {...register(`passengers.${idx}.title` as const)} placeholder="Title" />
                    <Input {...register(`passengers.${idx}.firstName` as const)} placeholder="First" />
                    <Input {...register(`passengers.${idx}.lastName` as const)} placeholder="Last" />
                    <Input type="date" {...register(`passengers.${idx}.dob` as const)} placeholder="DOB" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input {...register(`passengers.${idx}.nationality` as const)} placeholder="Nationality" />
                    <Input {...register(`passengers.${idx}.issuingCountry` as const)} placeholder="Issuing country" />
                    <Input {...register(`passengers.${idx}.passportNumber` as const)} placeholder="Passport number" />
                    <Input {...register(`passengers.${idx}.passportExpiry` as const)} placeholder="Passport expiry" />
                  </div>
                  {needsUsaTsa && (
                    <div>
                      <Label>Gender (Secure Flight)</Label>
                      <select
                        {...register(`passengers.${idx}.gender` as const)}
                        className="h-8 rounded-md border border-input bg-background px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                        <option value="X">X</option>
                      </select>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 2) {
      return (
        <Card variant="pro" accent="brand">
          <CardHeader>
            <CardTitle>Itinerary Review</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.airSegments.length === 0 ? (
              <div className="text-muted-foreground">No segments selected yet. Return to Air Search and select a flight.</div>
            ) : (
              <div className="space-y-2">
                {booking.airSegments.map((segment) => (
                  <div key={segment.id} className="rounded-md border border-border bg-muted/30 p-2.5 flex items-center justify-between">
                    <div className="text-foreground">{segment.from} → {segment.to} · {segment.flightNumber} · {segment.cabin}</div>
                    <Button size="sm" variant="outline" onClick={() => removeAirSegment(segment.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 3) {
      return (
        <Card variant="pro" accent="brand">
          <CardHeader>
            <CardTitle>Contact and ticketing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input {...register('phone')} placeholder="Phone" />
              <Input {...register('email')} placeholder="Email" />
              <Input {...register('agencyIata')} placeholder="Agency IATA" />
              <select
                {...register('phoneType')}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Office">Office</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Ticketing arrangement</div>
              <label className="flex items-center gap-2">
                <input type="radio" value="Ticket At Will" {...register('ticketingArrangement')} />
                Ticket At Will
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="Ticket By Date" {...register('ticketingArrangement')} />
                Ticket By Date
              </label>
            </div>
            {watch('ticketingArrangement') === 'Ticket By Date' && (
              <Input type="date" {...register('ticketByDate')} />
            )}
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 4) {
      return (
        <Card variant="pro" accent="brand">
          <CardHeader>
            <CardTitle>Special Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ssrCodes.map(([code, label, desc]) => {
                const checked = selectedSSR.includes(code);
                return (
                  <label
                    key={code}
                    className={cn(
                      'flex items-start gap-2 rounded-md border p-2.5 transition-colors cursor-pointer',
                      checked ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const values = new Set(selectedSSR);
                        if (e.target.checked) values.add(code);
                        else values.delete(code);
                        setValue('ssrs', Array.from(values));
                      }}
                    />
                    <span className="text-[12px]">
                      <span className="font-semibold">{code}</span> — {label} · {desc}
                    </span>
                  </label>
                );
              })}
            </div>

            <Textarea {...register('remarks')} rows={3} placeholder="Remarks" />

            <div className="space-y-2">
              {booking.airSegments.map((seg) => (
                <label key={seg.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2.5">
                  <span>{seg.from}→{seg.to} {seg.flightNumber}</span>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span>Request preferred seat</span>
                    <input type="checkbox" {...register(`seatRequests.${seg.id}` as const)} />
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card variant="pro" accent="brand">
        <CardHeader>
          <CardTitle>Review and create</CardTitle>
          <Eyebrow>Step 5 of 5</Eyebrow>
        </CardHeader>
        <CardContent className="space-y-3">
          <KpiStrip cols={3}>
            <KpiTile
              label="Base Fare"
              value={`$${totalPrice.toLocaleString()}`}
              tone="brand"
            />
            <KpiTile
              label="Taxes"
              value={`$${Math.round(totalPrice * 0.15).toLocaleString()}`}
              tone="neutral"
            />
            <KpiTile
              label="Fees"
              value={`$${Math.round(totalPrice * 0.05).toLocaleString()}`}
              tone="neutral"
            />
          </KpiStrip>
          <div
            className="rounded-[12px] border bg-[var(--brand-teal-100)] px-4 py-3 flex items-center justify-between"
            style={{ borderColor: '#B7E6EB' }}
          >
            <Eyebrow>Grand total</Eyebrow>
            <div className="font-display text-[24px] font-extrabold tabular-nums text-[var(--brand-navy-800)]">
              ${Math.round(totalPrice * 1.2).toLocaleString()}
            </div>
          </div>
          {ttlMinutes < 120 && (
            <div
              className="rounded-[10px] border bg-[#FDF5E6] text-[#9E6612] p-2.5 flex items-center gap-2 text-[12px]"
              style={{ borderColor: '#F5E0B0' }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Ticketing deadline is approaching.
            </div>
          )}
          {createPnr.error && (
            <div className="text-destructive text-sm">{(createPnr.error as Error).message}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  const isReview = currentStep === 5;
  const reviewReady = isReview && !createdLocator;

  return (
    <div className="space-y-5 text-[13px] pb-4">
      <PageHeader
        eyebrow={<>Step {currentStep} of {steps.length} · {steps[currentStep - 1]}</>}
        title="New Booking"
        meta="Build and create a passenger name record step by step"
      />

      <Card variant="pro">
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            {steps.map((label, idx) => {
              const step = idx + 1;
              const active = step === currentStep;
              const done = step < currentStep;
              return (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                      active
                        ? 'bg-[var(--brand-navy-800)] text-white shadow-[0_0_0_3px_rgba(37,165,180,0.25)]'
                        : done
                        ? 'bg-[var(--brand-teal-100)] text-[var(--brand-navy-800)]'
                        : 'border border-border text-muted-foreground bg-background'
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : step}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[11px] uppercase tracking-[0.14em]',
                      active
                        ? 'text-[var(--brand-navy-800)] font-bold'
                        : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                  {idx < steps.length - 1 && (
                    <span className="hidden md:inline-block h-px w-6 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {stepContent()}

      <ActionBar
        meta={
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Step {currentStep} / {steps.length}
          </span>
        }
        secondary={
          <Button
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          >
            <Minus className="h-4 w-4 mr-1" /> Back
          </Button>
        }
        primary={
          reviewReady ? (
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              disabled={createPnr.isPending}
            >
              {createPnr.isPending ? 'Creating…' : 'Create PNR'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                if (currentStep < 5) setCurrentStep((prev) => prev + 1);
              }}
              disabled={currentStep === 5}
            >
              {currentStep === 5 ? 'Done' : (<><Plus className="h-4 w-4 mr-1" /> Next</>)}
            </Button>
          )
        }
      />
    </div>
  );
}
