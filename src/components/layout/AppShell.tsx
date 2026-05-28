import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={pageTitle} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
