import { Car, Users, Calendar, Clock, DollarSign, TrendingDown, Gauge, AlertTriangle, FileText, Send, Wrench, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { mockVehicles, mockDrivers, mockBookings, mockPayouts, mockAlerts, mockMonthlyRevenue, mockBookingsByStatus, mockDocuments } from '@/lib/mock-data';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#00B39A', '#22C7D8', '#1F6A8A', '#F59E0B', '#EF4444'];

function KPICard({ icon: Icon, label, value, subLabel, color = '#00B39A', trend }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subLabel?: string;
  color?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const activeVehicles = mockVehicles.filter(v => v.status === 'active').length;
  const activeDrivers = mockDrivers.filter(d => d.status === 'active' || d.status === 'on_trip').length;
  const bookingsToday = mockBookings.filter(b => b.status === 'in_progress' || b.status === 'confirmed').length;
  const pendingBookings = mockBookings.filter(b => b.status === 'pending').length;
  const pendingPayouts = mockPayouts.filter(p => p.status === 'pending').length;
  const expiringDocs = mockDocuments.filter(d => d.status === 'expiring_soon' || d.status === 'expired').length;
  const maintenanceVehicles = mockVehicles.filter(v => v.status === 'maintenance').length;
  const recentMonthRevenue = mockMonthlyRevenue[mockMonthlyRevenue.length - 1];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Fleet overview and key metrics</p>
      </div>

      {/* KPIs row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Car} label="Active Vehicles" value={activeVehicles} subLabel={`of ${mockVehicles.length} total`} color="#00B39A" trend={{ value: 5.2, label: 'vs last month' }} />
        <KPICard icon={Users} label="Active Drivers" value={activeDrivers} subLabel={`${mockDrivers.filter(d=>d.status==='on_trip').length} on trip now`} color="#22C7D8" trend={{ value: 2.1, label: 'vs last month' }} />
        <KPICard icon={Calendar} label="Bookings Today" value={bookingsToday} subLabel="active now" color="#1F6A8A" />
        <KPICard icon={Clock} label="Pending Bookings" value={pendingBookings} subLabel="awaiting assignment" color="#F59E0B" />
      </div>

      {/* KPIs row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Monthly Revenue" value={formatCurrency(recentMonthRevenue.revenue)} color="#00B39A" trend={{ value: 15.2, label: 'vs last month' }} />
        <KPICard icon={TrendingDown} label="Monthly Expenses" value={formatCurrency(recentMonthRevenue.expenses)} color="#EF4444" trend={{ value: -3.1, label: 'vs last month' }} />
        <KPICard icon={Gauge} label="Fleet Utilization" value="79%" subLabel="avg across active vehicles" color="#22C7D8" trend={{ value: 4.0, label: 'vs last month' }} />
        <KPICard icon={AlertTriangle} label="Expiring Docs" value={expiringDocs} subLabel="requiring attention" color="#F59E0B" />
      </div>

      {/* KPIs row 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Contracts Ending" value={2} subLabel="within 60 days" color="#1F6A8A" />
        <KPICard icon={Send} label="Payouts Pending" value={pendingPayouts} subLabel="to be processed" color="#00B39A" />
        <KPICard icon={Wrench} label="In Maintenance" value={maintenanceVehicles} subLabel="vehicles" color="#EF4444" />
        <KPICard icon={DollarSign} label="Monthly Profit" value={formatCurrency(recentMonthRevenue.profit)} color="#00B39A" trend={{ value: 13.8, label: 'vs last month' }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={mockMonthlyRevenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B39A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00B39A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#00B39A" fill="url(#rev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" fill="url(#exp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bookings by status */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={mockBookingsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                  {mockBookingsByStatus.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {mockBookingsByStatus.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <div className="divide-y divide-border">
            {mockBookings.slice(0, 5).map(booking => (
              <div key={booking.id} className="px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{booking.customerName}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-48">{booking.pickupAddress}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(booking.scheduledAt)}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <div className="divide-y divide-border">
            {mockAlerts.filter(a => !a.isRead).slice(0, 5).map(alert => (
              <div key={alert.id} className="px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                    alert.severity === 'critical' || alert.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <AlertTriangle className={`w-3.5 h-3.5 ${
                      alert.severity === 'critical' || alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
