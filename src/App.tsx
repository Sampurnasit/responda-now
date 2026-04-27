import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode; 
  requiredRole?: "admin" | "volunteer" | "user";
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthenticated(true);
        const docSnap = await getDoc(doc(db, "profiles", user.uid));
        if (docSnap.exists()) {
          const role = docSnap.data().role;
          setUserRole(role);
          
          // If at root, redirect to role-specific page
          if (window.location.pathname === "/" && role) {
             window.location.href = `/${role}`;
          }
        } else {
          // No profile, force onboarding
          window.location.href = "/login";
        }
      } else {
        setAuthenticated(false);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authenticated === false) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole && userRole !== "admin") {
    // If they have a role but not the right one, send them to their own dashboard
    return <Navigate to={`/${userRole}`} replace />;
  }

  return <>{children}</>;
}

const navigateRef = { current: (path: string) => {} };

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Role-Based Routes */}
            <Route 
              path="/" 
              element={<ProtectedRoute><Index /></ProtectedRoute>} 
            />
            <Route 
              path="/user" 
              element={<ProtectedRoute requiredRole="user"><Index forceView="user" /></ProtectedRoute>} 
            />
            <Route 
              path="/volunteer" 
              element={<ProtectedRoute requiredRole="volunteer"><Index forceView="volunteer" /></ProtectedRoute>} 
            />
            <Route 
              path="/admin" 
              element={<ProtectedRoute requiredRole="admin"><Index forceView="admin" /></ProtectedRoute>} 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
