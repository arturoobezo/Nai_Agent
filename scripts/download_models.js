const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const baseModelsDir = path.join(appData, 'NaiAgent', 'models');

const dirs = {
  diffusion: path.join(baseModelsDir, 'diffusion'),
  clip: path.join(baseModelsDir, 'clip'),
  vae: path.join(baseModelsDir, 'vae'),
};

Object.values(dirs).forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const statusFilePath = path.join(baseModelsDir, 'download_status.json');

function updateStatus(modelId, progress) {
  let cur = {};
  try {
    if (fs.existsSync(statusFilePath)) {
      cur = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
    }
  } catch (e) {}
  cur[modelId] = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(statusFilePath, JSON.stringify(cur, null, 2), 'utf8');
  } catch (e) {}
}

async function detectHardware() {
  const totalRamGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  let gpuName = 'GPU Integrada / Genérica';
  let vramGB = 4;

  try {
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
        const line = stdout.trim().split('\n')[0];
        if (line) {
          const parts = line.split(',');
          gpuName = parts[0]?.trim() || gpuName;
          const mb = parseInt(parts[1]?.trim() || '4096', 10);
          vramGB = Math.round(mb / 1024);
        }
      } catch (eNvidia) {
        const { stdout: wmicOut } = await execAsync('wmic path win32_VideoController get name,adapterram');
        const lines = wmicOut.trim().split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const firstGpu = lines[1].split(/\s{2,}/);
          if (firstGpu.length >= 2) {
            const bytes = parseInt(firstGpu[0] || '0', 10);
            gpuName = firstGpu[1] || gpuName;
            if (bytes > 0) vramGB = Math.round(bytes / (1024 * 1024 * 1024));
          }
        }
      }
    }
  } catch (e) {}

  return { gpuName, vramGB, totalRamGB };
}

function downloadFileWithMirrors(mirrors, destPath, modelInfo) {
  return new Promise(async (resolve, reject) => {
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      if (stat.size > 10000000) {
        console.log(`[INSTALADO] ${modelInfo.name} ya está en disco (${(stat.size / (1024*1024*1024)).toFixed(2)} GB).`);
        updateStatus(modelInfo.id, { status: 'completed', percent: 100, bytesDownloaded: stat.size, totalBytes: stat.size });
        return resolve();
      }
    }

    const tempPath = destPath + '.tmp';
    let downloadedBytes = 0;
    if (fs.existsSync(tempPath)) {
      downloadedBytes = fs.statSync(tempPath).size;
    }

    for (let mIdx = 0; mIdx < mirrors.length; mIdx++) {
      const mirrorUrl = mirrors[mIdx];
      console.log(`[DESCARGANDO] ${modelInfo.name} (Mirror ${mIdx + 1}/${mirrors.length}): ${mirrorUrl}`);

      try {
        await new Promise((resMirror, rejMirror) => {
          function makeRequest(currentUrl, redirects = 0) {
            if (redirects > 10) return rejMirror(new Error('Demasiadas redirecciones HTTP'));

            const parsedUrl = new URL(currentUrl);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            const headers = { 'User-Agent': 'NaiAgent-HardwareInstaller/1.0' };
            if (downloadedBytes > 0) {
              headers['Range'] = `bytes=${downloadedBytes}-`;
            }

            const req = client.get(currentUrl, { headers }, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return makeRequest(res.headers.location, redirects + 1);
              }

              if (res.statusCode !== 200 && res.statusCode !== 206) {
                return rejMirror(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
              }

              const totalBytes = parseInt(res.headers['content-length'] || modelInfo.expectedSize, 10) + (res.statusCode === 206 ? downloadedBytes : 0);
              const fileStream = fs.createWriteStream(tempPath, { flags: downloadedBytes > 0 && res.statusCode === 206 ? 'a' : 'w' });
              let lastLogged = Date.now();

              res.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                fileStream.write(chunk);

                const now = Date.now();
                if (now - lastLogged > 1000) {
                  lastLogged = now;
                  const pct = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
                  const dlMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
                  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
                  console.log(`[PROGRESO] ${modelInfo.name}: ${pct}% (${dlMB} MB / ${totalMB} MB)`);
                  updateStatus(modelInfo.id, {
                    status: 'downloading',
                    percent: pct,
                    bytesDownloaded: downloadedBytes,
                    totalBytes,
                  });
                }
              });

              res.on('end', () => {
                fileStream.end();
                try {
                  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                  fs.renameSync(tempPath, destPath);
                  console.log(`[COMPLETADO] ${modelInfo.name} instalado con éxito.`);
                  updateStatus(modelInfo.id, {
                    status: 'completed',
                    percent: 100,
                    bytesDownloaded: downloadedBytes,
                    totalBytes,
                  });
                  resMirror();
                } catch (err) {
                  rejMirror(err);
                }
              });

              res.on('error', (err) => {
                fileStream.end();
                rejMirror(err);
              });
            });

            req.on('error', (err) => {
              rejMirror(err);
            });
          }

          makeRequest(mirrorUrl);
        });

        // If completed cleanly, resolve and exit mirror loop
        return resolve();
      } catch (errMirror) {
        console.warn(`[MIRROR FALLIDO] ${mirrorUrl}: ${errMirror.message}. Intentando siguiente fuente...`);
      }
    }

    reject(new Error(`Todos los mirrors fallaron para ${modelInfo.name}`));
  });
}

