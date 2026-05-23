import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Search, Plus, Phone, Mail, Car, FileText, Wallet,
  ChevronRight, Filter,
} from 'lucide-react';
import { mockSuppliers } from '../../../lib/mock-data';
import type { VehicleSupplier } from '../../../types';

const ownershipTypeLabels: Record<string, string> = {
  individual_owner: 'Individual Owner',
  external_company: 'External Company',
  leasing_partner: 'Leasing Partner',
  company_owned: 'Company Owned',
};

const ownershipTypeColors: Record<string, string> = {
  individual_owner: 'bg-blue-100 text-blue-800',
  external_company: 'bg-purple-100 text-purple-800',
  leasing_partner: 'bg-amber-100 text-amber-800',
  company_owned: 'bg-emerald-100 text-emerald-800',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-600',
  suspended: 'bg-red-100 text-red-700',
};

export default function Owners() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'company'>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | string>('all');

  const filtered = mockSuppliers.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.taxId?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    const matchOwnership = ownershipFilter === 'all' || s.ownershipType === ownershipFilter;
    return matchSearch && matchType && matchOwnership;
  });

  const stats = {
    total: mockSuppliers.length,
    active: mockSuppliers.filter(s => s.status === 'active').length,
    vehicles: mockSuppliers.reduce((sum, s) => sum + s.vehicleCount, 0),
    pendingPayouts: mockSuppliers.reduce((sum, s) => sum + (s.pendingPayouts ?? 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers & Owners</h1>
          <p className="text-sm text-slate-500 mt-0.5">External vehicle providers and ownership partners</p>
        </div>
        <button className="flex items-center gap-2 bg-[#00B39A] hover:bg-[#009b85] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: stats.total, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: stats.active, icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Vehicles Managed', value: stats.vehicles, icon: Car, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending Payouts', value: stats.pendingPayouts, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, tax ID…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#00B39A]/30 focus:border-[#00B39A]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B39A]/30"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
          <select
            value={ownershipFilter}
            onChange={e => setOwnershipFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#00B39A]/30"
          >
            <option value="all">All Ownership Types</option>
            <option value="individual_owner">Individual Owner</option>
            <option value="external_company">External Company</option>
            <option value="leasing_partner">Leasing Partner</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Tax ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Contact</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Vehicles</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Contracts</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Payouts</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No suppliers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(supplier => (
                  <SupplierRow
                    key={supplier.id}
                    supplier={supplier}
                    onClick={() => navigate(`/owners/${supplier.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SupplierRow({ supplier, onClick }: { supplier: VehicleSupplier; onClick: () => void }) {
  return (
    <tr
      className="hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            supplier.type === 'company' ? 'bg-purple-100' : 'bg-blue-100'
          }`}>
            {supplier.type === 'company'
              ? <Building2 className="w-4 h-4 text-purple-600" />
              : <User className="w-4 h-4 text-blue-600" />
            }
          </div>
          <div>
            <div className="font-medium text-slate-900">{supplier.name}</div>
            {supplier.contactPerson && (
              <div className="text-xs text-slate-500">Contact: {supplier.contactPerson}</div>
            )}
          </div>
        </div>
      </td>

      {/* Type badge */}
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ownershipTypeColors[supplier.ownershipType]}`}>
          {ownershipTypeLabels[supplier.ownershipType]}
        </span>
      </td>

      {/* Tax ID */}
      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
        {supplier.taxId ?? '—'}
      </td>

      {/* Contact */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="space-y-0.5">
          {supplier.email && (
            <div className="flex items-center gap-1 text-slate-600 text-xs">
              <Mail className="w-3 h-3" />
              {supplier.email}
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-1 text-slate-600 text-xs">
              <Phone className="w-3 h-3" />
              {supplier.phone}
            </div>
          )}
        </div>
      </td>

      {/* Vehicles */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <Car className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-900">{supplier.vehicleCount}</span>
        </div>
      </td>

      {/* Contracts */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-900">{supplier.activeContracts}</span>
        </div>
      </td>

      {/* Pending Payouts */}
      <td className="px-4 py-3 text-center hidden md:table-cell">
        {supplier.pendingPayouts && supplier.pendingPayouts > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
            <Wallet className="w-3 h-3" />
            {supplier.pendingPayouts}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[supplier.status]}`}>
          {supplier.status}
        </span>
      </td>

      {/* Arrow */}
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </td>
    </tr>
  );
}
