import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import AdminEvents from './pages/AdminEvents'
import AdminGroups from './pages/AdminGroups'
import AdminUsers from './pages/AdminUsers'
import AdminMedia from './pages/AdminMedia'
import AdminSettings from './pages/AdminSettings'
import APIHealthDashboard from './pages/APIHealthDashboard'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import OnlineCommunity from './pages/OnlineCommunity'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import Profile from './pages/Profile'
import MemberDashboard from './pages/MemberDashboard'
import Unauthorized from './pages/Unauthorized'
import Donate from './pages/Donate'
import Navigation from './components/Navigation'
import ProtectedRoute from './components/ProtectedRoute'
import { HealthBanner } from './components/HealthBanner'
import './index.css'

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAuthPage = location.pathname === '/login' || 
                     location.pathname === '/register' || 
                     location.pathname === '/admin/login';

  return (
    <div className="min-h-screen" style={{ backgroundColor: isAdminPage ? '#0a1f35' : '#051323' }}>
      {isAdminPage && !isAuthPage && <HealthBanner />}
      {!isAuthPage && (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <Navigation />
        </div>
      )}
      <main className={isAdminPage ? "p-4 lg:p-8" : ""}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/donate" element={<Donate />} />
          <Route 
            path="/community" 
            element={
              <ProtectedRoute>
                <OnlineCommunity />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups" 
            element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups/:id" 
            element={
              <ProtectedRoute>
                <GroupDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member" 
            element={
              <ProtectedRoute>
                <MemberDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/events" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminEvents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/groups" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminGroups />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminUsers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/media" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminMedia />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminSettings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/health" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <APIHealthDashboard />
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
