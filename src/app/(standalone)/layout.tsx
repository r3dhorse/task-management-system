
interface StandaloneLayoutProps {
  children: React.ReactNode;
}


const StandaloneLayout = ({ children }: StandaloneLayoutProps) => {

  return (
    <main className="bg-neutral-100 min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4">
        <div className="flex flex-col items-center justify-center min-h-screen">
          {children}
        </div>
      </div>
    </main>
  );

}

export default StandaloneLayout;