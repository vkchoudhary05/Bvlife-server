import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
// Support both `npm run dev` from /backend and workspace commands from the
// repository root. Existing process environment variables always take priority.
const environmentFiles = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), 'backend/.env'),
];
for (const environmentFile of [...new Set(environmentFiles)]) {
    if (!fs.existsSync(environmentFile))
        continue;
    const values = dotenv.parse(fs.readFileSync(environmentFile));
    for (const [key, value] of Object.entries(values)) {
        // A host can expose MSG91_AUTH_KEY as an empty variable. dotenv's normal
        // `override: false` then refuses the valid .env value, making OTP token
        // verification fail even though the key has been configured. Preserve any
        // real process-level secret, but fill missing or blank values from .env.
        if (!process.env[key]?.trim()) {
            process.env[key] = value;
        }
    }
}