async function main() {
  const hw = await detectHardware();
  console.log('=====================================================');
  console.log('  INSTALADOR NATIVO AISLADO DE NAI AGENT');
  console.log(`  Hardware Detectado: ${hw.gpuName} | ${hw.vramGB} GB VRAM | ${hw.totalRamGB} GB RAM`);
  console.log(`  Directorio de Modelos: ${baseModelsDir}`);
  console.log('=====================================================');

  // Select quantization by hardware capacity
  let kreaFilename = hw.totalRamGB >= 32 ? 'krea2_turbo-Q5_K_M.gguf' : 'krea2_turbo-Q4_K_M.gguf';
  let kreaMirrors = [
    `https://huggingface.co/vantagewithai/Krea-2-Turbo-GGUF/resolve/main/${kreaFilename}`,
    `https://huggingface.co/realrebelai/KREA-2_GGUFs/resolve/main/TURBO/Krea-2-Turbo-Q4_K_M.gguf`,
  ];

  let fluxFilename = 'flux-2-klein-4b-BF16.gguf';
  let fluxMirrors = [
    'https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-BF16.gguf',
    'https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-F16.gguf',
    'https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q8_0.gguf',
  ];

  if (hw.vramGB < 6) {
    console.log('⚡ Perfil de hardware ligero detectado (<6GB VRAM). Asignando quantizaciones Q2_K / Q3_K ultra-ligeras.');
    kreaFilename = 'krea2_turbo-Q2_K.gguf';
    kreaMirrors = [
      'https://huggingface.co/vantagewithai/Krea-2-Turbo-GGUF/resolve/main/krea2_turbo-Q2_K.gguf',
      'https://huggingface.co/realrebelai/KREA-2_GGUFs/resolve/main/TURBO/Krea-2-Turbo-Q3_K_S.gguf',
    ];
    fluxFilename = 'flux-2-klein-4b-Q2_K.gguf';
    fluxMirrors = [
      'https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q2_K.gguf',
      'https://huggingface.co/unsloth/FLUX.2-klein-4B-GGUF/resolve/main/flux-2-klein-4b-Q3_K_M.gguf',
    ];
  } else if (hw.vramGB >= 12) {
    console.log('🚀 Perfil de hardware alto detectado (≥12GB VRAM). Asignando quantizaciones Q8_0 de máxima precisión.');
    kreaFilename = 'krea2_turbo-Q8_0.gguf';
    kreaMirrors = [
      'https://huggingface.co/vantagewithai/Krea-2-Turbo-GGUF/resolve/main/krea2_turbo-Q8_0.gguf',
      'https://huggingface.co/realrebelai/KREA-2_GGUFs/resolve/main/TURBO/Krea-2-Turbo-Q8_0.gguf',
    ];
  }

  const modelQueue = [
    {
      id: 'wan_2_1_vae',
      name: 'Wan 2.1 VAE Oficial (Krea 2)',
      targetPath: path.join(dirs.vae, 'wan_2.1_vae.safetensors'),
      mirrors: [
        'https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors',
      ],
      expectedSize: 253815318,
    },
    {
      id: 'flux2_vae',
      name: 'Flux 2 VAE (Flux Klein)',
      targetPath: path.join(dirs.vae, 'flux2-vae.safetensors'),
      mirrors: [
        'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors',
        'https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors',
      ],
      expectedSize: 335544320,
    },
    {
      id: 'qwen3_clip',
      name: 'Qwen 3 4B FP4 Text Encoder',
      targetPath: path.join(dirs.clip, 'qwen_3_4b_fp4_flux2.safetensors'),
      mirrors: [
        'https://huggingface.co/Comfy-Org/Qwen3-VL/resolve/main/text_encoders/qwen3vl_4b_fp8_scaled.safetensors',
      ],
      expectedSize: 2500000000,
    },
    {
      id: 'krea2_turbo',
      name: `Krea 2 Turbo (${kreaFilename})`,
      targetPath: path.join(dirs.diffusion, kreaFilename),
      mirrors: kreaMirrors,
      expectedSize: 6970000000,
    },
    {
      id: 'flux_klein',
      name: `FLUX.2 Klein 4B (${fluxFilename})`,
      targetPath: path.join(dirs.diffusion, fluxFilename),
      mirrors: fluxMirrors,
      expectedSize: 2609054720,
    },
  ];

  for (const model of modelQueue) {
    try {
      await downloadFileWithMirrors(model.mirrors, model.targetPath, model);
    } catch (err) {
      console.error(`[ERROR] Falló la descarga de ${model.name}:`, err.message);
      updateStatus(model.id, { status: 'error', error: err.message });
    }
  }

  console.log('=====================================================');
  console.log('  INSTALACIÓN DE MODELOS NATIVOS FINALIZADA CON ÉXITO');
  console.log('=====================================================');
}

main().catch(console.error);
