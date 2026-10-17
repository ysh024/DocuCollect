export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-neutral-500 tracking-wide uppercase">
          Loading DocGet...
        </p>
      </div>
    </div>
  );
}
