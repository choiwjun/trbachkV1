import React from 'react';
import { CalculationResult } from '../types';
import { Card, Button, Badge } from './ui/LayoutComponents';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ResultViewProps {
  result: CalculationResult;
  onReset: () => void;
  onShare: () => void;
}

const formatKRW = (num: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(num);

export const ResultView: React.FC<ResultViewProps> = ({ result, onReset, onShare }) => {
  const { outcome, breakdown, meta } = result;

  // Pie Chart Data
  const data = [
    { name: '상품원가', value: breakdown.buyPriceKRW, color: '#52525b' }, // zinc-600
    { name: '관부가세', value: breakdown.customsDuty + breakdown.vat, color: '#f97316' }, // orange-500
    { name: '수수료/배송', value: breakdown.platformFee + breakdown.platformShippingFee + breakdown.shippingKRW, color: '#ef4444' }, // red-500
    { name: '순수익', value: outcome.profit > 0 ? outcome.profit : 0, color: '#10b981' }, // emerald-500
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Hero Result */}
      <Card className="text-center relative overflow-hidden py-8">
        <div className="relative z-10">
          <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase mb-3">예상 순수익</p>
          <h2 className={`text-5xl font-bold mb-4 ${outcome.isLoss ? 'text-rose-500' : 'text-emerald-400'}`}>
            {formatKRW(outcome.profit)}
          </h2>
          <div className="flex items-center justify-center gap-3">
            <Badge variant={outcome.isLoss ? 'warning' : 'success'}>
              수익률 {outcome.marginRate.toFixed(2)}%
            </Badge>
            {result.risk.taxWarning && (
              <Badge variant="warning">관부가세 주의</Badge>
            )}
          </div>
        </div>
        {/* Abstract Background Decoration */}
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${outcome.isLoss ? 'from-rose-500/50 to-transparent' : 'from-emerald-500/50 to-transparent'}`} />
      </Card>

      {/* Breakdown Chart & List */}
      <div className="space-y-4">
        <h3 className="text-zinc-400 text-sm font-bold uppercase ml-1">상세 내역</h3>
        
        {/* Simple Pie Chart Visualization */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => formatKRW(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5 flex flex-col justify-between h-36">
             <span className="text-zinc-500 text-sm">총 매출</span>
             <span className="text-2xl font-medium">{formatKRW(breakdown.grossRevenue)}</span>
          </Card>
          <Card className="p-5 flex flex-col justify-between h-36">
             <span className="text-zinc-500 text-sm">총 비용</span>
             <span className="text-white text-2xl font-medium">{formatKRW(breakdown.totalCost)}</span>
          </Card>
        </div>

        <Card className="space-y-5">
          <Row label="상품 원가 (환율적용)" value={formatKRW(breakdown.buyPriceKRW)} />
          <Row label="해외 배송비" value={formatKRW(breakdown.shippingKRW)} />
          <Row label="관세 및 부가세" value={formatKRW(breakdown.customsDuty + breakdown.vat)} highlight={breakdown.customsDuty > 0} />
          <Row label="플랫폼 수수료" value={`- ${formatKRW(breakdown.platformFee)}`} color="text-rose-400" />
          <div className="h-px bg-zinc-800 my-3" />
          <Row label="손익분기점" value={formatKRW(outcome.breakEvenPoint)} color="text-zinc-300" />
          <div className="flex justify-between items-center text-sm text-zinc-600 mt-3">
            <span>적용 환율: 1 USD = {meta.exchangeRate} KRW</span>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <Button onClick={onShare} variant="secondary">
          <i className="ri-share-box-line mr-2 text-xl"></i> 공유하기
        </Button>
        <Button onClick={onReset} className="w-20 !px-0" variant="ghost">
          <i className="ri-refresh-line text-2xl"></i>
        </Button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; color?: string; highlight?: boolean }> = ({ label, value, color = "text-white", highlight }) => (
  <div className="flex justify-between items-center text-base">
    <span className={`${highlight ? 'text-orange-400' : 'text-zinc-500'}`}>{label}</span>
    <span className={`font-mono ${color} ${highlight ? 'font-bold' : ''}`}>{value}</span>
  </div>
);