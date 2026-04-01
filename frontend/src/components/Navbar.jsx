import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setRole(snap.data().role || "client");
    }).catch(() => setRole("client"));
  }, [user?.uid]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "?";

  const links = role === "lawyer"
    ? [
        { label: "Dashboard", path: "/lawyer-dashboard" },
        { label: "My Profile", path: "/lawyer-dashboard" },
      ]
    : [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Find a Lawyer", path: "/lawyers" },
      ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        OnCall<span>Lawyer</span>
      </div>
      <div className="navbar-links">
        {links.map(({ label, path }) => (
          <a
            key={label}
            href={path}
            onClick={(e) => { e.preventDefault(); navigate(path); }}
            style={{ color: location.pathname === path ? "#fff" : undefined }}
          >
            {label}
          </a>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="navbar-avatar">{initials}</div>
          <button onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
