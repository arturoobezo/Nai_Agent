const fs = require('fs');
const path = require('path');

const FORBIDDEN_STRINGS = [
  'pollinations.ai',
  'api.stability.ai',
  'api.replicate.com',
  'fal.run',
  '/v1/images/generations',
];

const SCAN_DIRS = ['electron', 'src', 'public'];
let violations = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (/\.(js|jsx|ts|tsx|html|json)$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of FORBIDDEN_STRINGS) {
        if (content.includes(pattern)) {
          console.error(`🚨 [PRIVACY VIOLATION] Found forbidden pattern "${pattern}" in file: ${fullPath}`);
          violations++;
        }
      }
    }
  }
}

console.log('🔒 Verificando estricta privacidad offline de generación de imágenes...');
for (const d of SCAN_DIRS) {
  scanDir(path.join(__dirname, '..', d));
}

if (violations > 0) {
  console.error(`\n❌ ERROR: Se detectaron ${violations} patrones de servicios externos de imágenes.`);
  console.error('La compilación ha sido ABORTADA para proteger la privacidad local del usuario.');
  process.exit(1);
} else {
  console.log('✅ Verificación completada: 100% libre de endpoints externos de generación de imágenes.\n');
}
