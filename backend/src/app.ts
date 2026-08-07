import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import patientRoutes from './routes/patient.routes';
import appointmentRoutes from './routes/appointment.routes';
import sessionRoutes from './routes/session.routes';
import usersRoutes from './routes/users.routes';
import suiviRoutes from './routes/suivi.routes';
import { startReminderCron } from './services/reminder.service';

const app = express();
const isProd = env.NODE_ENV === 'production';

// Railway / Render terminent le TLS au niveau du proxy — obligatoire pour les cookies secure
if (isProd) app.set('trust proxy', 1);

// CORS — uniquement nécessaire en développement (en prod, même origine)
if (!isProd) {
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    })
  );
}

// Parseurs de requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session store — PostgreSQL en production, mémoire en développement
const PgSession = connectPgSimple(session);
const sessionStore = isProd && env.DB_URL
  ? new PgSession({
      pool: new Pool({ connectionString: env.DB_URL }),
      tableName: 'session',
      createTableIfMissing: true,
    })
  : undefined;

// Configuration de la session (sécurisée selon recommandations CNIL)
app.use(
  session({
    store: sessionStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      httpOnly: true,
      secure: isProd,       // HTTPS obligatoire en production
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 jour
    },
  })
);

// Déclaration des routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/suivis', suiviRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Le serveur backend est opérationnel.' });
});

// En production : servir le frontend React (build statique)
if (isProd) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // Catch-all SPA — toutes les routes non-API renvoient index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Middleware de gestion des erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur Express non gérée:', err);
  return res.status(500).json({
    error: 'Une erreur interne est survenue sur le serveur.',
  });
});

// Démarrer le cron des rappels J-1
startReminderCron();

export default app;
