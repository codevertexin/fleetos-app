import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockOwnerProfile } from '@/lib/mock-data';
import { LEGAL_LINKS } from '@/lib/services/legal.service';

const PROFILE_FIELDS = [
  { label: 'Full Name', key: 'name' as const },
  { label: 'Email', key: 'email' as const },
  { label: 'Phone', key: 'phone' as const },
  { label: 'NIF', key: 'nif' as const },
  { label: 'Company', key: 'companyName' as const },
  { label: 'Address', key: 'address' as const },
  { label: 'IBAN', key: 'iban' as const },
];

const LEGAL = [
  { label: 'Privacy Policy', url: LEGAL_LINKS.privacyPolicy },
  { label: 'Terms of Service', url: LEGAL_LINKS.termsOfService },
  { label: 'Data Processing Agreement', url: LEGAL_LINKS.dpa },
];

export function ProfileTab() {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Personal Information</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROFILE_FIELDS.map(f => (
            <div key={f.label}>
              <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
              {editing ? (
                <input
                  defaultValue={mockOwnerProfile[f.key] || ''}
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              ) : (
                <p className="text-sm text-foreground font-medium">
                  {mockOwnerProfile[f.key] || '—'}
                </p>
              )}
            </div>
          ))}
          {editing && <Button className="w-full">Save Changes</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {LEGAL.map(l => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="text-sm text-foreground">{l.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
