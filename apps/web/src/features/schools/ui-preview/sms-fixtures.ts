/**
 * Hardcoded school-management UI fixtures for design preview only.
 * Synthetic names and numbers — not live tenant data.
 */

export const previewAdminUser = {
  name: "Jane Copper",
  role: "Admin",
  initials: "JC",
};

export const previewStatCards = [
  { label: "Total students", value: "1,248", delta: "+5% this month", tone: "orange" },
  { label: "Total teachers", value: "86", delta: "+2% this month", tone: "blue" },
  { label: "Guardians", value: "1,102", delta: "+3% this month", tone: "teal" },
  { label: "Active classes", value: "42", delta: "Stable", tone: "green" },
  { label: "Present today", value: "91%", delta: "+1% vs yesterday", tone: "purple" },
  { label: "Fee collected", value: "₨ 2.4M", delta: "68% of due", tone: "cyan" },
] as const;

export const previewFeeBars = [
  { month: "Jan", total: 72, collected: 48 },
  { month: "Feb", total: 80, collected: 55 },
  { month: "Mar", total: 68, collected: 50 },
  { month: "Apr", total: 90, collected: 70 },
  { month: "May", total: 85, collected: 62 },
  { month: "Jun", total: 78, collected: 58 },
  { month: "Jul", total: 60, collected: 40 },
  { month: "Aug", total: 88, collected: 66 },
  { month: "Sep", total: 92, collected: 74 },
  { month: "Oct", total: 86, collected: 60 },
] as const;

export const previewAttendanceMix = [
  { label: "Present", pct: 87, color: "bg-teal" },
  { label: "Absent", pct: 8, color: "bg-red-500" },
  { label: "Late", pct: 3, color: "bg-amber-500" },
  { label: "Excused", pct: 2, color: "bg-violet-500" },
] as const;

export const previewNotices = [
  {
    author: "Admin",
    date: "25 Jan 2026",
    body: "Parent–teacher meeting scheduled for Grade 6 on Friday afternoon.",
  },
  {
    author: "Kathryn Murphy",
    date: "22 Jan 2026",
    body: "Science fair registration closes this week. Share the form with parents.",
  },
  {
    author: "John Doe",
    date: "18 Jan 2026",
    body: "Library books due for return before mid-term assessments.",
  },
] as const;

export const previewLeaveRequests = [
  {
    name: "Darlene Robertson",
    role: "English teacher",
    days: "3 days",
    applied: "10 Apr 2026",
  },
  {
    name: "Esther Howard",
    role: "Mathematics teacher",
    days: "1 day",
    applied: "09 Apr 2026",
  },
  {
    name: "Cody Fisher",
    role: "Admin staff",
    days: "2 days",
    applied: "08 Apr 2026",
  },
] as const;

export const previewEvents = [
  { title: "Marketing strategy kickoff", time: "09:00 – 10:30", day: "12" },
  { title: "Product design brainstorm", time: "11:00 – 12:00", day: "14" },
  { title: "Staff coordination huddle", time: "15:00 – 16:00", day: "18" },
] as const;

export const previewTopTeachers = [
  { name: "Theresa Webb", email: "theresa@greenfield.example.test", subject: "Mathematics" },
  { name: "Darrell Steward", email: "darrell@greenfield.example.test", subject: "Physics" },
  { name: "Brooklyn Simmons", email: "brooklyn@greenfield.example.test", subject: "Biology" },
  { name: "Leslie Alexander", email: "leslie@greenfield.example.test", subject: "English" },
] as const;

export const previewTopStudents = [
  { name: "Brooklyn Simmons", classLabel: "Class Six · A", marks: 92 },
  { name: "Floyd Miles", classLabel: "Class Seven · B", marks: 88 },
  { name: "Cameron Williamson", classLabel: "Class Six · A", marks: 85 },
  { name: "Jenny Wilson", classLabel: "Class Eight · C", marks: 81 },
] as const;

export type PreviewStudent = {
  id: string;
  admissionNo: string;
  rollNo: string;
  firstName: string;
  lastName: string;
  classLabel: string;
  section: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  category: string;
  status: "active" | "inactive";
  academicYear: string;
};

