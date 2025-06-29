import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, isAuthenticated, logout } from "../services/api";

// Define user interface
interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
  phone?: string;
  area?: string;
}

// Define context interface
interface AuthContextType {
  user: User | null; // Current logged-in user or null
  loading: boolean; // True while auth state is being determined
  isLoggedIn: boolean; // True if user is authenticated
  login: (userData: User) => Promise<void>; // Login handler
  logout: () => Promise<void>; // Logout handler
  hasPermission: (permission: string) => boolean; // Permission check
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission mappings for different roles
// Each role is mapped to an array of allowed permissions
const permissionsByRole: Record<string, string[]> = {
  owner: [
    // ...owner permissions...
    "view_customers",
    "add_customer",
    "edit_customer",
    "delete_customer",
    "view_customer_payments",
    "manage_customer_payments",
    "view_orders",
    "add_order",
    "edit_order",
    "delete_order",
    "manage_deliveries",
    "view_deliveries",
    "view_products",
    "manage_products",
    "view_suppliers",
    "manage_suppliers",
    "view_sales_reps",
    "manage_sales_reps",
    "view_drivers",
    "manage_drivers",
    "view_reports",
    "manage_reports",
    "view_inventory",
    "manage_inventory",
  ],
  sales_rep: [
    // ...sales rep permissions...
    "view_customers",
    "add_customer",
    "edit_customer",
    "view_customer_payments",
    "manage_customer_payments",
    "view_orders",
    "add_order",
    "edit_order",
    "delete_order",
    "view_products",
  ],
  lorry_driver: [
    // ...lorry driver permissions...
    "view_customers",
    "view_customer_payments",
    "manage_customer_payments",
    "view_orders",
    "update_delivery_status",
    "view_deliveries",
    "view_products",
  ],
};

// Auth Provider component

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null); // Stores current user
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false); // Auth state

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isAuth = await isAuthenticated(); // Check if user is logged in
        setIsLoggedIn(isAuth);

        if (isAuth) {
          const userData = await getCurrentUser(); // Fetch user details
          if (userData) {
            setUser({
              id: userData.id,
              username: userData.username,
              fullName: userData.fullName,
              role: userData.role,
              email: userData.email,
              phone: userData.phone,
              area: userData.area,
            });
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        await handleLogout(); // On error, log out
      } finally {
        setLoading(false); // Done loading
      }
    };

    initAuth();
  }, []);

  // Login function
  // Call this after successful authentication to set user state
  const handleLogin = async (userData: User) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  // Logout function
  // Clears user state and navigates to login screen
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setIsLoggedIn(false);
      router.replace("../(auth)/login"); // Redirect to login
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Permission check function
  // Returns true if current user has the given permission
  const hasPermission = (permission: string) => {
    if (!user) return false;

    const userRole = user.role;
    const rolePermissions = permissionsByRole[userRole] || [];

    return rolePermissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn,
        login: handleLogin,
        logout: handleLogout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
