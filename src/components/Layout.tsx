import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ToastContainer } from './Toast';
import { BridalBackground } from './BridalBackground';

export function Layout() {
  return (
    <>
      <BridalBackground />

      <div className="relative z-10 flex h-screen font-arabic overflow-hidden" style={{ gap: '2.5cm', paddingLeft: '0.5cm' }}>
        <Sidebar />

        <div
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{
            paddingRight: '0.5cm',
            paddingTop: '0.5cm',
            paddingBottom: '0.5cm',
          }}
        >
          <TopHeader />

          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="min-h-full" style={{ paddingInline: '0px', paddingTop: '0.5cm', paddingBottom: '0px' }}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
