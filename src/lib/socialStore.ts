// ═══ Social Media Module — Data Store & Mock Data ═══

export type SocialPlatform = "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok" | "youtube" | "threads" | "pinterest";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  displayName: string;
  profileUrl: string;
  avatarUrl?: string;
  platformId?: string;
  isActive: boolean;
  connectedAt: string;
  lastSyncedAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  color: string;
}

export interface SocialMetric {
  id: string;
  accountId: string;
  date: string;
  followers: number;
  followersGained: number;
  followersLost: number;
  netFollowers: number;
  impressions: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  postsPublished: number;
  videoViews: number;
  profileVisits: number;
  websiteClicks: number;
}

export interface SocialPost {
  id: string;
  accountId: string;
  platform: SocialPlatform;
  contentText: string;
  mediaUrls?: string[];
  mediaType: "image" | "video" | "carousel" | "story" | "reel" | "text";
  postUrl?: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt?: string;
  publishedAt?: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagementRate: number;
  videoViews?: number;
  tags: string[];
  campaign?: string;
  createdBy?: string;
}

export interface SocialGoal {
  id: string;
  accountId: string | null;
  metric: string;
  targetValue: number;
  currentValue: number;
  period: string;
  label: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "failed";
}

export interface SocialCompetitor {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  displayName: string;
  followersCount: number;
  engagementRate: number;
  postsPerWeek: number;
  growthRate: number;
  notes?: string;
}

// ── Platform Config ──
export const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; icon: string; color: string; logo: string }> = {
  instagram: { label: "Instagram",  icon: "📸", color: "#E1306C", logo: "/platform-icons/instagram.svg" },
  facebook:  { label: "Facebook",   icon: "📘", color: "#1877F2", logo: "/platform-icons/facebook.svg"  },
  twitter:   { label: "Twitter / X", icon: "🐦", color: "#1DA1F2", logo: "/platform-icons/twitter.svg"  },
  linkedin:  { label: "LinkedIn",   icon: "🔵", color: "#0A66C2", logo: "/platform-icons/linkedin.svg" },
  tiktok:    { label: "TikTok",     icon: "🎵", color: "#FE2C55", logo: "/platform-icons/tiktok.svg"   },
  youtube:   { label: "YouTube",    icon: "🔴", color: "#FF0000", logo: "/platform-icons/youtube.svg"  },
  threads:   { label: "Threads",    icon: "🧵", color: "#ffffff", logo: "/platform-icons/threads.svg"  },
  pinterest: { label: "Pinterest",  icon: "📌", color: "#E60023", logo: "/platform-icons/pinterest.svg"},
};

// ── Mock Accounts ──
export const mockSocialAccounts: SocialAccount[] = [];

