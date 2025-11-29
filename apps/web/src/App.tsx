import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import HomeRedesigned from './pages/HomeRedesigned'
import AdminDashboardRedesigned from './pages/AdminDashboardRedesigned'
import AdminDashboardNew from './pages/AdminDashboardNew'
import AdminEvents from './pages/AdminEvents'
import AdminGroups from './pages/AdminGroups'
import AdminUsers from './pages/AdminUsersRedesigned'
import AdminMedia from './pages/AdminMedia'
import AdminSettings from './pages/AdminSettings'
import AdminSettingsNew from './pages/AdminSettingsNew'
import AdminSecurity from './pages/AdminSecurity'
import AdminModeration from './pages/AdminModerationNew'
import AdminOptions from './pages/AdminOptions'
import AdminNotifications from './pages/AdminNotifications'
import AdminAnnouncements from './pages/AdminAnnouncements'
import AdminIntegrations from './pages/AdminIntegrations'
import APIHealthDashboard from './pages/APIHealthDashboard'
import SecurityDashboard from './pages/SecurityDashboard'
import ErrorPage from './pages/ErrorPage'
import GroupsDirectoryRedesigned from './pages/GroupsDirectoryRedesigned'
import GroupDetail from './pages/GroupDetail'
import OnlineCommunity from './pages/OnlineCommunityRedesigned'
import Chapters from './pages/Chapters'
import ProgramsPageRedesigned from './pages/ProgramsPageRedesigned'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Register from './pages/Register'
import Profile from './pages/Profile'
import MemberDashboard from './pages/MemberDashboard'
import Unauthorized from './pages/Unauthorized'
import Unsubscribe from './pages/Unsubscribe'
import Donate from './pages/Donate'
import Navigation from './components/Navigation'
import ProtectedRoute from './components/ProtectedRoute'
import { HealthBanner } from './components/HealthBanner'
import { UserProvider } from './contexts/UserContext'
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
          <Route path="/" element={<HomeRedesigned />} />
          <Route path="/programs" element={<ProgramsPageRedesigned />} />
          <Route path="/programs/:id" element={<ProgramsPageRedesigned />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/donate" element={<Donate />} />
          <Route 
            path="/online" 
            element={
              <ProtectedRoute>
                <OnlineCommunity />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups" 
            element={
              <GroupsDirectoryRedesigned />
            } 
          />
          <Route 
            path="/chapters" 
            element={
              <ProtectedRoute>
                <Chapters />
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
                <AdminDashboardNew />
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
                <AdminSettingsNew />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings/security" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminSecurity />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings/moderation" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminModeration />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings/media" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminMedia />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings/options" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminOptions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings/integrations" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminIntegrations />
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
          <Route 
            path="/admin/notifications" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/announcements" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminAnnouncements />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/security" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <SecurityDashboard />
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
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  )
}
