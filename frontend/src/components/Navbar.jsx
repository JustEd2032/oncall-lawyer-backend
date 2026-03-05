import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "?";

  const links = user?.role === "lawyer"
    ? [{ label: "Dashboard", path: "/lawyer-dashboard" }, { label: "My Profile", path: "/lawyer-profile" }]
    : [{ label: "Dashboard", path: "/dashboard" }, { label: "Find a Lawyer", path: "/lawyers" }];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        OnCall<span>Lawyer</span>
      </div>
      <div className="navbar-links">
        {links.map(({ label, path }) => (
          <a
            key={path}
            href={path}
            onClick={(e) => { e.preventDefault(); navigate(path); }}
            style={{ color: location.pathname === path ? "#fff" : undefined }}
          >
            {label}
          </a>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="navbar-avatar">{initials}</div>
          <button onClick={handleLogout} style={{ fontSize: "0.85rem" }}>Sign Out</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
