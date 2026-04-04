// Test script - Genera un Excel di test per car_watcher e lo invia via Telegram
const axios = require('axios');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Agente HTTPS che ignora i certificati SSL non validi
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const EXCEL_REPORT_PATH = path.join(__dirname, '..', 'data', 'test_report_auto.xlsx');

// Dati di test - auto simulate (ridotte per test veloci)
const MOCK_CARS = [
  {
    titolo: 'Fiat Panda 1.2 Easy',
    anno: 2024,
    km: 5000,
    prezzo: 14500,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-esempio-1',
    sourceUrl: 'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda',
    immagineUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=200&h=150&fit=crop',
    isNew: true
  },
  {
    titolo: 'Fiat Panda Cross 4x4',
    anno: 2023,
    km: 15000,
    prezzo: 16800,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-cross-esempio-2',
    sourceUrl: 'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda%20Cross',
    immagineUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&h=150&fit=crop',
    isNew: true
  },
  {
    titolo: 'Fiat Pandina Hybrid',
    anno: 2025,
    km: 0,
    prezzo: 17900,
    url: 'https://spaziogenova.it/veicoli/fiat-pandina-esempio-4',
    sourceUrl: 'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Pandina',
    immagineUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=150&fit=crop',
    isNew: true
  }
];

/**
 * Estrae il nome del modello dall'URL di ricerca
 */
function extractModelNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const modelo = urlObj.searchParams.get('_sfm_modello');
    if (modelo) {
      return decodeURIComponent(modelo).replace(/\+/g, ' ');
    }
    return 'Auto';
  } catch (error) {
    return 'Auto';
  }
}

/**
 * Scarica un'immagine, la ottimizza e la salva localmente
 */
async function downloadImage(imageUrl, outputPath) {
  try {
    console.log(`    📥 Download: ${imageUrl.substring(0, 60)}...`);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent,
      timeout: 15000
    });
    
    // Salva sempre come JPEG per compatibilità mobile
    const buffer = Buffer.from(response.data);
    
    // Cambia l'estensione in .jpg se necessario
    const jpgPath = outputPath.replace(/\.(png|webp|jpeg)$/i, '.jpg');
    
    fs.writeFileSync(jpgPath, buffer);
    console.log(`    ✅ Salvata come JPEG`);
    return jpgPath;
  } catch (error) {
    console.error(`    ⚠️  Errore download: ${error.message}`);
    return null;
  }
}

/**
 * Genera un report Excel con le immagini delle auto di test
 */
