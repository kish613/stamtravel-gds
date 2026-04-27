'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import type { SabreEnv } from '@/lib/sabre';

const NDC_OPTIONS = [
  { code: 'BA', name: 'British Airways' },
  { code: 'IB', name: 'Iberia' },
  { code: 'AA', name: 'American Airlines' },
  { code: 'UA', name: 'United Airlines' },
  { code: 'DL', name: 'Delta Air Lines' },
  { code: 'LY', name: 'El Al' },
  { code: 'LH', name: 'Lufthansa' },
  { code: 'LX', name: 'SWISS' },
  { code: 'OS', name: 'Austrian Airlines' },
  { code: 'SN', name: 'Brussels Airlines' },
  { code: 'EW', name: 'Eurowings' },
] as const;

type Step = 'idle' | 'saving' | 'testing' | 'error';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [env, setEnv] = useState<SabreEnv>('CERT');
  const [pcc, setPcc] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [epr, setEpr] = useState('');
  const [password, setPassword] = useState('');
  const [iata, setIata] = useState('');
  const [arc, setArc] = useState('');
  const [ndcCarriers, setNdcCarriers] = useState<string[]>(NDC_OPTIONS.map((c) => c.code));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testWarning, setTestWarning] = useState<string | null>(null);

  const toggleCarrier = (code: string, on: boolean) =>
    setNdcCarriers((prev) =>
      on ? Array.from(new Set([...prev, code])) : prev.filter((c) => c !== code)
    );

  const onConnect = async () => {
    setErrorMsg(null);
    setTestWarning(null);
    setStep('saving');

    const body = {
      env,
      pcc,
      clientId,
      clientSecret,
      ...(epr && { epr }),
      ...(password && { password }),
      ...(iata && { iata }),
      ...(arc && { arc }),
      ndcCarriers,
    };

    const saveRes = await fetch('/api/credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!saveRes.ok) {
      const data = await saveRes.json().catch(() => ({}));
      setErrorMsg(data.error ?? 'Failed to save credentials. Check all fields and try again.');
      setStep('error');
      return;
    }

    setStep('testing');
    const testRes = await fetch('/api/credentials/test', { method: 'POST' });
    if (!testRes.ok) {
      const data = await testRes.json().catch(() => ({}));
      setTestWarning(data.error ?? 'Credentials saved but connection test failed. You can continue and retry from Settings.');
    }

    onComplete();
  };

  const isLoading = step === 'saving' || step === 'testing';
  const canSubmit = pcc.trim().length >= 2 && clientId.trim().length > 0 && clientSecret.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/70 backdrop-blur-sm px-4">
      <Card
        variant="pro"
        accent="brand"
        className="w-full max-w-md"
      >
        <CardContent className="pt-8 pb-7 px-8">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-5">
            <Image
              src="/brand/logomark.svg"
              alt="GDSimple"
              width={28}
              height={28}
              className="h-7 w-7 flex-shrink-0"
            />
            <span
              className="font-display font-extrabold tracking-tight text-[19px] leading-none select-none"
              style={{ color: '#0A2540' }}
            >
              GDS<span className="font-medium" style={{ color: '#25A5B4' }}>imple</span>
            </span>
          </div>

          <Eyebrow className="mb-2">Getting started</Eyebrow>
          <h2 className="font-display text-[22px] font-extrabold tracking-tight text-foreground leading-tight mb-1">
            Connect your Sabre account
          </h2>
          <p className="text-[13px] text-muted-foreground mb-6">
            Enter your agency credentials to unlock bookings, ticketing, and queue management.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit && !isLoading) onConnect();
            }}
            className="flex flex-col gap-4"
          >
            {/* Essential fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Environment</Label>
                <Select value={env} onValueChange={(v) => setEnv(v as SabreEnv)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CERT">CERT (sandbox)</SelectItem>
                    <SelectItem value="PROD">PROD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ob-pcc">PCC / iPCC</Label>
                <Input
                  id="ob-pcc"
                  required
                  value={pcc}
                  onChange={(e) => setPcc(e.target.value.toUpperCase())}
                  placeholder="e.g. 7TZA"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ob-clientId">Client ID</Label>
              <Input
                id="ob-clientId"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="V1:…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ob-clientSecret">Client Secret</Label>
              <Input
                id="ob-clientSecret"
                type="password"
                autoComplete="off"
                required
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Advanced settings
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ob-epr">EPR (user)</Label>
                    <Input id="ob-epr" value={epr} onChange={(e) => setEpr(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ob-password">Password</Label>
                    <Input id="ob-password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ob-iata">IATA</Label>
                    <Input id="ob-iata" inputMode="numeric" value={iata} onChange={(e) => setIata(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ob-arc">ARC</Label>
                    <Input id="ob-arc" inputMode="numeric" value={arc} onChange={(e) => setArc(e.target.value)} />
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">NDC carrier activations</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {NDC_OPTIONS.map((c) => (
                      <label key={c.code} className="flex items-center gap-2 text-[12px] cursor-pointer">
                        <Checkbox
                          checked={ndcCarriers.includes(c.code)}
                          onCheckedChange={(v) => toggleCarrier(c.code, Boolean(v))}
                        />
                        <span className="font-mono">{c.code}</span>
                        <span className="text-muted-foreground truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error / warning */}
            {errorMsg && (
              <p className="text-[12px] text-destructive bg-destructive/8 rounded-[8px] px-3 py-2">
                {errorMsg}
              </p>
            )}
            {testWarning && (
              <p className="text-[12px] text-amber-600 bg-amber-50 rounded-[8px] px-3 py-2">
                {testWarning}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!canSubmit || isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 'saving' ? 'Saving…' : step === 'testing' ? 'Testing connection…' : 'Connect & continue'}
              </Button>
              <button
                type="button"
                onClick={onComplete}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Skip for now
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
