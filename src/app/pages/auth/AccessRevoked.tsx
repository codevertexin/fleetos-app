import { MembershipGatePage } from '@/components/auth/MembershipGatePage';

export default function AccessRevoked() {
  return (
    <MembershipGatePage
      title="FleetOS access revoked"
      description="Your FleetOS membership has been revoked. You can no longer access the operational FleetOS workspace with this account."
      hint="If you believe this is a mistake, contact your administrator."
    />
  );
}
