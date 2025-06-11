import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {


  return (
    <main className="bg-neutral-50 min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4">
        <nav className="flex justify-center items-center">
          <Image 
            src="/logo.svg" 
            alt="Task Management" 
            width={600} 
            height={90} 
            className="h-18 w-auto"
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