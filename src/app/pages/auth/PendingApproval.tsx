import { MembershipGatePage } from '@/components/auth/MembershipGatePage';

export default function PendingApproval() {
  return (
    <MembershipGatePage
      title="Access pending approval"
      description="Your CodeVertex account is signed in, but your FleetOS membership is waiting for approval. An administrator must approve your access before you can use the operational app."
      hint="FleetOS uses approval-required membership. You will receive access once approved."
    />
  );
}
