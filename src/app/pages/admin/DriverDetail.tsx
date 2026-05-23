import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Tabs, useTabs } from '@/components/ui/tabs';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';
import { mockDrivers, mockAssignments, mockDocuments, mockContracts, mockPayouts } from '@/lib/mock-data';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'documents', label: 'Documents' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'availability', label: 'Availability' },
  { id: 'payouts', label: 'Payouts' },
];

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useTabs('overview');
  const driver = mockDrivers.find(d => d.id === id);

  if (!driver) return (
    <div className="p-6 text-center py-20">
      <p className="text-muted-foreground">Driver not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/drivers')}>Back</Button>
    </div>
  );

  const driverAssignments = mockAssignments.filter(a => a.driverId === id);
  const driverDocs = mockDocuments.filter(d => d.entityId === id && d.entityType === 'driver');
  const driverContracts = mockContracts.filter(c => c.partyId === id && c.type === 'driver');
  const driverPayouts = mockPayouts.filter(p => p.recipientId === id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/drivers')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-[#1F6A8A]/20 text-[#1F6A8A] flex items-center justify-center text-lg font-bold">
            {driver.name.split(' ').map(n => n[0]).join('').slice(0,2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{driver.name}</h1>
              <StatusBadge status={driver.status} />
            </div>
            <p className="text-muted-foreground text-sm">NIF: {driver.nif}</p>
          </div>
        </div>
        <Button variant="outline"><Edit2 className="w-4 h-4" /> Edit</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Phone, label: driver.phone },
          { icon: Mail, label: driver.email },
          { icon: MapPin, label: driver.address },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{item.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="px-4 pt-2">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Personal Info</h3>
                {[
                  ['Full Name', driver.name],
                  ['NIF', driver.nif],
                  ['Phone', driver.phone],
                  ['Email', driver.email],
                  ['Address', driver.address],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm border-b border-border pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right max-w-48 truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Compliance</h3>
                {[
                  ['License Expiry', formatDate(driver.licenseExpiry)],
                  ['TVDE Cert Expiry', formatDate(driver.tvdeCertExpiry)],
                  ['Assigned Vehicle', driver.assignedVehiclePlate ?? 'None'],
                  ['Status', driver.status],
                  ['Availability', driver.availability],
                  ['Member Since', formatDate(driver.createdAt)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between text-sm border-b border-border pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Vehicle</TableHeaderCell>
                  <TableHeaderCell>Start</TableHeaderCell>
                  <TableHeaderCell>End</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Odometer</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {driverAssignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.vehiclePlate}</TableCell>
                    <TableCell>{formatDateTime(a.startTime)}</TableCell>
                    <TableCell>{a.endTime ? formatDateTime(a.endTime) : 'Active'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>{a.odometerStart ? `${a.odometerStart.toLocaleString()} km` : '—'}</TableCell>
                  </TableRow>
                ))}
                {driverAssignments.length === 0 && (
                  <TableRow><TableCell className="py-8 text-center text-muted-foreground">No assignments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'documents' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Document</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Expiry</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {driverDocs.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost">Upload</Button></TableCell>
                  </TableRow>
                ))}
                {driverDocs.length === 0 && (
                  <TableRow><TableCell className="py-8 text-center text-muted-foreground">No documents</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'contracts' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Period</TableHeaderCell>
                  <TableHeaderCell>Settlement</TableHeaderCell>
                  <TableHeaderCell>Value</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {driverContracts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="capitalize">{c.type}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>{formatDate(c.startDate)} → {formatDate(c.endDate)}</TableCell>
                    <TableCell className="capitalize">{c.settlementModel}</TableCell>
                    <TableCell>{c.settlementModel === 'fixed' ? formatCurrency(c.value) : `${c.value}%`}</TableCell>
                  </TableRow>
                ))}
                {driverContracts.length === 0 && (
                  <TableRow><TableCell className="py-8 text-center text-muted-foreground">No contracts</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'availability' && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Availability calendar coming soon.</p>
              <p className="text-sm mt-1">Will show weekly schedule, time-off, and blocked days.</p>
            </div>
          )}

          {activeTab === 'payouts' && (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Period</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Method</TableHeaderCell>
                  <TableHeaderCell>Processed</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {driverPayouts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.period}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.processedAt ? formatDate(p.processedAt) : '—'}</TableCell>
                  </TableRow>
                ))}
                {driverPayouts.length === 0 && (
                  <TableRow><TableCell className="py-8 text-center text-muted-foreground">No payouts</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
