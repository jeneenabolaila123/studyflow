export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      <div className="tabsList" role="tablist" aria-label="Workspace sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabsTab ${active === t.id ? 'tabsTabActive' : ''}`}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
