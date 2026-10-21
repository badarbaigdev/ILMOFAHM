/**
 * Static marketing copy for the public website.
 * Structured for future locale files (en → ur / ar) without route rewrites.
 * Illustrative only — not live product metrics or customer claims.
 */

import { brand } from "@/lib/brand";

export const marketingNav = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Request a demo" },
  { href: "/contact", label: "Contact" },
] as const;

export const marketingCta = {
  register: { href: "/register-school", label: "Register your school" },
  demo: { href: "/demo", label: "Request a demo" },
  signIn: { href: "/auth/sign-in", label: "Sign in" },
} as const;

export const homeContent = {
  hero: {
    eyebrow: brand.institutionalLabel,
    title: brand.productName,
    tagline: brand.tagline,
    lead: brand.descriptor,
    supporting:
      "One secure workspace for school administration, academics, attendance, fees, and results — designed for institutions that need clear ownership and complete visibility.",
  },
  featureOverview: {
    heading: "Built for how schools actually run",
    lead: "ILMOFAHM brings administrative and academic operations into one multi-school platform with role-based access.",
  },
  capabilities: {
    heading: "Academic and administrative capabilities",
    lead: "The platform is designed to cover the full institutional lifecycle. Modules ship incrementally; planned items are labelled below.",
  },
  benefits: {
    heading: "Why institutions choose a dedicated platform",
    lead: "Replace scattered spreadsheets and disconnected tools with a single system of record.",
    items: [
      {
        title: "School-scoped security",
        body: "Each school’s data is isolated. Access comes from verified memberships — not from guessing an ID in a URL.",
      },
      {
        title: "Operational clarity",
        body: "Owners and administrators see structure, people, and processes in one place as modules come online.",
      },
      {
        title: "Ready for growth",
        body: "Multi-campus and multi-school architecture from the start, with localization planned for Urdu and Arabic.",
      },
    ],
  },
  pricingPreview: {
    heading: "Straightforward plans",
    lead: "Example plan shapes for planning conversations. Commercial terms are confirmed with your institution — not invented on this page.",
    ctaLabel: "See pricing details",
    ctaHref: "/pricing",
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      {
        question: "Can we start with a school registration?",
        answer:
          "Yes. Use Register your school to submit an application. A platform administrator reviews it before your school workspace is provisioned.",
      },
      {
        question: "Is everything listed available today?",
        answer:
          "The public site describes the product direction. Available versus planned capabilities are marked on the Features page. The first release prioritizes registration through secure school login.",
      },
      {
        question: "Do you support multiple campuses?",
        answer:
          "Yes. The architecture treats campuses as locations belonging to a school so multi-site institutions can grow without splitting systems.",
      },
      {
        question: "Which languages are supported?",
        answer:
          "English is the initial language. The application is structured so Urdu, Arabic, and right-to-left layouts can be added without rebuilding core workflows.",
      },
    ],
  },
} as const;

export type FeatureAvailability = "available" | "in_progress" | "planned";

