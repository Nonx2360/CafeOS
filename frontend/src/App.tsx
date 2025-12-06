import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// Force refresh

import { useEffect } from "react";
import { connectSocket } from "./socket";
import { AdminDashboard } from "./pages/AdminDashboard";
import { OrderPage } from "./pages/OrderPage";
import { Kitchen } from "./pages/Kitchen";
import { MenuManagement } from "./pages/MenuManagement";
import { TableManagement } from "./pages/TableManagement";
import { ReceiptPage } from "./pages/ReceiptPage";
import { OrderHistory } from "./pages/OrderHistory";
import { SalesReportPage } from "./pages/SalesReportPage";
import { StaffManagement } from "./pages/StaffManagement";
import { Promotions } from "./pages/Promotions";
import { UtensilsCrossed, ChefHat, LayoutDashboard, Coffee } from "lucide-react";

// Home page with natural styling
const Home = () => (
  <div className="min-h-[calc(100vh-72px)] flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)' }}>
    <div className="text-center px-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Coffee className="w-12 h-12 text-amber-500" strokeWidth={1.5} />
          <h1 className="text-5xl font-semibold tracking-tight" style={{ color: '#e2e8f0' }}>
            Cafe<span style={{ color: '#e07848' }}>OS</span>
          </h1>
        </div>
        <p className="text-lg leading-relaxed" style={{ color: '#8b95a5' }}>
          A modern ordering system with real-time kitchen display and smart table management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
        <Link
          to="/order"
          className="group p-7 rounded-xl transition-all duration-200 hover:-translate-y-1"
          style={{
            background: 'rgba(30, 37, 45, 0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}
        >
          <div className="icon-container mb-5 mx-auto group-hover:bg-amber-900/30 transition-colors">
            <UtensilsCrossed className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Customer Order</h2>
          <p style={{ color: '#6b7785' }} className="text-sm">Browse the menu and place your order</p>
        </Link>

        <Link
          to="/kitchen"
          className="group p-7 rounded-xl transition-all duration-200 hover:-translate-y-1"
          style={{
            background: 'rgba(30, 37, 45, 0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}
        >
          <div className="icon-container mb-5 mx-auto group-hover:bg-orange-900/30 transition-colors">
            <ChefHat className="w-6 h-6 text-orange-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Kitchen Display</h2>
          <p style={{ color: '#6b7785' }} className="text-sm">View and manage incoming orders</p>
        </Link>

        <Link
          to="/admin"
          className="group p-7 rounded-xl transition-all duration-200 hover:-translate-y-1"
          style={{
            background: 'rgba(30, 37, 45, 0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}
        >
          <div className="icon-container mb-5 mx-auto group-hover:bg-blue-900/30 transition-colors">
            <LayoutDashboard className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Admin Dashboard</h2>
          <p style={{ color: '#6b7785' }} className="text-sm">Manage menu, tables, and view stats</p>
        </Link>
      </div>

      <div className="mt-14" style={{ color: '#5c6675' }}>
        <p className="text-sm">Real-time updates via WebSocket • React + FastAPI</p>
      </div>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    connectSocket();
  }, []);

  return (
    <Router>
      <div className="min-h-screen" style={{ background: '#0f1419' }}>
        <nav className="sticky top-0 z-50" style={{
          background: 'rgba(15, 20, 25, 0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="container mx-auto px-5 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold" style={{ color: '#e2e8f0' }}>
              <Coffee className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
              Cafe<span style={{ color: '#e07848' }}>OS</span>
            </Link>
            <div className="flex gap-8">
              <Link to="/order" className="text-sm font-medium transition-colors hover:text-amber-400" style={{ color: '#8b95a5' }}>Order</Link>
              <Link to="/kitchen" className="text-sm font-medium transition-colors hover:text-orange-400" style={{ color: '#8b95a5' }}>Kitchen</Link>
              <Link to="/admin" className="text-sm font-medium transition-colors hover:text-blue-400" style={{ color: '#8b95a5' }}>Admin</Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/menu" element={<MenuManagement />} />
          <Route path="/admin/tables" element={<TableManagement />} />
          <Route path="/admin/orders" element={<OrderHistory />} />
          <Route path="/admin/reports" element={<SalesReportPage />} />
          <Route path="/admin/staff" element={<StaffManagement />} />
          <Route path="/admin/promotions" element={<Promotions />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/receipt/:orderId" element={<ReceiptPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
