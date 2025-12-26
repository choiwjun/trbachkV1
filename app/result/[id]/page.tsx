
'use client'; // Switch to Client Component to use window/navigator

import { useEffect, useState } from 'react';
import { ResultView } from '@/components/ResultView';
import { Card } from '@/components/ui/LayoutComponents';
import { CalculationResult } from '@/types';

// Mock data fetcher
async function getResult(id: string) {
  // In real app, fetch from Supabase
  // For demo, we return null to show the empty state or mock data if we had it
  // Since this is now a Client Component, we simulate a fetch on mount
  return null; 
}

export default function ResultPage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetch
    setTimeout(() => {
        // Mock success for visual test (Uncomment to test view)
        /*
        setResult({
            meta: { exchangeRate: 1350, platform: 'kream', timestamp: new Date().toISOString() },
            breakdown: { buyPriceKRW: 135000, shippingKRW: 15000, customsDuty: 0, vat: 0, platformFee: 5000, platformShippingFee: 3000, totalCost: 158000, grossRevenue: 200000 },
            outcome: { profit: 42000, marginRate: 21.0, isLoss: false, breakEvenPoint: 160000 },
            risk: { taxWarning: false }
        });
        */
       setLoading(false);
    }, 500);
  }, [params.id]);

  const handleShare = async () => {
    if (!result) return;
    const profitStr = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(result.outcome.profit);
    const url = window.location.href;
    const text = `[TrbaChk] 수익 보고서 공유: 예상 수익 ${profitStr}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TrbaChk Report', text, url });
        return false;
      } catch (e) { console.log('cancelled'); }
    }
    
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading Report...</div>;
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="text-center p-8">
          <i className="ri-file-search-line text-4xl text-zinc-600 mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Result Expired</h2>
          <p className="text-zinc-500 mb-6">Calculation results are temporary or ID is invalid.</p>
          <a href="/" className="text-brand-500 hover:underline">Go Home</a>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pt-10">
      <h1 className="text-center text-zinc-500 text-sm uppercase tracking-widest mb-6">Shared Report</h1>
      <ResultView 
        result={result} 
        onReset={() => window.location.href = '/'} 
        onShare={handleShare} 
      />
    </div>
  );
}
