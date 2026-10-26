import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseStudentImportCsv, splitCsvLine } from "./parse-csv";

describe("splitCsvLine", () => {
  it("splits plain and quoted fields", () => {
    assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
    assert.deepEqual(splitCsvLine('"a""b",c'), ['a"b', "c"]);
  });
});

describe("parseStudentImportCsv", () => {
  it("parses a valid template-shaped file", () => {
    const csv = [
      "student_number,first_name,last_name,date_of_birth,gender,academic_year_name,grade_name,section_name",
      "STU-001,Sara,Ali,2015-05-01,female,2026-27,Grade 1,A",
    ].join("\n");
    const result = parseStudentImportCsv(csv);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0]?.studentNumber, "STU-001");
      assert.equal(result.rows[0]?.academicYearName, "2026-27");
    }
  });

  it("rejects missing required headers", () => {
    const result = parseStudentImportCsv("name,age\nSara,10");
    assert.equal(result.ok, false);
  });

  it("accepts header aliases", () => {
    const result = parseStudentImportCsv(
      "Student Number,First Name,Last Name\nA-1,Noor,Ahmed",
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rows[0]?.firstName, "Noor");
    }
  });
});