// ── Mock Posts ──
export const mockSocialPosts: SocialPost[] = [];
const _removedPosts = [
  { id: "sp_1",  accountId: "sa_1", platform: "instagram", contentText: "Excited to announce our new product line! After months of development, we're finally ready to share what we've been working on. Stay tuned for the full reveal next week!", mediaType: "carousel", postUrl: "https://instagram.com/p/abc123", status: "published", publishedAt: "2026-03-01T18:00:00Z", likes: 1240, comments: 89, shares: 156, saves: 320, impressions: 45200, reach: 32100, clicks: 210, engagementRate: 8.2, tags: ["product", "launch", "spring"], campaign: "Spring Launch" },
  { id: "sp_2",  accountId: "sa_2", platform: "linkedin", contentText: "We're hiring! Looking for a Senior Full-Stack Engineer to join our growing team. If you're passionate about building beautiful products, we'd love to hear from you.", mediaType: "image", postUrl: "https://linkedin.com/posts/abc", status: "published", publishedAt: "2026-02-28T09:30:00Z", likes: 890, comments: 124, shares: 67, saves: 95, impressions: 38100, reach: 28400, clicks: 180, engagementRate: 6.8, tags: ["hiring", "engineering"], campaign: "Hiring Q1" },
  { id: "sp_3",  accountId: "sa_3", platform: "twitter",   contentText: "Thread: 5 things we learned building our product in 2025. 1/ Start with the problem, not the solution. 2/ Ship weekly. 3/ Talk to users every week...", mediaType: "text", postUrl: "https://twitter.com/iconoff_hq/status/123", status: "published", publishedAt: "2026-03-02T10:00:00Z", likes: 420, comments: 38, shares: 380, saves: 45, impressions: 22000, reach: 18500, clicks: 95, engagementRate: 5.1, tags: ["thread", "learnings"], campaign: "Thought Leadership" },
  { id: "sp_4",  accountId: "sa_4", platform: "youtube",   contentText: "How We Built Our Dashboard in 30 Days — Full Tutorial", mediaType: "video", postUrl: "https://youtube.com/watch?v=abc", status: "published", publishedAt: "2026-02-25T14:00:00Z", likes: 340, comments: 67, shares: 28, saves: 0, impressions: 89000, reach: 45000, clicks: 420, engagementRate: 4.2, videoViews: 12400, tags: ["tutorial", "dev"], campaign: "Tutorials" },
  { id: "sp_5",  accountId: "sa_5", platform: "tiktok",    contentText: "Behind the scenes at ICONOFF office. Day in the life of a startup team building the future of finance. #startup #tech #bts", mediaType: "video", postUrl: "https://tiktok.com/@iconoff/video/123", status: "published", publishedAt: "2026-03-03T15:00:00Z", likes: 580, comments: 42, shares: 210, saves: 95, impressions: 45000, reach: 38000, clicks: 65, engagementRate: 7.8, videoViews: 28000, tags: ["bts", "office"] },
  { id: "sp_6",  accountId: "sa_1", platform: "instagram", contentText: "Monday motivation! Our team is crushing it this week. There's something special about a group of people who genuinely love what they do.", mediaType: "image", status: "published", publishedAt: "2026-02-24T12:00:00Z", likes: 680, comments: 32, shares: 45, saves: 120, impressions: 28000, reach: 19500, clicks: 88, engagementRate: 4.5, tags: ["motivation", "team"] },
  { id: "sp_7",  accountId: "sa_2", platform: "linkedin",  contentText: "Reflecting on our company's growth in 2025. From 5 to 25 team members, 3 product launches, and 200% revenue growth. Here's what we learned.", mediaType: "carousel", status: "published", publishedAt: "2026-02-20T08:00:00Z", likes: 1120, comments: 89, shares: 134, saves: 210, impressions: 52000, reach: 41000, clicks: 320, engagementRate: 7.1, tags: ["growth", "recap"], campaign: "Year in Review" },
  { id: "sp_13", accountId: "sa_1", platform: "instagram", contentText: "New year, new goals. We've set some ambitious targets for 2026 and we're already hitting them. Here's our public roadmap.", mediaType: "image", status: "published", publishedAt: "2026-01-05T11:00:00Z", likes: 720, comments: 41, shares: 38, saves: 195, impressions: 31000, reach: 22000, clicks: 112, engagementRate: 5.2, tags: ["goals", "roadmap"] },
  { id: "sp_14", accountId: "sa_2", platform: "linkedin",  contentText: "Lessons from our first year of building in public. Transparency is hard but the compounding trust it builds is worth every uncomfortable share.", mediaType: "text", status: "published", publishedAt: "2026-01-08T09:00:00Z", likes: 980, comments: 76, shares: 92, saves: 140, impressions: 44000, reach: 33000, clicks: 210, engagementRate: 6.3, tags: ["transparency", "startup"], campaign: "Thought Leadership" },
  { id: "sp_15", accountId: "sa_5", platform: "tiktok",    contentText: "Day in the life of our design lead. Spoiler: it involves a lot of Figma, oat milk, and furious debates about border-radius. #designlife #ux", mediaType: "video", status: "published", publishedAt: "2026-01-10T16:00:00Z", likes: 1450, comments: 98, shares: 340, saves: 210, impressions: 68000, reach: 55000, clicks: 90, engagementRate: 9.1, videoViews: 42000, tags: ["design", "dayinthelife"] },
  { id: "sp_16", accountId: "sa_3", platform: "twitter",   contentText: "Our entire stack in 2026: Vite + React + TypeScript, Supabase, Railway, Resend, Trigger.dev. $0 in infra below 10k users. The indie hacker dream is real.", mediaType: "text", status: "published", publishedAt: "2026-01-12T14:00:00Z", likes: 890, comments: 64, shares: 520, saves: 88, impressions: 38000, reach: 29000, clicks: 145, engagementRate: 7.4, tags: ["tech", "stack"] },
  { id: "sp_17", accountId: "sa_1", platform: "instagram", contentText: "5 design principles we live by at ICONOFF. Swipe through for the breakdown that's shaped every pixel of our product.", mediaType: "carousel", status: "published", publishedAt: "2026-01-15T18:00:00Z", likes: 1380, comments: 62, shares: 145, saves: 480, impressions: 49000, reach: 35000, clicks: 190, engagementRate: 9.8, tags: ["design", "principles"], campaign: "Brand" },
  { id: "sp_18", accountId: "sa_4", platform: "youtube",   contentText: "Full Product Walkthrough: Everything New in ICONOFF 2026. We're covering the new analytics module, social hub, and our redesigned portfolio view.", mediaType: "video", status: "published", publishedAt: "2026-01-18T15:00:00Z", likes: 520, comments: 94, shares: 42, saves: 0, impressions: 120000, reach: 62000, clicks: 680, engagementRate: 5.5, videoViews: 18900, tags: ["product", "walkthrough"], campaign: "Tutorials" },
  { id: "sp_19", accountId: "sa_2", platform: "linkedin",  contentText: "We promoted two team members to senior roles this month. Building from within is our default. Huge congrats to both of them.", mediaType: "image", status: "published", publishedAt: "2026-01-22T10:00:00Z", likes: 1560, comments: 148, shares: 31, saves: 55, impressions: 41000, reach: 30000, clicks: 95, engagementRate: 6.9, tags: ["team", "culture"] },
  { id: "sp_20", accountId: "sa_1", platform: "instagram", contentText: "Quick 60-second tutorial: How to set up your first portfolio tracker in ICONOFF. Save this for later.", mediaType: "reel", status: "published", publishedAt: "2026-01-25T17:30:00Z", likes: 2100, comments: 115, shares: 298, saves: 620, impressions: 78000, reach: 58000, clicks: 340, engagementRate: 11.4, tags: ["tutorial", "finance"], campaign: "Tutorials" },
  { id: "sp_21", accountId: "sa_3", platform: "twitter",   contentText: "Hot take: most fintech dashboards show you data you already know. We built ICONOFF to surface the things you didn't know you needed to see.", mediaType: "text", status: "published", publishedAt: "2026-01-28T11:00:00Z", likes: 740, comments: 88, shares: 390, saves: 62, impressions: 27000, reach: 21000, clicks: 180, engagementRate: 8.8, tags: ["fintech", "opinion"] },
  { id: "sp_22", accountId: "sa_5", platform: "tiktok",    contentText: "Office tour! See where we build ICONOFF every day. Yes, the cold brew is always free. Yes, we are hiring. #officetour #startup", mediaType: "video", status: "published", publishedAt: "2026-02-02T14:00:00Z", likes: 2340, comments: 167, shares: 510, saves: 280, impressions: 95000, reach: 76000, clicks: 120, engagementRate: 10.5, videoViews: 61000, tags: ["officetour", "team"] },
  { id: "sp_23", accountId: "sa_1", platform: "instagram", contentText: "Behind the build: the story of how our dark UI theme was born from one 2am design sprint. It started with a single CSS variable.", mediaType: "story", status: "published", publishedAt: "2026-02-05T20:00:00Z", likes: 540, comments: 28, shares: 18, saves: 90, impressions: 24000, reach: 17000, clicks: 62, engagementRate: 3.8, tags: ["design", "bts"] },
  { id: "sp_24", accountId: "sa_2", platform: "linkedin",  contentText: "Q1 milestones reached. 18K LinkedIn followers, 3 enterprise deals closed, and our NPS hit 72. Grateful for every single person who trusts us.", mediaType: "carousel", status: "published", publishedAt: "2026-02-08T09:00:00Z", likes: 1820, comments: 201, shares: 88, saves: 175, impressions: 62000, reach: 47000, clicks: 420, engagementRate: 8.3, tags: ["milestone", "growth"], campaign: "Year in Review" },
  { id: "sp_25", accountId: "sa_4", platform: "youtube",   contentText: "Building in Public — Month 14. What worked, what flopped, and one feature we almost shipped that would have broken everything.", mediaType: "video", status: "published", publishedAt: "2026-02-12T16:00:00Z", likes: 610, comments: 118, shares: 55, saves: 0, impressions: 102000, reach: 53000, clicks: 520, engagementRate: 4.8, videoViews: 22500, tags: ["bip", "startup"], campaign: "Thought Leadership" },
  { id: "sp_26", accountId: "sa_3", platform: "twitter",   contentText: "Unpopular opinion: your social media analytics dashboard shouldn't require an analytics degree to understand. We fixed that.", mediaType: "text", status: "published", publishedAt: "2026-02-15T13:00:00Z", likes: 1120, comments: 95, shares: 680, saves: 112, impressions: 48000, reach: 36000, clicks: 275, engagementRate: 10.2, tags: ["product", "opinion"], campaign: "Brand" },
  { id: "sp_27", accountId: "sa_1", platform: "instagram", contentText: "New feature unlocked: AI-powered posting schedule. Tell us your goals, we'll tell you exactly when to post. Available now.", mediaType: "reel", status: "published", publishedAt: "2026-02-18T19:00:00Z", likes: 1890, comments: 134, shares: 240, saves: 560, impressions: 72000, reach: 54000, clicks: 310, engagementRate: 10.8, tags: ["product", "ai"], campaign: "Spring Launch" },
  { id: "sp_28", accountId: "sa_5", platform: "tiktok",    contentText: "Team challenge: everyone presents their craziest product idea. Winner gets to build it next sprint. The ideas were... wild. #teamwork #startup", mediaType: "video", status: "published", publishedAt: "2026-02-22T15:30:00Z", likes: 1780, comments: 122, shares: 430, saves: 195, impressions: 82000, reach: 65000, clicks: 98, engagementRate: 9.3, videoViews: 51000, tags: ["team", "challenge"] },
  // ── Scheduled future posts ──
  { id: "sp_8",  accountId: "sa_1", platform: "instagram", contentText: "Sneak peek at our upcoming collaboration. You won't want to miss this one.", mediaType: "reel",  status: "scheduled", scheduledAt: "2026-03-10T18:00:00Z", likes: 0, comments: 0, shares: 0, saves: 0, impressions: 0, reach: 0, clicks: 0, engagementRate: 0, tags: ["collab", "teaser"], campaign: "Spring Launch" },
  { id: "sp_9",  accountId: "sa_3", platform: "twitter",   contentText: "What's your biggest challenge scaling a product? Reply below", mediaType: "text",  status: "scheduled", scheduledAt: "2026-03-08T10:00:00Z", likes: 0, comments: 0, shares: 0, saves: 0, impressions: 0, reach: 0, clicks: 0, engagementRate: 0, tags: ["engagement", "community"] },
  { id: "sp_11", accountId: "sa_1", platform: "instagram", contentText: "Spring collection drops March 15th. Mark your calendars.", mediaType: "image", status: "scheduled", scheduledAt: "2026-03-12T17:00:00Z", likes: 0, comments: 0, shares: 0, saves: 0, impressions: 0, reach: 0, clicks: 0, engagementRate: 0, tags: ["launch", "spring"], campaign: "Spring Launch" },
  { id: "sp_12", accountId: "sa_4", platform: "youtube",   contentText: "Live Q&A: Ask us anything about building SaaS products. See you Thursday.", mediaType: "video", status: "scheduled", scheduledAt: "2026-03-15T19:00:00Z", likes: 0, comments: 0, shares: 0, saves: 0, impressions: 0, reach: 0, clicks: 0, engagementRate: 0, tags: ["live", "qa"], campaign: "Community" },
  // ── Drafts ──
  { id: "sp_10", accountId: "sa_5", platform: "tiktok",    contentText: "POV: When the deploy goes perfectly on Friday. #devlife", mediaType: "video", status: "draft", likes: 0, comments: 0, shares: 0, saves: 0, impressions: 0, reach: 0, clicks: 0, engagementRate: 0, tags: ["humor", "dev"] },
  { id: "sp_29", accountId: "sa_2", platform: "linkedin",  contentText: "I've been thinking a lot about what makes a great product manager. It's not about managing features, it's about managing clarity.", mediaType: "text",  status: "draft", likes: 0, comments: 0, shares: 0, saves: 0, impressions: 0, reach: 0, clicks: 0, engagementRate: 0, tags: ["product", "leadership"] },
];

