import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {


  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/50 via-transparent to-purple-900/50"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      <div className="mx-auto max-w-screen-2xl p-4 relative z-10">
        <nav className="flex justify-center items-center">
          <Image 
            src="/logo.svg" 
            alt="Task Management" 
            width={600} 
            height={90} 
            className="h-18 w-auto drop-shadow-lg"
            priority
          />
        </nav>
        <div className="flex flex-col items-center justify-center -mt-0.75">
          {children}
        </div>
      </div>
    </main>
  );
}

export default AuthLayout;