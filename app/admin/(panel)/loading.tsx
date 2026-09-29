export default function Loading() {
  return (
    <div className="grid min-h-[40dvh] place-items-center" aria-busy="true">
      <div className="flex items-center gap-2" role="status">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-pulse rounded-full bg-lavender" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
