import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true });
}

async function login(page: Page, username: string, password: string) {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder*="tilisateur"], input[type="text"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

async function logout(page: Page) {
  const btn = page.locator('button:has-text("Déconnexion"), button:has-text("deconnexion"), button[title*="onnexion"]').first();
  if (await btn.isVisible()) {
    await btn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }
}

// ── ADMIN ──────────────────────────────────────────────────────────────────────

test.describe('ADMIN — audit complet', () => {
  test('Login admin', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await shot(page, '01-login-page');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin_password');
    await shot(page, '02-login-filled');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await shot(page, '03-admin-dashboard');

    await expect(page.locator('body')).not.toContainText('Identifiant ou mot de passe incorrect');
  });

  test('Admin — Dashboard', async ({ page }) => {
    await login(page, 'admin', 'admin_password');
    await shot(page, '04-admin-dashboard-full');
    // Vérifier les stats
    const hasStats = await page.locator('.stat-card, [class*="stat"]').count();
    console.log(`Dashboard stat cards: ${hasStats}`);
  });

  test('Admin — Patients : liste, création, détail', async ({ page }) => {
    await login(page, 'admin', 'admin_password');

    // Naviguer vers Patients
    await page.click('text=Patients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '05-admin-patients-list');

    // Créer un nouveau patient
    const addBtn = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("nouveau patient")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '06-admin-patient-form');

      // Remplir le formulaire
      const nameField = page.locator('input[placeholder*="Nom"], input[name="name"]').first();
      if (await nameField.isVisible()) {
        await nameField.fill('TEST_AUDIT');
        const firstNameField = page.locator('input[placeholder*="Prénom"], input[name="firstName"]').first();
        if (await firstNameField.isVisible()) await firstNameField.fill('Patient');
        const phoneField = page.locator('input[placeholder*="Téléphone"], input[placeholder*="phone"]').first();
        if (await phoneField.isVisible()) await phoneField.fill('0601020304');
        await shot(page, '07-admin-patient-form-filled');

        const submitBtn = page.locator('button[type="submit"]:has-text("Créer"), button:has-text("Enregistrer"), button:has-text("Sauvegarder")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
          await shot(page, '08-admin-patient-created');
        }
      }
    }

    // Cliquer sur un patient existant pour voir le détail
    const patientRow = page.locator('tr:has(td), .patient-row, [class*="patient"]').first();
    if (await patientRow.isVisible()) {
      await patientRow.click();
      await page.waitForTimeout(800);
      await shot(page, '09-admin-patient-detail');
    }
  });

  test('Admin — Rendez-vous : liste, création, navigation semaine', async ({ page }) => {
    await login(page, 'admin', 'admin_password');

    await page.click('text=Rendez-vous');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '10-admin-rdv-list');

    // Navigation semaine (bouton suivant)
    const nextBtn = page.locator('button:has-text("›"), button:has-text("Suivant"), button[aria-label*="suivant"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '11-admin-rdv-next-week');
      const prevBtn = page.locator('button:has-text("‹"), button:has-text("Précédent")').first();
      if (await prevBtn.isVisible()) { await prevBtn.click(); await page.waitForTimeout(300); }
    }

    // Ouvrir modal de création RDV
    const newRdvBtn = page.locator('button:has-text("Nouveau"), button:has-text("Ajouter"), button:has-text("Rendez-vous")').first();
    if (await newRdvBtn.isVisible()) {
      await newRdvBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '12-admin-rdv-form');

      // Escape pour fermer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Export .ics
    const exportBtn = page.locator('button:has-text("Export"), button:has-text(".ics")').first();
    if (await exportBtn.isVisible()) {
      console.log('Export .ics button found');
      await shot(page, '13-admin-rdv-export-visible');
    }

    // Abonnement auto
    const subscribeBtn = page.locator('button:has-text("Abonnement"), button:has-text("abonnement")').first();
    if (await subscribeBtn.isVisible()) {
      await subscribeBtn.click();
      await page.waitForTimeout(800);
      await shot(page, '14-admin-rdv-subscription-modal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('Admin — Séances', async ({ page }) => {
    await login(page, 'admin', 'admin_password');

    await page.click('text=Séances');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '15-admin-seances');
  });

  test('Admin — Administration : utilisateurs + logs CNIL', async ({ page }) => {
    await login(page, 'admin', 'admin_password');

    await page.click('text=Administration');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '16-admin-settings-users');

    // Créer un utilisateur test
    const usernameField = page.locator('input[placeholder*="nom d\'utilisateur"], input[placeholder*="Identifiant"]').first();
    if (await usernameField.isVisible()) {
      await usernameField.fill('test_audit_user');
      const nameField = page.locator('input[placeholder*="Nom complet"], input[placeholder*="Nom"]').first();
      if (await nameField.isVisible()) await nameField.fill('User Test Audit');
      const passField = page.locator('input[placeholder*="Mot de passe"]').first();
      if (await passField.isVisible()) await passField.fill('testpass123');
      await shot(page, '17-admin-settings-create-user-form');
    }

    // Logs CNIL
    const logsSection = page.locator('text=Journal, text=Activité, text=CNIL').first();
    if (await logsSection.isVisible()) {
      await shot(page, '18-admin-settings-logs');
    }
  });
});

// ── SECRÉTAIRE ─────────────────────────────────────────────────────────────────

