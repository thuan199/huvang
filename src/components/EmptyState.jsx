import { Inbox } from 'lucide-react';

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action = null,
  compact = false,
}) {
  return (
    <div
      className={`app-empty-state ${compact ? 'app-empty-state--compact' : ''}`}
      role="status"
    >
      <div className="app-empty-state__icon" aria-hidden="true">
        <Icon size={compact ? 24 : 30} />
      </div>

      <div className="app-empty-state__content">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>

      {action && (
        <div className="app-empty-state__action">
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;