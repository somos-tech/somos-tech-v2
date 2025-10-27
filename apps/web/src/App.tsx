import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from './pages/Home'
import AdminEvents from './pages/AdminEvents'
import Sidebar from './components/SideBar'
import './index.css'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 space-y-6">
          {/* <HeaderBar /> */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin/events" element={<AdminEvents />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
