import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Roster from './components/Roster';
import Footer from './components/Footer';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import CreatorEditPage from './components/CreatorEditPage';
import CreatorAddPage from './components/CreatorAddPage';
import InfluencerOnboarding from './components/InfluencerOnboarding';
import ProtectedRoute from './components/ProtectedRoute';
import { FieldOptionsProvider } from './contexts/FieldOptionsContext';

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#5072a7] selection:text-white">
      <Header />
      <main className="pt-10">
        <Roster />
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <FieldOptionsProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/onboarding" element={<InfluencerOnboarding />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/add"
          element={
            <ProtectedRoute>
              <CreatorAddPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/edit/:id"
          element={
            <ProtectedRoute>
              <CreatorEditPage />
            </ProtectedRoute>
          }
        />
        </Routes>
      </BrowserRouter>
    </FieldOptionsProvider>
  );
};

export default App;
