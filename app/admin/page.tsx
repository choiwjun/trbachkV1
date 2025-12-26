
'use client';
import Link from 'next/link';
import { Card } from '@/components/ui/LayoutComponents';

const ADMIN_LINKS = [
  { href: '/admin/fx', label: 'FX Rate Control', icon: 'ri-money-dollar-circle-line' },
  { href: '/admin/policies', label: 'Fee Policies', icon: 'ri-file-list-3-line' },
  { href: '/admin/banners', label: 'Banner Ads', icon: 'ri-advertisement-line' },
];

export default function AdminPage() {
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid gap-4">
        {ADMIN_LINKS.map(link => (
          <Link href={link.href} key={link.href}>
            <Card className="flex items-center gap-4 p-5 hover:bg-zinc-900 transition-colors">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center">
                <i className={`${link.icon} text-xl`}></i>
              </div>
              <span className="font-bold">{link.label}</span>
              <i className="ri-arrow-right-s-line ml-auto text-zinc-600"></i>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 border-t border-zinc-900 pt-6">
        <h3 className="text-zinc-500 text-sm font-bold uppercase mb-4">Quick Stats (Today)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">142</div>
            <div className="text-xs text-zinc-500">Calculations</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-emerald-400">4.2%</div>
            <div className="text-xs text-zinc-500">Banner CTR</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
