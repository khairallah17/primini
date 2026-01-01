export default function ProductDetailSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Breadcrumb Skeleton */}
      <nav className="flex items-center gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
        <span className="text-slate-400">/</span>
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <span className="text-slate-400">/</span>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      </nav>

      {/* Product Header Skeleton */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200 md:h-12" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-10 w-20 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Images and Description Section Skeleton */}
      <div className="grid gap-8 lg:grid-cols-[1fr,1.2fr]">
        {/* Left Column - Image Gallery Skeleton */}
        <div className="w-full flex flex-col items-center">
          <div className="relative aspect-[4/3] w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-hidden rounded-2xl bg-slate-200 mb-4 animate-pulse">
            <div className="absolute inset-4 md:inset-6">
              <div className="h-full w-full bg-slate-300 rounded" />
            </div>
          </div>
          {/* Thumbnail Gallery Skeleton */}
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg bg-slate-200 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Description Skeleton */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <div className="h-10 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-24 animate-pulse rounded bg-slate-200" />
        </div>
      </div>

      {/* Tab Content Skeleton */}
      <div className="space-y-6">
        {/* Filter Checkbox Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Offers List Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-lg p-4 animate-pulse"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
                <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Similar Products Skeleton */}
      <section className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="min-w-[250px] sm:min-w-[280px] h-96 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

