import React, { createContext, useContext, useState, useEffect } from "react";
import { useAppDispatch } from "../redux/hooks";
import { setPrivileges, clearPrivileges, type PrivilegeStatus } from "../redux/slices/privilegeSlice";

type UserRole = "admin" | "steward" | "chef" | null;

interface RolePrivilegeDetail {
  rolePrivilegeId: number;
  privilegeStatus: string;
  isMaintain: number;
}

interface UserPrivilegeDetail {
  userPrivilegeId: number;
  privilegeStatus: string;
  isMaintain: number;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  userRole: UserRole;
  userEmail: string | null;
  userId: number | null;
  rolePrivileges: Record<string, number>;
  userPrivileges: Record<string, number>;
  rolePrivilege: Record<string, RolePrivilegeDetail>;
  userPrivilege: Record<string, UserPrivilegeDetail>;
  setAuthAfterLogin: (payload: {
    token: string;
    role?: UserRole;
    email?: string;
    rolePrivileges?: Record<string, number>;
    userPrivileges?: Record<string, number>;
    rolePrivilege?: Record<string, RolePrivilegeDetail>;
    userPrivilege?: Record<string, UserPrivilegeDetail>;
    roleId?: number;
    userId?: number;
  }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export function AuthProvider({ children }: Props) {
  const dispatch = useAppDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem("token");
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (sessionStorage.getItem("userRole") as UserRole) || null;
  });

  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem("userEmail");
  });

  const [userId, setUserId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("userId");
    return saved ? parseInt(saved) : null;
  });

  const [rolePrivileges, setRolePrivileges] = useState<Record<string, number>>(() => {
    const saved = sessionStorage.getItem("rolePrivileges");
    return saved ? JSON.parse(saved) : {};
  });

  const [userPrivileges, setUserPrivileges] = useState<Record<string, number>>(() => {
    const saved = sessionStorage.getItem("userPrivileges");
    return saved ? JSON.parse(saved) : {};
  });

  const [rolePrivilege, setRolePrivilege] = useState<Record<string, RolePrivilegeDetail>>(() => {
    const saved = sessionStorage.getItem("rolePrivilege");
    return saved ? JSON.parse(saved) : {};
  });

  const [userPrivilege, setUserPrivilege] = useState<Record<string, UserPrivilegeDetail>>(() => {
    const saved = sessionStorage.getItem("userPrivilege");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const combinedPrivilege: Record<string, any> = {};

    // First map role privileges
    if (rolePrivilege && Object.keys(rolePrivilege).length > 0) {
      Object.entries(rolePrivilege).forEach(([key, val]) => {
        combinedPrivilege[key] = {
          privilegeStatus: val.privilegeStatus as PrivilegeStatus,
          isMaintain: val.isMaintain,
          restaurantPrivilegeId: val.rolePrivilegeId
        };
      });
    }

    // Then map user privileges (they override role privileges)
    if (userPrivilege && Object.keys(userPrivilege).length > 0) {
      Object.entries(userPrivilege).forEach(([key, val]) => {
        combinedPrivilege[key] = {
          privilegeStatus: val.privilegeStatus as PrivilegeStatus,
          isMaintain: val.isMaintain,
          restaurantPrivilegeId: val.userPrivilegeId
        };
      });
    }

    if (Object.keys(combinedPrivilege).length > 0) {
      dispatch(setPrivileges(combinedPrivilege));
    }
  }, []);

  const setAuthAfterLogin = ({
    token, role, email, rolePrivileges, userPrivileges, rolePrivilege, userPrivilege, roleId, userId
  }: {
    token: string;
    role?: UserRole;
    email?: string;
    rolePrivileges?: Record<string, number>;
    userPrivileges?: Record<string, number>;
    rolePrivilege?: Record<string, RolePrivilegeDetail>;
    userPrivilege?: Record<string, UserPrivilegeDetail>;
    roleId?: number;
    userId?: number;
  }) => {
    sessionStorage.setItem("token", token);

    if (role) sessionStorage.setItem("userRole", role);
    if (email) sessionStorage.setItem("userEmail", email);
    if (rolePrivileges) sessionStorage.setItem("rolePrivileges", JSON.stringify(rolePrivileges));
    if (userPrivileges) sessionStorage.setItem("userPrivileges", JSON.stringify(userPrivileges));
    if (rolePrivilege) sessionStorage.setItem("rolePrivilege", JSON.stringify(rolePrivilege));
    if (userPrivilege) sessionStorage.setItem("userPrivilege", JSON.stringify(userPrivilege));
    if (roleId) sessionStorage.setItem("roleId", roleId.toString());
    if (userId) sessionStorage.setItem("userId", userId.toString());

    setIsAuthenticated(true);
    setUserRole(role ?? null);
    setUserEmail(email ?? null);
    setUserId(userId ?? null);
    if (rolePrivileges) setRolePrivileges(rolePrivileges);
    if (userPrivileges) setUserPrivileges(userPrivileges);

    const combinedPrivilege: Record<string, any> = {};

    if (rolePrivilege) {
      setRolePrivilege(rolePrivilege);
      Object.entries(rolePrivilege).forEach(([key, val]) => {
        combinedPrivilege[key] = {
          privilegeStatus: val.privilegeStatus as PrivilegeStatus,
          isMaintain: val.isMaintain,
          restaurantPrivilegeId: val.rolePrivilegeId
        };
      });
    }

    if (userPrivilege) {
      setUserPrivilege(userPrivilege);
      Object.entries(userPrivilege).forEach(([key, val]) => {
        combinedPrivilege[key] = {
          privilegeStatus: val.privilegeStatus as PrivilegeStatus,
          isMaintain: val.isMaintain,
          restaurantPrivilegeId: val.userPrivilegeId
        };
      });
    }

    if (Object.keys(combinedPrivilege).length > 0) {
      dispatch(setPrivileges(combinedPrivilege));
    }
  };


  const logout = () => {
    sessionStorage.clear();

    setIsAuthenticated(false);
    setUserRole(null);
    setUserEmail(null);
    setUserId(null);
    setRolePrivileges({});
    setUserPrivileges({});
    setRolePrivilege({});
    setUserPrivilege({});
    dispatch(clearPrivileges());
  };

  const value: AuthContextValue = {
    isAuthenticated,
    userRole,
    userEmail,
    userId,
    rolePrivileges,
    userPrivileges,
    rolePrivilege,
    userPrivilege,
    setAuthAfterLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
