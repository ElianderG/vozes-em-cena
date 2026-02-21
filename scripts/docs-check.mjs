import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const readmePath = join(root, 'README.md');
const envExamplePath = join(root, '.env.example');
const scanDirs = [join(root, 'server'), join(root, 'src')];
const scanFiles = [join(root, 'vite.config.ts')];

const requiredReadmeSections = ['## Setup', '## Uso', '## Arquitetura', '## Troubleshooting'];

function unique(values) {
  return [...new Set(values)];
}

async function listCodeFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listCodeFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function getEnvVarsUsedInCode() {
  const files = [...scanFiles];
  for (const dir of scanDirs) {
    try {
      files.push(...(await listCodeFiles(dir)));
    } catch {
      // diretorio opcional
    }
  }

  const envVars = [];
  const regex = /process\.env\.([A-Z0-9_]+)/g;
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const match of content.matchAll(regex)) {
      envVars.push(match[1]);
    }
  }
  return unique(envVars);
}

function getEnvVarsFromExample(content) {
  return unique(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.split('=')[0].trim())
  );
}

async function main() {
  const [readme, envExample] = await Promise.all([
    readFile(readmePath, 'utf8'),
    readFile(envExamplePath, 'utf8'),
  ]);

  const missingSections = requiredReadmeSections.filter((section) => !readme.includes(section));
  const usedEnvVars = await getEnvVarsUsedInCode();
  const documentedEnvVars = getEnvVarsFromExample(envExample);
  const missingEnvVars = usedEnvVars.filter((envVar) => !documentedEnvVars.includes(envVar));

  if (missingSections.length > 0) {
    console.error('Faltam secoes obrigatorias no README:');
    for (const section of missingSections) console.error(`- ${section}`);
  }

  if (missingEnvVars.length > 0) {
    console.error('Variaveis usadas no codigo e ausentes no .env.example:');
    for (const envVar of missingEnvVars) console.error(`- ${envVar}`);
  }

  if (missingSections.length > 0 || missingEnvVars.length > 0) {
    process.exit(1);
  }

  console.log('docs:check OK');
}

main().catch((error) => {
  console.error('Falha em docs:check:', error.message);
  process.exit(1);
});
