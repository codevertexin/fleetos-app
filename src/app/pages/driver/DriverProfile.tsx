import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  Clock,
  Car,
  ChevronRight,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  Moon,
  Sun,
  Edit,
} from 'lucide-react';
import { openHelpCenter } from '@/lib/services/help.service';
import { openLegal } from '@/lib/services/legal.service';

const mockDriver = {
  name: 'Miguel Santos',
  phone: '+351 912 345 678',
  email: 'miguel.santos@email.com',
  city: 'Lisboa',
  vehicle: 'Toyota Corolla · AB-12-CD',
  joinedAt: 'January 2024',
  rating: 4.87,
  totalTrips: 312,
  totalHours: 840,
  acceptanceRate: 94,
  cancellationRate: 2,
  tier: 'Gold',
  avatarInitials: 'MS',
};

const stats = [
  { label: 'Total Trips', value: mockDriver.totalTrips.toString(), icon: <Car className="h-4 w-4" /> },
  { label: 'Rating', value: mockDriver.rating.toString(), icon: <Star className="h-4 w-4" /> },
  { label: 'Hours', value: `${mockDriver.totalHours}h`, icon: <Clock className="h-4 w-4" /> },
  { label: 'Acceptance', value: `${mockDriver.acceptanceRate}%`, icon: <TrendingUp className="h-4 w-4" /> },
];

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 p-3">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  sublabel,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left ${danger ? 'text-red-600' : ''}`}
      onClick={onClick}
    >
      <span className={`shrink-0 ${danger ? 'text-red-500' : 'text-muted-foreground'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-600' : ''}`}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function DriverProfile() {
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const tierColor =
    mockDriver.tier === 'Gold'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : mockDriver.tier === 'Platinum'
      ? 'bg-slate-100 text-slate-800 border-slate-300'
      : 'bg-orange-100 text-orange-800 border-orange-300';

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Profile</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Avatar + name card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-primary">{mockDriver.avatarInitials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold leading-tight">{mockDriver.name}</h2>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${tierColor}`}>
                    {mockDriver.tier} Driver
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{mockDriver.vehicle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Member since {mockDriver.joinedAt}</p>
              </div>

              <Button variant="ghost" size="icon" className="shrink-0">
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* Contact info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{mockDriver.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{mockDriver.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{mockDriver.city}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex divide-x">
              {stats.map(s => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance breakdown */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">This Month</p>
            <div className="space-y-2">
              {[
                { label: 'Acceptance Rate', value: mockDriver.acceptanceRate, color: 'bg-green-500', suffix: '%' },
                { label: 'Cancellation Rate', value: mockDriver.cancellationRate, color: 'bg-red-400', suffix: '%', invert: true },
                { label: 'On-time Starts', value: 91, color: 'bg-blue-500', suffix: '%' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}{item.suffix}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.invert ? item.value * 5 : item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <Separator />
            <MenuRow
              icon={<Bell className="h-4 w-4" />}
              label="Notifications"
              sublabel="Manage push & SMS alerts"
            />
            <Separator />
            <MenuRow
              icon={<Shield className="h-4 w-4" />}
              label="Security"
              sublabel="PIN, biometrics, sessions"
            />
            <Separator />
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left"
              onClick={() => setDarkMode(!darkMode)}
            >
              <span className="shrink-0 text-muted-foreground">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-muted-foreground">{darkMode ? 'Dark mode on' : 'Light mode on'}</p>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-muted'} relative`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Support & Legal */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Support & Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <Separator />
            <MenuRow
              icon={<HelpCircle className="h-4 w-4" />}
              label="Help Center"
              sublabel="FAQs and support articles"
              onClick={() => openHelpCenter('driver_home')}
            />
            <Separator />
            <MenuRow
              icon={<FileText className="h-4 w-4" />}
              label="Terms of Service"
              onClick={() => openLegal('terms')}
            />
            <Separator />
            <MenuRow
              icon={<FileText className="h-4 w-4" />}
              label="Privacy Policy"
              onClick={() => openLegal('privacy')}
            />
          </CardContent>
        </Card>

        {/* Sign out */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {!showLogoutConfirm ? (
              <MenuRow
                icon={<LogOut className="h-4 w-4" />}
                label="Sign Out"
                danger
                onClick={() => setShowLogoutConfirm(true)}
              />
            ) : (
              <div className="px-4 py-4">
                <p className="text-sm font-medium text-red-700 mb-3">Sign out of FleetOS?</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      // auth sign-out would go here
                      setShowLogoutConfirm(false);
                    }}
                  >
                    Sign Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowLogoutConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pb-2">
          FleetOS Driver · v2.4.1
        </p>
      </div>
    </div>
  );
}
