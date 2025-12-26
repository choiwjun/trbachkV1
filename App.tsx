import React, { useState } from 'react';
import { CalculatorForm } from './components/CalculatorForm';
import { ResultView } from './components/ResultView';
import { WarningModal } from './components/WarningModal';
import { CalculationRequest, CalculationResult } from './types';
import { calculateProfit } from './services/mockEdgeService';
import { Badge } from './components/ui/LayoutComponents';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Core Logic Handler
  const handleCalculate = async (data: CalculationRequest) => {
    setIsLoading(true);
    try {
      // In a real app: 
      // const response = await fetch('/functions/v1/calc', { method: 'POST', body: JSON.stringify(data) ... });
      const res = await calculateProfit(data);
      
      setResult(res);
      
      // Trigger warning modal if tax risk exists
      if (res.risk.taxWarning) {
        setShowWarning(true);
      }
    } catch (error) {
      console.error("Calculation failed", error);
      alert("계산 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    
    // Simple text share for MVP
    const text = `[TrbaChk 리포트]\n순수익: ₩${result.outcome.profit.toLocaleString()}\n수익률: ${result.outcome.marginRate.toFixed(1)}%`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TrbaChk 수익 리포트',
          text: text,
          url: window.location.href
        });
      } catch (e) {
        console.log('Share canceled');
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('결과가 클립보드에 복사되었습니다!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center mb-10 pt-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <i className="ri-calculator-line text-black font-bold text-xl"></i>
          </div>
          <h1 className="font-bold text-2xl tracking-tight">TrbaChk</h1>
        </div>
        <div className="flex gap-2">
            <Badge variant="neutral">v1.0</Badge>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md relative">
        {!result ? (
          <CalculatorForm onSubmit={handleCalculate} isLoading={isLoading} />
        ) : (
          <ResultView 
            result={result} 
            onReset={() => setResult(null)} 
            onShare={handleShare}
          />
        )}
      </main>

      {/* Modals */}
      <WarningModal 
        isOpen={showWarning} 
        onClose={() => setShowWarning(false)} 
        message={result?.risk.taxWarningMessage}
      />
      
      {/* Footer */}
      <footer className="fixed bottom-0 w-full text-center py-5 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-900 text-zinc-500 text-xs uppercase tracking-widest pointer-events-none">
        <p>관세청 고시 환율 적용 (매일 09:00 갱신)</p>
      </footer>
    </div>
  );
};

export default App;