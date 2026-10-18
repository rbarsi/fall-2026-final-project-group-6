
import * as path from 'path';
import { promises as fs } from 'fs';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from './database.js';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    const migrator = new Migrator ({
        db, 
        provider: new FileMigrationProvider ({
            fs, path, migrationFolder: path.join(__dirname, 'migrations'),
    }),
});

const { error, results } = await migrator.migrateToLatest();

results?.forEach((it) => {
    if (it.status == 'Success') {
        console.log(`Migration "${it.migrationName}" executed successfully.`);
    } else if (it.status == 'Error') {
        console.error(`Failed to execute migration "${it.migrationName}".`);
    }
});

if (error) {
    console.error('Migration failed:');
    console.error(error);
    process.exit(1);
}

await db.destroy();
}

runMigrations();