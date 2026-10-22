// Point state at a throwaway file before any module reads PANTRY_STATE, so tests never touch the demo.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const tmpState = () => join(mkdtempSync(join(tmpdir(), 'pantry-test-')), 'state.json');
process.env.PANTRY_STATE ??= tmpState();
