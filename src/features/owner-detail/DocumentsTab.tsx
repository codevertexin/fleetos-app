import { FileText, CheckCircle2, Download, Upload } from 'lucide-react';
import type { VehicleSupplier } from '../../types';

interface Props {
  supplier: VehicleSupplier;
}

const MOCK_DOCS = [
  { name: 'Company Registration', type: 'registration', status: 'valid', expiryDate: '—' },
  { name: 'VAT Certificate', type: 'tax', status: 'valid', expiryDate: '—' },
  { name: 'Vehicle Insurance Policy', type: 'insurance', status: 'valid', expiryDate: '2025-06-01' },
  { name: 'Framework Agreement', type: 'contract', status: 'valid', expiryDate: '2025-12-31' },
];

export function DocumentsTab({ supplier }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Documents associated with {supplier.name}</p>
        <button className="flex items-center gap-1.5 text-sm bg-[#00B39A] text-white px-3 py-1.5 rounded-lg hover:bg-[#009b85] transition-colors">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {MOCK_DOCS.map(doc => (
          <div key={doc.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-900">{doc.name}</div>
                <div className="text-xs text-slate-500 capitalize">{doc.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {doc.expiryDate !== '—' ? `Expires: ${doc.expiryDate}` : 'No expiry'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  doc.status === 'valid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {doc.status}
              </span>
              <button className="text-slate-400 hover:text-slate-700">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
