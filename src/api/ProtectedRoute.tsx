import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
    const token =
        sessionStorage.getItem("accessToken") || sessionStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;