async function generateTestExcelReport(cars) {
  console.log('\n📊 === GENERAZIONE REPORT EXCEL DI TEST ===\n');
  
  if (cars.length === 0) {
    console.log('⚠️  Nessuna auto da esportare.');
    return false;
  }
  
  // Organizza le auto per URL di origine
  const carsBySourceUrl = new Map();
  cars.forEach(car => {
    if (!carsBySourceUrl.has(car.sourceUrl)) {
      carsBySourceUrl.set(car.sourceUrl, []);
    }
    carsBySourceUrl.get(car.sourceUrl).push(car);
  });
  
  console.log(`📁 Creazione fogli separati per ${carsBySourceUrl.size} ricerche...`);

  // Crea il workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Car Watcher - Test';
  workbook.created = new Date();
  
  // Crea la cartella per le immagini temporanee
  const tempImageDir = path.join(__dirname, '..', 'data', 'temp_test_images');
  if (!fs.existsSync(tempImageDir)) {
    fs.mkdirSync(tempImageDir, { recursive: true });
  }
  
  let totalImages = 0;
  
  // Per ogni URL di ricerca, crea un foglio separato
  for (const [sourceUrl, carsInSheet] of carsBySourceUrl.entries()) {
    const modelName = extractModelNameFromUrl(sourceUrl);
    console.log(`\n📄 Creazione foglio "${modelName}" con ${carsInSheet.length} auto...`);
    
    // Ordina le auto di questo foglio
    const sortedCars = [...carsInSheet].sort((a, b) => {
      if (a.anno !== null && b.anno !== null) {
        if (b.anno !== a.anno) return b.anno - a.anno;
      } else if (a.anno !== null) {
        return -1;
      } else if (b.anno !== null) {
        return 1;
      }
      
      if (a.km !== null && b.km !== null) {
        return a.km - b.km;
      } else if (a.km !== null) {
        return -1;
      } else if (b.km !== null) {
        return 1;
      }
      
      return 0;
    });
    
    // Crea il worksheet con il nome del modello
    const worksheet = workbook.addWorksheet(modelName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });
    
    // Definisci le colonne
    worksheet.columns = [
      { header: 'Foto', key: 'foto', width: 20 },
      { header: 'Nuovo', key: 'nuovo', width: 12 },
      { header: 'Titolo', key: 'titolo', width: 40 },
      { header: 'Anno', key: 'anno', width: 10 },
      { header: 'Km', key: 'km', width: 15 },
      { header: 'Prezzo (€)', key: 'prezzo', width: 15 },
      { header: 'Link', key: 'link', width: 50 }
    ];
    
    // Stile dell'intestazione
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Aggiungi i dati
    for (let i = 0; i < sortedCars.length; i++) {
      const car = sortedCars[i];
      const rowNumber = i + 2;
      
      console.log(`  📝 Riga ${rowNumber}: ${car.titolo}`);
      
      // Aggiungi la riga di dati
      const row = worksheet.addRow({
        nuovo: car.isNew ? '✨ NUOVO' : '',
        titolo: car.titolo,
        anno: car.anno !== null ? car.anno : 'N/A',
        km: car.km !== null ? car.km.toLocaleString('it-IT') : 'N/A',
        prezzo: car.prezzo !== null ? car.prezzo.toLocaleString('it-IT') : 'N/A',
        link: car.url
      });
      
      row.height = 100;
      row.alignment = { vertical: 'middle', wrapText: true };
      
      // Evidenzia le auto nuove
      if (car.isNew) {
        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD4EDDA' }
          };
          cell.font = { bold: true };
        });
        
        worksheet.getCell(`B${rowNumber}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF28A745' }
        };
        worksheet.getCell(`B${rowNumber}`).font = { 
          bold: true, 
          color: { argb: 'FFFFFFFF' },
          size: 11
        };
        worksheet.getCell(`B${rowNumber}`).alignment = { 
          vertical: 'middle', 
          horizontal: 'center' 
        };
      }
      
      // Link cliccabile
      worksheet.getCell(`G${rowNumber}`).value = {
        text: 'Apri annuncio',
        hyperlink: car.url
      };
      worksheet.getCell(`G${rowNumber}`).font = { color: { argb: 'FF0000FF' }, underline: true };
      
      // Scarica e aggiungi immagine
      if (car.immagineUrl) {
        const imagePath = path.join(tempImageDir, `${modelName}_${i}.jpg`);
        
        totalImages++;
        console.log(`  📷 Immagine ${totalImages}/${cars.length}:`);
        const downloadedPath = await downloadImage(car.immagineUrl, imagePath);
        
        if (downloadedPath && fs.existsSync(downloadedPath)) {
          try {
            const imageId = workbook.addImage({
              filename: downloadedPath,
              extension: 'jpeg'
            });
            
            // Dimensioni ottimizzate per mobile Excel
            worksheet.addImage(imageId, {
              tl: { col: 0, row: rowNumber - 1 },
              ext: { width: 120, height: 80 },
              editAs: 'oneCell' // Importante per Excel mobile
            });
            console.log(`    ✅ Immagine aggiunta all'Excel`);
          } catch (error) {
            console.error(`    ⚠️  Errore inserimento immagine: ${error.message}`);
          }
        }
        
        // Pausa tra immagini
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Bordi
    const borderStyle = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });
    });
    
    console.log(`✅ Foglio "${modelName}" completato (${sortedCars.length} auto)`);
  }
  
  // Salva il file Excel
  await workbook.xlsx.writeFile(EXCEL_REPORT_PATH);
  
  // Pulisci le immagini temporanee
  try {
    const files = fs.readdirSync(tempImageDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempImageDir, file));
    }
    fs.rmdirSync(tempImageDir);
    console.log('\n🧹 Immagini temporanee rimosse');
  } catch (error) {
    console.error('⚠️  Errore pulizia immagini temporanee:', error.message);
  }
  
  console.log(`\n✅ Report Excel di test generato con successo!`);
  console.log(`📁 Percorso: ${EXCEL_REPORT_PATH}`);
  console.log(`📊 Totale fogli: ${carsBySourceUrl.size}`);
  console.log(`📊 Totale auto: ${cars.length}`);
  console.log(`📷 Totale immagini: ${totalImages}\n`);
  
  return true;
}

