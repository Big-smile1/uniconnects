// Grade & GPA helpers for the Nigerian university system (5-point scale).
export function pointForScore(total: number): { grade: string; point: number } {
  if (total >= 70) return { grade: "A", point: 5 };
  if (total >= 60) return { grade: "B", point: 4 };
  if (total >= 50) return { grade: "C", point: 3 };
  if (total >= 45) return { grade: "D", point: 2 };
  if (total >= 40) return { grade: "E", point: 1 };
  return { grade: "F", point: 0 };
}

export interface ResultRow {
  grade_point: number | null;
  total: number | null;
  credit_units: number;
  status?: string;
}

export function computeGPA(rows: ResultRow[]): number {
  const valid = rows.filter((r) => r.grade_point !== null);
  if (!valid.length) return 0;
  const totalPoints = valid.reduce((s, r) => s + (r.grade_point ?? 0) * r.credit_units, 0);
  const totalUnits = valid.reduce((s, r) => s + r.credit_units, 0);
  if (!totalUnits) return 0;
  return totalPoints / totalUnits;
}

export function gradeColor(grade: string | null): string {
  switch (grade) {
    case "A":
      return "bg-success/15 text-success border-success/20";
    case "B":
      return "bg-primary/10 text-primary border-primary/20";
    case "C":
      return "bg-gold/15 text-gold-foreground border-gold/30";
    case "D":
    case "E":
      return "bg-warning/15 text-warning-foreground border-warning/30";
    case "F":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function classOfDegree(cgpa: number): string {
  if (cgpa >= 4.5) return "First Class";
  if (cgpa >= 3.5) return "Second Class Upper";
  if (cgpa >= 2.4) return "Second Class Lower";
  if (cgpa >= 1.5) return "Third Class";
  if (cgpa >= 1.0) return "Pass";
  return "Fail";
}
