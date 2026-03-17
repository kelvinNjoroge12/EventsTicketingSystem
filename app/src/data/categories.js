export const categories = [
  {
    id: "cat-001",
    name: "Academic & Research",
    icon: "??",
    description: "Academic talks, research seminars, and scholarly forums"
  },
  {
    id: "cat-002",
    name: "Workshops & Training",
    icon: "???",
    description: "Skills workshops, labs, and professional training sessions"
  },
  {
    id: "cat-003",
    name: "Student Life",
    icon: "??",
    description: "Student clubs, socials, and campus community experiences"
  },
  {
    id: "cat-004",
    name: "Faith & Service",
    icon: "??",
    description: "Chapel gatherings, service initiatives, and outreach events"
  },
  {
    id: "cat-005",
    name: "Sports & Recreation",
    icon: "??",
    description: "Athletics, fitness, and recreation activities"
  },
  {
    id: "cat-006",
    name: "Arts & Culture",
    icon: "??",
    description: "Performances, exhibitions, and cultural showcases"
  },
  {
    id: "cat-007",
    name: "Entrepreneurship & Innovation",
    icon: "??",
    description: "Innovation challenges, startup forums, and maker events"
  },
  {
    id: "cat-008",
    name: "Career & Networking",
    icon: "??",
    description: "Career fairs, mentorship, and networking sessions"
  },
  {
    id: "cat-009",
    name: "Community Outreach",
    icon: "??",
    description: "Community service, partnerships, and impact programs"
  },
  {
    id: "cat-010",
    name: "Alumni Events",
    icon: "???",
    description: "Alumni reunions, networking, and homecoming events"
  },
  {
    id: "cat-011",
    name: "Conferences & Seminars",
    icon: "???",
    description: "University-wide conferences, symposia, and panels"
  }
];

export const getCategoryByName = (name) => {
  return categories.find(cat => cat.name.toLowerCase().trim() === name.toLowerCase().trim());
};

export const getCategoryIcon = (name) => {
  const category = getCategoryByName(name);
  return category ? category.icon : "??";
};
