import { FileText, Download } from 'lucide-react';
import { mockDocuments, mockOwnerVehicles } from '@/lib/mock-data';
import { docStatusBadge } from './badges';

export function DocumentsTab() {
  const ownerDocs = mockDocuments.filter(
    d => d.entityType === 'vehicle' && mockOwnerVehicles.some(v => v.id === d.entityId),
  );

  return (
    <div className="space-y-3">
      {ownerDocs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No documents found for your vehicles.</p>
        </div>
      )}
      {ownerDocs.map(doc => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{doc.name}</p>
            <p className="text-xs text-muted-foreground">
              Expires: {doc.expiryDate} · {doc.entityName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {docStatusBadge(doc.status)}
            <button className="p-1.5 hover:bg-muted rounded text-muted-foreground transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
