import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/theme/ThemeProvider';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Reconciliation from './pages/Reconciliation';
import FraudIntelligence from './pages/FraudIntelligence';
import Notices from './pages/Notices';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Upload from './pages/Upload';
import VendorPortal from './pages/VendorPortal';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<Landing />} />

          {/* App with shared layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/reconcile" element={<Reconciliation />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/fraud" element={<FraudIntelligence />} />
            <Route path="/vendor-portal" element={<VendorPortal />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
