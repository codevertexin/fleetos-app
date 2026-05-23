import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building2, User, Car, FileText, Wallet, Phone, Mail, MapPin, TrendingUp, ArrowLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { mockSuppliers, mockVehicles, mockContracts, mockPayouts } from '../../../lib/mock-data';
import { TABS } from '../../../features/owner-detail/constants';
import { StatusBadge } from '../../../features/owner-detail/StatusBadge';
import { ownershipTypeLabels } from '../../../features/owner-detail/constants';
import { OverviewTab } from '../../../features/owner-detail/OverviewTab';
import { VehiclesTab } from '../../../features/owner-detail/VehiclesTab';
import { ContractsTab } from '../../../features/owner-detail/ContractsTab';
import { StatementsTab } from '../../../features/owner-detail/StatementsTab';
import { PayoutsTab } from '../../../features/owner-detail/PayoutsTab';
import { DocumentsTab } from '../../../features/owner-detail/DocumentsTab';
import { ContactsTab } from '../../../features/owner-detail/ContactsTab';

export default function OwnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const supplier = mockSuppliers.find(s => s.id === id);
  if (!supplier) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Supplier not found.</p>
        <button onClick={() => navigate('/owners')} className="mt-3 text-[#00B39A] text-sm hover:underline">
          Back to Suppliers
        </button>
      </div>
    );
  }

  const vehicles = mockVehicles.filter(v => v.supplierId === supplier.id);
  const contracts = mockContracts.filter(c => c.lessorId === supplier.id || c.partyId === supplier.id);
  const payouts = mockPayouts.filter(p => p.recipientId === supplier.id);

  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/owners" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Suppliers & Owners
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-medium">{supplier.name}</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            supplier.type === 'company' ? 'bg-purple-100' : 'bg-blue-100'
          }`}>
            {supplier.type === 'company'
              ? <Building2 className="w-7 h-7 text-purple-600" />
              : <User className="w-7 h-7 text-blue-600" />
            }
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{supplier.name}</h1>
              <StatusBadge status={supplier.status} />
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {ownershipTypeLabels[supplier.ownershipType]}
              </span>
            </div>
            {supplier.contactPerson && (
              <p className="text-sm text-slate-500 mt-0.5">Contact: {supplier.contactPerson}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {supplier.email && (
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" />{supplier.email}</span>
              )}
              {supplier.phone && (
                <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" />{supplier.phone}</span>
              )}
              {supplier.address && (
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" />{supplier.address}</span>
              )}
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            <MoreHorizontal className="w-4 h-4" /> Actions
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          {[
            { label: 'Vehicles', value: supplier.vehicleCount, icon: Car, color: 'text-blue-600' },
            { label: 'Active Contracts', value: supplier.activeContracts, icon: FileText, color: 'text-purple-600' },
            { label: 'Total Paid Out', value: `€${(supplier.totalPaidOut ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
            { label: 'Pending Payouts', value: supplier.pendingPayouts ?? 0, icon: Wallet, color: 'text-amber-600' },
          ].map(kpi => (
            <div key={kpi.label} className="text-center">
              <kpi.icon className={`w-5 h-5 mx-auto mb-1 ${kpi.color}`} />
              <div className="text-lg font-bold text-slate-900">{kpi.value}</div>
              <div className="text-xs text-slate-500">{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#00B39A] text-[#00B39A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab supplier={supplier} totalPaid={totalPaid} totalPending={totalPending} />}
      {activeTab === 'vehicles' && <VehiclesTab vehicles={vehicles} />}
      {activeTab === 'contracts' && <ContractsTab contracts={contracts} />}
      {activeTab === 'statements' && <StatementsTab supplier={supplier} />}
      {activeTab === 'payouts' && <PayoutsTab payouts={payouts} />}
      {activeTab === 'documents' && <DocumentsTab supplier={supplier} />}
      {activeTab === 'contacts' && <ContactsTab supplier={supplier} />}
    </div>
  );
}
