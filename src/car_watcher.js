const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const https = require('https');
const cron = require('node-cron');

// Agente HTTPS che ignora i certificati SSL non validi
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Path per salvare gli annunci già visti
const SEEN_CARS_FILE = path.join(__dirname, '..', 'data', 'seen_cars.json');
const EXCEL_REPORT_PATH = path.join(__dirname, '..', 'data', 'report_auto.xlsx');

// Array di URL da ispezionare - configurabile
const URLS = [
  // Esempio: inserisci qui gli URL delle pagine con le liste di auto
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda&_sfm_prezzo=8400+34060',
  // Aggiungi altri URL qui
];

// Storage per i dati delle auto
let carsDatabase = [];
let processedUrls = new Set();
let seenCarsUrls = new Set(); // URL già visti nelle scansioni precedenti

/**
 * Carica gli annunci già visti dal file JSON
 */
function loadSeenCars() {
  try {
    if (fs.existsSync(SEEN_CARS_FILE)) {
      const data = fs.readFileSync(SEEN_CARS_FILE, 'utf-8');
      const seenData = JSON.parse(data);
      seenCarsUrls = new Set(seenData.urls || []);
      console.log(`📂 Caricati ${seenCarsUrls.size} annunci già visti dall'archivio`);
    } else {
      console.log('📂 Nessun archivio precedente trovato, prima scansione');
    }
  } catch (error) {
    console.error('⚠️  Errore nel caricamento archivio:', error.message);
    seenCarsUrls = new Set();
  }
}

/**
 * Salva gli annunci visti nel file JSON
 */
function saveSeenCars(newUrls) {
  try {
    // Aggiungi i nuovi URL a quelli già visti
    newUrls.forEach(url => seenCarsUrls.add(url));
    
    const dataToSave = {
      lastUpdate: new Date().toISOString(),
      totalCars: seenCarsUrls.size,
      urls: Array.from(seenCarsUrls)
    };
    
    fs.writeFileSync(SEEN_CARS_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    console.log(`💾 Archivio aggiornato: ${seenCarsUrls.size} annunci totali`);
  } catch (error) {
    console.error('⚠️  Errore nel salvataggio archivio:', error.message);
  }
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
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const token = config.telegram?.botToken;
    const chatId = config.telegram?.chatId;
    
    if (!token || !chatId) {
      console.log('⚠️  Token o Chat ID Telegram non configurati, skip invio');
      return;
    }
    
    console.log('\n📤 Invio report Excel via Telegram...');
    
    // Prepara il messaggio
    const message = `🚗 <b>Nuove Auto Trovate!</b>\n\n` +
                   `✨ <b>${newCarsCount}</b> ${newCarsCount === 1 ? 'nuova auto' : 'nuove auto'} disponibili\n` +
                   `📊 Report Excel allegato con tutti i dettagli\n\n` +
                   `🔍 Ordinate per anno più recente e km minori`;
    
    // Invia il messaggio
    const msgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(msgUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    
    // Invia il file Excel
    const formData = new (require('form-data'))();
    formData.append('chat_id', chatId);
    formData.append('document', fs.createReadStream(EXCEL_REPORT_PATH));
    formData.append('caption', `📋 Report Auto - ${new Date().toLocaleDateString('it-IT')}`);
    
    const docUrl = `https://api.telegram.org/bot${token}/sendDocument`;
    await axios.post(docUrl, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✅ Report inviato su Telegram con successo!');
    
  } catch (error) {
    console.error('❌ Errore nell\'invio Telegram:', error.message);
  }
}

/**
 * Rileva tutte le pagine disponibili per una lista
 * @param {string} listUrl - URL della prima pagina
 * @returns {Array<string>} - Array di URL di tutte le pagine
 */
async function detectAllPages(listUrl) {
  try {
    console.log(`🔍 Verifico se ci sono più pagine...`);
    const { data } = await axios.get(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const $ = cheerio.load(data);
    const pages = new Set();
    pages.add(listUrl); // Aggiungi sempre la prima pagina
    
    // Cerca link di paginazione che contengono sf_paged o parametri simili
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('sf_paged=') || href.includes('paged='))) {
        let fullUrl = href;
        
        // Converti URL relativo in assoluto
        if (href.startsWith('/')) {
          const baseUrl = new URL(listUrl);
          fullUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
        } else if (href.startsWith('?')) {
          const baseUrl = new URL(listUrl);
          fullUrl = `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname}${href}`;
        }
        
        // Assicurati che sia della stessa ricerca (stesso parametro base)
        const currentUrlObj = new URL(listUrl);
        const linkUrlObj = new URL(fullUrl);
        
        // Confronta i parametri principali (escluso paged)
        if (currentUrlObj.pathname === linkUrlObj.pathname) {
          pages.add(fullUrl);
        }
      }
    });
    
    const pageArray = Array.from(pages).sort();
    
    if (pageArray.length > 1) {
      console.log(`📚 Trovate ${pageArray.length} pagine totali`);
    } else {
      console.log(`📚 Una sola pagina disponibile`);
    }
    
    return pageArray;
    
  } catch (error) {
    console.error(`⚠️  Errore nel rilevamento pagine: ${error.message}`);
    return [listUrl]; // Ritorna almeno la prima pagina
  }
}

