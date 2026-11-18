/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StockfyProvider, useStockfy } from './context/StockfyContext';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { SalesAndCreditsView } from './components/SalesAndCreditsView';
import { InventoryView } from './components/InventoryView';
import { FinanceView } from './components/FinanceView';
import { ExpensesAndWarrantiesView } from './components/ExpensesAndWarrantiesView';

const ActiveWorkspace: React.FC = () => {
  const { activeTab } = useStockfy();

  switch (activeTab) {
    case 'dashboard':
      return <DashboardView />;
    case 'sales':
      return <SalesAndCreditsView />;
    case 'inventory':
      return <InventoryView />;
    case 'finance':
      return <FinanceView />;
    case 'expenses':
      return <ExpensesAndWarrantiesView />;
    default:
      return <DashboardView />;
  }
};

export default function App() {
  return (
    <StockfyProvider>
      <Layout>
        <ActiveWorkspace />
      </Layout>
    </StockfyProvider>
  );
}
