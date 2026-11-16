import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export function getCrops() {
  return readJson('crops.json');
}

export function getMandis() {
  return readJson('mandis.json');
}

export function getLocations() {
  return readJson('locations.json');
}

export function readUserStore() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      const initial = { users: {}, sessions: {}, otps: {} };
      fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return {
      users: parsed.users || {},
      sessions: parsed.sessions || {},
      otps: parsed.otps || {},
    };
  } catch {
    return { users: {}, sessions: {}, otps: {} };
  }
}

export function writeUserStore(store) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}