/**
 * Estrae i link agli annunci individuali dalla pagina lista
 * @param {string} listUrl - URL della pagina con la lista di auto
 * @returns {Array<string>} - Array di URL degli annunci
 */
async function extractCarLinksFromList(listUrl) {
  try {
    console.log(`🔍 Scarico la lista da: ${listUrl}`);
    const { data } = await axios.get(listUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const $ = cheerio.load(data);
    const carLinks = [];

    // Selettori specifici per spaziogenova.it
    $('a[href*="/veicoli/"]').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        // Converti URL relativo in assoluto se necessario
        if (href.startsWith('/')) {
          const baseUrl = new URL(listUrl);
          href = `${baseUrl.protocol}//${baseUrl.host}${href}`;
        }
        if (!carLinks.includes(href)) {
          carLinks.push(href);
        }
      }
    });

    console.log(`✅ Trovati ${carLinks.length} annunci nella lista`);
    return carLinks;
    
  } catch (error) {
    console.error(`❌ Errore durante l'estrazione della lista da ${listUrl}:`, error.message);
    return [];
  }
}

/**
 * Estrae i dettagli da un singolo annuncio
 * @param {string} carUrl - URL dell'annuncio
 * @returns {Object|null} - Oggetto con i dettagli dell'auto
 */
