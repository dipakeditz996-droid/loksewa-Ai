export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="font-heading text-[22px] font-extrabold tracking-tight text-[#0B2545]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-[#667085]">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2.5">{action}</div>}
    </div>
  );
}
