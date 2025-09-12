interface AuthLayoutProps {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {


  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Enhanced gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/60 via-indigo-900/40 to-purple-900/60"></div>
      
      {/* Task management inspired geometric patterns */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-white/20"/>
        </svg>
      </div>
      
      {/* Floating elements for productivity theme */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {/* Task board inspired floating cards */}
        <div className="absolute top-20 left-20 w-32 h-20 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg backdrop-blur-sm animate-pulse border border-white/5"></div>
        <div className="absolute top-40 right-32 w-28 h-16 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg backdrop-blur-sm animate-pulse delay-1000 border border-white/5"></div>
        <div className="absolute bottom-32 left-1/4 w-36 h-24 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg backdrop-blur-sm animate-pulse delay-2000 border border-white/5"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-18 bg-gradient-to-r from-slate-500/10 to-blue-500/10 rounded-lg backdrop-blur-sm animate-pulse delay-3000 border border-white/5"></div>
        
        {/* Subtle glow effects */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-2/3 right-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-4000"></div>
        
        {/* Connecting lines for workflow visualization */}
        <div className="absolute top-1/3 left-1/4 w-px h-32 bg-gradient-to-b from-white/5 to-transparent animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-px bg-gradient-to-r from-white/5 to-transparent animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/3 left-1/2 w-px h-20 bg-gradient-to-t from-white/5 to-transparent animate-pulse delay-3000"></div>
      </div>
      
      <div className="mx-auto max-w-screen-2xl p-4 relative z-10">
        <div className="flex flex-col items-center justify-center min-h-screen">
          {children}
        </div>
      </div>
      
      {/* Bottom decorative gradient */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
    </main>
  );
}

export default AuthLayout;