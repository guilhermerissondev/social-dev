import { createDatabase } from '../client.ts';
import { runMigrations } from '../migrate.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const database = createDatabase(url, { maxConnections: 1 });
try {
  await runMigrations(database.db);
  console.log('Migrations applied');
} finally {
  await database.close();
}
