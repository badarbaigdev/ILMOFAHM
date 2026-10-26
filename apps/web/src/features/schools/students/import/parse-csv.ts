export type StudentImportCsvRow = {
  rowNumber: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  academicYearName: string;
  gradeName: string;
  sectionName: string;
};

export type ParseCsvResult =
  | { ok: true; rows: StudentImportCsvRow[] }
  | { ok: false; error: string };

const HEADER_ALIASES: Record<string, keyof Omit<StudentImportCsvRow, "rowNumber">> =
  {
    student_number: "studentNumber",
    studentnumber: "studentNumber",
    first_name: "firstName",
    firstname: "firstName",
    last_name: "lastName",
    lastname: "lastName",
    date_of_birth: "dateOfBirth",
    dateofbirth: "dateOfBirth",
    dob: "dateOfBirth",
    gender: "gender",
    academic_year_name: "academicYearName",
    academic_year: "academicYearName",
    academicyear: "academicYearName",
    grade_name: "gradeName",
    grade: "gradeName",
    section_name: "sectionName",
    section: "sectionName",
  };

const REQUIRED_HEADERS = ["studentNumber", "firstName", "lastName"] as const;

/** RFC4180-ish CSV split that supports quoted commas and "" escapes. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function parseStudentImportCsv(text: string): ParseCsvResult {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      error: "CSV needs a header row and at least one data row.",
    };
  }

  const headerCells = splitCsvLine(lines[0] ?? "");
  const columnMap: Array<keyof Omit<StudentImportCsvRow, "rowNumber"> | null> =
    headerCells.map((cell) => {
      const alias = HEADER_ALIASES[normalizeHeader(cell)];
      return alias ?? null;
    });

  for (const required of REQUIRED_HEADERS) {
    if (!columnMap.includes(required)) {
      return {
        ok: false,
        error:
          "CSV header must include student_number, first_name, and last_name.",
      };
    }
  }

  if (lines.length - 1 > 500) {
    return { ok: false, error: "Import is limited to 500 data rows." };
  }

  const rows: StudentImportCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i] ?? "");
    const row: StudentImportCsvRow = {
      rowNumber: i,
      studentNumber: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      academicYearName: "",
      gradeName: "",
      sectionName: "",
    };
    columnMap.forEach((field, index) => {
      if (!field) return;
      row[field] = cells[index] ?? "";
    });
    rows.push(row);
  }

  return { ok: true, rows };
}

export const STUDENT_IMPORT_TEMPLATE_CSV = [
  "student_number,first_name,last_name,date_of_birth,gender,academic_year_name,grade_name,section_name",
  "STU-001,Sara,Ali,2015-05-01,female,2026-27,Grade 1,A",
  "STU-002,Omar,Khan,2014-11-20,male,2026-27,Grade 1,A",
].join("\n");
