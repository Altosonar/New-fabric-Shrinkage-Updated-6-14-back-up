import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ResultsProvider } from './store/ResultsContext';
import { MainLayout } from './layouts/MainLayout';
import { CalculatorPage } from './features/shrinkage-calculator/pages/CalculatorPage';
import { ResultsPage } from './features/results/pages/ResultsPage';
import { SettingsPage } from './features/settings';

function App() {
  return (
    <ResultsProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<CalculatorPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ResultsProvider>
  );
}

export default App;
