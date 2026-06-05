import { Link } from 'react-router-dom';
import { CreditCard, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_ADMIN } from '@/lib/fleetos-routes';

export default function OperationalDashboardLocked() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-[#00B39A]" />
          Operational dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live fleet operations unlock after workspace setup and billing activation.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Subscription required</CardTitle>
          <CardDescription>
            Your company is approved. Finish fleet setup, then subscribe to access bookings,
            dispatch, and the operational dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to={COMPANY_ADMIN.root}>
            <Button type="button">Continue workspace setup</Button>
          </Link>
          <Link to={COMPANY_ADMIN.billing}>
            <Button type="button" variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
