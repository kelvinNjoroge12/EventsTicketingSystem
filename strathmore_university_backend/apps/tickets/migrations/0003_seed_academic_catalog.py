from django.db import migrations


SCHOOLS_COURSES = {
    "Strathmore Institute of Mathematical Sciences": [
        "Bachelor of Business Science: Actuarial Science",
        "Bachelor of Business Science: Finance",
        "Bachelor of Business Science: Financial Engineering",
        "Chartered Financial Analyst (CFA)",
        "Master of Science in Biomathematics",
        "Master of Science in Development Finance",
        "Master of Science in Development Finance (MDF)",
        "Master of Science in Mathematical Finance",
        "Master of Science in Statistical Science",
    ],
    "Strathmore Law School": [
        "Bachelor of Laws",
        "Master of Laws",
    ],
    "Strathmore University Business School": [
        "Advanced Management Program (AMP)",
        "Advisory Board Member",
        "Bachelor of Commerce",
        "Bachelor of Financial Services",
        "Bachelor of Science in Leadership and Management",
        "Bachelor of Science in Supply Chain and Operations Management",
        "Bio-Entrepreneurship Executive Program",
        "Diploma in Business Creation and Entrepreneurship",
        "Diploma in Business Management",
        "Diploma in Leadership and Management",
        "Diploma in Procurement",
        "Enterprise Development Programme (EDP)",
        "Executive Coaching for Managers",
        "Executive Healthcare Management Program (EHMP)",
        "Family Business Executive Programme (FBEP)",
        "Grants Management Program",
        "Leading High-Performing Healthcare Organisations (LeHHO)",
        "Leading the Board (LTB)",
        "Managing Healthcare Businesses (MHB)",
        "Master of Business Administration",
        "Master of Business Administration - Healthcare Management",
        "Master of Business Administration (Modular)",
        "Master of Commerce",
        "Master of Management in Agribusiness",
        "Master of Management in Agribusiness (MMA)",
        "Master of Science in Education Management",
        "MBA for Executive (E MBA)",
        "MBA in Healthcare Management (MBA HCM)",
        "Modular MBA",
        "New Managers Leadership Programme (NMLP)",
        "Owner Manager Program (OMP)",
        "Part-time MBA",
        "Post Experience Diploma in Educational Management",
        "Postgraduate Diploma in Educational Management",
        "Project Management Professional (PMP)",
        "Senior Management Leadership Program (SMLP)",
        "Teacher Enhancement Programme (TEP)",
        "The Effective Director (TED)",
        "Women Directors Leadership Summit (WDLS)",
        "Women in Leadership Programme (WIL)",
    ],
    "School of Computing and Engineering Sciences": [
        "Bachelor of Business Information Technology",
        "Bachelor of Science in Electrical and Electronic Engineering",
        "Bachelor of Science in Informatics and Computer Science",
        "Bachelor of Science in Telecommunications",
        "Certified Information Security Manager (CISM)",
        "Certified Information Systems Auditor (CISA)",
        "Master of Science in Computing and Information Systems",
        "Master of Science in Information Systems Security (Msc ISS)",
        "Master of Science in Information Technology",
        "Master of Science in Mobile Telecommunications and Innovation",
    ],
    "School of Tourism and Hospitality": [
        "Bachelor of Science in Hospitality and Hotel Management",
        "Bachelor of Science in Tourism Management",
    ],
    "School of Humanities and Social Sciences": [
        "Bachelor of Arts in Communication",
        "Bachelor of Arts in Communication (Journalism and Public Relations)",
        "Bachelor of Arts in Development Studies and Philosophy",
        "Bachelor of Arts in International Studies",
        "Diploma in International Relations",
        "Diploma in Journalism and New Media",
        "Master in Public Policy and Management (MPPM)",
        "Master of Applied Philosophy and Ethics",
        "Master of Public Policy and Management",
    ],
    "Strathmore Institute of Technology": [
        "Certificate in Secretarial Studies",
        "CERTIFICATE IN COMPUTER APPLICATION {CCA}",
        "Diploma in Business Information Technology",
        "Diploma in Secretarial Studies",
        "INTERNATIONAL COMPUTER DRIVING LICENSE (ICDL)",
    ],
    "School of Accounting": [
        "Association of Chartered Certified Accountants (ACCA)",
        "Certified Public Accountants (CPA)",
        "Chartered Institute of Marketing (CIM)",
        "Microfinance Diploma",
    ],
}


def seed_academic_catalog(apps, schema_editor):
    School = apps.get_model("tickets", "School")
    Course = apps.get_model("tickets", "Course")

    for school_index, (school_name, courses) in enumerate(SCHOOLS_COURSES.items()):
        school, _ = School.objects.get_or_create(
            name=school_name,
            defaults={
                "is_active": True,
                "sort_order": school_index,
            },
        )
        school_updates = []
        if not school.is_active:
            school.is_active = True
            school_updates.append("is_active")
        if school.sort_order != school_index:
            school.sort_order = school_index
            school_updates.append("sort_order")
        if school_updates:
            school.save(update_fields=school_updates)

        for course_index, course_name in enumerate(courses):
            course, _ = Course.objects.get_or_create(
                school=school,
                name=course_name,
                defaults={
                    "is_active": True,
                    "sort_order": course_index,
                },
            )
            course_updates = []
            if not course.is_active:
                course.is_active = True
                course_updates.append("is_active")
            if course.sort_order != course_index:
                course.sort_order = course_index
                course_updates.append("sort_order")
            if course_updates:
                course.save(update_fields=course_updates)


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0002_registration_categories"),
    ]

    operations = [
        migrations.RunPython(seed_academic_catalog, migrations.RunPython.noop),
    ]
