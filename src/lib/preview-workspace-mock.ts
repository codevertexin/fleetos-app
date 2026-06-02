/**
 * P0.3C — Preview workspace sample data (read-only, never persisted).
 */

import {
  mockBookings,
  mockDrivers,
  mockMonthlyRevenue,
  mockVehicles,
} from '@/lib/mock-data';

export const PREVIEW_DEMO_LABEL = 'Sample demo data';

export const previewKpis = {
  activeVehicles: 12,
  activeDrivers: 9,
  bookingsToday: 7,
  utilizationPct: 78,
  monthlyRevenueEur: 42850,
} as const;

export const previewVehicles = mockVehicles.slice(0, 4).map(v => ({
  id: v.id,
  plate: v.plate,
  label: `${v.brand} ${v.model}`,
  status: v.status,
  driver: v.assignedDriverName ?? 'Unassigned',
}));

const previewDriverRatings: Record<string, number> = {
  d1: 4.9,
  d2: 4.7,
  d3: 4.8,
  d4: 4.6,
};

export const previewDrivers = mockDrivers.slice(0, 4).map(d => ({
  id: d.id,
  name: d.name,
  status: d.status,
  vehicle: d.assignedVehiclePlate ?? '—',
  rating: previewDriverRatings[d.id] ?? 4.5,
}));

export const previewBookings = mockBookings.slice(0, 3).map(b => ({
  id: b.id,
  reference: `BK-${b.id.toUpperCase()}`,
  customer: b.customerName,
  route: `${b.pickupAddress} → ${b.dropoffAddress}`,
  status: b.status,
  scheduledAt: b.scheduledAt,
}));

export const previewDispatchSteps = [
  { step: 1, title: 'Booking received', detail: 'Customer request captured (demo)' },
  { step: 2, title: 'Vehicle & driver match', detail: 'Auto-suggest best available unit' },
  { step: 3, title: 'Dispatch confirmed', detail: 'Driver notified on mobile app' },
  { step: 4, title: 'Trip in progress', detail: 'Live status & ETA (simulated)' },
  { step: 5, title: 'Completed & invoiced', detail: 'Finance sync preview only' },
] as const;

export const previewReports = [
  { label: 'Fleet utilization', value: '78%', trend: '+4% vs last month (demo)' },
  { label: 'On-time performance', value: '94%', trend: 'Sample KPI' },
  { label: 'Revenue (30d)', value: '€42.8k', trend: 'Not your live billing data' },
] as const;

export const previewTutorials = [
  {
    id: 't1',
    title: 'Welcome to FleetOS',
    description: 'How the operational workspace is organized after approval.',
    duration: '4 min read',
  },
  {
    id: 't2',
    title: 'Fleet & driver setup',
    description: 'Add vehicles, assign drivers, and manage documents.',
    duration: '6 min read',
  },
  {
    id: 't3',
    title: 'Bookings & dispatch',
    description: 'From customer booking to trip completion.',
    duration: '5 min read',
  },
  {
    id: 't4',
    title: 'Reports & finance',
    description: 'Revenue, payouts, and owner settlements overview.',
    duration: '7 min read',
  },
] as const;

export const previewChartMonths = mockMonthlyRevenue.slice(-6).map(m => ({
  month: m.month,
  revenue: m.revenue,
}));
