import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  if (user === undefined) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default ProtectedRoute;