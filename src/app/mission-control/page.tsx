'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePnrList, useQueues, useFids } from '@/lib/query';
import { HeaderRow } from '@/components/mission-control/HeaderRow';
import { FIDSBoard, type FidsMode } from '@/components/mission-control/FIDSBoard';
import { CommandBar } from '@/components/mission-control/CommandBar';
import { KpiStack, buildKpis } from '@/components/mission-control/KpiStack';
import { CreditBank, collectCredits } from '@/components/mission-control/CreditBank';
import { PnrWorkList } from '@/components/mission-control/PnrWorkList';
import { TtlTicker } from '@/components/mission-control/TtlTicker';
import { IntegrationsPanel } from '@/components/mission-control/IntegrationsPanel';
import { QueueStrip } from '@/components/mission-control/QueueStrip';
import { DashboardGrid } from '@/components/mission-control/DashboardGrid';
import { LayoutEditToolbar } from '@/components/mission-control/LayoutEditToolbar';
import { useAppStore } from '@/stores/app-store';
import type { TileId } from '@/lib/dashboard-layout';
import type { FidsRow } from '@/lib/types';

export default function MissionControlPage() {
  const { data: pnrs, isLoading: loadingPnr } = usePnrList();
  const { data: queues, isLoading: loadingQ } = useQueues();
  const { data: fids, isLoading: loadingFids } = useFids();

  const isEditingLayout = useAppStore((s) => s.isEditingLayout);
  const setEditingLayout = useAppStore((s) => s.setEditingLayout);
  const resetDashboardLayouts = useAppStore((s) => s.resetDashboardLayouts);

  const [now, setNow] = useState<number | null>(null);
  const [fidsMode, setFidsMode] = useState<FidsMode>('DEPARTURES');

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const pnrList = pnrs || [];
  const queueList = queues || [];

  const kpis = useMemo(() => buildKpis(pnrList, queueList, now ?? Date.now()), [pnrList, queueList, now]);
  const credits = useMemo(() => collectCredits(pnrList, now ?? Date.now()), [pnrList, now]);

  const myPnrLocators = useMemo(() => new Set(pnrList.map((p) => p.locator)), [pnrList]);
  const myPnrRows: FidsRow[] = useMemo(() => {
    if (!fids) return [];
    return fids.departures.filter((d) => myPnrLocators.has(d.locator));
  }, [fids, myPnrLocators]);

  const tiles: Partial<Record<TileId, { label: string; node: React.ReactNode }>> = {
    'kpi-stack': { label: 'KPIs', node: <KpiStack kpis={kpis} /> },
    'credit-bank': { label: 'Credit Bank', node: <CreditBank credits={credits} /> },
    'fids-board': {
      label: 'Flight Information Display',
      node: (
        <FIDSBoard
          departures={fids?.departures || []}
          arrivals={fids?.arrivals || []}
          myPnrs={myPnrRows}
          mode={fidsMode}
          onModeChange={setFidsMode}
          loading={loadingFids}
        />
      )
    },
    'pnr-work-list': {
      label: 'PNR Work List',
      node: loadingPnr ? (
        <div className="p-6 rounded-[14px] bg-white border border-slate-200 text-slate-400 text-[13px] h-full">
          Loading PNR work…
        </div>
      ) : (
        <PnrWorkList pnrs={pnrList} now={now ?? Date.now()} />
      )
    },
    'ttl-ticker': { label: 'Ticketing Deadlines', node: <TtlTicker pnrs={pnrList} /> },
    'integrations-panel': { label: 'Integrations', node: <IntegrationsPanel /> },
    'queue-strip': {
      label: 'Queues',
      node: loadingQ ? (
        <div className="p-6 rounded-[14px] bg-white border border-slate-200 text-slate-400 text-[13px] h-full">
          Loading queues…
        </div>
      ) : (
        <QueueStrip queues={queueList} now={now ?? Date.now()} />
      )
    }
  };

  return (
    <div className="-mx-8 -my-6 px-8 py-6 w-full max-w-none min-h-screen">
      <style jsx global>{`
        @keyframes mcPulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(0.85);
          }
        }
        @keyframes mcPing {
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        /* ── FIDS board — container-query driven ── */
        .mc-fids {
          container-type: inline-size;
          container-name: mc-fids;
        }
        .mc-fids-grid {
          display: grid;
          grid-template-columns: var(
            --fids-cols,
            62px 82px 1fr 64px 52px 118px
          );
          gap: 12px;
        }
        .mc-fids-tab-short {
          display: none;
        }
        @container mc-fids (max-width: 719px) {
          .mc-fids-grid {
            --fids-cols: 54px 74px 1fr 56px 44px 96px;
          }
        }
        @container mc-fids (max-width: 559px) {
          .mc-fids-grid {
            --fids-cols: 48px 68px 1fr 42px 36px 80px;
          }
          .mc-fids-pax {
            display: none;
          }
          .mc-fids-tab-long {
            display: none;
          }
          .mc-fids-tab-short {
            display: inline;
          }
        }

        /* ── Queue strip — container-query driven ── */
        .mc-queuestrip {
          container-type: inline-size;
          container-name: mc-queuestrip;
        }
        .mc-qs-inner {
          display: grid;
          grid-template-columns: var(--qs-cols, minmax(280px, 320px) 1fr);
          min-height: 148px;
        }
        @container mc-queuestrip (max-width: 819px) {
          .mc-qs-inner {
            --qs-cols: 1fr;
          }
          .mc-qs-rail {
            border-left: none !important;
            border-top: 1px solid #e2e8f0;
          }
        }
      `}</style>

      <div className="flex flex-col gap-5 max-w-[1600px] mx-auto">
        <HeaderRow />

        <div className="sticky top-[var(--nav-height)] z-20">
          <CommandBar />
        </div>

        <DashboardGrid tiles={tiles} />
      </div>

      {isEditingLayout && (
        <LayoutEditToolbar
          onDone={() => setEditingLayout(false)}
          onReset={() => {
            resetDashboardLayouts();
            fetch('/api/dashboard-layout', { method: 'DELETE' }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
