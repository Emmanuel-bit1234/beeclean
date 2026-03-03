import 'dotenv/config';
import { db } from '../src/db/connection.js';
import { ministries, departments } from '../src/db/schema.js';

async function seedDepartmentsStructure() {
  console.log('🌱 Seeding detailed ministries/departments structure...\n');

  const allMinistries = await db
    .select({ id: ministries.id, code: ministries.code })
    .from(ministries);

  const byCode = (code: string) => {
    const m = allMinistries.find((x) => x.code === code);
    if (!m) {
      console.warn(`⚠️ Ministry with code ${code} not found. Skipping its departments.`);
    }
    return m;
  };

  const fin = byCode('FIN');  // Ministère des Finances
  const bud = byCode('BUD');  // Ministère du Budget
  const fonc = byCode('FONC'); // Ministère de la Fonction Publique
  const emp = byCode('EMP');  // Ministère de l'Emploi et Travail

  type DepartmentSeed = { ministryId: number; code: string; name: string };

  const seeds: DepartmentSeed[] = [];

  if (emp) {
    seeds.push(
      // Emploi & Travail – Cabinet, SG, DRH, DFP, Relations pro, IT, DAF, Juridique
      { ministryId: emp.id, code: 'EMP-CAB', name: 'Cabinet du Ministre' },
      { ministryId: emp.id, code: 'EMP-SG', name: 'Secrétariat Général' },
      { ministryId: emp.id, code: 'EMP-DRH', name: 'Direction des Ressources Humaines' },
      { ministryId: emp.id, code: 'EMP-DFP', name: 'Direction de la Fonction Publique / Administration du Personnel' },
      { ministryId: emp.id, code: 'EMP-DRP', name: 'Direction des Relations Professionnelles / Inspection du Travail' },
      { ministryId: emp.id, code: 'EMP-DSI', name: 'Direction Informatique / Systèmes d’Information' },
      { ministryId: emp.id, code: 'EMP-DAF', name: 'Direction de l’Administration et des Finances' },
      { ministryId: emp.id, code: 'EMP-JUR', name: 'Service Juridique / Conformité' },
    );
  }

  if (bud) {
    seeds.push(
      // Budget – Cabinet, SG, Préparation, Exécution, Contrôle, IT, DAF, Juridique
      { ministryId: bud.id, code: 'BUD-CAB', name: 'Cabinet du Ministre' },
      { ministryId: bud.id, code: 'BUD-SG', name: 'Secrétariat Général' },
      { ministryId: bud.id, code: 'BUD-DPB', name: 'Direction de la Préparation Budgétaire' },
      { ministryId: bud.id, code: 'BUD-DEB', name: 'Direction de l’Exécution Budgétaire' },
      { ministryId: bud.id, code: 'BUD-DCB', name: 'Direction du Contrôle Budgétaire / Audit Budgétaire' },
      { ministryId: bud.id, code: 'BUD-DSI', name: 'Direction Informatique / Statistiques Budgétaires' },
      { ministryId: bud.id, code: 'BUD-DAF', name: 'Direction de l’Administration et des Finances' },
      { ministryId: bud.id, code: 'BUD-JUR', name: 'Service Juridique / Conformité' },
    );
  }

  if (fin) {
    seeds.push(
      // Finances – Cabinet, SG, Trésor, Comptabilité, Impôts, IT, DAF, Juridique
      { ministryId: fin.id, code: 'FIN-CAB', name: 'Cabinet du Ministre' },
      { ministryId: fin.id, code: 'FIN-SG', name: 'Secrétariat Général' },
      { ministryId: fin.id, code: 'FIN-DTR', name: 'Direction du Trésor / Gestion de la Trésorerie' },
      { ministryId: fin.id, code: 'FIN-DCP', name: 'Direction de la Comptabilité Publique' },
      { ministryId: fin.id, code: 'FIN-DIMP', name: 'Direction des Impôts / Retenues' },
      { ministryId: fin.id, code: 'FIN-DSI', name: 'Direction des Systèmes d’Information / Cybersécurité' },
      { ministryId: fin.id, code: 'FIN-DAF', name: 'Direction de l’Administration et des Finances' },
      { ministryId: fin.id, code: 'FIN-JUR', name: 'Service Juridique / Conformité' },
    );
  }

  if (fonc) {
    seeds.push(
      // Fonction Publique – Registre, Carrières, Discipline, Contrôle, IT
      { ministryId: fonc.id, code: 'FONC-REG', name: 'Direction Identification / Matricule' },
      { ministryId: fonc.id, code: 'FONC-CARR', name: 'Direction des Carrières' },
      { ministryId: fonc.id, code: 'FONC-DISC', name: 'Direction Discipline' },
      { ministryId: fonc.id, code: 'FONC-CONT', name: 'Direction Contrôle / Inspection' },
      { ministryId: fonc.id, code: 'FONC-DSI', name: 'Direction Informatique / Enrôlement biométrique' },
      { ministryId: fonc.id, code: 'FONC-DAF', name: 'Direction de l’Administration et des Finances' },
      { ministryId: fonc.id, code: 'FONC-JUR', name: 'Service Juridique / Conformité' },
    );
  }

  if (seeds.length === 0) {
    console.log('⚠️  No ministries found for FIN/BUD/FONC/EMP. Nothing to do.');
    process.exit(0);
  }

  const existing = await db
    .select({ id: departments.id, code: departments.code, ministryId: departments.ministryId })
    .from(departments);

  let inserted = 0;
  for (const s of seeds) {
    const already = existing.find((d) => d.code === s.code && d.ministryId === s.ministryId);
    if (already) continue;

    await db.insert(departments).values({
      ministryId: s.ministryId,
      code: s.code,
      name: s.name,
      budgetMonthly: '0',
    });
    inserted += 1;
    console.log(`✅ Department inserted: ${s.code} – ${s.name}`);
  }

  if (inserted === 0) {
    console.log('⏭️  All detailed departments already exist. Nothing to insert.');
  } else {
    console.log(`\n✨ Done. ${inserted} department(s) inserted.`);
  }

  process.exit(0);
}

seedDepartmentsStructure().catch((err) => {
  console.error('Seed departments structure failed:', err);
  process.exit(1);
});