async function extractCarDetails(carUrl) {
  try {
    // Evita di processare URL già visti IN QUESTA SESSIONE
    if (processedUrls.has(carUrl)) {
      return null;
    }
    
    // Controlla se l'auto è già stata vista in scansioni precedenti
    const isNewCar = !seenCarsUrls.has(carUrl);

    console.log(`  📄 Analizzo: ${carUrl}`);
    const { data } = await axios.get(carUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const $ = cheerio.load(data);
    
    // PERSONALIZZA QUESTI SELETTORI in base al sito target
    // Selettori specifici per spaziogenova.it
    
    let anno = null;
    let km = null;
    let prezzo = null;
    let titolo = 'N/A';
    let immagineUrl = null;
    
    // Estrai il titolo (prova diverse fonti)
    titolo = $('meta[property="og:title"]').attr('content') ||
             $('.scheda_auto_titolo').first().text().trim() ||
             $('.scheda_veicolo_titolo').first().text().trim() ||
             $('h1').first().text().trim() ||
             'N/A';
    
    // Rimuovi "- 10837468 - Spazio Genova" e simili dal titolo
    titolo = titolo.replace(/\s*-\s*\d+\s*-\s*Spazio Genova\s*$/i, '').trim();
    
    // Estrai anno
    const annoText = $('.scheda_auto_anno').first().text().trim();
    if (annoText) {
      const annoMatch = annoText.match(/(\d{4})/);
      if (annoMatch) anno = parseInt(annoMatch[1]);
    }
    // Fallback: cerca nell'HTML
    if (!anno) {
      const yearMatch = data.match(/\b(20[012]\d)\b/);
      if (yearMatch) anno = parseInt(yearMatch[1]);
    }
    
    // Estrai km
    const kmText = $('.scheda_auto_chilometraggio').first().text().trim();
    if (kmText) {
      const kmMatch = kmText.match(/([\d.]+)/);
      if (kmMatch) {
        km = parseInt(kmMatch[1].replace(/\./g, ''));
      }
    }
    // Fallback: cerca nell'HTML
    if (!km) {
      const kmFallback = data.match(/(\d+)\s*km/i);
      if (kmFallback) km = parseInt(kmFallback[1]);
    }
    
    // Estrai prezzo
    const prezzoText = $('.scheda_auto_prezzo').first().text().trim();
    if (prezzoText) {
      const prezzoMatch = prezzoText.match(/([\d.]+)/);
      if (prezzoMatch) {
        // Il prezzo è nel formato "10900.0" (senza separatori di migliaia)
        const prezzoStr = prezzoMatch[1].replace('.0', ''); // Rimuovi il ".0" finale
        prezzo = parseFloat(prezzoStr);
      }
    }
    // Fallback: cerca nell'HTML
    if (!prezzo) {
      const prezzoFallback = data.match(/€\s*([\d.]+)|(\d{5,})/);
      if (prezzoFallback) {
        prezzo = parseFloat((prezzoFallback[1] || prezzoFallback[2]).replace(/\./g, ''));
      }
    }
    
    // Estrai l'URL dell'immagine principale
    // Prova diversi selettori comuni per le immagini
    const imgSelectors = [
      'meta[property="og:image"]',
      'img.main-image',
      'img.car-image',
      '.gallery img',
      'img[itemprop="image"]',
      '.product-image img'
    ];
    
    for (const selector of imgSelectors) {
      const imgElement = $(selector).first();
      if (imgElement.length > 0) {
        immagineUrl = imgElement.attr('content') || imgElement.attr('src');
        if (immagineUrl) {
          // Converti URL relativo in assoluto
          if (immagineUrl.startsWith('/')) {
            const baseUrl = new URL(carUrl);
            immagineUrl = `${baseUrl.protocol}//${baseUrl.host}${immagineUrl}`;
          }
          break;
        }
      }
    }

    // Prova anche con JSON-LD se presente (fallback)
    if (!anno || !km || !prezzo) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html());
          if (json['@type'] === 'Car' || json['@type'] === 'Product') {
            if (!anno && json.vehicleModelDate) anno = parseInt(json.vehicleModelDate);
            if (!km && json.mileageFromOdometer) km = parseInt(json.mileageFromOdometer.value);
            if (!prezzo && json.offers && json.offers.price) prezzo = parseFloat(json.offers.price);
          }
        } catch (e) {
          // Ignora errori di parsing JSON
        }
      });
    }

    // Se km è null, significa che è un'auto nuova (km 0)
    if (km === null) {
      km = 0;
    }

    processedUrls.add(carUrl);

    return {
      titolo,
      anno,
      km,
      prezzo,
      immagineUrl,
      url: carUrl,
      dataScansione: new Date().toISOString(),
      isNew: isNewCar // Flag per identificare le auto nuove
    };
    
  } catch (error) {
    console.error(`  ❌ Errore durante l'analisi di ${carUrl}:`, error.message);
    return null;
  }
}

/**
 * Processa tutti gli URL configurati
 */
