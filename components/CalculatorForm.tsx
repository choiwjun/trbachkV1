import React, { useState } from 'react';
import { Platform, CalculationRequest } from '../types';
import { Button, InputGroup, Card } from './ui/LayoutComponents';

interface CalculatorFormProps {
  onSubmit: (data: CalculationRequest) => void;
  isLoading: boolean;
}

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'kream', label: '크림' },
  { id: 'stockx', label: '스탁엑스' },
  { id: 'soldout', label: '솔드아웃' },
  { id: 'smartstore', label: '스토어' },
];

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit, isLoading }) => {
  const [platform, setPlatform] = useState<Platform>('kream');
  const [buyPrice, setBuyPrice] = useState('');
  const [shipping, setShipping] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyPrice || !sellPrice) return;

    // Haptic feedback for mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }

    onSubmit({
      platform,
      buyPriceUSD: parseFloat(buyPrice),
      shippingCostUSD: parseFloat(shipping) || 0,
      sellPriceKRW: parseFloat(sellPrice),
      quantity: 1,
      isVATIncluded: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in pb-24">
      
      {/* Platform Selector */}
      <div className="grid grid-cols-4 gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            className={`
              py-4 rounded-xl text-sm font-bold transition-all duration-300
              ${platform === p.id 
                ? 'bg-zinc-800 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-zinc-300'}
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Cost Section */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-shopping-bag-3-line text-zinc-500 text-xl"></i>
            <h3 className="text-lg font-bold text-zinc-300">구매 비용 (USD)</h3>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <InputGroup 
              label="상품 가격" 
              prefix="$" 
              placeholder="0" 
              type="number" 
              inputMode="decimal"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              required
            />
            <InputGroup 
              label="배송비" 
              prefix="$" 
              placeholder="0" 
              type="number" 
              inputMode="decimal"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
            />
          </div>
        </Card>

        {/* Sell Section */}
        <Card className="space-y-5">
           <div className="flex items-center gap-2 mb-2">
            <i className="ri-store-2-line text-zinc-500 text-xl"></i>
            <h3 className="text-lg font-bold text-zinc-300">판매 예상 (KRW)</h3>
          </div>
          <InputGroup 
            label="판매 희망가" 
            suffix="₩" 
            placeholder="0" 
            type="number" 
            inputMode="numeric"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            required
            className="text-right"
          />
        </Card>
      </div>

      <div className="sticky bottom-8 z-20">
        <div className="absolute inset-0 bg-zinc-950/80 blur-xl -z-10 transform scale-110"></div>
        <Button type="submit" isLoading={isLoading}>
          수익 계산하기
        </Button>
      </div>
    </form>
  );
};