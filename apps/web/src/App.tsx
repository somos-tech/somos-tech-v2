import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Home from './pages/Home'
import AdminEvents from './pages/AdminEvents'
import Login from './pages/Login'
import Register from './pages/Register'
import Unauthorized from './pages/Unauthorized'
import Navigation from './components/Navigation'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen" style={{ backgroundColor: isAdminPage ? '#0a1f35' : '#051323' }}>
      {!isAuthPage && (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <Navigation />
        </div>
      )}
      <main className={isAdminPage ? "p-4 lg:p-8" : ""}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route 
            path="/admin/events" 
            element={
              <ProtectedRoute>
                <AdminEvents />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
