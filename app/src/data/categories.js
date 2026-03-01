export const categories = [
  {
    id: "cat-001",
    name: "Tech",
    icon: "💻",
    description: "Technology conferences, workshops, and meetups"
  },
  {
    id: "cat-002",
    name: "Design",
    icon: "🎨",
    description: "Design conferences, creative workshops, and portfolio reviews"
  },
  {
    id: "cat-003",
    name: "Business",
    icon: "💼",
    description: "Business seminars, networking events, and entrepreneurship"
  },
  {
    id: "cat-004",
    name: "Finance",
    icon: "💰",
    description: "Fintech events, investment forums, and financial literacy"
  },
  {
    id: "cat-005",
    name: "Marketing",
    icon: "📱",
    description: "Digital marketing, social media, and brand strategy events"
  },
  {
    id: "cat-006",
    name: "Creative",
    icon: "✨",
    description: "Creative arts, photography, writing, and content creation"
  },
  {
    id: "cat-007",
    name: "Health",
    icon: "🏥",
    description: "Healthtech, wellness, and fitness events"
  },
  {
    id: "cat-008",
    name: "Music",
    icon: "🎵",
    description: "Music production, concerts, and dance events"
  },
  {
    id: "cat-009",
    name: "Environment",
    icon: "🌱",
    description: "Climate action, sustainability, and environmental events"
  },
  {
    id: "cat-010",
    name: "Fashion",
    icon: "👗",
    description: "Fashion shows, design, and sustainable fashion events"
  },
  {
    id: "cat-011",
    name: "Gaming",
    icon: "🎮",
    description: "Gaming tournaments, esports, and game development"
  }
];

export const getCategoryByName = (name) => {
  return categories.find(cat => cat.name.toLowerCase().trim() === name.toLowerCase().trim());
};

export const getCategoryIcon = (name) => {
  const category = getCategoryByName(name);
  return category ? category.icon : "📅";
};
