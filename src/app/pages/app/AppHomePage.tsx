import { Link } from 'react-router-dom';
import { Car, CreditCard, Users } from 'lucide-react';
import { COMPANY_ADMIN } from '@/lib/fleetos-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AppHomePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workspace setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your fleet before subscribing to live operations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-[#00B39A]" />
            Fleet vehicles
          </CardTitle>
          <CardDescription>
            Add and manage vehicles in your approved workspace. Bookings and dispatch unlock after
            billing activation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={COMPANY_ADMIN.vehicles}>
            <Button type="button">Manage vehicles</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#00B39A]" />
            Fleet drivers
          </CardTitle>
          <CardDescription>
            Register and manage drivers in your approved workspace. Assignments unlock after billing
            activation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={COMPANY_ADMIN.drivers}>
            <Button type="button">Manage drivers</Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="opacity-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Billing
          </CardTitle>
          <CardDescription>Subscribe to unlock the operational dashboard.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
