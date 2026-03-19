import { getUserById } from "@/lib/authContext";

export type NotificationType =
  | "task_assigned" | "task_completed" | "comment" | "mention"
  | "goal_assigned" | "file_uploaded" | "vault_access" | "system";

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link: string;
  actorId: string;
  createdAt: Date;
}

function d(hoursAgo: number): Date {
  return new Date(Date.now() - hoursAgo * 3600000);
}

export function getNotificationsForUser(userId: string): AppNotification[] {
  const all: AppNotification[] = [
    // Unread / new
    { id: "n01", recipientId: "usr_001", type: "task_assigned", title: "Marco assigned you a task", body: '"Review Q4 contract"', isRead: false, link: "/tasks", actorId: "usr_002", createdAt: d(0.03) },
    { id: "n02", recipientId: "usr_001", type: "comment", title: "Sara commented on your task", body: '"Fix payment bug": "Done!"', isRead: false, link: "/tasks", actorId: "usr_003", createdAt: d(0.25) },
    { id: "n03", recipientId: "usr_001", type: "goal_assigned", title: "New goal assigned to you", body: '"Close 5 deals by Q1"', isRead: false, link: "/profile", actorId: "usr_001", createdAt: d(1) },
    // Read / earlier
    { id: "n04", recipientId: "usr_001", type: "file_uploaded", title: "Marco uploaded to Cloud", body: '"Q4_Report.xlsx" in Finance', isRead: true, link: "/cloud", actorId: "usr_002", createdAt: d(26) },
    { id: "n05", recipientId: "usr_001", type: "task_completed", title: "Task completed", body: 'Elena completed "Order supplies"', isRead: true, link: "/tasks", actorId: "usr_004", createdAt: d(50) },
    { id: "n06", recipientId: "usr_001", type: "system", title: "Role changed", body: "Sara's role updated to Member", isRead: true, link: "/admin", actorId: "usr_001", createdAt: d(72) },
    { id: "n07", recipientId: "usr_001", type: "vault_access", title: "Vault locked folder accessed", body: "Locked folder was accessed", isRead: true, link: "/vault", actorId: "usr_001", createdAt: d(120) },
    { id: "n08", recipientId: "usr_001", type: "mention", title: "Elena mentioned you", body: 'in "Sprint planning" comment', isRead: true, link: "/tasks", actorId: "usr_004", createdAt: d(144) },
    // For other users
    { id: "n09", recipientId: "usr_002", type: "task_assigned", title: "Alessandro assigned you a task", body: '"Prepare monthly report"', isRead: false, link: "/tasks", actorId: "usr_001", createdAt: d(0.5) },
    { id: "n10", recipientId: "usr_003", type: "goal_assigned", title: "New goal assigned", body: '"Increase social engagement by 20%"', isRead: false, link: "/profile", actorId: "usr_001", createdAt: d(2) },
    { id: "n11", recipientId: "usr_002", type: "comment", title: "Sara commented on a task", body: '"Deploy v2": "Ready for review"', isRead: true, link: "/tasks", actorId: "usr_003", createdAt: d(30) },
  ];
  return all.filter((n) => n.recipientId === userId);
}

const TYPE_ICONS: Record<NotificationType, string> = {
  task_assigned: "✅",
  task_completed: "✅",
  comment: "💬",
  mention: "📣",
  goal_assigned: "🎯",
  file_uploaded: "📁",
  vault_access: "🔐",
  system: "⚙️",
};

export function getNotificationIcon(type: NotificationType): string {
  return TYPE_ICONS[type] || "🔔";
}
