import React, { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-container">
      {/* Desktop vertical sidebar — nav items portaled in from CalculatorPage */}
      <aside className="sidebar-nav">
        <div className="sidebar-logo">
          <i className="fas fa-layer-group"></i>
        </div>
        {/* Portal target for sidebar nav buttons */}
        <div id="sidebar-nav-portal" className="sidebar-nav-items"></div>
      </aside>

      {/* Main body — content sits to the right of the sidebar */}
      <div className="app-body">
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation portal target — nav items portaled in from CalculatorPage */}
      <nav id="mobile-nav-portal" className="mobile-bottom-nav"></nav>
    </div>
  );
}
