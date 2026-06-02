import { Navigate } from 'react-router-dom';
import { isPlatformAdminUiEnabled } from '@/lib/platform-admin-ui';

export function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  if (!isPlatformAdminUiEnabled()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
