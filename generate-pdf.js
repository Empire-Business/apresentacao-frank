#!/usr/bin/env node
/**
 * Script para gerar PDF da apresentação Empire
 * Usa Chrome/Chromium headless para renderização fiel
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9999;
const HOST = 'localhost';
const OUTPUT_PDF = 'Empire-Apresentacao.pdf';

// Criar servidor HTTP simples para servir arquivos estáticos
const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/print.html' : req.url;
  const filePath = path.join(__dirname, decodeURIComponent(url));
  
  // Security: only serve files within the project directory
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.end(data);
  });
});

async function generatePDF() {
  console.log('🚀 Iniciando servidor local...');
  
  return new Promise((resolve, reject) => {
    server.listen(PORT, HOST, async () => {
      console.log(`✅ Servidor rodando em http://${HOST}:${PORT}`);
      console.log('📄 Gerando PDF, aguarde...\n');
      
      const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      const outputPath = path.join(__dirname, OUTPUT_PDF);
      
      // Usar --virtual-time-budget para aguardar recursos carregarem
      const args = [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=15000',
        `--window-size=1920,1080`,
        `--print-to-pdf-no-header`,
        `--print-to-pdf=${outputPath}`,
        `http://${HOST}:${PORT}/print.html`
      ];
      
      console.log('🖨️  Renderizando slides...');
      
      const chrome = spawn(chromePath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      chrome.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      chrome.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      chrome.on('close', (code) => {
        server.close();
        
        if (code !== 0 && !fs.existsSync(outputPath)) {
          console.error('❌ Chrome saiu com erro:', code);
          console.error('stderr:', stderr);
          reject(new Error(`Chrome exit code: ${code}`));
          return;
        }
        
        try {
          const stats = fs.statSync(outputPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          
          console.log('\n✅ PDF gerado com sucesso!');
          console.log(`📁 Arquivo: ${OUTPUT_PDF}`);
          console.log(`📊 Tamanho: ${sizeMB} MB`);
          console.log(`📑 Slides: 37 páginas`);
          console.log(`📐 Formato: 1920x1080 (Full HD)`);
          
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      
      // Timeout de segurança
      setTimeout(() => {
        chrome.kill();
        server.close();
        reject(new Error('Timeout ao gerar PDF'));
      }, 60000);
    });
  });
}

// Executar
generatePDF()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  });
