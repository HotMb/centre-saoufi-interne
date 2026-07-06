import { test, expect } from '@playwright/test';

test('Test de connexion Administrateur', async ({ page }) => {
  // Navigation vers l'application frontend
  await page.goto('http://localhost:5173');

  // Saisie des identifiants (Assurez-vous que l'email 'admin@centresaoufi.ma' et mot de passe 'admin123' existent dans votre seed.ts)
  await page.fill('input[type="email"]', 'admin@centresaoufi.ma');
  await page.fill('input[type="password"]', 'admin123');

  // Clic sur le bouton de connexion
  await page.click('button[type="submit"]');

  // Vérifier qu'on est bien connecté en vérifiant l'apparition du Dashboard
  await expect(page.locator('h2:has-text("Tableau de bord")')).toBeVisible({ timeout: 10000 });
});
