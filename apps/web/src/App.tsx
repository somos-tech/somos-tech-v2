import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Home from './pages/Home'
import AdminEvents from './pages/AdminEvents'
import Navigation from './components/Navigation'
import './index.css'

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen" style={{ backgroundColor: isAdminPage ? '#0a1f35' : '#051323' }}>
      <div style={{ position: 'relative', zIndex: 50 }}>
        <Navigation />
      </div>
      <main className={isAdminPage ? "p-4 lg:p-8" : ""}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/events" element={<AdminEvents />} />
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
