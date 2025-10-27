import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Home from './pages/Home'
import AdminEvents from './pages/AdminEvents'
import Sidebar from './components/SideBar'
import './index.css'

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: isHomePage ? '#051323' : '#f8fafc' }}>
      {!isHomePage && <Sidebar />}
      <main className={isHomePage ? "flex-1" : "flex-1 p-4 lg:p-8 space-y-6"}>
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
