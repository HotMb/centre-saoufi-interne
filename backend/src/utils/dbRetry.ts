// Réessaie une requête Prisma une fois après une courte pause si la base de données
// vient d'être réveillée (connexion froide après veille/inactivité de la machine de dev).
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isConnectionError =
      error?.code === 'P1001' || error?.code === 'P1017' ||
      /Can't reach database|Connection.*closed|ECONNREFUSED/i.test(error?.message ?? '');

    if (retries > 0 && isConnectionError) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return withDbRetry(fn, retries - 1);
    }
    throw error;
  }
}
