/**
 * Synthetic fixtures for UI/UX preview only.
 * Not production data. Do not use these IDs for live RPCs.
 */

import type {
  SchoolAcademicTermRow,
  SchoolAcademicYearRow,
  SchoolGradeRow,
  SchoolSectionRow,
  SchoolSubjectRow,
} from "@/features/schools/academic/queries";
import type {
  SchoolCampusRecord,
  SchoolHolidayRecord,
  SchoolRecord,
} from "@/features/schools/context";
import type {
  SchoolMemberRow,
  SchoolPendingInviteRow,
} from "@/features/schools/members/queries";

export const PREVIEW_SCHOOL_ID = "aaaaaaaa-1111-4111-8111-111111111111";
export const PREVIEW_OWNER_USER_ID = "bbbbbbbb-2222-4222-8222-222222222222";

export const previewSchool: SchoolRecord = {
  id: PREVIEW_SCHOOL_ID,
  name: "Greenfield Academy",
  slug: "greenfield-academy",
  status: "active",
  email: "office@greenfield.example.test",
  phone: "+92 21 1234 5678",
  addressLine1: "12 Education Avenue",
  city: "Karachi",
  region: "Sindh",
  countryCode: "PK",
  institutionType: "school",
  defaultLocale: "en",
  timezone: "Asia/Karachi",
  websiteUrl: "https://greenfield.example.test",
  brandDisplayName: "Greenfield Academy",
  brandPrimaryColor: "#0F766E",
  brandLogoUrl: null,
  workingDays: [1, 2, 3, 4, 5],
  setupCompletedAt: "2026-09-15T10:00:00.000Z",
};

export const previewSchoolPendingSetup: SchoolRecord = {
  ...previewSchool,
  status: "pending_setup",
  setupCompletedAt: null,
  brandDisplayName: null,
  brandPrimaryColor: null,
};

export const previewCampuses: SchoolCampusRecord[] = [
  {
    id: "cccccccc-3333-4333-8333-333333333333",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Main Campus",
    code: "MAIN",
    phone: "+92 21 1234 5678",
    email: "main@greenfield.example.test",
    addressLine1: "12 Education Avenue",
    city: "Karachi",
    status: "active",
    isDefault: true,
  },
  {
    id: "dddddddd-4444-4444-8444-444444444444",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "North Campus",
    code: "NORTH",
    phone: null,
    email: null,
    addressLine1: "88 Lake Road",
    city: "Karachi",
    status: "active",
    isDefault: false,
  },
];

export const previewHolidays: SchoolHolidayRecord[] = [
  {
    id: "eeeeeeee-5555-4555-8555-555555555555",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Independence Day",
    holidayDate: "2026-08-14",
  },
  {
    id: "ffffffff-6666-4666-8666-666666666666",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Winter break",
    holidayDate: "2026-12-25",
  },
];

export const previewMembers: SchoolMemberRow[] = [
  {
    id: "m1111111-1111-4111-8111-111111111111",
    schoolId: PREVIEW_SCHOOL_ID,
    userId: PREVIEW_OWNER_USER_ID,
    role: "owner",
    status: "active",
    fullName: "Ayesha Rahman",
    email: "ayesha@greenfield.example.test",
  },
  {
    id: "m2222222-2222-4222-8222-222222222222",
    schoolId: PREVIEW_SCHOOL_ID,
    userId: "u2222222-2222-4222-8222-222222222222",
    role: "admin",
    status: "active",
    fullName: "Bilal Khan",
    email: "bilal@greenfield.example.test",
  },
  {
    id: "m3333333-3333-4333-8333-333333333333",
    schoolId: PREVIEW_SCHOOL_ID,
    userId: "u3333333-3333-4333-8333-333333333333",
    role: "teacher",
    status: "active",
    fullName: "Sara Malik",
    email: "sara@greenfield.example.test",
  },
  {
    id: "m4444444-4444-4444-8444-444444444444",
    schoolId: PREVIEW_SCHOOL_ID,
    userId: "u4444444-4444-4444-8444-444444444444",
    role: "accountant",
    status: "suspended",
    fullName: "Omar Siddiqui",
    email: "omar@greenfield.example.test",
  },
];

export const previewInvitations: SchoolPendingInviteRow[] = [
  {
    id: "i1111111-1111-4111-8111-111111111111",
    schoolId: PREVIEW_SCHOOL_ID,
    email: "new.teacher@example.test",
    role: "teacher",
    status: "pending",
    expiresAt: "2026-11-01T00:00:00.000Z",
    createdAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "i2222222-2222-4222-8222-222222222222",
    schoolId: PREVIEW_SCHOOL_ID,
    email: "staff.hire@example.test",
    role: "staff",
    status: "pending",
    expiresAt: "2026-10-28T00:00:00.000Z",
    createdAt: "2026-10-21T14:30:00.000Z",
  },
];

