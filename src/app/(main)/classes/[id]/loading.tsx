export default function Loading() {
  return (
    <div className="max-w-xl mx-auto pb-32 animate-pulse">
      <div className="w-full h-[260px] bg-gray-200" />
      <div className="px-4 pt-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
          <div className="h-5 w-12 bg-gray-200 rounded-full" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="space-y-2 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
