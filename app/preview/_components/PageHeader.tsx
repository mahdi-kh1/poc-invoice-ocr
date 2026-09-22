export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="preview-page-header">
      <div>
        <h1 className="preview-page-title">{title}</h1>
        {description && <p className="preview-page-desc">{description}</p>}
      </div>
      {actions && <div className="preview-page-actions">{actions}</div>}
    </div>
  );
}
