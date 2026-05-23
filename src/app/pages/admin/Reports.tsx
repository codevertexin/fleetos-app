import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Car, Calendar, Building2 } from 'lucide-react';
import {
  mockMonthlyRevenue, mockBookingsByStatus, mockFleetUtilization, mockDriverPerformance,
  mockProfitByOwnershipType, mockPayoutsBySupplier, mockVehiclesByOwnershipType, mockExternalFleetCost,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const COLORS = ['#00B39A', '#22C7D8', '#1F6A8A', '#F59E0B', '#EF4444'];

function StatCard({ label, value, sub, trend, color = 'text-foreground' }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down'; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      {sub && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
          {sub}
        </p>
      )}
    </div>
  );
}

const PERIODS = ['Last 3 months', 'Last 6 months', 'This year'] as const;

export default function Reports() {
  const [period, setPeriod] = useState<typeof PERIODS[number]>('Last 6 months');

  const totalRevenue = mockMonthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = mockMonthlyRevenue.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const totalBookings = mockBookingsByStatus.reduce((s, b) => s + b.value, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fleet performance & financial analytics</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                period === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`€${totalRevenue.toLocaleString()}`} sub="+12% vs prior period" trend="up" color="text-primary" />
        <StatCard label="Total Expenses" value={`€${totalExpenses.toLocaleString()}`} sub="+3% vs prior period" trend="up" />
        <StatCard label="Net Profit" value={`€${totalProfit.toLocaleString()}`} sub="+18% vs prior period" trend="up" color="text-green-500" />
        <StatCard label="Total Bookings" value={String(totalBookings)} sub="+8% vs prior period" trend="up" />
      </div>

      {/* Revenue & Expenses chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Revenue vs Expenses</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={mockMonthlyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00B39A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00B39A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C7D8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22C7D8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`€${v.toLocaleString()}`, '']}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00B39A" fill="url(#gradRevenue)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" fill="url(#gradExpenses)" strokeWidth={2} />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#22C7D8" fill="url(#gradProfit)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row: Bookings by status + Fleet utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bookings pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Bookings by Status
          </h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={mockBookingsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {mockBookingsByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {mockBookingsByStatus.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                    <span className="text-muted-foreground">{b.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{b.value}</span>
                </div>
              ))}
              <div className="border-t border-border mt-1 pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Total</span>
                <span className="font-bold text-foreground">{totalBookings}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet utilization */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" /> Fleet Utilization
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockFleetUtilization} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="plate" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Utilization']}
              />
              <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                {mockFleetUtilization.map((entry, i) => (
                  <Cell key={i} fill={entry.utilization >= 80 ? '#00B39A' : entry.utilization >= 60 ? '#22C7D8' : '#F59E0B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Ownership Analytics ─────────────────────────────────────────── */}
      <div className="mt-2">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Ownership & Supplier Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Profit by ownership type */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Profit by Ownership Type</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockProfitByOwnershipType} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  {[
                    { key: 'company_owned', color: '#00B39A' },
                    { key: 'individual_owner', color: '#22C7D8' },
                    { key: 'external_company', color: '#1F6A8A' },
                    { key: 'leasing_partner', color: '#F59E0B' },
                  ].map(d => (
                    <linearGradient key={d.key} id={`grad-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={d.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={d.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`€${v.toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="company_owned" name="Company Owned" stroke="#00B39A" fill="url(#grad-company_owned)" strokeWidth={2} />
                <Area type="monotone" dataKey="individual_owner" name="Individual" stroke="#22C7D8" fill="url(#grad-individual_owner)" strokeWidth={2} />
                <Area type="monotone" dataKey="external_company" name="External Co." stroke="#1F6A8A" fill="url(#grad-external_company)" strokeWidth={2} />
                <Area type="monotone" dataKey="leasing_partner" name="Leasing" stroke="#F59E0B" fill="url(#grad-leasing_partner)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicles by ownership type — pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Vehicles by Ownership Type</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={mockVehiclesByOwnershipType} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {mockVehiclesByOwnershipType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1">
                {mockVehiclesByOwnershipType.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
                <div className="border-t border-border mt-1 pt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Total</span>
                  <span className="font-bold text-foreground">{mockVehiclesByOwnershipType.reduce((s, d) => s + d.value, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payouts by supplier */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Payouts by Supplier / Owner</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mockPayoutsBySupplier} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`€${v.toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="paid" name="Paid" fill="#00B39A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* External fleet cost over time */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">External Fleet Cost (Monthly)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mockExternalFleetCost} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`€${v.toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="autorent" name="AutoRent Lda" fill="#1F6A8A" stackId="a" />
                <Bar dataKey="leaseplan" name="LeasePlan" fill="#22C7D8" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      {/* Driver Performance */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Driver Performance
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockDriverPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="driver" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="trips" orientation="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="trips" dataKey="trips" name="Trips" fill="#1F6A8A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {mockDriverPerformance.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{d.driver}</p>
                  <p className="text-xs text-muted-foreground">{d.trips} trips · ★ {d.rating}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">€{d.revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
