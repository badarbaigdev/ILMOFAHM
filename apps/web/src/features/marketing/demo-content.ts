/** Hardcoded demo-page content (not live scheduling data). */

export const demoPageContent = {
  heading: "Request a demo",
  lead: "Tell us about your school. We use this to prepare a guided walkthrough once request delivery is connected.",
  agenda: {
    title: "Typical 45-minute walkthrough",
    items: [
      {
        title: "School registration & approval",
        body: "How applications become a provisioned school with an owner invitation.",
      },
      {
        title: "Setup & academic structure",
        body: "Campuses, years, grades, sections, and staff invitations.",
      },
      {
        title: "Students, guardians & attendance",
        body: "Manual entry, CSV import, relationships, and daily attendance.",
      },
      {
        title: "Platform operator view",
        body: "How ILMOFAHM operators review schools, plans, and subscriptions.",
      },
    ],
  },
  audience: {
    title: "Who should attend",
    items: [
      "School owner or principal",
      "Admin / registrar",
      "IT or operations lead (optional)",
    ],
  },
} as const;
