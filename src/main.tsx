import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The administrator area is a separate page (/admin) that is not part of the public website bundle.
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'));
const isAdminPage = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminPage ? (
      <Suspense fallback={<div aria-busy="true" />}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
