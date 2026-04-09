from __future__ import annotations

CURATED_EVENT_CATEGORIES = [
    {
        "name": "Academic & Research",
        "slug": "academic-research",
        "icon": "book",
        "description": "Academic talks, research seminars, and scholarly forums",
        "sort_order": 0,
    },
    {
        "name": "Knowledge Series",
        "slug": "knowledge-series",
        "icon": "bulb",
        "description": "Thought-leadership sessions, guest talks, and expert panels",
        "sort_order": 1,
    },
    {
        "name": "Workshops & Training",
        "slug": "workshops-training",
        "icon": "tools",
        "description": "Skills workshops, labs, and professional training sessions",
        "sort_order": 2,
    },
    {
        "name": "Student Life",
        "slug": "student-life",
        "icon": "users",
        "description": "Student clubs, socials, and community experiences",
        "sort_order": 3,
    },
    {
        "name": "Networking",
        "slug": "networking",
        "icon": "network",
        "description": "Industry mixers, meetups, and professional connections",
        "sort_order": 4,
    },
    {
        "name": "Alumni Reunion",
        "slug": "alumni-reunion",
        "icon": "cap",
        "description": "Class reunions, alumni meetups, and homecoming moments",
        "sort_order": 5,
    },
    {
        "name": "Wellness Events",
        "slug": "wellness-events",
        "icon": "heart",
        "description": "Wellbeing workshops, fitness sessions, and mental health talks",
        "sort_order": 6,
    },
    {
        "name": "Sports & Recreation",
        "slug": "sports-recreation",
        "icon": "trophy",
        "description": "Athletics, fitness, and recreation activities",
        "sort_order": 7,
    },
    {
        "name": "Arts & Culture",
        "slug": "arts-culture",
        "icon": "palette",
        "description": "Performances, exhibitions, and cultural showcases",
        "sort_order": 8,
    },
    {
        "name": "Entrepreneurship & Innovation",
        "slug": "entrepreneurship-innovation",
        "icon": "rocket",
        "description": "Innovation challenges, startup forums, and maker events",
        "sort_order": 9,
    },
    {
        "name": "Corporate & Executive",
        "slug": "corporate-executive",
        "icon": "briefcase",
        "description": "Executive forums, corporate collaborations, and industry events",
        "sort_order": 10,
    },
    {
        "name": "Community Outreach",
        "slug": "community-outreach",
        "icon": "hands",
        "description": "Community service, collaborations, and impact programs",
        "sort_order": 11,
    },
    {
        "name": "Conferences & Seminars",
        "slug": "conferences-seminars",
        "icon": "mic",
        "description": "University-wide conferences, symposia, and panels",
        "sort_order": 12,
    },
]

LEGACY_CATEGORY_ALIASES = {
    "marketing": "Networking",
    "music": "Arts & Culture",
    "music & arts": "Arts & Culture",
    "creative": "Arts & Culture",
    "tech": "Entrepreneurship & Innovation",
    "technology": "Entrepreneurship & Innovation",
    "business": "Corporate & Executive",
    "education": "Knowledge Series",
    "health": "Wellness Events",
    "university events": "Conferences & Seminars",
}

CURATED_CATEGORY_SLUGS = [item["slug"] for item in CURATED_EVENT_CATEGORIES]


def normalize_category_label(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


def get_curated_category_definition(value: str | None):
    normalized = normalize_category_label(value)
    if not normalized:
        return None

    resolved_name = LEGACY_CATEGORY_ALIASES.get(normalized)
    if resolved_name:
        normalized = normalize_category_label(resolved_name)

    for definition in CURATED_EVENT_CATEGORIES:
        if normalize_category_label(definition["name"]) == normalized:
            return definition
        if definition["slug"] == normalized:
            return definition
    return None


def resolve_category_name(value: str | None) -> str:
    definition = get_curated_category_definition(value)
    if definition:
        return definition["name"]
    return (value or "").strip()


def ensure_curated_categories(category_model, event_model=None):
    curated_records = {}

    for definition in CURATED_EVENT_CATEGORIES:
        category = (
            category_model.objects.filter(slug=definition["slug"]).first()
            or category_model.objects.filter(name__iexact=definition["name"]).first()
        )

        if category is None:
            category = category_model.objects.create(
                name=definition["name"],
                slug=definition["slug"],
                icon=definition["icon"],
                description=definition["description"],
                is_active=True,
                sort_order=definition["sort_order"],
            )
        else:
            updates = []
            for field, value in (
                ("name", definition["name"]),
                ("slug", definition["slug"]),
                ("icon", definition["icon"]),
                ("description", definition["description"]),
                ("sort_order", definition["sort_order"]),
                ("is_active", True),
            ):
                if getattr(category, field) != value:
                    setattr(category, field, value)
                    updates.append(field)
            if updates:
                category.save(update_fields=updates)

        curated_records[definition["name"]] = category

    for legacy_label, target_name in LEGACY_CATEGORY_ALIASES.items():
        target = curated_records[target_name]
        for source in category_model.objects.filter(name__iexact=legacy_label):
            if source.pk == target.pk:
                continue
            if event_model is not None:
                event_model.objects.filter(category_id=source.pk).update(category_id=target.pk)
            source.delete()

    return curated_records
