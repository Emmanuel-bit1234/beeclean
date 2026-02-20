/**
 * RDC Government Payroll – roles aligned with:
 * - Hiérarchie générale du gouvernement (President → Vice-Ministres)
 * - Structure interne des ministères (Directeur de Cabinet → Agents)
 * - Key payroll roles: Ministre Finances/Budget, Directeurs Paie/Budget/Informatique
 * - System: Admin (full system access)
 */
export const RDC_PAYROLL_ROLES = [
  'Admin',
  'President',           // Président de la République
  'Premier_Ministre',
  'VPM',                 // Vice-Premiers Ministres
  'Ministre_Etat',       // Ministres d'État
  'Ministre',
  'Ministre_Delegue',    // Ministres Délégués
  'Vice_Ministre',
  'Directeur_Cabinet',
  'Secretaire_General',
  'Directeur_Paie',      // Payroll (strategic)
  'Directeur_Budget',    // Budget (strategic)
  'Directeur_Informatique',
  'Chef_Division',
  'Chef_Bureau',
  'Agent',
] as const;

export type RdcPayrollRole = (typeof RDC_PAYROLL_ROLES)[number];

export const DEFAULT_ROLE: RdcPayrollRole = 'Agent';

export function isValidRole(role: string): role is RdcPayrollRole {
  return (RDC_PAYROLL_ROLES as readonly string[]).includes(role);
}