// ── Mock Goals ──
export const mockSocialGoals: SocialGoal[] = [];

// ── Mock Competitors ──
export const mockCompetitors: SocialCompetitor[] = [];

// ── Helper: generate daily metrics for last N days ──
function generateDailyMetrics(accountId: string, days: number, baseFollowers: number): SocialMetric[] {
  const metrics: SocialMetric[] = [];
  const now = new Date("2026-03-04");
  let followers = baseFollowers - Math.floor(days * (baseFollowers * 0.002));

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const gained = Math.floor(Math.random() * 60) + 10;
    const lost = Math.floor(Math.random() * 15) + 2;
    followers += gained - lost;
    const impressions = Math.floor(Math.random() * 20000) + 5000;
    const reach = Math.floor(impressions * (0.5 + Math.random() * 0.3));
    const likes = Math.floor(Math.random() * 300) + 50;
    const comments = Math.floor(Math.random() * 40) + 5;
    const shares = Math.floor(Math.random() * 50) + 5;
    const saves = Math.floor(Math.random() * 80) + 10;
    const clicks = Math.floor(Math.random() * 60) + 10;
    const engagement = likes + comments + shares + saves + clicks;
    const engagementRate = reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0;

    metrics.push({
      id: `m_${accountId}_${i}`,
      accountId,
      date: date.toISOString().split("T")[0],
      followers,
      followersGained: gained,
      followersLost: lost,
      netFollowers: gained - lost,
      impressions,
      reach,
      engagement,
      engagementRate,
      likes,
      comments,
      shares,
      saves,
      clicks,
      postsPublished: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0,
      videoViews: Math.floor(Math.random() * 5000),
      profileVisits: Math.floor(Math.random() * 200) + 30,
      websiteClicks: Math.floor(Math.random() * 40) + 5,
    });
  }
  return metrics;
}

