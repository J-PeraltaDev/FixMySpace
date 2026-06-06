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
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#bfecdd] font-bold text-[#00261e]">FM</div>
      <div>
        <h3 className="text-lg font-bold text-[#191c1b]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[#414845]">{message}</p>
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="primary-button">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
