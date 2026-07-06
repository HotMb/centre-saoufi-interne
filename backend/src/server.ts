import app from './app';
import { env } from './config/env';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  Centre Saoufi - Serveur Backend démarré`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Environnement: ${env.NODE_ENV}`);
  console.log(`=========================================`);
});