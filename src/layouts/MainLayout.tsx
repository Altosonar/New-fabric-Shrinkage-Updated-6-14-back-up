import React, { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-container">
      <header className="top-header">
        <div className="logo">
          <i className="fas fa-layer-group"></i> Fabric Shrinkage Calculator
        </div>
        <div id="header-nav-portal"></div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