export const featuresContent = {
  heading: "Platform capabilities",
  lead: "Explore what ILMOFAHM is designed to cover. Availability labels distinguish what the product aims to deliver from what is already shipping in this codebase.",
  groups: [
    {
      title: "Administration",
      items: [
        {
          title: "School administration",
          body: "School profile, campuses, locale, and operational settings under owner control.",
          availability: "in_progress" as FeatureAvailability,
        },
        {
          title: "Role-based access",
          body: "Owners, administrators, teachers, accountants, and staff with server-enforced permissions.",
          availability: "in_progress" as FeatureAvailability,
        },
        {
          title: "Multi-school SaaS architecture",
          body: "Shared application, school-isolated data, and platform operator tools for onboarding.",
          availability: "in_progress" as FeatureAvailability,
        },
      ],
    },
    {
      title: "People and records",
      items: [
        {
          title: "Student records",
          body: "Admissions, profiles, guardians, and enrollment history.",
          availability: "planned" as FeatureAvailability,
        },
        {
          title: "Staff management",
          body: "Staff records, teaching assignments, and membership lifecycle.",
          availability: "planned" as FeatureAvailability,
        },
      ],
    },
    {
      title: "Academics",
      items: [
        {
          title: "Academic years and classes",
          body: "Years, terms, grades, sections, subjects, and structure setup.",
          availability: "in_progress" as FeatureAvailability,
        },
        {
          title: "Attendance",
          body: "Sessions, daily marks, corrections, and summaries.",
          availability: "planned" as FeatureAvailability,
        },
        {
          title: "Exams and results",
          body: "Assessments, mark entry, validation, and report cards.",
          availability: "planned" as FeatureAvailability,
        },
      ],
    },
    {
      title: "Finance and insight",
      items: [
        {
          title: "Fee management",
          body: "Fee structures, invoices, payments, and outstanding balances for the school.",
          availability: "planned" as FeatureAvailability,
        },
        {
          title: "Reporting",
          body: "Authorized operational and academic reports with tenant isolation.",
          availability: "planned" as FeatureAvailability,
        },
      ],
    },
  ],
  availabilityLabels: {
    available: "Available",
    in_progress: "In progress",
    planned: "Planned",
  } satisfies Record<FeatureAvailability, string>,
} as const;

export const legalContent = {
  privacy: {
    heading: "Privacy policy",
    updated: "2026-10-21",
    disclaimer:
      "This page is an illustrative policy outline for the public website. It is not legal advice. Final commercial terms should be reviewed by counsel before production launch.",
    sections: [
      {
        title: "Information we collect",
        body: "When you contact us or register a school, we collect the details you submit (such as names, emails, phone numbers, and school information) to respond and process applications.",
      },
      {
        title: "How we use information",
        body: "We use submitted information to evaluate school applications, operate the service, communicate about your request, and improve product reliability and security.",
      },
      {
        title: "School and student data",
        body: "Institutional records entered after onboarding belong to the school tenant. Access is controlled by membership and role. We do not use children’s records for marketing.",
      },
      {
        title: "Security",
        body: "We apply technical and organizational measures including authenticated access, server-side authorization, and database access controls. No method of transmission is perfectly secure.",
      },
      {
        title: "Contact",
        body: "Privacy questions may be sent through the Contact page. Update this section with a dedicated privacy address before commercial launch.",
      },
    ],
  },
  terms: {
    heading: "Terms of service",
    updated: "2026-10-21",
    disclaimer:
      "These terms are a working draft for the public site. They do not create a binding commercial agreement until replaced with counsel-approved terms.",
    sections: [
      {
        title: "Service description",
        body: "ILMOFAHM provides school management software as a service. Features become available according to your school’s provisioned access and subscription status.",
      },
      {
        title: "Accounts and access",
        body: "You are responsible for safeguarding account credentials and for activity under your school memberships. Platform operators may suspend access for security or policy reasons.",
      },
      {
        title: "Acceptable use",
        body: "Do not attempt to access another school’s data, probe the service without authorization, upload unlawful content, or interfere with platform integrity.",
      },
      {
        title: "Subscriptions",
        body: "Initial billing may be managed manually. Online payment collection may be introduced later. Pricing discussed on the site is illustrative until confirmed in writing.",
      },
      {
        title: "Limitation of liability",
        body: "To the extent permitted by law, ILMOFAHM is not liable for indirect or consequential damages arising from use of the service. Replace with jurisdiction-specific terms before launch.",
      },
    ],
  },
} as const;

export const formNotices = {
  demoStage:
    "Demo-stage form: your browser validates the fields, but messages are not stored or emailed yet. A server integration will be added in a later milestone.",
  registerStage:
    "Registration entry is ready for visitors. Submitting an application to the database arrives in the next backend milestone — this page currently validates input only.",
} as const;
