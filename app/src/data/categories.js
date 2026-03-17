export const categories = [
  {
    id: "cat-001",
    name: "Academic & Research",
    icon: "AR",
    description: "Academic talks, research seminars, and scholarly forums"
  },
  {
    id: "cat-002",
    name: "Workshops & Training",
    icon: "WT",
    description: "Skills workshops, labs, and professional training sessions"
  },
  {
    id: "cat-003",
    name: "Student Life",
    icon: "SL",
    description: "Student clubs, socials, and community experiences"
  },
  {
    id: "cat-004",
    name: "Faith & Service",
    icon: "FS",
    description: "Chapel gatherings, service initiatives, and outreach events"
  },
  {
    id: "cat-005",
    name: "Sports & Recreation",
    icon: "SR",
    description: "Athletics, fitness, and recreation activities"
  },
  {
    id: "cat-006",
    name: "Arts & Culture",
    icon: "AC",
    description: "Performances, exhibitions, and cultural showcases"
  },
  {
    id: "cat-007",
    name: "Entrepreneurship & Innovation",
    icon: "EI",
    description: "Innovation challenges, startup forums, and maker events"
  },
  {
    id: "cat-008",
    name: "Corporate & Executive",
    icon: "CE",
    description: "Executive forums, corporate collaborations, and industry events"
  },
  {
    id: "cat-009",
    name: "Community Outreach",
    icon: "CO",
    description: "Community service, collaborations, and impact programs"
  },
  {
    id: "cat-010",
    name: "Alumni Events",
    icon: "AL",
    description: "Alumni reunions, networking, and homecoming events"
  },
  {
    id: "cat-011",
    name: "Conferences & Seminars",
    icon: "CS",
    description: "University-wide conferences, symposia, and panels"
  }
];

export const getCategoryByName = (name) => {
  return categories.find(cat => cat.name.toLowerCase().trim() === name.toLowerCase().trim());
};

export const getCategoryIcon = (name) => {
  const category = getCategoryByName(name);
  return category ? category.icon : "EV";
};
