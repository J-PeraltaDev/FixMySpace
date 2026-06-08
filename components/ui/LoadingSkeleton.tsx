type LoadingSkeletonProps = {
  count?: number;
  className?: string;
};

export function LoadingSkeleton({
  count = 1,
  className = "",
}: LoadingSkeletonProps) {
  const classes = [
    "soft-card h-24 animate-pulse bg-white",
    className,
  ].filter(Boolean).join(" ");

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          aria-label="Cargando"
          className={classes}
          key={index}
          role="status"
        />
      ))}
    </>
  );
}
