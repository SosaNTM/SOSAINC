import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Glitchy404 } from "@/components/ui/Glitchy404";
import { Meteors } from "@/components/ui/meteors";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.debug("404: Non-existent route accessed:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "var(--bg-body)" }}>
      <div className="ambient-orbs">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <div className="ambient-orb-3" />
        <div className="ambient-orb-4" />
      </div>
      <Meteors number={30} />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <Glitchy404 width={600} height={162} color="var(--text-primary)" />
        <p style={{ fontSize: 16, color: "var(--text-secondary)" }}>
          This page doesn't exist
        </p>
        <Link
          to="/"
          className="glass-btn-primary inline-flex items-center gap-2 liquid-shimmer"
          style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, borderRadius: 10 }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
