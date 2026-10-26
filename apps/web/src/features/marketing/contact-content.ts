/** Hardcoded contact-page content (not live CRM data). */

export const contactPageContent = {
  heading: "Contact",
  lead: "Reach the ILMOFAHM team about onboarding, partnerships, or product questions. The form validates in your browser; message delivery connects in a later milestone.",
  channels: [
    {
      title: "School onboarding",
      body: "Register your school online, then a platform operator reviews the application before activation.",
      actionLabel: "Register school",
      actionHref: "/register-school",
    },
    {
      title: "Product walkthrough",
      body: "Request a guided demo for owners and administrators evaluating ILMOFAHM.",
      actionLabel: "Request a demo",
      actionHref: "/demo",
    },
    {
      title: "Illustrative desk hours",
      body: "Monday–Friday, 10:00–18:00 Asia/Karachi (sample hours for layout — confirm before launch).",
      actionLabel: null,
      actionHref: null,
    },
  ],
  office: {
    title: "Illustrative office",
    lines: [
      "ILMOFAHM — Institutional Technology",
      "12 Education Avenue (sample address)",
      "Karachi, Sindh, Pakistan",
      "hello@ilmofahm.example.test",
      "+92 21 0000 0000",
    ],
  },
} as const;
