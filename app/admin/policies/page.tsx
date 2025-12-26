
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, InputGroup, Card, Badge } from '@/components/ui/LayoutComponents';
import { getAdminSettings, updateFeeRule } from '@/lib/admin-api';
import { FeeRule, Platform } from '@/types';

export default function AdminPoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('kream');
  
  // Edit Form State
  const [editRule, setEditRule] = useState<Partial<FeeRule>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAdminSettings();
      setFeeRules(data.feeRules);
      
      const current = data.feeRules.find((r: FeeRule) => r.platform === selectedPlatform) || {};
      setEditRule(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [selectedPlatform]);

  const handleSave = async () => {
    try {
      await updateFeeRule({
        ...editRule,
        platform: selectedPlatform,
        is_active: true,
        version: `v${Date.now()}` // Simple versioning
      } as FeeRule);
      alert('Policy Updated!');
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 pt-10">
      <Link href="/admin" className="text-zinc-500 text-sm mb-4 block">← Back</Link>
      <h1 className="text-2xl font-bold mb-6">Fee Policies</h1>

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['kream', 'stockx', 'soldout', 'smartstore'].map(p => (
           <button
             key={p}
             onClick={() => setSelectedPlatform(p as Platform)}
             className={`px-4 py-2 rounded-full text-sm font-bold border ${selectedPlatform === p ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
           >
             {p.toUpperCase()}
           </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-zinc-500">Loading Policies...</div>
      ) : (
        <Card className="space-y-5">
           <div className="flex justify-between items-center mb-2">
             <span className="font-bold text-lg">Current Rule</span>
             <Badge>{editRule.version || 'v1.0'}</Badge>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <InputGroup 
               label="Commission Rate (0.01 = 1%)" 
               type="number" step="0.001"
               value={editRule.rate || 0}
               onChange={e => setEditRule({...editRule, rate: parseFloat(e.target.value)})}
             />
             <InputGroup 
               label="Min Fee (KRW)" 
               type="number"
               value={editRule.min_fee || 0}
               onChange={e => setEditRule({...editRule, min_fee: parseFloat(e.target.value)})}
             />
           </div>
           
           <InputGroup 
               label="Shipping Fee (Platform Charge)" 
               type="number"
               value={editRule.shipping_fee || 0}
               onChange={e => setEditRule({...editRule, shipping_fee: parseFloat(e.target.value)})}
           />

           <div className="pt-4">
             <Button onClick={handleSave} isLoading={loading}>
               Deploy New Policy
             </Button>
             <p className="text-xs text-zinc-500 mt-3 text-center">
               Updating will archive the previous rule and activate this one immediately.
             </p>
           </div>
        </Card>
      )}
    </div>
  );
}
