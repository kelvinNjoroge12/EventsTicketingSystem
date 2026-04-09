import {
  BookOpen,
  Lightbulb,
  Wrench,
  Users,
  Network,
  GraduationCap,
  HeartPulse,
  Trophy,
  Palette,
  Rocket,
  Briefcase,
  Handshake,
  Mic2,
  Ticket
} from "lucide-react";

const ICON_COLORS = {
  blue: "text-[#02338D]",
  gold: "text-[#D4AF37]",
  red: "text-[#7A0019]",
};

const LEGACY_CATEGORY_ALIASES = {
  marketing: "networking",
  music: "arts-culture",
  "music-arts": "arts-culture",
  "music-and-arts": "arts-culture",
  creative: "arts-culture",
  tech: "entrepreneurship-innovation",
  technology: "entrepreneurship-innovation",
  business: "corporate-executive",
  education: "knowledge-series",
  health: "wellness-events",
  "university-events": "conferences-seminars",
};

export const categories = [
  {
    id: "cat-001",
    name: "Academic & Research",
    slug: "academic-research",
    icon: BookOpen,
    iconColor: ICON_COLORS.blue,
    description: "Academic talks, research seminars, and scholarly forums"
  },
  {
    id: "cat-002",
    name: "Knowledge Series",
    slug: "knowledge-series",
    icon: Lightbulb,
    iconColor: ICON_COLORS.gold,
    description: "Thought-leadership sessions, guest talks, and expert panels"
  },
  {
    id: "cat-003",
    name: "Workshops & Training",
    slug: "workshops-training",
    icon: Wrench,
    iconColor: ICON_COLORS.blue,
    description: "Skills workshops, labs, and professional training sessions"
  },
  {
    id: "cat-004",
    name: "Student Life",
    slug: "student-life",
    icon: Users,
    iconColor: ICON_COLORS.gold,
    description: "Student clubs, socials, and community experiences"
  },
  {
    id: "cat-005",
    name: "Networking",
    slug: "networking",
    icon: Network,
    iconColor: ICON_COLORS.red,
    description: "Industry mixers, meetups, and professional connections"
  },
  {
    id: "cat-006",
    name: "Alumni Reunion",
    slug: "alumni-reunion",
    icon: GraduationCap,
    iconColor: ICON_COLORS.gold,
    description: "Class reunions, alumni meetups, and homecoming moments"
  },
  {
    id: "cat-007",
    name: "Wellness Events",
    slug: "wellness-events",
    icon: HeartPulse,
    iconColor: ICON_COLORS.red,
    description: "Wellbeing workshops, fitness sessions, and mental health talks"
  },
  {
    id: "cat-008",
    name: "Sports & Recreation",
    slug: "sports-recreation",
    icon: Trophy,
    iconColor: ICON_COLORS.blue,
    description: "Athletics, fitness, and recreation activities"
  },
  {
    id: "cat-009",
    name: "Arts & Culture",
    slug: "arts-culture",
    icon: Palette,
    iconColor: ICON_COLORS.gold,
    description: "Performances, exhibitions, and cultural showcases"
  },
  {
    id: "cat-010",
    name: "Entrepreneurship & Innovation",
    slug: "entrepreneurship-innovation",
    icon: Rocket,
    iconColor: ICON_COLORS.red,
    description: "Innovation challenges, startup forums, and maker events"
  },
  {
    id: "cat-011",
    name: "Corporate & Executive",
    slug: "corporate-executive",
    icon: Briefcase,
    iconColor: ICON_COLORS.blue,
    description: "Executive forums, corporate collaborations, and industry events"
  },
  {
    id: "cat-012",
    name: "Community Outreach",
    slug: "community-outreach",
    icon: Handshake,
    iconColor: ICON_COLORS.gold,
    description: "Community service, collaborations, and impact programs"
  },
  {
    id: "cat-013",
    name: "Conferences & Seminars",
    slug: "conferences-seminars",
    icon: Mic2,
    iconColor: ICON_COLORS.red,
    description: "University-wide conferences, symposia, and panels"
  }
];

const normalizeCategoryKey = (value = "") => value.toLowerCase().trim();

const slugifyCategoryName = (value = "") =>
  normalizeCategoryKey(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveCategoryKey = (value = "") => {
  const slugified = slugifyCategoryName(value);
  return LEGACY_CATEGORY_ALIASES[slugified] || slugified;
};

export const getCategoryByName = (value) => {
  const normalized = resolveCategoryKey(value);
  if (!normalized) return undefined;

  return categories.find((cat) => {
    return (
      resolveCategoryKey(cat.name) === normalized ||
      cat.slug === normalized ||
      cat.slug === resolveCategoryKey(value)
    );
  });
};

export const enrichCategory = (category) => {
  const raw = typeof category === "string" ? { name: category } : (category || {});
  const match = getCategoryByName(raw.name || raw.slug || raw.id || "");

  if (!match) {
    return raw;
  }

  return {
    ...raw,
    id: raw.id || match.id,
    slug: match.slug,
    name: match.name,
    icon: match.icon,
    iconColor: match.iconColor,
    description: match.description,
  };
};

export const sortCategoriesLikeCatalog = (list = []) => {
  const order = new Map(categories.map((category, index) => [category.slug, index]));
  const deduped = [];
  const seen = new Set();

  list.forEach((item) => {
    const normalized = enrichCategory(item);
    const key = normalized.slug || normalizeCategoryKey(normalized.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(normalized);
  });

  return deduped.sort((left, right) => {
    const leftMeta = enrichCategory(left);
    const rightMeta = enrichCategory(right);
    const leftIndex = order.get(leftMeta.slug) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = order.get(rightMeta.slug) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return (leftMeta.name || "").localeCompare(rightMeta.name || "");
  });
};

export const getCategoryIcon = (name) => {
  const category = getCategoryByName(name);
  return category ? category.icon : Ticket;
};
