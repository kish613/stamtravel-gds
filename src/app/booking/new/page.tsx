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
import { AlertCircle, Plus, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
        <Card>
          <CardHeader>
            <CardTitle>PNR Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[14px] font-semibold text-muted-foreground">Record Locator</div>
            <div className="text-[32px] font-mono font-bold text-foreground tracking-tight">{createdLocator}</div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => { navigator.clipboard.writeText(createdLocator).catch(() => undefined); }}>
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
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Review and create</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UiCard>
              <CardContent className="p-3">
                <div className="text-muted-foreground text-[12px]">Base fare</div>
                <div className="font-semibold text-foreground">${totalPrice}</div>
              </CardContent>
            </UiCard>
            <UiCard>
              <CardContent className="p-3">
                <div className="text-muted-foreground text-[12px]">Taxes</div>
                <div className="font-semibold text-foreground">${Math.round(totalPrice * 0.15)}</div>
              </CardContent>
            </UiCard>
            <UiCard>
              <CardContent className="p-3">
                <div className="text-muted-foreground text-[12px]">Fees</div>
                <div className="font-semibold text-foreground">${Math.round(totalPrice * 0.05)}</div>
              </CardContent>
            </UiCard>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 font-semibold text-lg text-foreground">
            Total: ${Math.round(totalPrice * 1.2)}
          </div>
          {ttlMinutes < 120 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-700 p-2.5 flex items-center gap-2 text-[12px]">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Ticketing deadline is approaching.
            </div>
          )}
          <div className="text-right">
            <Button onClick={handleSubmit(onSubmit)} disabled={createPnr.isPending}>
              {createPnr.isPending ? 'Creating...' : 'Create PNR'}
            </Button>
          </div>
          {createPnr.error && (
            <div className="text-destructive text-sm">{(createPnr.error as Error).message}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">New Booking</h1>
        <p className="text-sm text-muted-foreground mt-1">Build and create a passenger name record step by step</p>
      </div>

      {/* Step indicator */}
      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          {steps.map((label, idx) => {
            const step = idx + 1;
            const active = step === currentStep;
            const done = step < currentStep;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium',
                    active ? 'bg-primary text-primary-foreground' : done ? 'bg-muted text-muted-foreground' : 'border border-border text-muted-foreground'
                  )}
                >
                  {step}
                </span>
                <span className={cn('text-[13px]', active ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {stepContent()}

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
        >
          <Minus className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => { if (currentStep < 5) setCurrentStep((prev) => prev + 1); }}
          disabled={currentStep === 5 || (currentStep === 1 ? false : currentStep === 5)}
          variant={currentStep < 5 ? 'outline' : 'default'}
        >
          {currentStep === 5 ? 'Done' : <><Plus className="h-4 w-4 mr-1" /> Next</>}
        </Button>
      </div>
    </div>
  );
}
