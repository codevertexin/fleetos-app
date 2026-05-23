import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ChevronRight,
  Shield,
  Car,
  CreditCard,
  FileCheck,
} from 'lucide-react';

type DocStatus = 'valid' | 'expiring' | 'expired' | 'pending' | 'missing';

interface Document {
  id: string;
  name: string;
  description: string;
  status: DocStatus;
  expiresAt?: string;
  uploadedAt?: string;
  icon: React.ReactNode;
  required: boolean;
}

const mockDocuments: Document[] = [
  {
    id: 'driving-license',
    name: "Driver's License",
    description: 'Valid EU driving license (Category B or higher)',
    status: 'valid',
    expiresAt: '2027-08-14',
    uploadedAt: '2024-01-10',
    icon: <CreditCard className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'tvde-cert',
    name: 'TVDE Certificate',
    description: 'IMT-issued TVDE driver certification',
    status: 'expiring',
    expiresAt: '2025-07-01',
    uploadedAt: '2023-07-01',
    icon: <Shield className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'vehicle-inspection',
    name: 'Vehicle Inspection (IPO)',
    description: 'Annual roadworthiness inspection certificate',
    status: 'valid',
    expiresAt: '2026-03-22',
    uploadedAt: '2025-03-22',
    icon: <Car className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'insurance',
    name: 'Vehicle Insurance',
    description: 'Commercial passenger transport insurance',
    status: 'valid',
    expiresAt: '2026-01-01',
    uploadedAt: '2025-01-01',
    icon: <Shield className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'contract',
    name: 'Driver Contract',
    description: 'FleetOS service agreement',
    status: 'valid',
    uploadedAt: '2024-01-10',
    icon: <FileCheck className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'criminal-record',
    name: 'Criminal Record Certificate',
    description: 'Issued within the last 3 months',
    status: 'pending',
    icon: <FileText className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'bank-details',
    name: 'Bank Account Details',
    description: 'IBAN for weekly payouts',
    status: 'valid',
    uploadedAt: '2024-01-10',
    icon: <CreditCard className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'profile-photo',
    name: 'Profile Photo',
    description: 'Professional headshot for app display',
    status: 'missing',
    icon: <FileText className="h-5 w-5" />,
    required: false,
  },
];

const statusConfig: Record<DocStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
  valid: {
    label: 'Valid',
    variant: 'default',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
  },
  expiring: {
    label: 'Expiring Soon',
    variant: 'secondary',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-600',
  },
  expired: {
    label: 'Expired',
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
  },
  pending: {
    label: 'Under Review',
    variant: 'outline',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-600',
  },
  missing: {
    label: 'Missing',
    variant: 'destructive',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DocumentCard({ doc }: { doc: Document }) {
  const [uploading, setUploading] = useState(false);
  const cfg = statusConfig[doc.status];

  function handleUpload() {
    setUploading(true);
    setTimeout(() => setUploading(false), 2000);
  }

  const needsAction = doc.status === 'missing' || doc.status === 'expired' || doc.status === 'expiring';

  return (
    <Card className={`border transition-colors ${needsAction ? 'border-amber-200 bg-amber-50/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`mt-0.5 p-2 rounded-lg ${
            doc.status === 'valid' ? 'bg-green-100 text-green-700' :
            doc.status === 'expiring' ? 'bg-amber-100 text-amber-700' :
            doc.status === 'pending' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {doc.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-medium text-sm leading-tight">{doc.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
              </div>
              <Badge variant={cfg.variant} className="shrink-0 flex items-center gap-1 text-xs">
                {cfg.icon}
                {cfg.label}
              </Badge>
            </div>

            {/* Dates */}
            <div className="mt-2 space-y-0.5">
              {doc.uploadedAt && (
                <p className="text-xs text-muted-foreground">
                  Uploaded: {formatDate(doc.uploadedAt)}
                </p>
              )}
              {doc.expiresAt && (
                <p className={`text-xs font-medium ${
                  doc.status === 'expiring' ? 'text-amber-700' :
                  doc.status === 'expired' ? 'text-red-700' :
                  'text-muted-foreground'
                }`}>
                  {doc.status === 'expiring'
                    ? `Expires in ${daysUntil(doc.expiresAt)} days — ${formatDate(doc.expiresAt)}`
                    : doc.status === 'expired'
                    ? `Expired ${formatDate(doc.expiresAt)}`
                    : `Valid until ${formatDate(doc.expiresAt)}`}
                </p>
              )}
            </div>

            {/* Actions */}
            {(doc.status !== 'valid' && doc.status !== 'pending') && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant={doc.status === 'missing' ? 'primary' : 'outline'}
                  className="h-8 text-xs gap-1.5"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading…' : doc.status === 'missing' ? 'Upload Document' : 'Upload Renewal'}
                </Button>
              </div>
            )}
            {doc.status === 'pending' && (
              <p className="mt-2 text-xs text-blue-600">
                Under review — usually takes 1–2 business days.
              </p>
            )}
            {doc.status === 'valid' && (
              <button className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                View document <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriverDocuments() {
  const valid = mockDocuments.filter(d => d.status === 'valid').length;
  const total = mockDocuments.length;
  const issues = mockDocuments.filter(d => d.status !== 'valid' && d.status !== 'pending').length;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3">
        <h1 className="text-lg font-semibold">My Documents</h1>
        <p className="text-sm text-muted-foreground">Keep your documents up to date to stay active</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status summary */}
        <Card className={issues > 0 ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}>
          <CardContent className="p-4 flex items-center gap-3">
            {issues > 0 ? (
              <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
            )}
            <div>
              <p className={`font-semibold text-sm ${issues > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                {issues > 0 ? `${issues} document${issues > 1 ? 's' : ''} need attention` : 'All documents up to date'}
              </p>
              <p className={`text-xs ${issues > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                {valid} of {total} documents valid
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Required documents */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Required Documents
          </h2>
          <div className="space-y-3">
            {mockDocuments.filter(d => d.required).map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>

        {/* Optional documents */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Optional
          </h2>
          <div className="space-y-3">
            {mockDocuments.filter(d => !d.required).map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>

        {/* Help */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Need help?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact your fleet manager or call{' '}
              <a href="tel:+351210000000" className="text-primary underline">+351 21 000 0000</a>{' '}
              for document queries.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
