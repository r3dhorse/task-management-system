"use client";

const LoadingPage = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white" />
        <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-white/40 opacity-20" />
      </div>
    </div>
  );
};

export default LoadingPage;
