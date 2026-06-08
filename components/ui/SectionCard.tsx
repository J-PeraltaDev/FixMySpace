import type { ReactNode } from "react";

type SectionCardProps = {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  actions,
  children,
  className = "",
}: SectionCardProps) {
  const classes = ["soft-card p-5", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="section-title">{title}</h2> : <span />}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