export const previewStudents: PreviewStudent[] = [
  {
    id: "stu-001",
    admissionNo: "AD52365",
    rollNo: "12",
    firstName: "Darlene",
    lastName: "Robertson",
    classLabel: "Class 1",
    section: "A",
    dateOfBirth: "05 May 2012",
    gender: "Female",
    phone: "209-555-0104",
    email: "darlene@example.test",
    category: "General",
    status: "active",
    academicYear: "2025-26",
  },
  {
    id: "stu-002",
    admissionNo: "AD52366",
    rollNo: "08",
    firstName: "Seth",
    lastName: "Hallam",
    classLabel: "Class 6",
    section: "A",
    dateOfBirth: "10 Nov 2006",
    gender: "Male",
    phone: "789-678-4560",
    email: "seth@example.test",
    category: "General",
    status: "active",
    academicYear: "2025-26",
  },
  {
    id: "stu-003",
    admissionNo: "AD52367",
    rollNo: "04",
    firstName: "Annette",
    lastName: "Black",
    classLabel: "Class 2",
    section: "B",
    dateOfBirth: "05 May 2012",
    gender: "Female",
    phone: "209-555-0112",
    email: "annette@example.test",
    category: "Special",
    status: "active",
    academicYear: "2025-26",
  },
  {
    id: "stu-004",
    admissionNo: "AD52368",
    rollNo: "15",
    firstName: "Jerome",
    lastName: "Bell",
    classLabel: "Class 3",
    section: "A",
    dateOfBirth: "05 May 2012",
    gender: "Male",
    phone: "209-555-0148",
    email: "jerome@example.test",
    category: "General",
    status: "inactive",
    academicYear: "2025-26",
  },
  {
    id: "stu-005",
    admissionNo: "AD52369",
    rollNo: "21",
    firstName: "Kristin",
    lastName: "Watson",
    classLabel: "Class 4",
    section: "C",
    dateOfBirth: "05 May 2012",
    gender: "Female",
    phone: "209-555-0166",
    email: "kristin@example.test",
    category: "General",
    status: "active",
    academicYear: "2025-26",
  },
];

/** Month × day codes for student attendance grid (P/A/L/H/F). */
export const previewStudentAttendanceSummary = {
  present: 227,
  absent: 70,
  halfDay: 27,
  late: 28,
  holiday: 12,
} as const;

export const previewAttendanceMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function patternForMonth(monthIndex: number): string[] {
  if (monthIndex >= 5) return Array.from({ length: 31 }, () => "");
  const cycle = ["P", "P", "P", "P", "A", "P", "L", "P", "P", "H", "P", "F", "P"];
  return Array.from({ length: 31 }, (_, day) => {
    if (day >= 28 && monthIndex === 1) return "";
    return cycle[day % cycle.length] ?? "P";
  });
}

export const previewAttendanceGrid = previewAttendanceMonths.map((_, i) =>
  patternForMonth(i),
);

export type PreviewTeacher = {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  subject: string;
  classes: string;
  contract: string;
  shift: string;
  location: string;
  dateOfBirth: string;
  gender: string;
  joinDate: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  qualification: string;
  experience: string;
  maritalStatus: string;
  fatherName: string;
  motherName: string;
  address: string;
  permanentAddress: string;
  bankName: string;
  bankBranch: string;
  ifsc: string;
  bloodGroup: string;
  height: string;
  weight: string;
  bio: string;
};

export const previewTeachers: PreviewTeacher[] = [
  {
    id: "tch-001",
    staffId: "AD1256589",
    firstName: "Marvin",
    lastName: "McKinney",
    subject: "Mathematics",
    classes: "1(A), 2(A), 3(A)",
    contract: "Permanent",
    shift: "Morning",
    location: "2nd Floor",
    dateOfBirth: "10 Nov 1995",
    gender: "Male",
    joinDate: "05 May 2018",
    phone: "789-678-4560",
    email: "marvin@greenfield.example.test",
    status: "active",
    qualification: "M.Sc. Mathematics",
    experience: "7 years",
    maritalStatus: "Married",
    fatherName: "Ralph Edwards",
    motherName: "Floyd Miles",
    address: "8502 Preston Rd. Inglewood, Maine 98380",
    permanentAddress: "2118 Thornridge Cir. Syracuse, Connecticut 35624",
    bankName: "Bank of America",
    bankBranch: "New York",
    ifsc: "5283209832",
    bloodGroup: "O+",
    height: "5.8 ft",
    weight: "72 kg",
    bio: "Punctual, student-centred instructor focused on conceptual clarity and exam readiness.",
  },
  {
    id: "tch-002",
    staffId: "AD1256590",
    firstName: "Theresa",
    lastName: "Webb",
    subject: "English",
    classes: "5(B), 6(A)",
    contract: "Permanent",
    shift: "Morning",
    location: "1st Floor",
    dateOfBirth: "02 Mar 1990",
    gender: "Female",
    joinDate: "12 Aug 2019",
    phone: "209-555-0199",
    email: "theresa@greenfield.example.test",
    status: "active",
    qualification: "M.A. English",
    experience: "6 years",
    maritalStatus: "Single",
    fatherName: "Robert Webb",
    motherName: "Anna Webb",
    address: "12 Lake View, Karachi",
    permanentAddress: "12 Lake View, Karachi",
    bankName: "HBL",
    bankBranch: "Clifton",
    ifsc: "HBL000123",
    bloodGroup: "A+",
    height: "5.4 ft",
    weight: "58 kg",
    bio: "Builds literacy confidence through reading circles and structured writing practice.",
  },
];

export function getPreviewStudent(id: string): PreviewStudent | undefined {
  return previewStudents.find((s) => s.id === id);
}

export function getPreviewTeacher(id: string): PreviewTeacher | undefined {
  return previewTeachers.find((t) => t.id === id);
}
