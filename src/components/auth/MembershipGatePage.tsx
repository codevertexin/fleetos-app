import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';

interface MembershipGatePageProps {
  title: string;
  description: string;
  hint?: string;
}

export function MembershipGatePage({ title, description, hint }: MembershipGatePageProps) {
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <img src="/logo.png" alt="FleetOS" className="mx-auto mb-6 h-16 w-16" />
        <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        {user?.email ? (
          <p className="mb-6 text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        ) : null}
        {hint ? <p className="mb-6 text-xs text-muted-foreground">{hint}</p> : null}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => logout()}>
            Sign out
          </Button>
          <a href="/login" className="text-sm text-[#00B39A] hover:underline">
            Back to login
          </a>
        </div>
        <p className="mt-10 text-[10px] text-muted-foreground">
          Protected account access by CodeVertex
        </p>
      </div>
    </div>
  );
}
