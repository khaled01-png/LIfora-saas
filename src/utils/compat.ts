// Standard ABO/Rh red-cell compatibility (who can give to whom). A convenience filter only, never medical clearance.
const CAN_GIVE_TO: Record<string, string[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};
export function canDonateTo(donorGroup: string, patientGroup: string): boolean {
  return (CAN_GIVE_TO[donorGroup] || []).includes(patientGroup);
}
