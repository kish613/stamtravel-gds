'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { AgencyCredentialsPublic, SabreEnv } from '@/lib/sabre';

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
  { code: 'EW', name: 'Eurowings' }
] as const;

type FormState = {
  env: SabreEnv;
  pcc: string;
  epr: string;
  password: string;
  clientId: string;
  clientSecret: string;
  iata: string;
  arc: string;
  ndcCarriers: string[];
};

const EMPTY: FormState = {
  env: 'CERT',
  pcc: '',
  epr: '',
  password: '',
  clientId: '',
  clientSecret: '',
  iata: '',
  arc: '',
  ndcCarriers: NDC_OPTIONS.map((c) => c.code)
};

export function CredentialsForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [publicCreds, setPublicCreds] = useState<AgencyCredentialsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = async () => {
    const res = await fetch('/api/credentials');
    if (!res.ok) return;
    const data = (await res.json()) as AgencyCredentialsPublic | null;
    setPublicCreds(data);
    if (data) {
      setForm((f) => ({
        ...f,
        env: data.env,
        pcc: data.pcc,
        iata: data.iata ?? '',
        arc: data.arc ?? '',
        ndcCarriers: data.ndcCarriers.length ? data.ndcCarriers : f.ndcCarriers
      }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    setMessage(null);
    const res = await fetch('/api/credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      setPublicCreds(data);
      setMessage({ tone: 'ok', text: 'Credentials saved.' });
      setForm((f) => ({ ...f, password: '', clientSecret: '' }));
    } else {
      setMessage({ tone: 'error', text: data.error ?? 'Save failed' });
    }
  };

  const onTest = async () => {
    setMessage(null);
    const res = await fetch('/api/credentials/test', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.ok) {
      setMessage({ tone: 'ok', text: `Verified at ${new Date(data.verifiedAt).toLocaleString()}` });
      load();
    } else {
      setMessage({ tone: 'error', text: data.error ?? 'Test failed' });
    }
  };

  const onDelete = async () => {
    if (!confirm('Remove stored Sabre credentials for this agency?')) return;
    const res = await fetch('/api/credentials', { method: 'DELETE' });
    if (res.ok) {
      setPublicCreds(null);
      setForm(EMPTY);
      setMessage({ tone: 'ok', text: 'Credentials removed.' });
    }
  };

  const toggleCarrier = (code: string, on: boolean) =>
    setForm((f) => ({
      ...f,
      ndcCarriers: on
        ? Array.from(new Set([...f.ndcCarriers, code]))
        : f.ndcCarriers.filter((c) => c !== code)
    }));

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex flex-col gap-5"
    >
      <div className="bg-muted/40 text-muted-foreground rounded-md border border-border p-3 text-sm">
        Billed to your Sabre contract. Dev search runs on our shared search-only pool. Any
        booking, ticketing, PNR retrieval, or queue write uses your credentials.
      </div>

      {publicCreds && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span>
            <strong>Connected:</strong> {publicCreds.pcc} · {publicCreds.env}
            {publicCreds.verifiedAt && (
              <span className="text-muted-foreground ml-2">
                verified {new Date(publicCreds.verifiedAt).toLocaleString()}
              </span>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Environment</Label>
          <Select
            value={form.env}
            onValueChange={(v) => setForm((f) => ({ ...f, env: v as SabreEnv }))}
          >
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
          <Label htmlFor="pcc">PCC / iPCC</Label>
          <Input
            id="pcc"
            required
            value={form.pcc}
            onChange={(e) => setForm((f) => ({ ...f, pcc: e.target.value.toUpperCase() }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="epr">EPR (user)</Label>
          <Input
            id="epr"
            value={form.epr}
            onChange={(e) => setForm((f) => ({ ...f, epr: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">
            Password {publicCreds?.hasPassword && <span className="text-muted-foreground">(set)</span>}
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="off"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={publicCreds?.hasPassword ? '●●●●●●●●  leave blank to keep' : ''}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            required
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            autoComplete="off"
            required={!publicCreds?.hasPassword}
            value={form.clientSecret}
            onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
            placeholder={publicCreds?.hasPassword ? '●●●●●●●●  leave blank to keep' : ''}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="iata">IATA</Label>
          <Input
            id="iata"
            inputMode="numeric"
            value={form.iata}
            onChange={(e) => setForm((f) => ({ ...f, iata: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="arc">ARC</Label>
          <Input
            id="arc"
            inputMode="numeric"
            value={form.arc}
            onChange={(e) => setForm((f) => ({ ...f, arc: e.target.value }))}
          />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="mb-2 block">NDC carrier activations</Label>
        <p className="text-muted-foreground mb-3 text-xs">
          Select which NDC carriers your agency has activated in Sabre Central Marketplace.
          Offers from these airlines will route through the NDC Offer/Order path.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {NDC_OPTIONS.map((c) => (
            <label key={c.code} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.ndcCarriers.includes(c.code)}
                onCheckedChange={(v) => toggleCarrier(c.code, Boolean(v))}
              />
              <span className="font-mono">{c.code}</span>
              <span className="text-muted-foreground">— {c.name}</span>
            </label>
          ))}
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.tone === 'ok' ? 'text-status-good' : 'text-destructive'}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="outline" onClick={onTest} disabled={!publicCreds}>
          Test connection
        </Button>
        {publicCreds && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete credentials
          </Button>
        )}
      </div>
    </form>
  );
}
