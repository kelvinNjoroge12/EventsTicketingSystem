export const events = [
  {
    id: "evt-001",
    slug: "nairobi-tech-summit-2025",
    title: "Nairobi Tech Summit 2025",
    category: "Tech",
    tags: ["AI", "Startups", "Innovation"],
    description: "Join us for East Africa's premier technology conference bringing together innovators, entrepreneurs, and tech leaders. The Nairobi Tech Summit 2025 will feature keynote speeches from industry pioneers, hands-on workshops, networking sessions, and a startup pitch competition.\n\nWhether you're a developer, designer, product manager, or tech enthusiast, this summit offers invaluable insights into the latest trends in artificial intelligence, cloud computing, blockchain, and more. Connect with like-minded professionals and explore opportunities in Kenya's thriving tech ecosystem.",
    date: "2025-08-15",
    time: "09:00 AM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "Sarit Centre, Westlands, Nairobi",
    format: "In-Person",
    price: 1500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 340,
    capacity: 500,
    themeColor: "#1E4DB7",
    accentColor: "#7C3AED",
    organizer: { id: "org-001", name: "TechKenya", avatar: null, bio: "TechKenya is a leading technology community organization dedicated to fostering innovation and growth in East Africa's tech ecosystem.", brandColor: "#1E4DB7", totalEvents: 12, totalAttendees: 4500, memberSince: "2022" },
    tickets: [
      { type: "Standard", price: 1500, remaining: 160 },
      { type: "VIP", price: 5000, remaining: 12 }
    ],
    promoCodes: [
      { code: "EARLY20", discountType: "percent", discountValue: 20, expiry: "2025-07-01", usageLimit: 100 }
    ],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-001", name: "Jane Mwangi", title: "CTO", org: "AfriTech", bio: "Jane is a seasoned technology leader with over 15 years of experience in software engineering and digital transformation.", photo: null, linkedin: "#", twitter: "#" },
      { id: "spk-002", name: "David Kamau", title: "AI Research Lead", org: "Google Kenya", bio: "David leads AI research initiatives at Google Kenya, focusing on machine learning applications for African languages.", photo: null, linkedin: "#", twitter: "#" },
      { id: "spk-003", name: "Sarah Ochieng", title: "Founder & CEO", org: "NairobiStart", bio: "Sarah is a serial entrepreneur who has founded three successful tech startups in East Africa.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: { name: "David Ochieng", bio: "David is a renowned tech event host and community builder with a passion for African innovation.", photo: null },
    schedule: [
      { time: "09:00 AM", title: "Opening Keynote", speaker: "Jane Mwangi" },
      { time: "10:30 AM", title: "Panel: Future of AI in Africa", speaker: "Multiple Speakers" },
      { time: "12:00 PM", title: "Lunch Break", speaker: null },
      { time: "01:30 PM", title: "Workshop: Building with LLMs", speaker: "David Kamau" },
      { time: "03:00 PM", title: "Startup Pitch Competition", speaker: "Various Founders" },
      { time: "04:30 PM", title: "Closing Remarks & Networking", speaker: null }
    ],
    sponsors: [
      { name: "Safaricom", tier: "Gold", logo: null, website: "https://safaricom.co.ke" },
      { name: "Google Kenya", tier: "Silver", logo: null, website: "#" },
      { name: "Andela", tier: "Bronze", logo: null, website: "#" }
    ],
    stickers: ["🔥 Trending", "💻 Tech", "📍 Nairobi"],
    relatedEventIds: ["evt-002", "evt-005", "evt-009"]
  },
  {
    id: "evt-002",
    slug: "design-matters-nairobi",
    title: "Design Matters Nairobi",
    category: "Design",
    tags: ["UI/UX", "Branding", "Creative"],
    description: "A gathering of designers, creatives, and visual storytellers. Design Matters Nairobi explores the intersection of African aesthetics and modern design principles.\n\nThis conference brings together leading designers from across the continent to share their work, discuss trends, and inspire the next generation of creative talent. Topics include brand identity, user experience design, motion graphics, and sustainable design practices.",
    date: "2025-09-20",
    time: "10:00 AM",
    endTime: "06:00 PM",
    timezone: "EAT",
    location: "The Alchemist, Westlands, Nairobi",
    format: "In-Person",
    price: 2500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: true,
    attendeeCount: 280,
    capacity: 300,
    themeColor: "#7C3AED",
    accentColor: "#EC4899",
    organizer: { id: "org-002", name: "DesignHub Africa", avatar: null, bio: "DesignHub Africa is a community-driven platform supporting designers and creatives across the continent.", brandColor: "#7C3AED", totalEvents: 8, totalAttendees: 2100, memberSince: "2021" },
    tickets: [
      { type: "General", price: 2500, remaining: 20 },
      { type: "Student", price: 1200, remaining: 5 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-004", name: "Amina Hassan", title: "Creative Director", org: "PixelCraft", bio: "Amina leads design teams for major African brands and has won multiple design awards.", photo: null, linkedin: "#", twitter: "#" },
      { id: "spk-005", name: "Brian Otieno", title: "UX Lead", org: "Flutterwave", bio: "Brian specializes in creating seamless user experiences for fintech products.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: { name: "Grace Wanjiku", bio: "Grace is a design educator and event curator passionate about African design.", photo: null },
    schedule: [
      { time: "10:00 AM", title: "Welcome & Opening", speaker: null },
      { time: "10:30 AM", title: "Keynote: African Design Renaissance", speaker: "Amina Hassan" },
      { time: "12:00 PM", title: "Workshop: Design Systems", speaker: "Brian Otieno" },
      { time: "02:00 PM", title: "Panel: Design for Social Impact", speaker: "Multiple Speakers" },
      { time: "04:00 PM", title: "Portfolio Reviews", speaker: null },
      { time: "05:30 PM", title: "Closing Party", speaker: null }
    ],
    sponsors: [
      { name: "Adobe", tier: "Gold", logo: null, website: "#" },
      { name: "Figma", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🎨 Design", "🔥 Almost Sold Out"],
    relatedEventIds: ["evt-001", "evt-003", "evt-007"]
  },
  {
    id: "evt-003",
    slug: "startup-pitch-night",
    title: "Startup Pitch Night",
    category: "Business",
    tags: ["Startups", "Investment", "Networking"],
    description: "Watch early-stage startups pitch to a panel of investors and industry experts. Startup Pitch Night is your chance to see innovation in action and network with the startup community.\n\nFounders will have 5 minutes to pitch their ideas followed by Q&A from our expert panel. Whether you're looking for investment opportunities, seeking inspiration for your own venture, or simply curious about the startup ecosystem, this event is for you.",
    date: "2025-07-30",
    time: "06:00 PM",
    endTime: "09:00 PM",
    timezone: "EAT",
    location: "iHub Nairobi, Kilimani",
    format: "In-Person",
    price: 0,
    currency: "KES",
    isFree: true,
    isAlmostSoldOut: false,
    attendeeCount: 150,
    capacity: 200,
    themeColor: "#16A34A",
    accentColor: "#22C55E",
    organizer: { id: "org-003", name: "Nairobi Startup Community", avatar: null, bio: "A community of founders, investors, and startup enthusiasts building the future of African business.", brandColor: "#16A34A", totalEvents: 24, totalAttendees: 3200, memberSince: "2020" },
    tickets: [
      { type: "Free Entry", price: 0, remaining: 50 }
    ],
    promoCodes: [],
    refundPolicy: "No Refund",
    speakers: [],
    mc: null,
    schedule: [
      { time: "06:00 PM", title: "Registration & Networking", speaker: null },
      { time: "06:45 PM", title: "Opening Remarks", speaker: null },
      { time: "07:00 PM", title: "Startup Pitches Begin", speaker: "Various Founders" },
      { time: "08:30 PM", title: "Investor Panel Feedback", speaker: null },
      { time: "09:00 PM", title: "Networking Drinks", speaker: null }
    ],
    sponsors: [
      { name: "VC Africa", tier: "Gold", logo: null, website: "#" }
    ],
    stickers: ["🆓 Free", "💼 Business"],
    relatedEventIds: ["evt-001", "evt-004"]
  },
  {
    id: "evt-004",
    slug: "fintech-innovation-forum",
    title: "Fintech Innovation Forum",
    category: "Finance",
    tags: ["Fintech", "Banking", "Mobile Money"],
    description: "Exploring the future of financial technology in Africa. The Fintech Innovation Forum brings together banks, fintechs, regulators, and investors to discuss the evolving financial landscape.\n\nTopics include mobile money innovations, digital banking, regulatory frameworks, cross-border payments, and financial inclusion initiatives. Learn from success stories and explore partnership opportunities.",
    date: "2025-10-05",
    time: "08:30 AM",
    endTime: "04:30 PM",
    timezone: "EAT",
    location: "Radisson Blu, Upper Hill, Nairobi",
    format: "In-Person",
    price: 8000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 420,
    capacity: 600,
    themeColor: "#0891B2",
    accentColor: "#06B6D4",
    organizer: { id: "org-004", name: "Africa Fintech Network", avatar: null, bio: "Connecting fintech stakeholders across the continent to drive innovation and financial inclusion.", brandColor: "#0891B2", totalEvents: 6, totalAttendees: 2800, memberSince: "2021" },
    tickets: [
      { type: "Delegate", price: 8000, remaining: 180 },
      { type: "Executive", price: 15000, remaining: 25 }
    ],
    promoCodes: [
      { code: "FINTECH50", discountType: "percent", discountValue: 50, expiry: "2025-09-01", usageLimit: 50 }
    ],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-006", name: "Peter Ndegwa", title: "CEO", org: "Safaricom", bio: "Peter leads Kenya's largest telecommunications and mobile money company.", photo: null, linkedin: "#", twitter: "#" },
      { id: "spk-007", name: "Tara Sigh", title: "VP Product", org: "Flutterwave", bio: "Tara drives product strategy for one of Africa's fastest-growing fintechs.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: { name: "James Muriuki", bio: "James is a fintech analyst and media personality covering African financial technology.", photo: null },
    schedule: [
      { time: "08:30 AM", title: "Registration & Breakfast", speaker: null },
      { time: "09:30 AM", title: "Keynote: The Future of Mobile Money", speaker: "Peter Ndegwa" },
      { time: "11:00 AM", title: "Panel: Digital Banking Transformation", speaker: "Multiple Speakers" },
      { time: "12:30 PM", title: "Lunch & Networking", speaker: null },
      { time: "02:00 PM", title: "Workshop: Building Fintech Products", speaker: "Tara Sigh" },
      { time: "03:30 PM", title: "Closing Panel: Investment Trends", speaker: null }
    ],
    sponsors: [
      { name: "KCB Bank", tier: "Gold", logo: null, website: "#" },
      { name: "Equity Bank", tier: "Gold", logo: null, website: "#" },
      { name: "M-Pesa", tier: "Platinum", logo: null, website: "#" }
    ],
    stickers: ["💰 Finance", "📍 Nairobi"],
    relatedEventIds: ["evt-001", "evt-003"]
  },
  {
    id: "evt-005",
    slug: "women-in-tech-conference",
    title: "Women in Tech Conference 2025",
    category: "Tech",
    tags: ["Diversity", "Career", "Leadership"],
    description: "Celebrating and empowering women in technology. This conference creates a space for women to share experiences, learn from each other, and build supportive networks.\n\nSessions cover career advancement, technical skills, leadership development, and work-life balance. Open to all genders who support diversity in tech.",
    date: "2025-11-12",
    time: "09:00 AM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "Strathmore University, Nairobi",
    format: "In-Person",
    price: 1000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 380,
    capacity: 450,
    themeColor: "#DB2777",
    accentColor: "#F472B6",
    organizer: { id: "org-005", name: "Women in Tech Africa", avatar: null, bio: "Empowering women to pursue and excel in technology careers across the African continent.", brandColor: "#DB2777", totalEvents: 15, totalAttendees: 5600, memberSince: "2019" },
    tickets: [
      { type: "Standard", price: 1000, remaining: 70 },
      { type: "Student", price: 500, remaining: 30 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-008", name: "Dr. Faith Karimi", title: "Professor", org: "University of Nairobi", bio: "Dr. Karimi is a leading researcher in computer science and advocate for women in STEM.", photo: null, linkedin: "#", twitter: "#" },
      { id: "spk-009", name: "Lisa Wangari", title: "Engineering Manager", org: "Microsoft", bio: "Lisa leads engineering teams at Microsoft and mentors women in tech.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: { name: "Njeri Gikera", bio: "Njeri is a tech community leader and podcast host focusing on African tech stories.", photo: null },
    schedule: [
      { time: "09:00 AM", title: "Welcome & Keynote", speaker: "Dr. Faith Karimi" },
      { time: "10:30 AM", title: "Panel: Breaking the Glass Ceiling", speaker: "Multiple Speakers" },
      { time: "12:00 PM", title: "Lunch & Mentorship", speaker: null },
      { time: "01:30 PM", title: "Workshop: Negotiation Skills", speaker: "Lisa Wangari" },
      { time: "03:00 PM", title: "Networking Session", speaker: null }
    ],
    sponsors: [
      { name: "Microsoft", tier: "Gold", logo: null, website: "#" },
      { name: "Andela", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["👩‍💻 Women in Tech", "💜 Diversity"],
    relatedEventIds: ["evt-001", "evt-002"]
  },
  {
    id: "evt-006",
    slug: "digital-marketing-masterclass",
    title: "Digital Marketing Masterclass",
    category: "Marketing",
    tags: ["Social Media", "SEO", "Analytics"],
    description: "Learn the latest digital marketing strategies from industry experts. This intensive masterclass covers social media marketing, SEO, content strategy, email marketing, and analytics.\n\nPerfect for marketers, business owners, and anyone looking to improve their digital presence. Hands-on exercises and real case studies from African businesses.",
    date: "2025-08-22",
    time: "10:00 AM",
    endTime: "04:00 PM",
    timezone: "EAT",
    location: "Online",
    format: "Online",
    price: 3000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 120,
    capacity: 500,
    themeColor: "#EA580C",
    accentColor: "#F97316",
    organizer: { id: "org-006", name: "Digital Academy Kenya", avatar: null, bio: "Providing cutting-edge digital skills training for professionals and businesses.", brandColor: "#EA580C", totalEvents: 32, totalAttendees: 4800, memberSince: "2020" },
    tickets: [
      { type: "Online Access", price: 3000, remaining: 380 }
    ],
    promoCodes: [
      { code: "MARKETING30", discountType: "percent", discountValue: 30, expiry: "2025-08-01", usageLimit: 100 }
    ],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-010", name: "Mark Otieno", title: "Digital Strategist", org: "Ogilvy", bio: "Mark has led digital campaigns for major brands across Africa.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "10:00 AM", title: "Introduction to Digital Marketing", speaker: "Mark Otieno" },
      { time: "11:30 AM", title: "Social Media Strategy", speaker: "Mark Otieno" },
      { time: "01:00 PM", title: "Lunch Break", speaker: null },
      { time: "02:00 PM", title: "SEO & Content Marketing", speaker: "Mark Otieno" },
      { time: "03:30 PM", title: "Q&A and Wrap-up", speaker: null }
    ],
    sponsors: [],
    stickers: ["💻 Online", "📱 Marketing"],
    relatedEventIds: ["evt-007", "evt-008"]
  },
  {
    id: "evt-007",
    slug: "content-creators-meetup",
    title: "Content Creators Meetup",
    category: "Creative",
    tags: ["Content", "YouTube", "TikTok"],
    description: "A monthly gathering for content creators, influencers, and digital storytellers. Share tips, collaborate on projects, and grow your audience together.\n\nTopics include platform algorithms, monetization strategies, brand partnerships, and content planning. Bring your questions and your creativity!",
    date: "2025-07-15",
    time: "02:00 PM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "The Social House, Lavington",
    format: "In-Person",
    price: 0,
    currency: "KES",
    isFree: true,
    isAlmostSoldOut: false,
    attendeeCount: 85,
    capacity: 150,
    themeColor: "#9333EA",
    accentColor: "#A855F7",
    organizer: { id: "org-007", name: "Creator Economy Kenya", avatar: null, bio: "Supporting content creators and influencers in building sustainable careers.", brandColor: "#9333EA", totalEvents: 18, totalAttendees: 2100, memberSince: "2021" },
    tickets: [
      { type: "Free Entry", price: 0, remaining: 65 }
    ],
    promoCodes: [],
    refundPolicy: "No Refund",
    speakers: [],
    mc: null,
    schedule: [
      { time: "02:00 PM", title: "Networking & Introductions", speaker: null },
      { time: "02:30 PM", title: "Creator Spotlight", speaker: null },
      { time: "03:30 PM", title: "Platform Updates & Tips", speaker: null },
      { time: "04:30 PM", title: "Open Discussion", speaker: null }
    ],
    sponsors: [],
    stickers: ["🆓 Free", "🎥 Content"],
    relatedEventIds: ["evt-006", "evt-008"]
  },
  {
    id: "evt-008",
    slug: "photography-workshop",
    title: "Photography Workshop: Capture Nairobi",
    category: "Creative",
    tags: ["Photography", "Workshop", "Visual Arts"],
    description: "Learn photography fundamentals and advanced techniques in this hands-on workshop. We'll explore street photography, portraits, and landscape shots around Nairobi.\n\nBring your camera (DSLR, mirrorless, or smartphone) and learn composition, lighting, editing, and storytelling through images. Suitable for all skill levels.",
    date: "2025-09-08",
    time: "08:00 AM",
    endTime: "02:00 PM",
    timezone: "EAT",
    location: "Nairobi National Museum",
    format: "In-Person",
    price: 3500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: true,
    attendeeCount: 28,
    capacity: 30,
    themeColor: "#059669",
    accentColor: "#10B981",
    organizer: { id: "org-008", name: "Nairobi Photography Club", avatar: null, bio: "A community of photographers sharing knowledge and passion for visual storytelling.", brandColor: "#059669", totalEvents: 20, totalAttendees: 890, memberSince: "2019" },
    tickets: [
      { type: "Workshop", price: 3500, remaining: 2 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-011", name: "Mutua Matheka", title: "Professional Photographer", org: "Freelance", bio: "Mutua is an acclaimed photographer known for his stunning African landscapes and portraits.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "08:00 AM", title: "Introduction & Theory", speaker: "Mutua Matheka" },
      { time: "09:30 AM", title: "Practical Session: Street Photography", speaker: null },
      { time: "11:00 AM", title: "Break", speaker: null },
      { time: "11:30 AM", title: "Portrait Session", speaker: null },
      { time: "01:00 PM", title: "Editing Workshop", speaker: "Mutua Matheka" }
    ],
    sponsors: [
      { name: "Canon Kenya", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🔥 Almost Sold Out", "📸 Photography"],
    relatedEventIds: ["evt-006", "evt-007"]
  },
  {
    id: "evt-009",
    slug: "devops-summit-2025",
    title: "DevOps Summit 2025",
    category: "Tech",
    tags: ["DevOps", "Cloud", "Infrastructure"],
    description: "Deep dive into DevOps practices, tools, and culture. Learn about CI/CD, containerization, Kubernetes, cloud infrastructure, and site reliability engineering.\n\nHands-on workshops, case studies from production environments, and networking with DevOps professionals. Suitable for developers, sysadmins, and infrastructure engineers.",
    date: "2025-10-18",
    time: "09:00 AM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "USIU-Africa, Kasarani",
    format: "In-Person",
    price: 2000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 180,
    capacity: 250,
    themeColor: "#2563EB",
    accentColor: "#3B82F6",
    organizer: { id: "org-009", name: "DevOps Kenya", avatar: null, bio: "A community of DevOps professionals sharing knowledge and best practices.", brandColor: "#2563EB", totalEvents: 10, totalAttendees: 1500, memberSince: "2021" },
    tickets: [
      { type: "Standard", price: 2000, remaining: 70 },
      { type: "Workshop", price: 4000, remaining: 15 }
    ],
    promoCodes: [],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-012", name: "John Kimani", title: "SRE Lead", org: "Twiga Foods", bio: "John manages infrastructure for one of Kenya's largest logistics platforms.", photo: null, linkedin: "#", twitter: "#" },
      { id: "spk-013", name: "Alice Muthoni", title: "Cloud Architect", org: "AWS", bio: "Alice helps companies design and implement cloud-native architectures.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: { name: "Peter Kamau", bio: "Peter is a DevOps evangelist and community organizer.", photo: null },
    schedule: [
      { time: "09:00 AM", title: "Opening & Keynote", speaker: "John Kimani" },
      { time: "10:30 AM", title: "Workshop: Kubernetes Basics", speaker: "Alice Muthoni" },
      { time: "12:30 PM", title: "Lunch", speaker: null },
      { time: "01:30 PM", title: "Panel: DevOps Culture", speaker: "Multiple Speakers" },
      { time: "03:00 PM", title: "Hands-on: CI/CD Pipeline", speaker: "John Kimani" }
    ],
    sponsors: [
      { name: "AWS", tier: "Gold", logo: null, website: "#" },
      { name: "Docker", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["⚙️ DevOps", "☁️ Cloud"],
    relatedEventIds: ["evt-001", "evt-010"]
  },
  {
    id: "evt-010",
    slug: "cybersecurity-conference",
    title: "Cybersecurity Conference East Africa",
    category: "Tech",
    tags: ["Security", "Hacking", "Privacy"],
    description: "Addressing cybersecurity challenges facing African organizations. Learn about threat detection, incident response, compliance, and security best practices.\n\nFeatures keynote speeches, technical workshops, and a capture-the-flag competition. Essential for security professionals, IT managers, and developers.",
    date: "2025-11-20",
    time: "08:00 AM",
    endTime: "06:00 PM",
    timezone: "EAT",
    location: "KICC, Nairobi",
    format: "In-Person",
    price: 5000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 320,
    capacity: 400,
    themeColor: "#DC2626",
    accentColor: "#EF4444",
    organizer: { id: "org-010", name: "InfoSec East Africa", avatar: null, bio: "Promoting cybersecurity awareness and professional development in East Africa.", brandColor: "#DC2626", totalEvents: 5, totalAttendees: 1200, memberSince: "2022" },
    tickets: [
      { type: "Standard", price: 5000, remaining: 80 },
      { type: "CTF Participant", price: 2000, remaining: 50 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-014", name: "Dr. James Oduor", title: "CISO", org: "KCB Bank", bio: "Dr. Oduor leads cybersecurity strategy for one of Kenya's largest banks.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "08:00 AM", title: "Registration", speaker: null },
      { time: "09:00 AM", title: "Keynote: Threat Landscape", speaker: "Dr. James Oduor" },
      { time: "10:30 AM", title: "Workshop: Penetration Testing", speaker: null },
      { time: "12:30 PM", title: "Lunch", speaker: null },
      { time: "02:00 PM", title: "CTF Competition Begins", speaker: null },
      { time: "05:00 PM", title: "Awards & Closing", speaker: null }
    ],
    sponsors: [
      { name: "Kaspersky", tier: "Gold", logo: null, website: "#" },
      { name: "Cisco", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🔒 Security", "🏆 CTF"],
    relatedEventIds: ["evt-009", "evt-001"]
  },
  {
    id: "evt-011",
    slug: "healthtech-innovation-summit",
    title: "HealthTech Innovation Summit",
    category: "Health",
    tags: ["HealthTech", "Digital Health", "Telemedicine"],
    description: "Exploring technology solutions for healthcare in Africa. From telemedicine to health records, discover innovations transforming patient care.\n\nConnect with healthcare providers, tech developers, policymakers, and investors driving digital health transformation.",
    date: "2025-09-25",
    time: "09:00 AM",
    endTime: "04:00 PM",
    timezone: "EAT",
    location: "Aga Khan University Hospital, Nairobi",
    format: "In-Person",
    price: 3500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 200,
    capacity: 300,
    themeColor: "#0D9488",
    accentColor: "#14B8A6",
    organizer: { id: "org-011", name: "HealthTech Africa", avatar: null, bio: "Advancing healthcare through technology innovation and collaboration.", brandColor: "#0D9488", totalEvents: 4, totalAttendees: 800, memberSince: "2022" },
    tickets: [
      { type: "Standard", price: 3500, remaining: 100 }
    ],
    promoCodes: [],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-015", name: "Dr. Wanjiku Nganga", title: "Medical Director", org: "MyDawa", bio: "Dr. Nganga leads digital health initiatives at Kenya's leading e-pharmacy.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "09:00 AM", title: "Opening Remarks", speaker: null },
      { time: "09:30 AM", title: "Keynote: Telemedicine in Africa", speaker: "Dr. Wanjiku Nganga" },
      { time: "11:00 AM", title: "Panel: Health Data Privacy", speaker: null },
      { time: "12:30 PM", title: "Lunch", speaker: null },
      { time: "02:00 PM", title: "Startup Pitches", speaker: null }
    ],
    sponsors: [
      { name: "MyDawa", tier: "Gold", logo: null, website: "#" }
    ],
    stickers: ["🏥 Health", "💡 Innovation"],
    relatedEventIds: ["evt-012"]
  },
  {
    id: "evt-012",
    slug: "mental-health-awareness-walk",
    title: "Mental Health Awareness Walk",
    category: "Health",
    tags: ["Mental Health", "Wellness", "Community"],
    description: "Join us for a community walk to raise awareness about mental health. Open discussions, resource sharing, and breaking the stigma around mental health in our community.\n\nAll are welcome. The walk will be followed by a panel discussion with mental health professionals.",
    date: "2025-10-10",
    time: "07:00 AM",
    endTime: "11:00 AM",
    timezone: "EAT",
    location: "Uhuru Park, Nairobi",
    format: "In-Person",
    price: 0,
    currency: "KES",
    isFree: true,
    isAlmostSoldOut: false,
    attendeeCount: 450,
    capacity: 1000,
    themeColor: "#0891B2",
    accentColor: "#22D3EE",
    organizer: { id: "org-012", name: "Mental Health Kenya", avatar: null, bio: "Promoting mental health awareness and providing support resources for all Kenyans.", brandColor: "#0891B2", totalEvents: 8, totalAttendees: 3200, memberSince: "2020" },
    tickets: [
      { type: "Free Entry", price: 0, remaining: 550 }
    ],
    promoCodes: [],
    refundPolicy: "No Refund",
    speakers: [],
    mc: null,
    schedule: [
      { time: "07:00 AM", title: "Registration & Warm-up", speaker: null },
      { time: "07:30 AM", title: "Walk Begins", speaker: null },
      { time: "09:00 AM", title: "Panel Discussion", speaker: null },
      { time: "10:30 AM", title: "Resource Fair", speaker: null }
    ],
    sponsors: [],
    stickers: ["🆓 Free", "🧠 Mental Health"],
    relatedEventIds: ["evt-011"]
  },
  {
    id: "evt-013",
    slug: "ecommerce-bootcamp",
    title: "E-Commerce Bootcamp",
    category: "Business",
    tags: ["E-Commerce", "Retail", "Digital"],
    description: "Learn how to start and grow your online business. From setting up your store to marketing and fulfillment, this bootcamp covers everything you need to know.\n\nPerfect for aspiring entrepreneurs, existing business owners looking to go digital, and anyone interested in e-commerce.",
    date: "2025-08-30",
    time: "09:00 AM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "Nairobi Garage, Kilimani",
    format: "In-Person",
    price: 4000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 95,
    capacity: 120,
    themeColor: "#7C3AED",
    accentColor: "#8B5CF6",
    organizer: { id: "org-013", name: "E-Commerce Kenya", avatar: null, bio: "Empowering entrepreneurs to succeed in the digital marketplace.", brandColor: "#7C3AED", totalEvents: 12, totalAttendees: 1800, memberSince: "2021" },
    tickets: [
      { type: "Full Day", price: 4000, remaining: 25 }
    ],
    promoCodes: [
      { code: "ECOMMERCE25", discountType: "percent", discountValue: 25, expiry: "2025-08-15", usageLimit: 30 }
    ],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-016", name: "Carol Mbugua", title: "Founder", org: "ShopZetu", bio: "Carol built one of Kenya's fastest-growing fashion e-commerce platforms.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "09:00 AM", title: "Introduction to E-Commerce", speaker: "Carol Mbugua" },
      { time: "10:30 AM", title: "Setting Up Your Store", speaker: null },
      { time: "12:00 PM", title: "Lunch", speaker: null },
      { time: "01:00 PM", title: "Marketing Your Products", speaker: "Carol Mbugua" },
      { time: "03:00 PM", title: "Logistics & Fulfillment", speaker: null }
    ],
    sponsors: [
      { name: "Jumia", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🛒 E-Commerce", "💼 Business"],
    relatedEventIds: ["evt-003", "evt-004"]
  },
  {
    id: "evt-014",
    slug: "real-estate-investment-seminar",
    title: "Real Estate Investment Seminar",
    category: "Business",
    tags: ["Real Estate", "Investment", "Property"],
    description: "Learn the fundamentals of real estate investment in Kenya. Topics include property valuation, financing options, legal considerations, and market trends.\n\nWhether you're a first-time investor or looking to expand your portfolio, this seminar provides valuable insights from industry experts.",
    date: "2025-09-15",
    time: "02:00 PM",
    endTime: "06:00 PM",
    timezone: "EAT",
    location: "Hilton Hotel, Nairobi",
    format: "In-Person",
    price: 2500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 75,
    capacity: 100,
    themeColor: "#B45309",
    accentColor: "#D97706",
    organizer: { id: "org-014", name: "Property Investors Network", avatar: null, bio: "Connecting real estate investors and providing education on property investment.", brandColor: "#B45309", totalEvents: 6, totalAttendees: 600, memberSince: "2022" },
    tickets: [
      { type: "Standard", price: 2500, remaining: 25 }
    ],
    promoCodes: [],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-017", name: "Samuel Kariuki", title: "Property Developer", org: "Prime Properties", bio: "Samuel has developed residential and commercial properties across Kenya for 20 years.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "02:00 PM", title: "Market Overview", speaker: "Samuel Kariuki" },
      { time: "03:00 PM", title: "Investment Strategies", speaker: null },
      { time: "04:00 PM", title: "Legal & Tax Considerations", speaker: null },
      { time: "05:00 PM", title: "Networking", speaker: null }
    ],
    sponsors: [],
    stickers: ["🏠 Real Estate", "💰 Investment"],
    relatedEventIds: ["evt-003", "evt-013"]
  },
  {
    id: "evt-015",
    slug: "music-producers-workshop",
    title: "Music Producers Workshop",
    category: "Music",
    tags: ["Music", "Production", "Audio"],
    description: "Learn music production from industry professionals. Topics include beat making, mixing, mastering, and music business.\n\nHands-on sessions with professional equipment and software. Suitable for aspiring producers and artists looking to understand the production process.",
    date: "2025-10-25",
    time: "11:00 AM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "Pawa254, Nairobi",
    format: "In-Person",
    price: 2000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 40,
    capacity: 50,
    themeColor: "#BE185D",
    accentColor: "#DB2777",
    organizer: { id: "org-015", name: "Kenya Music Producers", avatar: null, bio: "Supporting music producers and advancing the quality of music production in Kenya.", brandColor: "#BE185D", totalEvents: 9, totalAttendees: 650, memberSince: "2021" },
    tickets: [
      { type: "Workshop", price: 2000, remaining: 10 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-018", name: "Clemo", title: "Music Producer", org: " Calif Records", bio: "Clemo is a legendary Kenyan producer who has shaped the sound of East African music.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "11:00 AM", title: "Introduction to Production", speaker: "Clemo" },
      { time: "12:30 PM", title: "Beat Making Session", speaker: null },
      { time: "02:00 PM", title: "Lunch", speaker: null },
      { time: "03:00 PM", title: "Mixing & Mastering", speaker: "Clemo" }
    ],
    sponsors: [
      { name: "Sony Music", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🎵 Music", "🎧 Production"],
    relatedEventIds: ["evt-016"]
  },
  {
    id: "evt-016",
    slug: "afrobeat-dance-class",
    title: "Afrobeat Dance Class",
    category: "Music",
    tags: ["Dance", "Afrobeat", "Fitness"],
    description: "Learn Afrobeat dance moves in a fun, energetic class. Suitable for all levels, this class will get you moving to the hottest African beats.\n\nGreat workout, great music, great vibes. Come dance with us!",
    date: "2025-08-12",
    time: "06:00 PM",
    endTime: "08:00 PM",
    timezone: "EAT",
    location: "The Junction Mall, Nairobi",
    format: "In-Person",
    price: 500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 35,
    capacity: 50,
    themeColor: "#EA580C",
    accentColor: "#F97316",
    organizer: { id: "org-016", name: "Dance Academy Kenya", avatar: null, bio: "Teaching African dance styles and promoting fitness through dance.", brandColor: "#EA580C", totalEvents: 25, totalAttendees: 1200, memberSince: "2020" },
    tickets: [
      { type: "Single Class", price: 500, remaining: 15 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [],
    mc: null,
    schedule: [
      { time: "06:00 PM", title: "Warm-up", speaker: null },
      { time: "06:30 PM", title: "Afrobeat Basics", speaker: null },
      { time: "07:15 PM", title: "Choreography", speaker: null },
      { time: "07:45 PM", title: "Freestyle", speaker: null }
    ],
    sponsors: [],
    stickers: ["💃 Dance", "🎶 Afrobeat"],
    relatedEventIds: ["evt-015"]
  },
  {
    id: "evt-017",
    slug: "climate-action-summit",
    title: "Climate Action Summit",
    category: "Environment",
    tags: ["Climate", "Sustainability", "Green"],
    description: "Addressing climate change challenges and solutions for Africa. Join environmentalists, policymakers, and innovators working towards a sustainable future.\n\nTopics include renewable energy, sustainable agriculture, waste management, and climate policy.",
    date: "2025-11-05",
    time: "08:30 AM",
    endTime: "04:30 PM",
    timezone: "EAT",
    location: "United Nations Complex, Nairobi",
    format: "In-Person",
    price: 0,
    currency: "KES",
    isFree: true,
    isAlmostSoldOut: false,
    attendeeCount: 600,
    capacity: 800,
    themeColor: "#15803D",
    accentColor: "#22C55E",
    organizer: { id: "org-017", name: "Climate Action Kenya", avatar: null, bio: "Driving climate action and environmental sustainability across Kenya.", brandColor: "#15803D", totalEvents: 7, totalAttendees: 3500, memberSince: "2019" },
    tickets: [
      { type: "Free Entry", price: 0, remaining: 200 }
    ],
    promoCodes: [],
    refundPolicy: "No Refund",
    speakers: [
      { id: "spk-019", name: "Dr. Patricia Kombo", title: "Environmental Scientist", org: "UNEP", bio: "Dr. Kombo leads climate adaptation research at the UN Environment Programme.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "08:30 AM", title: "Registration", speaker: null },
      { time: "09:30 AM", title: "Opening Keynote", speaker: "Dr. Patricia Kombo" },
      { time: "11:00 AM", title: "Panel: Renewable Energy", speaker: null },
      { time: "12:30 PM", title: "Lunch", speaker: null },
      { time: "02:00 PM", title: "Workshop: Sustainable Practices", speaker: null }
    ],
    sponsors: [
      { name: "UNEP", tier: "Gold", logo: null, website: "#" },
      { name: "WWF", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🆓 Free", "🌱 Climate"],
    relatedEventIds: ["evt-018"]
  },
  {
    id: "evt-018",
    slug: "sustainable-fashion-show",
    title: "Sustainable Fashion Show",
    category: "Fashion",
    tags: ["Fashion", "Sustainability", "Design"],
    description: "Showcasing eco-friendly fashion from African designers. Discover brands that prioritize sustainability without compromising style.\n\nFeatures runway shows, designer talks, and a marketplace for sustainable fashion products.",
    date: "2025-09-30",
    time: "05:00 PM",
    endTime: "10:00 PM",
    timezone: "EAT",
    location: "Villa Rosa Kempinski, Nairobi",
    format: "In-Person",
    price: 3000,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: true,
    attendeeCount: 280,
    capacity: 300,
    themeColor: "#059669",
    accentColor: "#34D399",
    organizer: { id: "org-018", name: "Sustainable Fashion Kenya", avatar: null, bio: "Promoting eco-conscious fashion and supporting sustainable designers.", brandColor: "#059669", totalEvents: 5, totalAttendees: 1200, memberSince: "2021" },
    tickets: [
      { type: "General", price: 3000, remaining: 20 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [],
    mc: { name: "Ella Wanjiru", bio: "Ella is a fashion journalist and sustainability advocate.", photo: null },
    schedule: [
      { time: "05:00 PM", title: "Doors Open & Marketplace", speaker: null },
      { time: "07:00 PM", title: "Runway Show Begins", speaker: null },
      { time: "09:00 PM", title: "Designer Talks", speaker: null },
      { time: "09:45 PM", title: "After Party", speaker: null }
    ],
    sponsors: [
      { name: "H&M Foundation", tier: "Gold", logo: null, website: "#" }
    ],
    stickers: ["🔥 Almost Sold Out", "👗 Fashion"],
    relatedEventIds: ["evt-017", "evt-002"]
  },
  {
    id: "evt-019",
    slug: "blockchain-developer-meetup",
    title: "Blockchain Developer Meetup",
    category: "Tech",
    tags: ["Blockchain", "Web3", "Crypto"],
    description: "Monthly meetup for blockchain developers and enthusiasts. Discuss the latest in Web3, smart contracts, DeFi, and blockchain applications.\n\nTechnical talks, coding sessions, and networking with the blockchain community.",
    date: "2025-08-05",
    time: "06:30 PM",
    endTime: "09:00 PM",
    timezone: "EAT",
    location: "iHub Nairobi, Kilimani",
    format: "In-Person",
    price: 0,
    currency: "KES",
    isFree: true,
    isAlmostSoldOut: false,
    attendeeCount: 110,
    capacity: 150,
    themeColor: "#4F46E5",
    accentColor: "#6366F1",
    organizer: { id: "org-019", name: "Blockchain Kenya", avatar: null, bio: "Building the blockchain ecosystem in Kenya through education and collaboration.", brandColor: "#4F46E5", totalEvents: 14, totalAttendees: 1800, memberSince: "2021" },
    tickets: [
      { type: "Free Entry", price: 0, remaining: 40 }
    ],
    promoCodes: [],
    refundPolicy: "No Refund",
    speakers: [
      { id: "spk-020", name: "Eugene Mutai", title: "Blockchain Developer", org: "Freelance", bio: "Eugene is a pioneer in African blockchain development and smart contract auditing.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "06:30 PM", title: "Networking", speaker: null },
      { time: "07:00 PM", title: "Technical Talk", speaker: "Eugene Mutai" },
      { time: "08:00 PM", title: "Coding Session", speaker: null },
      { time: "08:45 PM", title: "Open Discussion", speaker: null }
    ],
    sponsors: [
      { name: "Cardano Foundation", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🆓 Free", "⛓️ Blockchain"],
    relatedEventIds: ["evt-001", "evt-020"]
  },
  {
    id: "evt-020",
    slug: "data-science-summit",
    title: "Data Science Summit 2025",
    category: "Tech",
    tags: ["Data Science", "ML", "Analytics"],
    description: "Exploring the world of data science and machine learning. Learn from data scientists working on real-world problems in Africa and beyond.\n\nWorkshops on Python, R, TensorFlow, data visualization, and building production ML systems.",
    date: "2025-10-12",
    time: "09:00 AM",
    endTime: "05:00 PM",
    timezone: "EAT",
    location: "Strathmore University, Nairobi",
    format: "In-Person",
    price: 2500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 220,
    capacity: 300,
    themeColor: "#0369A1",
    accentColor: "#0EA5E9",
    organizer: { id: "org-020", name: "Data Science Kenya", avatar: null, bio: "Building a community of data scientists and promoting data-driven decision making.", brandColor: "#0369A1", totalEvents: 8, totalAttendees: 2100, memberSince: "2020" },
    tickets: [
      { type: "Standard", price: 2500, remaining: 80 },
      { type: "Student", price: 1000, remaining: 25 }
    ],
    promoCodes: [
      { code: "DATA40", discountType: "percent", discountValue: 40, expiry: "2025-09-15", usageLimit: 50 }
    ],
    refundPolicy: "7 Days",
    speakers: [
      { id: "spk-021", name: "Dr. Ahmed Hassan", title: "Data Science Lead", org: "IBM Research", bio: "Dr. Hassan leads AI research initiatives at IBM Research Africa.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: { name: "Joyce Wairimu", bio: "Joyce is a data scientist and community organizer passionate about AI education.", photo: null },
    schedule: [
      { time: "09:00 AM", title: "Opening & Keynote", speaker: "Dr. Ahmed Hassan" },
      { time: "10:30 AM", title: "Workshop: Machine Learning Basics", speaker: null },
      { time: "12:30 PM", title: "Lunch", speaker: null },
      { time: "01:30 PM", title: "Panel: Data Ethics", speaker: null },
      { time: "03:00 PM", title: "Hands-on: Building ML Models", speaker: null }
    ],
    sponsors: [
      { name: "IBM", tier: "Gold", logo: null, website: "#" },
      { name: "Microsoft", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["📊 Data", "🤖 ML"],
    relatedEventIds: ["evt-001", "evt-019"]
  },
  {
    id: "evt-021",
    slug: "product-management-workshop",
    title: "Product Management Workshop",
    category: "Business",
    tags: ["Product", "Management", "Strategy"],
    description: "Learn the fundamentals of product management from experienced PMs. Topics include product strategy, user research, roadmapping, and metrics.\n\nIdeal for aspiring product managers, founders, and anyone involved in building products.",
    date: "2025-09-05",
    time: "10:00 AM",
    endTime: "04:00 PM",
    timezone: "EAT",
    location: "Nairobi Garage, Kilimani",
    format: "In-Person",
    price: 3500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 65,
    capacity: 80,
    themeColor: "#7C2D12",
    accentColor: "#9A3412",
    organizer: { id: "org-021", name: "Product Kenya", avatar: null, bio: "Supporting product professionals and advancing product management practices in Kenya.", brandColor: "#7C2D12", totalEvents: 10, totalAttendees: 950, memberSince: "2021" },
    tickets: [
      { type: "Workshop", price: 3500, remaining: 15 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-022", name: "Michelle Akinyi", title: "Product Lead", org: "Sendy", bio: "Michelle leads product at one of Kenya's leading logistics platforms.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "10:00 AM", title: "Introduction to Product Management", speaker: "Michelle Akinyi" },
      { time: "11:30 AM", title: "User Research Workshop", speaker: null },
      { time: "01:00 PM", title: "Lunch", speaker: null },
      { time: "02:00 PM", title: "Roadmapping Session", speaker: "Michelle Akinyi" }
    ],
    sponsors: [],
    stickers: ["📱 Product", "💼 Business"],
    relatedEventIds: ["evt-003", "evt-013"]
  },
  {
    id: "evt-022",
    slug: "yoga-in-the-park",
    title: "Yoga in the Park",
    category: "Health",
    tags: ["Yoga", "Wellness", "Fitness"],
    description: "Start your weekend with a refreshing outdoor yoga session. Suitable for all levels, led by certified instructors.\n\nBring your yoga mat and water. A perfect way to connect with nature and find inner peace.",
    date: "2025-08-09",
    time: "07:30 AM",
    endTime: "09:00 AM",
    timezone: "EAT",
    location: "Karura Forest, Nairobi",
    format: "In-Person",
    price: 300,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 25,
    capacity: 40,
    themeColor: "#0F766E",
    accentColor: "#14B8A6",
    organizer: { id: "org-022", name: "Nairobi Yoga Community", avatar: null, bio: "Making yoga accessible to everyone and building a wellness community.", brandColor: "#0F766E", totalEvents: 30, totalAttendees: 1500, memberSince: "2020" },
    tickets: [
      { type: "Single Session", price: 300, remaining: 15 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [],
    mc: null,
    schedule: [
      { time: "07:30 AM", title: "Arrival & Setup", speaker: null },
      { time: "08:00 AM", title: "Yoga Session Begins", speaker: null },
      { time: "09:00 AM", title: "Closing Meditation", speaker: null }
    ],
    sponsors: [],
    stickers: ["🧘 Yoga", "🌳 Nature"],
    relatedEventIds: ["evt-012"]
  },
  {
    id: "evt-023",
    slug: "writers-workshop",
    title: "Creative Writers Workshop",
    category: "Creative",
    tags: ["Writing", "Creative", "Storytelling"],
    description: "A workshop for writers of all levels. Learn storytelling techniques, character development, and get feedback on your work.\n\nWhether you're working on a novel, blog, or just want to improve your writing, this workshop is for you.",
    date: "2025-10-03",
    time: "02:00 PM",
    endTime: "06:00 PM",
    timezone: "EAT",
    location: "Kwani Trust, Nairobi",
    format: "In-Person",
    price: 1500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: false,
    attendeeCount: 30,
    capacity: 35,
    themeColor: "#4338CA",
    accentColor: "#6366F1",
    organizer: { id: "org-023", name: "Writers Guild Kenya", avatar: null, bio: "Supporting writers and promoting literary culture in Kenya.", brandColor: "#4338CA", totalEvents: 12, totalAttendees: 480, memberSince: "2021" },
    tickets: [
      { type: "Workshop", price: 1500, remaining: 5 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [
      { id: "spk-023", name: "Yvonne Adhiambo", title: "Author", org: "Freelance", bio: "Yvonne is an acclaimed Kenyan author whose works have been published internationally.", photo: null, linkedin: "#", twitter: "#" }
    ],
    mc: null,
    schedule: [
      { time: "02:00 PM", title: "Introduction", speaker: "Yvonne Adhiambo" },
      { time: "02:30 PM", title: "Writing Exercise", speaker: null },
      { time: "04:00 PM", title: "Feedback Session", speaker: null },
      { time: "05:00 PM", title: "Q&A", speaker: "Yvonne Adhiambo" }
    ],
    sponsors: [],
    stickers: ["✍️ Writing", "📚 Creative"],
    relatedEventIds: ["evt-007", "evt-008"]
  },
  {
    id: "evt-024",
    slug: "gaming-tournament",
    title: "East Africa Gaming Tournament",
    category: "Gaming",
    tags: ["Gaming", "Esports", "Competition"],
    description: "The biggest gaming tournament in East Africa. Compete in FIFA, Call of Duty, and Mobile Legends for cash prizes and glory.\n\nSpectators welcome! Enjoy live matches, gaming booths, and meet your favorite streamers.",
    date: "2025-11-15",
    time: "10:00 AM",
    endTime: "10:00 PM",
    timezone: "EAT",
    location: "Sarit Centre, Westlands",
    format: "In-Person",
    price: 500,
    currency: "KES",
    isFree: false,
    isAlmostSoldOut: true,
    attendeeCount: 450,
    capacity: 500,
    themeColor: "#6B21A8",
    accentColor: "#9333EA",
    organizer: { id: "org-024", name: "Esports East Africa", avatar: null, bio: "Promoting competitive gaming and building the esports ecosystem in East Africa.", brandColor: "#6B21A8", totalEvents: 6, totalAttendees: 2100, memberSince: "2022" },
    tickets: [
      { type: "Spectator", price: 500, remaining: 50 },
      { type: "Competitor", price: 1000, remaining: 5 }
    ],
    promoCodes: [],
    refundPolicy: "48 Hours",
    speakers: [],
    mc: { name: "GamingKenya", bio: "Popular gaming streamer and esports commentator.", photo: null },
    schedule: [
      { time: "10:00 AM", title: "Registration", speaker: null },
      { time: "11:00 AM", title: "Tournament Begins", speaker: null },
      { time: "01:00 PM", title: "Lunch Break", speaker: null },
      { time: "02:00 PM", title: "Semi-Finals", speaker: null },
      { time: "07:00 PM", title: "Finals", speaker: null },
      { time: "09:00 PM", title: "Awards Ceremony", speaker: null }
    ],
    sponsors: [
      { name: "PlayStation", tier: "Gold", logo: null, website: "#" },
      { name: "Samsung", tier: "Silver", logo: null, website: "#" }
    ],
    stickers: ["🔥 Almost Sold Out", "🎮 Gaming"],
    relatedEventIds: ["evt-015", "evt-016"]
  }
];

export const getEventBySlug = (slug) => {
  return events.find(event => event.slug === slug);
};

export const getEventsByCategory = (category) => {
  return events.filter(event => event.category === category);
};

export const getRelatedEvents = (event) => {
  if (!event.relatedEventIds || event.relatedEventIds.length === 0) {
    return events.filter(e => e.category === event.category && e.id !== event.id).slice(0, 3);
  }
  return events.filter(e => event.relatedEventIds.includes(e.id));
};

export const searchEvents = (query, location = "", date = "") => {
  return events.filter(event => {
    const matchesQuery = !query || 
      event.title.toLowerCase().includes(query.toLowerCase()) ||
      event.category.toLowerCase().includes(query.toLowerCase()) ||
      event.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    
    const matchesLocation = !location || 
      event.location.toLowerCase().includes(location.toLowerCase());
    
    const matchesDate = !date || event.date === date;
    
    return matchesQuery && matchesLocation && matchesDate;
  });
};

export const getUpcomingEvents = (limit = 20) => {
  const today = new Date().toISOString().split('T')[0];
  return events
    .filter(event => event.date >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
};

export const getEventsByOrganizer = (organizerId) => {
  return events.filter(event => event.organizer.id === organizerId);
};