export const mockMetrics: Record<string, SocialMetric[]> = {};

// ── Aggregation helpers ──
export function getMetricsForPeriod(accountId: string, days: number): SocialMetric[] {
  const all = mockMetrics[accountId] || [];
  return all.slice(-days);
}

export function getAggregatedMetrics(accountIds: string[], days: number) {
  let totalFollowers = 0;
  let totalImpressions = 0;
  let totalReach = 0;
  let totalEngagement = 0;
  let totalPosts = 0;
  let totalProfileVisits = 0;
  let totalWebsiteClicks = 0;
  let prevTotalFollowers = 0;
  let prevTotalImpressions = 0;
  let prevTotalEngagement = 0;
  let prevTotalPosts = 0;

  accountIds.forEach((id) => {
    const metrics = mockMetrics[id] || [];
    const current = metrics.slice(-days);
    const previous = metrics.slice(-days * 2, -days);

    current.forEach((m) => {
      totalImpressions += m.impressions;
      totalReach += m.reach;
      totalEngagement += m.engagement;
      totalPosts += m.postsPublished;
      totalProfileVisits += m.profileVisits;
      totalWebsiteClicks += m.websiteClicks;
    });
    if (current.length > 0) totalFollowers += current[current.length - 1].followers;

    previous.forEach((m) => {
      prevTotalImpressions += m.impressions;
      prevTotalEngagement += m.engagement;
      prevTotalPosts += m.postsPublished;
    });
    if (previous.length > 0) prevTotalFollowers += previous[previous.length - 1].followers;
  });

  const engRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
  const followerChange = totalFollowers - prevTotalFollowers;
  const followerChangePct = prevTotalFollowers > 0 ? (followerChange / prevTotalFollowers) * 100 : 0;
  const impressionChange = totalImpressions - prevTotalImpressions;
  const impressionChangePct = prevTotalImpressions > 0 ? (impressionChange / prevTotalImpressions) * 100 : 0;

  return {
    totalFollowers,
    totalImpressions,
    totalReach,
    totalEngagement,
    engagementRate: Number(engRate.toFixed(1)),
    totalPosts,
    totalProfileVisits,
    totalWebsiteClicks,
    followerChange,
    followerChangePct: Number(followerChangePct.toFixed(1)),
    impressionChange,
    impressionChangePct: Number(impressionChangePct.toFixed(1)),
    engagementChange: totalEngagement - prevTotalEngagement,
    postsChange: totalPosts - prevTotalPosts,
  };
}

