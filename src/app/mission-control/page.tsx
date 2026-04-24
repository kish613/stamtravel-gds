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
import type { FidsRow } from '@/lib/types';

export default function MissionControlPage() {
  const { data: pnrs, isLoading: loadingPnr } = usePnrList();
  const { data: queues, isLoading: loadingQ } = useQueues();
  const { data: fids, isLoading: loadingFids } = useFids();

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

        <FIDSBoard
          departures={fids?.departures || []}
          arrivals={fids?.arrivals || []}
          myPnrs={myPnrRows}
          mode={fidsMode}
          onModeChange={setFidsMode}
          loading={loadingFids}
        />

        <div className="sticky top-[var(--nav-height)] z-20">
          <CommandBar />
        </div>

        {/* Left rail — hoisted above the main grid at LG (1024-1279),
            stacks single-column below LG, hidden at XL (handled inside grid). */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:hidden">
          <KpiStack kpis={kpis} />
          <CreditBank credits={credits} />
        </div>

        {/* Main grid — 3 rails XL / 2 rails LG / 1 rail MD */}
        <div className="grid items-start gap-5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(280px,320px)]">
          {/* LEFT RAIL — only visible at XL */}
          <div className="hidden xl:flex flex-col gap-4">
            <KpiStack kpis={kpis} />
            <CreditBank credits={credits} />
          </div>

          {/* CENTER RAIL */}
          <div className="flex flex-col gap-4 min-w-0">
            {loadingPnr ? (
              <div className="p-6 rounded-[14px] bg-white border border-slate-200 text-slate-400 text-[13px]">
                Loading PNR work…
              </div>
            ) : (
              <PnrWorkList pnrs={pnrList} now={now ?? Date.now()} />
            )}
          </div>

          {/* RIGHT RAIL */}
          <div className="flex flex-col gap-4 min-w-0">
            <TtlTicker pnrs={pnrList} />
            <IntegrationsPanel />
          </div>
        </div>

        {loadingQ ? (
          <div className="p-6 rounded-[14px] bg-white border border-slate-200 text-slate-400 text-[13px]">
            Loading queues…
          </div>
        ) : (
          <QueueStrip queues={queueList} now={now ?? Date.now()} />
        )}
      </div>
    </div>
  );
}
