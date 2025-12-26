
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card } from '@/components/ui/LayoutComponents';
import { CalculationLog } from '@/types';

const PLATFORMS = [
  { id: 'kream', label: 'KREAM', color: 'bg-zinc-800', icon: 'ri-vip-diamond-line' },
  { id: 'stockx', label: 'StockX', color: 'bg-green-900/40 text-green-400', icon: 'ri-stock-line' },
  { id: 'soldout', label: 'SoldOut', color: 'bg-zinc-800', icon: 'ri-shirt-line' },
  { id: 'smartstore', label: 'Store', color: 'bg-zinc-800', icon: 'ri-store-2-line' },
];

export default function HomePage() {
  const [history, setHistory] = useState<CalculationLog[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('trbachk_history');
    if (stored) {
      setHistory(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  return (
    <div className="p-6 flex flex-col gap-8 pt-12 animate-fade-in">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">TrbaChk</h1>
          <p className="text-zinc-500 text-sm mt-1">Select platform to start</p>
        </div>
        <Link href="/admin" className="opacity-0 pointer-events-none">Admin</Link> {/* Secret link */}
      </header>

      <div className="grid grid-cols-2 gap-4">
        {PLATFORMS.map((p) => (
          <Link href={`/calculator/${p.id}`} key={p.id}>
            <div className={`
              h-32 rounded-2xl border border-zinc-800 p-5 flex flex-col justify-between
              hover:border-zinc-600 transition-all active:scale-95 cursor-pointer
              ${p.color}
            `}>
              <i className={`${p.icon} text-2xl`}></i>
              <span className="font-bold text-lg">{p.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Recent Calculations</h2>
          {history.length > 0 && (
            <button 
              onClick={() => { localStorage.removeItem('trbachk_history'); setHistory([]); }}
              className="text-xs text-zinc-600 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <Card className="py-8 text-center border-dashed border-zinc-800">
            <p className="text-zinc-600 text-sm">No calculation history yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((log, idx) => (
              <Link href={`/result/${log.id}`} key={idx}>
                <Card className="p-4 flex justify-between items-center hover:bg-zinc-900 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase text-zinc-500">{log.platform}</span>
                      <span className="text-xs text-zinc-600">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="font-mono text-sm">
                      Profit: {new Intl.NumberFormat('ko-KR').format(log.result.outcome.profit)}
                    </div>
                  </div>
                  <i className="ri-arrow-right-s-line text-zinc-600"></i>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
