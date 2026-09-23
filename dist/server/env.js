import dotenv from 'dotenv';
import path from 'path';
// Support both `npm run dev` from /backend and workspace commands from the
// repository root. Existing process environment variables always take priority.
const environmentFiles = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), 'backend/.env'),
];
for (const environmentFile of [...new Set(environmentFiles)]) {
    dotenv.config({ path: environmentFile, override: false, quiet: true });
}
