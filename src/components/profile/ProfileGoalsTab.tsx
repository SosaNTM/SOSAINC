import { MOCK_GOALS } from "@/lib/profileData";
import { getUserById } from "@/lib/authContext";
import { format } from "date-fns";
import { Target, CheckCircle, Info } from "lucide-react";

export function ProfileGoalsTab({ userId }: { userId: string }) {
  const goals = MOCK_GOALS.filter((g) => g.userId === userId);
  const quarters = [...new Set(goals.map((g) => g.quarter))];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>My Goals</h3>
        <p style={{ fontSize: 13, color: "var(--text-quaternary)", marginTop: 2 }}>Set by company leadership</p>
      </div>

      {quarters.map((q) => (
        <div key={q}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>{q}</p>
          <div className="flex flex-col gap-3">
            {goals.filter((g) => g.quarter === q).map((goal) => {
              const setter = getUserById(goal.setBy);
              return (
                <div
                  key={goal.id}
                  style={{
                    background: "var(--glass-bg)",
                    border: "0.5px solid var(--glass-border)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {goal.completed ? (
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
                    ) : (
                      <Target className="w-4 h-4 shrink-0" style={{ color: "var(--accent-color)" }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{goal.title}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-2">
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--glass-border)" }}>
                      <div
                        style={{
                          width: `${goal.progress}%`,
                          height: "100%",
                          borderRadius: 3,
                          background: goal.completed ? "#22c55e" : "var(--accent-color)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: goal.completed ? "#22c55e" : "var(--text-secondary)", minWidth: 60, textAlign: "right" }}>
                      {goal.completed ? "Complete ✓" : goal.target ? `${goal.current}/${goal.target} (${goal.progress}%)` : `${goal.progress}%`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3" style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
                    <span>Due: {format(goal.dueDate, "MMM dd")}</span>
                    <span>•</span>
                    <span>Set by: {setter?.displayName || "Unknown"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {goals.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: 20 }}>No goals assigned yet</p>
      )}

      <div
        className="flex items-center gap-2"
        style={{
          fontSize: 12,
          color: "var(--text-quaternary)",
          background: "var(--glass-bg)",
          border: "0.5px solid var(--glass-border)",
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        <Info className="w-3.5 h-3.5 shrink-0" />
        Goals are created and managed by the Owner. Contact them for updates.
      </div>
    </div>
  );
}
