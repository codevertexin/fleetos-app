const BRAND_COLORS = [
  { name: 'Primary', color: '#00B39A' },
  { name: 'Secondary', color: '#22C7D8' },
  { name: 'Dark Blue', color: '#1F6A8A' },
  { name: 'Navy', color: '#0A1628' },
];

export function AppearancePanel() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-foreground">Theme</h2>
      <p className="text-sm text-muted-foreground">
        Use the dark mode toggle in the sidebar to switch between light and dark themes.
      </p>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Brand Colors</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BRAND_COLORS.map(c => (
          <div key={c.name} className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: c.color }} />
            <div>
              <p className="text-xs font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{c.color}</p>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-border" />
      <h2 className="text-base font-semibold text-foreground">Logo</h2>
      <div className="flex items-center gap-4">
        <img
          src="/logo.png"
          alt="Logo"
          className="h-10 rounded-lg bg-background p-1 border border-border"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <button className="px-3 py-1.5 border border-border text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground">
          Upload Logo
        </button>
      </div>
    </div>
  );
}
