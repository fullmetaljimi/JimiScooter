// Test script per car_watcher - esegue un singolo scan senza scheduler
const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Agente HTTPS che ignora i certificati SSL non validi
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Path per salvare gli annunci già visti
const SEEN_CARS_FILE = path.join(__dirname, '..', 'data', 'seen_cars.json');
const EXCEL_REPORT_PATH = path.join(__dirname, '..', 'data', 'report_auto.xlsx');

// Array di URL da ispezionare - configurabile
const URLS = [
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Pandina&_sfm_prezzo=8400+34060'
];

// Storage per i dati delle auto
let carsDatabase = [];
let processedUrls = new Set();
let seenCarsUrls = new Set();

// Importa le funzioni necessarie dal car_watcher
async function runTest() {
  console.log('🧪 === TEST CAR WATCHER ===\n');
  
  // Carica seen cars
  try {
    if (fs.existsSync(SEEN_CARS_FILE)) {
      const data = fs.readFileSync(SEEN_CARS_FILE, 'utf-8');
      const seenData = JSON.parse(data);
      seenCarsUrls = new Set(seenData.urls || []);
      console.log(`📂 Caricati ${seenCarsUrls.size} annunci già visti\n`);
    }
  } catch (e) {
    console.log('📂 Nessun archivio precedente\n');
  }
  
  // Simula la scansione - solo conteggio
  console.log(`🔍 Scanning URL: ${URLS[0]}\n`);
  
  // Test invio Telegram manuale
  await testTelegramSend();
  
  console.log('\n✅ Test completato!');
  process.exit(0);
}

async function testTelegramSend() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const token = config.telegram?.botToken;
    const chatId = config.telegram?.chatId;
    
    console.log(`📍 ChatID destinazione: ${chatId}`);
    console.log(`📤 Invio messaggio di test...\n`);
    
    const message = `🧪 <b>Test Car Watcher</b>\n\n` +
                   `✨ Questo è un messaggio di test\n` +
                   `📊 Se ricevi questo, la configurazione funziona!\n`;
    
    const msgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(msgUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    
    console.log(`✅ Messaggio inviato! ID: ${response.data.result.message_id}`);
    console.log(`👤 Destinatario: ${response.data.result.chat.first_name} (@${response.data.result.chat.username})`);
    
    // Test invio file se esiste
    if (fs.existsSync(EXCEL_REPORT_PATH)) {
      console.log(`\n📎 Invio file Excel...`);
      
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', fs.createReadStream(EXCEL_REPORT_PATH));
      formData.append('caption', `📋 Test Report Auto`);
      
      const docUrl = `https://api.telegram.org/bot${token}/sendDocument`;
      const docResponse = await axios.post(docUrl, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      console.log(`✅ File inviato! ID: ${docResponse.data.result.message_id}`);
    } else {
      console.log(`\n⚠️  File Excel non trovato, skip invio file`);
    }
    
  } catch (error) {
    console.error(`❌ Errore: ${error.message}`);
    if (error.response) {
      console.error(`   Dettagli: ${JSON.stringify(error.response.data)}`);
    }
  }
}

runTest();