const YEAR_ID = "y1111111-1111-4111-8111-111111111111";
const YEAR_PREV_ID = "y2222222-2222-4222-8222-222222222222";
const GRADE_5_ID = "g5555555-5555-4555-8555-555555555555";
const GRADE_6_ID = "g6666666-6666-4666-8666-666666666666";

export const previewAcademicYears: SchoolAcademicYearRow[] = [
  {
    id: YEAR_ID,
    schoolId: PREVIEW_SCHOOL_ID,
    name: "2026-27",
    startsOn: "2026-04-01",
    endsOn: "2027-03-31",
    status: "active",
    isCurrent: true,
  },
  {
    id: YEAR_PREV_ID,
    schoolId: PREVIEW_SCHOOL_ID,
    name: "2025-26",
    startsOn: "2025-04-01",
    endsOn: "2026-03-31",
    status: "archived",
    isCurrent: false,
  },
];

export const previewAcademicTerms: SchoolAcademicTermRow[] = [
  {
    id: "t1111111-1111-4111-8111-111111111111",
    schoolId: PREVIEW_SCHOOL_ID,
    academicYearId: YEAR_ID,
    name: "Term 1",
    startsOn: "2026-04-01",
    endsOn: "2026-09-30",
    sortOrder: 1,
  },
  {
    id: "t2222222-2222-4222-8222-222222222222",
    schoolId: PREVIEW_SCHOOL_ID,
    academicYearId: YEAR_ID,
    name: "Term 2",
    startsOn: "2026-10-01",
    endsOn: "2027-03-31",
    sortOrder: 2,
  },
];

export const previewGrades: SchoolGradeRow[] = [
  {
    id: GRADE_5_ID,
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Grade 5",
    code: "G5",
    sortOrder: 5,
    status: "active",
  },
  {
    id: GRADE_6_ID,
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Grade 6",
    code: "G6",
    sortOrder: 6,
    status: "active",
  },
  {
    id: "g4444444-4444-4444-8444-444444444444",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Grade 4",
    code: "G4",
    sortOrder: 4,
    status: "archived",
  },
];

export const previewSections: SchoolSectionRow[] = [
  {
    id: "s5a55555-5555-4555-8555-555555555555",
    schoolId: PREVIEW_SCHOOL_ID,
    gradeId: GRADE_5_ID,
    name: "A",
    capacity: 30,
    status: "active",
  },
  {
    id: "s5b55555-5555-4555-8555-555555555555",
    schoolId: PREVIEW_SCHOOL_ID,
    gradeId: GRADE_5_ID,
    name: "B",
    capacity: 28,
    status: "active",
  },
  {
    id: "s6a66666-6666-4666-8666-666666666666",
    schoolId: PREVIEW_SCHOOL_ID,
    gradeId: GRADE_6_ID,
    name: "A",
    capacity: 32,
    status: "active",
  },
];

export const previewSubjects: SchoolSubjectRow[] = [
  {
    id: "sub11111-1111-4111-8111-111111111111",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Mathematics",
    code: "MATH",
    status: "active",
  },
  {
    id: "sub22222-2222-4222-8222-222222222222",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "English",
    code: "ENG",
    status: "active",
  },
  {
    id: "sub33333-3333-4333-8333-333333333333",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Science",
    code: "SCI",
    status: "active",
  },
  {
    id: "sub44444-4444-4444-8444-444444444444",
    schoolId: PREVIEW_SCHOOL_ID,
    name: "Urdu",
    code: "URD",
    status: "active",
  },
];

export const UI_PREVIEW_LINKS = [
  { href: "/ui-preview/school", label: "Dashboard" },
  { href: "/ui-preview/school/students", label: "Student list" },
  { href: "/ui-preview/school/students/new", label: "Add student" },
  { href: "/ui-preview/school/students/stu-002", label: "Student details" },
  { href: "/ui-preview/school/teachers", label: "Teacher list" },
  { href: "/ui-preview/school/teachers/tch-001", label: "Teacher details" },
  { href: "/ui-preview/school/guardians", label: "Guardians" },
  { href: "/ui-preview/school/attendance", label: "Attendance" },
  { href: "/ui-preview/school/academic", label: "Academic" },
  { href: "/ui-preview/school/members", label: "Staff & roles" },
  { href: "/ui-preview/school/settings", label: "Settings" },
  { href: "/ui-preview/school/setup", label: "Setup checklist" },
] as const;