test.describe('SECRÉTAIRE — audit complet', () => {
  test('Login secrétaire', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'secretaire');
    await page.fill('input[type="password"]', 'secretaire_password');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await shot(page, '20-secretaire-dashboard');

    await expect(page.locator('body')).not.toContainText('Identifiant ou mot de passe incorrect');
  });

  test('Secrétaire — Dashboard', async ({ page }) => {
    await login(page, 'secretaire', 'secretaire_password');
    await shot(page, '21-secretaire-dashboard-full');
  });

  test('Secrétaire — Patients', async ({ page }) => {
    await login(page, 'secretaire', 'secretaire_password');
    await page.click('text=Patients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '22-secretaire-patients');

    // Recherche
    const searchInput = page.locator('input[placeholder*="echerche"], input[placeholder*="Recherche"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Dupont');
      await page.waitForTimeout(600);
      await shot(page, '23-secretaire-patients-search');
      await searchInput.fill('');
    }
  });

  test('Secrétaire — Rendez-vous', async ({ page }) => {
    await login(page, 'secretaire', 'secretaire_password');
    await page.click('text=Rendez-vous');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '24-secretaire-rdv');
  });

  test('Secrétaire — Séances (notes masquées)', async ({ page }) => {
    await login(page, 'secretaire', 'secretaire_password');
    await page.click('text=Séances');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '25-secretaire-seances');

    // Vérifier que les notes sont masquées (CNIL)
    const body = await page.textContent('body');
    if (body && body.includes('[Confidentiel')) {
      console.log('✓ Notes CNIL masquées pour secrétaire');
    }
  });

  test('Secrétaire — Pas de Paramètres dans sidebar', async ({ page }) => {
    await login(page, 'secretaire', 'secretaire_password');
    const settingsLink = page.locator('text=Paramètres');
    const isVisible = await settingsLink.isVisible();
    console.log(`Paramètres visible pour secrétaire: ${isVisible}`);
    await shot(page, '26-secretaire-sidebar');
  });
});

// ── PRATICIEN ──────────────────────────────────────────────────────────────────

test.describe('PRATICIEN — audit complet', () => {
  test('Login praticien', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'mabrouk');
    await page.fill('input[type="password"]', 'praticien_password');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await shot(page, '30-praticien-dashboard');

    await expect(page.locator('body')).not.toContainText('Identifiant ou mot de passe incorrect');
  });

  test('Praticien — Dashboard', async ({ page }) => {
    await login(page, 'mabrouk', 'praticien_password');
    await shot(page, '31-praticien-dashboard-full');
  });

  test('Praticien — Patients', async ({ page }) => {
    await login(page, 'mabrouk', 'praticien_password');
    await page.click('text=Patients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '32-praticien-patients');
  });

  test('Praticien — Rendez-vous (filtrés par praticien)', async ({ page }) => {
    await login(page, 'mabrouk', 'praticien_password');
    await page.click('text=Rendez-vous');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '33-praticien-rdv');
  });

  test('Praticien — Séances : création', async ({ page }) => {
    await login(page, 'mabrouk', 'praticien_password');
    await page.click('text=Séances');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await shot(page, '34-praticien-seances');

    // Essayer d'ajouter une séance
    const addBtn = page.locator('button:has-text("Nouvelle"), button:has-text("Ajouter"), button:has-text("Nouvelle séance")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '35-praticien-seance-form');
      await page.keyboard.press('Escape');
    }
  });

  test('Praticien — Abonnement calendrier (flux iCal)', async ({ page }) => {
    await login(page, 'mabrouk', 'praticien_password');
    await page.click('text=Rendez-vous');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const subscribeBtn = page.locator('button:has-text("Abonnement"), button:has-text("abonnement")').first();
    if (await subscribeBtn.isVisible()) {
      await subscribeBtn.click();
      await page.waitForTimeout(1000);
      await shot(page, '36-praticien-calendar-subscription');

      // Vérifier que l'URL est dans la modal
      const urlText = await page.locator('input[readonly], code, [class*="url"]').first().textContent();
      console.log(`Calendar URL visible: ${urlText ? 'YES (' + urlText.substring(0, 60) + '...)' : 'NO'}`);
      await page.keyboard.press('Escape');
    }
  });
});

// ── PATIENT ────────────────────────────────────────────────────────────────────

test.describe('PATIENT — audit complet', () => {
  test('Login patient', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'patient1');
    await page.fill('input[type="password"]', 'patient_password');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await shot(page, '40-patient-dashboard');
  });

  test('Patient — vérifier accès limité', async ({ page }) => {
    await login(page, 'patient1', 'patient_password');
    await shot(page, '41-patient-view-full');

    // Vérifier que le patient ne voit pas les paramètres ou les fonctions admin
    const settingsLink = page.locator('text=Paramètres').first();
    const isSettingsVisible = await settingsLink.isVisible();
    console.log(`Paramètres visible pour patient: ${isSettingsVisible}`);
  });
});

// ── MAUVAISES CREDENTIALS ──────────────────────────────────────────────────────

test.describe('Sécurité — mauvais credentials', () => {
  test('Mauvais mot de passe', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'wrong_password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await shot(page, '50-login-bad-password');

    // Doit rester sur la page de login avec une erreur
    const errorMsg = page.getByText(/incorrect|invalide|erreur/i).first();
    console.log(`Error message visible: ${await errorMsg.isVisible()}`);
  });

  test('Utilisateur inexistant', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'utilisateur_inconnu_xyz');
    await page.fill('input[type="password"]', 'anything');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await shot(page, '51-login-unknown-user');
  });
});
