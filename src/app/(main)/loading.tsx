export default function Loading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card p-3 flex items-start gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
