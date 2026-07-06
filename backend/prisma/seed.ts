import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Nettoyage de la base de données...');

  // Supprimer dans l'ordre inverse des dépendances
  await prisma.suiviNote.deleteMany();
  await prisma.suiviPatient.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.session.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patientNote.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();

  console.log('Création des comptes utilisateurs...');

  const [adminPass, secPass, pratPass, pat1Pass, pat2Pass] = await Promise.all([
    bcrypt.hash('Admin2024!', 10),
    bcrypt.hash('Secretaire2024!', 10),
    bcrypt.hash('Mabrouk2024!', 10),
    bcrypt.hash('Patient2024!', 10),
    bcrypt.hash('Patient2024!', 10),
  ]);

  const admin = await prisma.user.create({
    data: { username: 'admin', password_hash: adminPass, name: 'Administrateur', role: 'ADMIN' },
  });

  const secretaire = await prisma.user.create({
    data: { username: 'secretaire', password_hash: secPass, name: 'Saoufi Secretaire', role: 'SECRETAIRE' },
  });

  const praticien = await prisma.user.create({
    data: { username: 'mabrouk', password_hash: pratPass, name: 'MABROUK Manal', role: 'PRATICIEN' },
  });

  console.log('Création des dossiers patients...');

  const patient1 = await prisma.patient.create({
    data: {
      name: 'ALAOUI',
      firstName: 'Youssef',
      birthDate: new Date('1975-03-22'),
      phone: '0661234567',
      email: 'youssef.alaoui@email.ma',
      address: '14 Rue Ibn Khaldoun, Safi',
      medecinTraitant: 'Dr. Benali',
      pathologie: 'Lombalgie chronique',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'BENOMAR',
      firstName: 'Fatima',
      birthDate: new Date('1990-11-08'),
      phone: '0672345678',
      address: '8 Quartier Sidi Bouzid, Safi',
      medecinTraitant: 'Dr. Kettani',
      pathologie: 'Entorse cheville droite post-opératoire',
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: 'CHRAIBI',
      firstName: 'Omar',
      birthDate: new Date('1965-07-15'),
      phone: '0683456789',
      address: '5 Rue des Orangers, Safi',
      medecinTraitant: 'Dr. Ouazzani',
      pathologie: 'AVC — rééducation membre supérieur droit',
    },
  });

  // Compte portail patient pour Youssef
  await prisma.user.create({
    data: {
      username: 'youssef.alaoui',
      password_hash: pat1Pass,
      name: 'ALAOUI Youssef',
      role: 'PATIENT',
      patientId: patient1.id,
    },
  });

  // Compte portail patient pour Fatima
  await prisma.user.create({
    data: {
      username: 'fatima.benomar',
      password_hash: pat2Pass,
      name: 'BENOMAR Fatima',
      role: 'PATIENT',
      patientId: patient2.id,
    },
  });

  console.log('Création des rendez-vous...');

  const now = new Date();
  const rdv1Date = new Date(now);
  rdv1Date.setDate(now.getDate() + 1);
  rdv1Date.setHours(10, 0, 0, 0);

  const rdv2Date = new Date(now);
  rdv2Date.setDate(now.getDate() + 1);
  rdv2Date.setHours(11, 0, 0, 0);

  const rdv3Date = new Date(now);
  rdv3Date.setDate(now.getDate() + 2);
  rdv3Date.setHours(9, 30, 0, 0);

  const rdv4Date = new Date(now);
  rdv4Date.setDate(now.getDate() + 3);
  rdv4Date.setHours(16, 0, 0, 0);

  await prisma.appointment.createMany({
    data: [
      {
        patientId: patient1.id,
        dateTime: rdv1Date,
        service: 'Kinésithérapie',
        status: 'PLANIFIE',
        practitionerId: praticien.id,
        durationMinutes: 45,
      },
      {
        patientId: patient2.id,
        dateTime: rdv2Date,
        service: 'Rééducation fonctionnelle',
        status: 'PLANIFIE',
        practitionerId: praticien.id,
        durationMinutes: 60,
      },
      {
        patientId: patient3.id,
        dateTime: rdv3Date,
        service: 'Kinésithérapie',
        status: 'PLANIFIE',
        practitionerId: praticien.id,
        durationMinutes: 45,
      },
      {
        // Patient non-inscrit (walk-in)
        patientName: 'EL FASSI Mohamed',
        dateTime: rdv4Date,
        service: 'Soins',
        status: 'PLANIFIE',
        practitionerId: praticien.id,
        durationMinutes: 30,
      },
    ],
  });

  console.log('Création des séances de soins...');

  const session1Date = new Date(now);
  session1Date.setDate(now.getDate() - 5);
  session1Date.setHours(10, 0, 0, 0);

  const session1 = await prisma.session.create({
    data: {
      patientId: patient1.id,
      practitionerId: praticien.id,
      dateTime: session1Date,
      service: 'Kinésithérapie',
      notes: 'Douleur lombaire L4-L5. Massage décontracturant réalisé, étirements passifs. Patient coopératif. Amélioration légère de la mobilité en flexion.',
    },
  });

  // Consigne sur la séance
  await prisma.sessionNote.create({
    data: {
      sessionId: session1.id,
      authorId: praticien.id,
      content: 'Revoir exercices de renforcement des abdominaux profonds à la prochaine séance. Demander si douleur nocturne persiste.',
    },
  });

  const session2Date = new Date(now);
  session2Date.setDate(now.getDate() - 3);
  session2Date.setHours(11, 0, 0, 0);

  const session2 = await prisma.session.create({
    data: {
      patientId: patient2.id,
      practitionerId: praticien.id,
      dateTime: session2Date,
      service: 'Rééducation fonctionnelle',
      notes: 'Post-opératoire J+21. Cicatrice propre, œdème résiduel léger. Travail sur la proprioception et la reprise d\'appui progressif. EVA 3/10 en fin de séance.',
    },
  });

  await prisma.sessionNote.create({
    data: {
      sessionId: session2.id,
      authorId: praticien.id,
      content: 'Appui complet autorisé par le chirurgien. Reprendre le bain thérapeutique à partir de la prochaine séance.',
    },
  });

  console.log('Création des suivis de traitement...');

  const suivi1 = await prisma.suiviPatient.create({
    data: {
      patientId: patient1.id,
      practitionerId: praticien.id,
      pathologie: 'Lombalgie chronique L4-L5',
      objectifs: 'Réduire la douleur à EVA < 2, restaurer la mobilité complète en flexion, renforcer la sangle abdominale',
      seancesPrevues: 15,
      dateDebut: new Date(now.getFullYear(), now.getMonth(), 1),
      dateFin: new Date(now.getFullYear(), now.getMonth() + 2, 1),
      statut: 'EN_COURS',
    },
  });

  await prisma.suiviNote.createMany({
    data: [
      {
        suiviId: suivi1.id,
        authorId: praticien.id,
        content: 'Séance 1-3 : travail passif, massage et chaleur. Bonne tolérance.',
        createdAt: new Date(now.getFullYear(), now.getMonth(), 5),
      },
      {
        suiviId: suivi1.id,
        authorId: praticien.id,
        content: 'Séance 4-6 : introduction des exercices actifs. EVA passée de 7 à 5. Progrès encourageants.',
        createdAt: new Date(now.getFullYear(), now.getMonth(), 12),
      },
    ],
  });

  const suivi2 = await prisma.suiviPatient.create({
    data: {
      patientId: patient2.id,
      practitionerId: praticien.id,
      pathologie: 'Entorse cheville droite grade III post-opératoire',
      objectifs: 'Récupération de la mobilité complète, proprioception, reprise du sport à 3 mois',
      seancesPrevues: 20,
      dateDebut: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      statut: 'EN_COURS',
    },
  });

  await prisma.suiviNote.create({
    data: {
      suiviId: suivi2.id,
      authorId: praticien.id,
      content: 'Début de protocole. Travail sur l\'œdème et mobilisation passive. Patient très motivé.',
    },
  });

  // Note clinique patient
  await prisma.patientNote.create({
    data: {
      patientId: patient1.id,
      authorId: praticien.id,
      content: 'Antécédent de hernie discale opérée en 2018. Éviter la mobilisation en hyperextension. Préférer les positions de décharge.',
    },
  });

  await prisma.patientNote.create({
    data: {
      patientId: patient3.id,
      authorId: praticien.id,
      content: 'Patient hypertenseur sous traitement. Surveiller la tension avant chaque séance. Éviter les efforts intenses.',
    },
  });

  console.log('');
  console.log('=== Seed terminé ===');
  console.log('');
  console.log('Comptes créés :');
  console.log('  admin / Admin2024!         → Administrateur');
  console.log('  secretaire / Secretaire2024! → Secrétaire');
  console.log('  mabrouk / Mabrouk2024!     → Praticien');
  console.log('  youssef.alaoui / Patient2024! → Patient (Youssef ALAOUI)');
  console.log('  fatima.benomar / Patient2024! → Patient (Fatima BENOMAR)');
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
