
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, InputGroup, Card } from '@/components/ui/LayoutComponents';
import { getAdminSettings, updateGlobalSettings } from '@/lib/admin-api';
import { AdminSettings } from '@/types';

export default function AdminFXPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [manualRate, setManualRate] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAdminSettings();
      setSettings(data.settings);
      setManualRate(data.settings.manual_fx_rate.toString());
    } catch (e) {
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUpdate = async (updates: Partial<AdminSettings>) => {
    try {
      await updateGlobalSettings(updates);
      await refresh();
      alert('Updated Successfully');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading || !settings) return <div className="p-10 text-center">Loading Admin Data...</div>;

  return (
    <div className="p-6 pt-10">
      <Link href="/admin" className="text-zinc-500 text-sm mb-4 block">← Back</Link>
      <h1 className="text-2xl font-bold mb-6">FX Rate Control</h1>

      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="font-bold">Sync Mode</span>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {['AUTO', 'MANUAL'].map(m => (
              <button
                key={m}
                onClick={() => handleUpdate({ fx_mode: m as any })}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${settings.fx_mode === m ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {settings.fx_mode === 'AUTO' ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <i className="ri-check-double-line"></i> Auto-Sync Active
            </div>
            <p className="text-xs text-zinc-400">Synced daily from Korea Customs Service.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <InputGroup 
              label="Manual USD/KRW" 
              value={manualRate} 
              onChange={e => setManualRate(e.target.value)}
              className="font-mono"
            />
            <Button variant="secondary" onClick={() => handleUpdate({ manual_fx_rate: Number(manualRate) })}>
              Update Rate
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