async function processAllUrls() {
  console.log('\n🚗 === INIZIO SCANSIONE AUTO ===\n');
  
  // Carica gli annunci già visti
  loadSeenCars();
  
  const allCarsFound = [];
  const allCarUrls = [];

  for (const listUrl of URLS) {
    console.log(`\n📋 Processo lista: ${listUrl}`);
    
    // Rileva tutte le pagine disponibili
    const allPages = await detectAllPages(listUrl);
    
    // Estrai i link agli annunci da tutte le pagine
    const allCarLinksFromThisList = [];
    
    for (const pageUrl of allPages) {
      if (allPages.length > 1) {
        console.log(`  📄 Pagina: ${pageUrl}`);
      }
      const carLinks = await extractCarLinksFromList(pageUrl);
      allCarLinksFromThisList.push(...carLinks);
      
      // Piccola pausa tra le pagine
      if (allPages.indexOf(pageUrl) < allPages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Rimuovi duplicati
    const uniqueCarLinks = [...new Set(allCarLinksFromThisList)];
    console.log(`🔢 Totale annunci unici trovati: ${uniqueCarLinks.length}`);
    
    // Per ogni annuncio, estrai i dettagli
    for (const carUrl of uniqueCarLinks) {
      allCarUrls.push(carUrl);
      
      // Se l'auto è già stata vista, skippa (a meno che sia la prima scansione)
      if (seenCarsUrls.size > 0 && seenCarsUrls.has(carUrl)) {
        console.log(`  ⏭️  Già visto: ${carUrl.split('/').pop()}`);
        continue;
      }
      
      // Piccola pausa tra le richieste per evitare di sovraccaricare il server
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const carDetails = await extractCarDetails(carUrl);
      if (carDetails) {
        allCarsFound.push(carDetails);
      }
    }
  }

  // Filtra solo le auto realmente nuove
  const newCars = allCarsFound.filter(car => car.isNew);
  
  console.log(`\n✅ Scansione completata!`);
  console.log(`   📊 Annunci totali trovati: ${allCarUrls.length}`);
  console.log(`   🆕 Nuove auto: ${newCars.length}`);
  console.log(`   ⏭️  Già viste: ${allCarUrls.length - newCars.length}\n`);

  // Se ci sono nuove auto, aggiorna il database e notifica
  if (newCars.length > 0) {
    // Carica il database esistente se presente
    if (seenCarsUrls.size > 0) {
      // Carica le auto esistenti dal file JSON (se esiste)
      try {
        if (fs.existsSync(SEEN_CARS_FILE)) {
          const seenData = JSON.parse(fs.readFileSync(SEEN_CARS_FILE, 'utf-8'));
          // Qui potresti caricare anche i dettagli se li avessi salvati
        }
      } catch (e) {
        // Ignora errori
      }
    }
    
    // Aggiungi le nuove auto al database
    carsDatabase = [...allCarsFound];

    // Genera il report console
    generateReport();
    
    // Genera il report Excel con immagini
    await generateExcelReport();
    
    // Salva gli URL nel file di stato
    saveSeenCars(allCarUrls);
    
    // Invia notifica Telegram
    await sendExcelToTelegram(newCars.length);
    
  } else {
    console.log('ℹ️  Nessuna nuova auto trovata, nessun aggiornamento necessario.');
  }
}

/**
 * Genera un report ordinato delle auto
 * Ordine: prima le più recenti, poi quelle con meno km
 */
function generateReport() {
  console.log('\n📊 === REPORT AUTO TROVATE ===\n');

  if (carsDatabase.length === 0) {
    console.log('⚠️  Nessuna auto trovata nel database.');
    return;
  }

  // Ordina: prima per anno decrescente (più recente prima), 
  // poi per km crescente (meno km prima)
  const sortedCars = [...carsDatabase].sort((a, b) => {
    // Prima ordina per anno (decrescente)
    if (a.anno !== null && b.anno !== null) {
      if (b.anno !== a.anno) return b.anno - a.anno;
    } else if (a.anno !== null) {
      return -1; // a ha anno, b no -> a viene prima
    } else if (b.anno !== null) {
      return 1; // b ha anno, a no -> b viene prima
    }
    
    // Se l'anno è uguale (o entrambi mancanti), ordina per km (crescente)
    if (a.km !== null && b.km !== null) {
      return a.km - b.km;
    } else if (a.km !== null) {
      return -1; // a ha km, b no -> a viene prima
    } else if (b.km !== null) {
      return 1; // b ha km, a no -> b viene prima
    }
    
    return 0;
  });

  console.log(`Totale auto nel database: ${sortedCars.length}\n`);
  console.log('═'.repeat(80));
  
  sortedCars.forEach((car, index) => {
    console.log(`\n${index + 1}. ${car.titolo}`);
    console.log(`   Anno:    ${car.anno !== null ? car.anno : '❓ N/A'}`);
    console.log(`   Km:      ${car.km !== null ? car.km.toLocaleString('it-IT') + ' km' : '❓ N/A'}`);
    console.log(`   Prezzo:  ${car.prezzo !== null ? '€' + car.prezzo.toLocaleString('it-IT') : '❓ N/A'}`);
    console.log(`   Link:    ${car.url}`);
    console.log('─'.repeat(80));
  });

  console.log('\n═'.repeat(80));
  console.log('\n✨ Report completato!\n');
}

/**
 * Esporta il report in formato JSON
 */
function exportReportToJson(filename = 'car_report.json') {
  const sortedCars = [...carsDatabase].sort((a, b) => {
    if (a.anno !== null && b.anno !== null && b.anno !== a.anno) {
      return b.anno - a.anno;
    }
    if (a.km !== null && b.km !== null) {
      return a.km - b.km;
    }
    return 0;
  });

  fs.writeFileSync(filename, JSON.stringify(sortedCars, null, 2), 'utf-8');
  console.log(`💾 Report esportato in: ${filename}`);
}

/**
 * Scarica un'immagine e la salva localmente
 */
async function downloadImage(imageUrl, outputPath) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent,
      timeout: 10000
    });
    
    fs.writeFileSync(outputPath, response.data);
    return true;
  } catch (error) {
    console.error(`  ⚠️  Impossibile scaricare l'immagine: ${error.message}`);
    return false;
  }
}

