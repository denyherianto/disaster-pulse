
export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <main className="w-full max-w-md bg-slate-50 h-[100dvh] sm:border sm:border-slate-200 sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col font-sans">
        {children}
      </main>
    </div>
  );
}
