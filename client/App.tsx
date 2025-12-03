import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Workforce from "./pages/Workforce";
import Recrutement from "./pages/Recrutement";
import Departeurs from "./pages/Departeurs";
import Effectif from "./pages/Effectif";
import Attendance from "./pages/Attendance";
import Performance from "./pages/Performance";
import Turnover from "./pages/Turnover";
import Incidents from "./pages/Incidents";
import Sector from "./pages/Sector";
import AdminSuperadmin from "./pages/AdminSuperadmin";
import AdminPointage from "./pages/AdminPointage";
import AdminLaboural from "./pages/AdminLaboural";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/workforce" element={<Workforce />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/turnover" element={<Turnover />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/sector" element={<Sector />} />
              <Route
                path="/admin/superadmin"
                element={
                  <ProtectedRoute requiredPermission="SUPERADMIN">
                    <AdminSuperadmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pointage"
                element={
                  <ProtectedRoute requiredPermission="POINTAGE">
                    <AdminPointage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/laboural"
                element={
                  <ProtectedRoute requiredPermission="LABOURAL">
                    <AdminLaboural />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
