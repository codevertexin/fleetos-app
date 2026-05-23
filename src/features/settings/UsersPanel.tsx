import { cn } from '@/lib/utils';

const mockTeamMembers = [
  { id: 'u1', name: 'Carlos Mendes', email: 'carlos@fleetos.app', role: 'Fleet Admin', status: 'active' },
  { id: 'u2', name: 'Ana Torres', email: 'ana@fleetos.app', role: 'Dispatcher', status: 'active' },
  { id: 'u3', name: 'Luis Pinto', email: 'luis@fleetos.app', role: 'Accountant', status: 'active' },
  { id: 'u4', name: 'Sara Costa', email: 'sara@fleetos.app', role: 'Driver', status: 'inactive' },
];

const ROLES = ['Fleet Admin', 'Dispatcher', 'Accountant', 'Driver', 'Owner', 'Support'];

const PERMISSIONS = [
  { role: 'Fleet Admin', vehicles: 'Full', drivers: 'Full', finance: 'Full', settings: 'Full' },
  { role: 'Dispatcher', vehicles: 'Read', drivers: 'Read', finance: 'None', settings: 'None' },
  { role: 'Accountant', vehicles: 'Read', drivers: 'Read', finance: 'Full', settings: 'None' },
  { role: 'Driver', vehicles: 'Own', drivers: 'None', finance: 'None', settings: 'None' },
  { role: 'Owner', vehicles: 'Own', drivers: 'None', finance: 'Own', settings: 'None' },
];

function permColor(v: string) {
  return v === 'Full'
    ? 'bg-green-500/10 text-green-600'
    : v === 'Read'
    ? 'bg-blue-500/10 text-blue-500'
    : v === 'Own'
    ? 'bg-amber-500/10 text-amber-600'
    : 'bg-muted text-muted-foreground';
}

export function UsersPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Team Members</h2>
        <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors">
          + Invite Member
        </button>
      </div>
      <div className="space-y-2">
        {mockTeamMembers.map(m => (
          <div
            key={m.id}
            className="flex items-center justify-between py-3 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                {m.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                defaultValue={m.role}
                className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none"
              >
                {ROLES.map(r => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  m.status === 'active'
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {m.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-border mt-2" />
      <h2 className="text-base font-semibold text-foreground">Roles & Permissions</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left text-muted-foreground font-semibold">Role</th>
              {['Vehicles', 'Drivers', 'Finance', 'Settings'].map(h => (
                <th key={h} className="py-2 text-center text-muted-foreground font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(r => (
              <tr key={r.role} className="border-b border-border last:border-0">
                <td className="py-2 font-medium text-foreground">{r.role}</td>
                {[r.vehicles, r.drivers, r.finance, r.settings].map((v, i) => (
                  <td key={i} className="py-2 text-center">
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', permColor(v))}>
                      {v}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
