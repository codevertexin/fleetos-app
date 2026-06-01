import { MembershipGatePage } from '@/components/auth/MembershipGatePage';
import type { FleetosAccessState } from '@/types/fleetos-access';

const COPY: Partial<
  Record<FleetosAccessState, { title: string; description: string; hint?: string }>
> = {
  needs_onboarding: {
    title: 'Register your company',
    description:
      'Complete company onboarding to submit your FleetOS workspace application.',
    hint: 'You will enter Preview mode after submission while we review your application.',
  },
  pending_review: {
    title: 'Preview workspace',
    description:
      'Your company application is under review. Explore simulated dashboards, sample fleet data, tutorials, and support while you wait.',
    hint: 'Operational data and team invites unlock after approval.',
  },
  active_unsubscribed: {
    title: 'Complete setup & subscribe',
    description:
      'Your company is approved. Configure vehicles, drivers, and your team, then subscribe to unlock live fleet operations.',
    hint: 'Bookings, dispatch, and billable operations require an active subscription.',
  },
};

interface AccessWorkspacePageProps {
  mode: FleetosAccessState;
}

export default function AccessWorkspacePage({ mode }: AccessWorkspacePageProps) {
  const copy = COPY[mode] ?? COPY.pending_review!;
  return (
    <MembershipGatePage
      title={copy.title}
      description={copy.description}
      hint={copy.hint}
    />
  );
}
