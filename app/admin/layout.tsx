
'use client';
import React, { useEffect, useState } from 'react';
import { Card, InputGroup, Button } from '@/components/ui/LayoutComponents';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [key, setKey] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('trbachk_admin_key');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (stored) setAuthorized(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.length > 5) {
      sessionStorage.setItem('trbachk_admin_key', key);
      setAuthorized(true);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-8 space-y-6">
          <div className="text-center">
            <i className="ri-shield-keyhole-line text-4xl text-brand-500"></i>
            <h1 className="text-xl font-bold mt-2">Admin Access</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <InputGroup
              label="Secret Key"
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Enter admin bearer token"
            />
            <Button type="submit">Unlock Dashboard</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-md mx-auto relative">
        {children}
      </div>
    </div>
  );
}
