
import { Metadata } from 'next';
import { ResultView } from '@/components/ResultView';
import { Card } from '@/components/ui/LayoutComponents';

// Mock data fetcher for Server Component
async function getResult(id: string) {
  // In real app, fetch from Supabase:
  // const { data } = await supabase.from('calc_results').select('*').eq('log_id', id).single();
  // return data.result_payload;
  return null; // Fallback for demo
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: 'TrbaChk Result',
    openGraph: {
      images: [`/api/og?result_id=${params.id}`],
    },
  };
}

export default async function ResultPage({ params }: { params: { id: string } }) {
  const result = await getResult(params.id);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="text-center p-8">
          <i className="ri-file-search-line text-4xl text-zinc-600 mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Result Expired or Not Found</h2>
          <p className="text-zinc-500 mb-6">Calculation results are temporary.</p>
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
        onReset={() => {}} 
        onShare={() => {}} 
      />
    </div>
  );
}