/**
 * Genera un report Excel con le immagini delle auto
 */
async function generateExcelReport() {
  console.log('\n📊 === GENERAZIONE REPORT EXCEL ===\n');
  
  if (carsDatabase.length === 0) {
    console.log('⚠️  Nessuna auto da esportare.');
    return;
  }

  // Ordina i dati
  const sortedCars = [...carsDatabase].sort((a, b) => {
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

  // Crea il workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Car Watcher';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Auto Trovate', {
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
  
  // Crea la cartella per le immagini temporanee
  const tempImageDir = path.join(__dirname, '..', 'data', 'temp_images');
  if (!fs.existsSync(tempImageDir)) {
    fs.mkdirSync(tempImageDir, { recursive: true });
  }
  
  console.log('📥 Scarico le immagini e creo il file Excel...');
  
  // Aggiungi i dati
  for (let i = 0; i < sortedCars.length; i++) {
    const car = sortedCars[i];
    const rowNumber = i + 2; // +2 perché la riga 1 è l'intestazione
    
    // Aggiungi la riga di dati
    const row = worksheet.addRow({
      nuovo: car.isNew ? '✨ NUOVO' : '',
      titolo: car.titolo,
      anno: car.anno !== null ? car.anno : 'N/A',
      km: car.km !== null ? car.km.toLocaleString('it-IT') : 'N/A',
      prezzo: car.prezzo !== null ? car.prezzo.toLocaleString('it-IT') : 'N/A',
      link: car.url
    });
    
    // Imposta l'altezza della riga per contenere l'immagine
    row.height = 100;
    
    // Imposta l'allineamento
    row.alignment = { vertical: 'middle', wrapText: true };
    
    // Se è un annuncio nuovo, evidenzialo con sfondo verde chiaro
    if (car.isNew) {
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4EDDA' } // Verde chiaro
        };
        cell.font = { bold: true };
      });
      
      // Colonna "Nuovo" con sfondo verde scuro e testo bianco
      worksheet.getCell(`B${rowNumber}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF28A745' } // Verde scuro
      };
      worksheet.getCell(`B${rowNumber}`).font = { 
        bold: true, 
        color: { argb: 'FFFFFFFF' }, // Testo bianco
        size: 11
      };
      worksheet.getCell(`B${rowNumber}`).alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      };
    }
    
    // Rendi il link cliccabile
    worksheet.getCell(`G${rowNumber}`).value = {
      text: 'Apri annuncio',
      hyperlink: car.url
    };
    worksheet.getCell(`G${rowNumber}`).font = { color: { argb: 'FF0000FF' }, underline: true };
    
    // Scarica e aggiungi l'immagine se disponibile
    if (car.immagineUrl) {
      const imageExtension = car.immagineUrl.split('.').pop().split('?')[0] || 'jpg';
      const imagePath = path.join(tempImageDir, `car_${i}.${imageExtension}`);
      
      console.log(`  📷 Scarico immagine ${i + 1}/${sortedCars.length}...`);
      const success = await downloadImage(car.immagineUrl, imagePath);
      
      if (success && fs.existsSync(imagePath)) {
        try {
          const imageId = workbook.addImage({
            filename: imagePath,
            extension: imageExtension === 'jpg' ? 'jpeg' : imageExtension
          });
          
          // Aggiungi l'immagine alla cella
          worksheet.addImage(imageId, {
            tl: { col: 0, row: rowNumber - 1 }, // top-left
            ext: { width: 130, height: 90 } // dimensioni
          });
        } catch (error) {
          console.error(`  ⚠️  Errore nell'aggiungere l'immagine: ${error.message}`);
        }
      }
      
      // Piccola pausa tra i download
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Aggiungi i bordi alle celle
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
  
  // Salva il file Excel
  const excelPath = path.join(__dirname, '..', 'data', 'report_auto.xlsx');
  await workbook.xlsx.writeFile(excelPath);
  
  // Pulisci le immagini temporanee
  try {
    const files = fs.readdirSync(tempImageDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempImageDir, file));
    }
    fs.rmdirSync(tempImageDir);
  } catch (error) {
    // Ignora errori di pulizia
  }
  
  console.log(`\n✅ Report Excel generato con successo!`);
  console.log(`📁 Percorso: ${excelPath}`);
  console.log(`📊 Totale auto: ${sortedCars.length}\n`);
}

// === ESECUZIONE E SCHEDULING ===

console.log('\n🕒 === CAR WATCHER SCHEDULER ===\n');
console.log('📅 Scansioni programmate:');
console.log('   ⏰ Ore 12:00 (mezzogiorno)');
console.log('   ⏰ Ore 18:00 (sera)\n');

// Funzione wrapper per la scansione schedulata
async function runScheduledScan() {
  const now = new Date();
  console.log(`\n🔔 === SCANSIONE PROGRAMMATA AVVIATA ===`);
  console.log(`🕒 Ora: ${now.toLocaleString('it-IT')}\n`);
  
  try {
    await processAllUrls();
    console.log(`\n✅ Scansione completata alle ${new Date().toLocaleTimeString('it-IT')}`);
  } catch (error) {
    console.error('❌ Errore durante la scansione:', error.message);
  }
}

// Scansione alle 12:00 (mezzogiorno)
cron.schedule('0 12 * * *', () => {
  runScheduledScan();
}, {
  timezone: 'Europe/Rome'
});

// Scansione alle 18:00 (sera)
cron.schedule('0 18 * * *', () => {
  runScheduledScan();
}, {
  timezone: 'Europe/Rome'
});

console.log('✅ Scheduler attivato con successo!');
console.log('🛡️  Il programma resterà in esecuzione in background...');
console.log('🚫 Per terminare premi CTRL+C\n');

// Esegui una scansione immediata all'avvio (opzionale)
const SCAN_ON_STARTUP = true;

if (SCAN_ON_STARTUP) {
  console.log('🚀 Eseguo scansione iniziale all\'avvio...\n');
  runScheduledScan().then(() => {
    console.log('\n⏳ In attesa della prossima scansione programmata...');
  });
} else {
  console.log('⏳ In attesa della prossima scansione programmata...');
}
