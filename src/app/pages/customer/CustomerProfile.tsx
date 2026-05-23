import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { User, Shield, Bell, LogOut, ChevronRight, Camera, Edit2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LEGAL_LINKS, openLegal } from '@/lib/services/legal.service';
import { HELP_CORE_URL } from '@/lib/services/help.service';

interface CustomerUser {
  name: string;
  email: string;
  phone: string;
  language: string;
  tripsCount: number;
  rating: number;
}

const mockCustomer: CustomerUser = {
  name: 'Maria João',
  email: 'maria@example.com',
  phone: '+351 920 111 222',
  language: 'English',
  tripsCount: 12,
  rating: 4.9,
};

export default function CustomerProfile() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: mockCustomer.name,
    email: mockCustomer.email,
    phone: mockCustomer.phone,
  });
  const [notifications, setNotifications] = useState({ bookingUpdates: true, promotions: false, sms: true });

  function handleSave() {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Avatar & Stats */}
      <div className="flex flex-col items-center pt-4 pb-2">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {form.name.split(' ').map(n => n[0]).join('')}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <h2 className="text-lg font-bold text-foreground">{form.name}</h2>
        <p className="text-sm text-muted-foreground">{form.email}</p>

        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{mockCustomer.tripsCount}</p>
            <p className="text-xs text-muted-foreground">Trips</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">⭐ {mockCustomer.rating}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Personal Information</CardTitle>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-primary text-sm flex items-center gap-1">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <button onClick={handleSave} className="text-emerald-600 text-sm flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
              <Check className="w-3.5 h-3.5" /> Profile updated successfully
            </div>
          )}
          {[
            { label: 'Full Name', key: 'name' as const },
            { label: 'Email', key: 'email' as const },
            { label: 'Phone', key: 'phone' as const },
          ].map(f => (
            <div key={f.key}>
              <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
              {editing ? (
                <input
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{form[f.key]}</p>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={() => setEditing(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'bookingUpdates' as const, label: 'Booking Updates', sub: 'Trip confirmations and status changes' },
            { key: 'promotions' as const, label: 'Promotions', sub: 'Special offers and discounts' },
            { key: 'sms' as const, label: 'SMS Alerts', sub: 'Driver arrival notifications' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.sub}</p>
              </div>
              <button
                onClick={() => setNotifications({ ...notifications, [n.key]: !notifications[n.key] })}
                className={`relative w-11 h-6 rounded-full transition-colors ${notifications[n.key] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifications[n.key] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legal & Account */}
      <Card>
        <CardContent className="p-2">
          {[
            { label: 'Privacy Policy', action: () => openLegal('privacyPolicy') },
            { label: 'Terms of Service', action: () => openLegal('termsOfService') },
            { label: 'Help Center', action: () => window.open(HELP_CORE_URL, '_blank') },
            { label: 'Delete Account', action: () => {}, danger: true },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              className={`w-full flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-muted transition-colors ${item.danger ? 'text-red-500' : 'text-foreground'}`}>
              <span className="text-sm font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full text-muted-foreground gap-2">
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
}
