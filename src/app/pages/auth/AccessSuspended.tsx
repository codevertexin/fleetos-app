import { MembershipGatePage } from '@/components/auth/MembershipGatePage';

export default function AccessSuspended() {
  return (
    <MembershipGatePage
      title="FleetOS access suspended"
      description="Your FleetOS membership is currently suspended. Contact your fleet administrator or CodeVertex support to restore access."
    />
  );
}