export function getSparklineData(accountId: string, days: number, metric: keyof SocialMetric): number[] {
  const metrics = getMetricsForPeriod(accountId, days);
  return metrics.map((m) => Number(m[metric]) || 0);
}

export function getAllSparklineData(accountIds: string[], days: number, metric: keyof SocialMetric): number[] {
  const length = days;
  const result: number[] = new Array(length).fill(0);
  accountIds.forEach((id) => {
    const data = getSparklineData(id, days, metric);
    data.forEach((v, i) => {
      result[i] = (result[i] || 0) + v;
    });
  });
  return result;
}

// ── Best posting times heatmap data ──
export function getBestTimesHeatmap(): number[][] {
  // 7 days x 6 time slots (6am, 9am, 12pm, 3pm, 6pm, 9pm)
  return [
    [0.1, 0.3, 0.6, 0.4, 0.9, 0.7], // Mon
    [0.1, 0.7, 0.9, 0.7, 0.6, 0.3], // Tue
    [0.1, 0.6, 0.7, 0.9, 0.6, 0.4], // Wed
    [0.1, 0.4, 0.6, 0.6, 0.9, 0.7], // Thu
    [0.1, 0.7, 0.5, 0.7, 0.6, 0.9], // Fri
    [0.1, 0.1, 0.3, 0.6, 0.8, 0.7], // Sat
    [0.1, 0.1, 0.1, 0.3, 0.6, 0.6], // Sun
  ];
}

