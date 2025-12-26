
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, InputGroup, Card, Badge } from '@/components/ui/LayoutComponents';
import { getAdminSettings, updateBanners } from '@/lib/admin-api';
import { Banner } from '@/types';

export default function AdminBannersPage() {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);

  // Simple Mock Stats
  const stats = {
    A: { impressions: 1200, clicks: 45, ctr: 3.75 },
    B: { impressions: 980, clicks: 52, ctr: 5.30 },
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAdminSettings();
      // If no banners from DB, initialize defaults
      if (!data.banners || data.banners.length === 0) {
        setBanners([
          { id: '1', variant: 'A', imageUrl: '', linkUrl: '', weight: 50, is_active: true },
          { id: '2', variant: 'B', imageUrl: '', linkUrl: '', weight: 50, is_active: true }
        ]);
      } else {
        setBanners(data.banners);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUpdate = (index: number, field: keyof Banner, value: any) => {
    const newBanners = [...banners];
    // @ts-ignore
    newBanners[index][field] = value;
    setBanners(newBanners);
  };

  const saveChanges = async () => {
    try {
      await updateBanners(banners);
      alert('Banners Updated!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-10 text-center text-zinc-500">Loading Banners...</div>;

  return (
    <div className="p-6 pt-10 pb-20">
      <Link href="/admin" className="text-zinc-500 text-sm mb-4 block">← Back</Link>
      <h1 className="text-2xl font-bold mb-2">Banner A/B Test</h1>
      <p className="text-zinc-500 text-sm mb-6">Manage footer affiliate banners and weights.</p>

      <div className="space-y-8">
        {banners.map((banner, idx) => (
          <Card key={idx} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-50 text-9xl font-bold text-zinc-800 -z-0 pointer-events-none">
              {banner.variant}
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                 <Badge variant={banner.variant === 'B' ? 'warning' : 'neutral'}>Variant {banner.variant}</Badge>
                 <div className="text-xs text-zinc-400">
                    CTR: <span className="text-emerald-400 font-bold">
                      {/* @ts-ignore */}
                      {stats[banner.variant]?.ctr}%
                    </span>
                 </div>
              </div>

              <InputGroup 
                label="Headline / Image Alt" 
                value={banner.imageUrl} 
                onChange={e => handleUpdate(idx, 'imageUrl', e.target.value)}
                placeholder="e.g. Join Pro Trading"
              />
              
              <InputGroup 
                label="Target Link URL" 
                value={banner.linkUrl} 
                onChange={e => handleUpdate(idx, 'linkUrl', e.target.value)}
                placeholder="https://..."
              />

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Traffic Weight</span>
                  <span className="font-mono font-bold">{banner.weight}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={banner.weight} 
                  onChange={e => handleUpdate(idx, 'weight', Number(e.target.value))}
                  className="w-full accent-brand-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full p-4 bg-zinc-950/80 backdrop-blur border-t border-zinc-900 flex justify-center max-w-md mx-auto left-0 right-0">
        <Button onClick={saveChanges}>
           Publish Changes
        </Button>
      </div>
    </div>
  );
}
