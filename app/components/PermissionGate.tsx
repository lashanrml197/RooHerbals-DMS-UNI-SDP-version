import React from "react";
import { useAuth } from "../context/AuthContext";

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate component for conditional rendering based on permissions
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useAuth();

  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGate;
