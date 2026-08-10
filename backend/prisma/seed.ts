import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Nettoyage de la base de données...');

  await prisma.suiviNote.deleteMany();
  await prisma.suiviPatient.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.session.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patientNote.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();

  console.log('Création des comptes...');

  const [adminPass, secPass, pratPass] = await Promise.all([
    bcrypt.hash('Admin2024!', 10),
    bcrypt.hash('Secretaire2024!', 10),
    bcrypt.hash('Mabrouk2024!', 10),
  ]);

  await prisma.user.createMany({
    data: [
      { username: 'admin', password_hash: adminPass, name: 'Administrateur', role: 'ADMIN' },
      { username: 'secretaire', password_hash: secPass, name: 'Saoufi Secretaire', role: 'SECRETAIRE' },
      { username: 'mabrouk', password_hash: pratPass, name: 'MABROUK Manal', role: 'PRATICIEN' },
    ],
  });

  console.log('');
  console.log('=== Seed terminé ===');
  console.log('');
  console.log('Comptes créés :');
  console.log('  admin       / Admin2024!       → Administrateur');
  console.log('  secretaire  / Secretaire2024!  → Secrétaire');
  console.log('  mabrouk     / Mabrouk2024!     → Praticien (MABROUK Manal)');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
