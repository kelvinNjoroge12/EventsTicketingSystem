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

export const categories = [
  {
    id: "cat-001",
    name: "Academic & Research",
    icon: BookOpen,
    iconColor: ICON_COLORS.blue,
    description: "Academic talks, research seminars, and scholarly forums"
  },
  {
    id: "cat-002",
    name: "Knowledge Series",
    icon: Lightbulb,
    iconColor: ICON_COLORS.gold,
    description: "Thought-leadership sessions, guest talks, and expert panels"
  },
  {
    id: "cat-003",
    name: "Workshops & Training",
    icon: Wrench,
    iconColor: ICON_COLORS.blue,
    description: "Skills workshops, labs, and professional training sessions"
  },
  {
    id: "cat-004",
    name: "Student Life",
    icon: Users,
    iconColor: ICON_COLORS.gold,
    description: "Student clubs, socials, and community experiences"
  },
  {
    id: "cat-005",
    name: "Networking",
    icon: Network,
    iconColor: ICON_COLORS.red,
    description: "Industry mixers, meetups, and professional connections"
  },
  {
    id: "cat-006",
    name: "Alumni Reunion",
    icon: GraduationCap,
    iconColor: ICON_COLORS.gold,
    description: "Class reunions, alumni meetups, and homecoming moments"
  },
  {
    id: "cat-007",
    name: "Wellness Events",
    icon: HeartPulse,
    iconColor: ICON_COLORS.red,
    description: "Wellbeing workshops, fitness sessions, and mental health talks"
  },
  {
    id: "cat-008",
    name: "Sports & Recreation",
    icon: Trophy,
    iconColor: ICON_COLORS.blue,
    description: "Athletics, fitness, and recreation activities"
  },
  {
    id: "cat-009",
    name: "Arts & Culture",
    icon: Palette,
    iconColor: ICON_COLORS.gold,
    description: "Performances, exhibitions, and cultural showcases"
  },
  {
    id: "cat-010",
    name: "Entrepreneurship & Innovation",
    icon: Rocket,
    iconColor: ICON_COLORS.red,
    description: "Innovation challenges, startup forums, and maker events"
  },
  {
    id: "cat-011",
    name: "Corporate & Executive",
    icon: Briefcase,
    iconColor: ICON_COLORS.blue,
    description: "Executive forums, corporate collaborations, and industry events"
  },
  {
    id: "cat-012",
    name: "Community Outreach",
    icon: Handshake,
    iconColor: ICON_COLORS.gold,
    description: "Community service, collaborations, and impact programs"
  },
  {
    id: "cat-013",
    name: "Conferences & Seminars",
    icon: Mic2,
    iconColor: ICON_COLORS.red,
    description: "University-wide conferences, symposia, and panels"
  }
];

export const getCategoryByName = (name) => {
  return categories.find(cat => cat.name.toLowerCase().trim() === name.toLowerCase().trim());
};

export const getCategoryIcon = (name) => {
  const category = getCategoryByName(name);
  return category ? category.icon : Ticket;
};