// ── Content type performance ──
export function getContentTypePerformance() {
  return [
    { type: "Reels / Videos", avgEngRate: 7.2, color: "#E1306C" },
    { type: "Carousels", avgEngRate: 5.8, color: "#0A66C2" },
    { type: "Single Image", avgEngRate: 4.3, color: "#1DA1F2" },
    { type: "Stories", avgEngRate: 3.9, color: "#FE2C55" },
    { type: "Text Only", avgEngRate: 2.4, color: "#FF0000" },
    { type: "Links", avgEngRate: 1.9, color: "#6b7280" },
  ];
}

// Demographics mock
export function getDemographics() {
  return {
    age: [
      { range: "18-24", pct: 22 },
      { range: "25-34", pct: 45 },
      { range: "35-44", pct: 21 },
      { range: "45-54", pct: 8 },
      { range: "55+", pct: 4 },
    ],
    gender: [
      { label: "Male", pct: 42 },
      { label: "Female", pct: 54 },
      { label: "Other", pct: 4 },
    ],
    locations: [
      { city: "Milan, IT", pct: 28 },
      { city: "Rome, IT", pct: 15 },
      { city: "London, UK", pct: 8 },
      { city: "New York, US", pct: 6 },
      { city: "Berlin, DE", pct: 4 },
      { city: "Paris, FR", pct: 3 },
      { city: "Barcelona, ES", pct: 2 },
    ],
  };
}

// Not-connected platforms
export const unconnectedPlatforms: SocialPlatform[] = ["facebook", "threads", "pinterest"];

// ── Per-portal account seeds ──────────────────────────────────────────────────
const PORTAL_ACCOUNTS: Record<string, SocialAccount[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

export function setActivePortal(id: string) {
  const accounts = PORTAL_ACCOUNTS[id] ?? PORTAL_ACCOUNTS.sosa;
  // Mutate array in-place so existing imports see the new data on next mount
  mockSocialAccounts.length = 0;
  accounts.forEach(a => mockSocialAccounts.push(a));
  // Rebuild metrics for new account IDs
  accounts.forEach(a => {
    if (!mockMetrics[a.id]) {
      mockMetrics[a.id] = generateDailyMetrics(a.id, 90, a.followersCount);
    }
  });
}

// Format large numbers
export function formatSocialNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}