/**
 * Invia il file Excel via Telegram
 */
async function sendExcelToTelegram(newCarsCount) {
  try {
    // Carica configurazione Telegram
    const configPath = path.join(__dirname, '..', 'config', 'config.json');
    if (!fs.existsSync(configPath)) {
      console.log('⚠️  Configurazione Telegram non trovata, skip invio');
      return false;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const token = config.telegram?.botToken;
    const chatId = config.telegram?.chatId;
    
    if (!token || !chatId) {
      console.log('⚠️  Token o Chat ID Telegram non configurati, skip invio');
      return false;
    }
    
    console.log('\n📤 === INVIO TELEGRAM ===\n');
    console.log(`📍 Chat ID: ${chatId}`);
    console.log(`📊 Auto da notificare: ${newCarsCount}`);
    
    // Prepara il messaggio
    const message = `🧪 <b>Test - Nuove Auto Trovate!</b>\n\n` +
                   `✨ <b>${newCarsCount}</b> ${newCarsCount === 1 ? 'nuova auto' : 'nuove auto'} disponibili\n` +
                   `📊 Report Excel allegato con tutti i dettagli\n\n` +
                   `🔍 Ordinate per anno più recente e km minori\n\n` +
                   `<i>⚠️ Questo è un messaggio di TEST del sistema Car Watcher</i>`;
    
    // Invia il messaggio
    console.log('📨 Invio messaggio di testo...');
    const msgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const msgResponse = await axios.post(msgUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    console.log(`✅ Messaggio inviato! (ID: ${msgResponse.data.result.message_id})`);
    
    // Verifica che il file Excel esista
    if (!fs.existsSync(EXCEL_REPORT_PATH)) {
      console.error('❌ File Excel non trovato, impossibile inviare');
      return false;
    }
    
    // Invia il file Excel
    console.log('📎 Invio file Excel...');
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', fs.createReadStream(EXCEL_REPORT_PATH));
    formData.append('caption', `📋 Report Auto TEST - ${new Date().toLocaleDateString('it-IT')}`);
    
    const docUrl = `https://api.telegram.org/bot${token}/sendDocument`;
    const docResponse = await axios.post(docUrl, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log(`✅ File Excel inviato! (ID: ${docResponse.data.result.message_id})`);
    
    console.log('\n✅ Report inviato su Telegram con successo!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Errore nell\'invio Telegram:', error.message);
    if (error.response) {
      console.error('Dettagli errore:', error.response.data);
    }
    return false;
  }
}

/**
 * Esegue il test completo
 */
async function runTest() {
  console.log('\n🧪 ======================================');
  console.log('🚗 TEST EXCEL + TELEGRAM - CAR WATCHER');
  console.log('======================================\n');
  
  console.log(`📊 Auto di test da processare: ${MOCK_CARS.length}`);
  const newCars = MOCK_CARS.filter(car => car.isNew);
  console.log(`✨ Auto marcate come "nuove": ${newCars.length}\n`);
  
  try {
    // Step 1: Genera il report Excel
    console.log('📝 STEP 1: Generazione Excel...\n');
    const excelGenerated = await generateTestExcelReport(MOCK_CARS);
    
    if (!excelGenerated) {
      console.error('❌ Errore nella generazione dell\'Excel');
      process.exit(1);
    }
    
    // Step 2: Invia via Telegram
    console.log('📨 STEP 2: Invio via Telegram...\n');
    const telegramSent = await sendExcelToTelegram(newCars.length);
    
    if (!telegramSent) {
      console.error('\n⚠️  Excel generato ma non inviato via Telegram');
      console.log(`📁 Puoi trovare il file qui: ${EXCEL_REPORT_PATH}`);
      process.exit(0);
    }
    
    // Riepilogo finale
    console.log('======================================');
    console.log('✅ TEST COMPLETATO CON SUCCESSO!');
    console.log('======================================');
    console.log(`📊 Excel generato: ${EXCEL_REPORT_PATH}`);
    console.log(`📤 Messaggio e file inviati su Telegram`);
    console.log(`🚗 Auto totali: ${MOCK_CARS.length}`);
    console.log(`✨ Auto nuove: ${newCars.length}\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Esegui il test
runTest();
