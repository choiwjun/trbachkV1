
import { ImageResponse } from 'next/og';
// @ts-ignore
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('result_id');

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: '8px' }} />
          <h1 style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>TrbaChk</h1>
        </div>
        <div style={{ fontSize: 60, fontWeight: 'bold', color: '#10b981' }}>
          Profit Report
        </div>
        <div style={{ fontSize: 24, color: '#a1a1aa', marginTop: '10px' }}>
          ID: {id?.slice(0, 8)}...
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
