import Link from "next/link";

export function EmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="soft-card flex flex-col items-start gap-4 p-6">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 font-black text-emerald-900">FM</div>
      <div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="primary-button">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
