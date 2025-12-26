
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { calculateProfit, trackBannerClick } from '@/lib/api';
import { CalcInput, CalculationLog } from '@/types';
import { Button, InputGroup, Card, Badge } from '@/components/ui/LayoutComponents';
import { WarningModal } from '@/components/WarningModal';
import { ResultView } from '@/components/ResultView';

export default function CalculatorPage({ params }: { params: { platform: string } }) {
  const router = useRouter();
  const [input, setInput] = useState<Partial<CalcInput>>({
    platform: params.platform as any,
    sell_currency: 'KRW'
  });
  const [showWarning, setShowWarning] = useState(false);
  const [resultData, setResultData] = useState<CalculationLog | null>(null);

  // Banner A/B Test (Random)
  const [bannerVariant] = useState(() => Math.random() > 0.5 ? 'A' : 'B');

  const { mutate, isPending } = useMutation({
    mutationFn: calculateProfit,
    onSuccess: (data) => {
      // Haptics
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (data.outcome.is_loss) navigator.vibrate([30, 50, 30]);
        else navigator.vibrate(50);
      }

      // Save to History (LocalStorage)
      const log: CalculationLog = {
        id: crypto.randomUUID(), // Mock ID, real app uses DB ID
        platform: params.platform as any,
        input: input as CalcInput,
        result: data,
        created_at: new Date().toISOString()
      };
      
      const stored = localStorage.getItem('trbachk_history');
      const history = stored ? JSON.parse(stored) : [];
      localStorage.setItem('trbachk_history', JSON.stringify([log, ...history].slice(0, 10)));
      
      setResultData(log);
      
      if (data.warnings.length > 0) {
        setShowWarning(true);
      }
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(input as CalcInput);
  };

  const handleReset = () => {
    setResultData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (resultData) {
    return (
      <div className="p-4 pt-8">
        <div className="mb-4 flex items-center justify-between">
           <button onClick={handleReset} className="text-zinc-500 hover:text-white flex items-center gap-1">
             <i className="ri-arrow-left-line"></i> Back
           </button>
           <span className="uppercase font-bold text-zinc-600">{params.platform}</span>
        </div>
        {/* @ts-ignore - Temporary ignore until ResultView supports CalcResult or data is mapped */}
        <ResultView 
          result={resultData.result} 
          onReset={handleReset}
          onShare={() => {
             // In real app, navigate to /result/[id] or copy link
             const url = `${window.location.origin}/result/${resultData.id}`;
             navigator.clipboard.writeText(url);
             alert('Link copied to clipboard!');
          }}
        />
        
        {/* Ad Banner Slot */}
        <div className="mt-8 mb-12">
           <div 
             onClick={() => trackBannerClick('main_footer', bannerVariant)}
             className="w-full h-24 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center cursor-pointer relative overflow-hidden group"
           >
             {bannerVariant === 'A' ? (
               <div className="text-center">
                 <p className="text-brand-500 font-bold">Trading Membership</p>
                 <p className="text-xs text-zinc-500">Join Pro Traders Club</p>
               </div>
             ) : (
               <div className="text-center">
                 <p className="text-emerald-500 font-bold">Safe Logistics</p>
                 <p className="text-xs text-zinc-500">Global Shipping Discount</p>
               </div>
             )}
             <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
           <p className="text-[10px] text-center text-zinc-700 mt-2">Sponsored • Variant {bannerVariant}</p>
        </div>

        <WarningModal 
          isOpen={showWarning} 
          onClose={() => setShowWarning(false)} 
          message={resultData.result.warnings[0]} 
        />
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 min-h-screen">
       <header className="flex items-center gap-3 mb-8">
         <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400">
           <i className="ri-arrow-left-s-line text-xl"></i>
         </button>
         <h1 className="text-xl font-bold capitalize">{params.platform} Calculator</h1>
       </header>

       <form onSubmit={handleSubmit} className="space-y-6 pb-20">
         <Card className="space-y-4">
           <InputGroup 
             label="Buy Price (USD)" 
             prefix="$" 
             type="number" 
             placeholder="0" 
             required
             onChange={(e) => setInput({...input, buy_price_krw: Number(e.target.value) * 1350, sell_currency: 'USD'})} 
           />
           {/* Note: Simplified UX for demo. Usually user enters KRW or USD based on toggle. Here mapping USD input to KRW for backend comp */}
           <p className="text-xs text-zinc-500 text-right">* Converted approx. for UI demo</p>

           <InputGroup 
             label="Intl. Shipping" 
             prefix="$" 
             type="number" 
             placeholder="0"
             onChange={(e) => setInput({...input, shipping_fee: Number(e.target.value) * 1350})} 
           />
         </Card>

         <Card className="space-y-4">
           <InputGroup 
             label="Sell Price (KRW)" 
             suffix="₩" 
             type="number" 
             placeholder="0" 
             required
             onChange={(e) => setInput({...input, sell_price: Number(e.target.value)})} 
           />
         </Card>

         <div className="flex items-center justify-between px-2">
           <label className="text-sm text-zinc-400 flex items-center gap-2">
             <input 
               type="checkbox" 
               className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
               onChange={(e) => setInput({...input, is_combined_tax_risk: e.target.checked})}
             />
             Combined Tax Risk?
           </label>
           <i className="ri-information-line text-zinc-600"></i>
         </div>

         <Button type="submit" isLoading={isPending} className="mt-8">
           Calculate Profit
         </Button>
       </form>
    </div>
  );
}
