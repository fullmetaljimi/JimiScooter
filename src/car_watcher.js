const axios = require('axios');
const cheerio = require('cheerio');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Storage } = require('@google-cloud/storage');

// Agente HTTPS che ignora i certificati SSL non validi
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Path per salvare gli annunci già visti
const SEEN_CARS_FILE = path.join(__dirname, '..', 'data', 'seen_cars.json');
const EXCEL_REPORT_PATH = path.join(__dirname, '..', 'data', 'report_auto.xlsx');
const GCS_URL_FILE = path.join(__dirname, '..', 'data', 'last_gcs_url.txt');

// Google Cloud Storage configuration
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'subito-notifier-files';
const GCS_FILE_NAME = 'report_auto.xlsx';
const storage = new Storage(); // Usa le credenziali del service account sulla VM

// Array di URL da ispezionare - configurabile
/* Commentati per test veloce:
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda&_sfm_prezzo=8400+34060',
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda%20Cross&_sfm_prezzo=8400+34060',
*/
const URLS = [
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda&_sfm_prezzo=8400+34060',
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda%20Cross&_sfm_prezzo=8400+34060',
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Pandina&_sfm_prezzo=8400+34060'
];

// Storage per i dati delle auto
let carsDatabase = [];
let carsBySourceUrl = new Map(); // Mappa: sourceUrl -> array di auto
let processedUrls = new Set();
let seenCarsUrls = new Set(); // URL già visti nelle scansioni precedenti
let seenCarsDetails = new Map(); // Dettagli completi delle auto già viste (URL -> dettagli)

/**
 * Estrae il nome del modello dall'URL di ricerca
 * @param {string} url - URL della ricerca
 * @returns {string} - Nome del modello
 */
function extractModelNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const modelo = urlObj.searchParams.get('_sfm_modello');
    if (modelo) {
      // Decodifica e pulisci il nome (es. "Panda%20Cross" -> "Panda Cross")
      return decodeURIComponent(modelo).replace(/\+/g, ' ');
    }
    return 'Auto';
  } catch (error) {
    return 'Auto';
  }
}

/**
 * Carica gli annunci già visti dal file JSON
 */
function loadSeenCars() {
  try {
    if (fs.existsSync(SEEN_CARS_FILE)) {
      const data = fs.readFileSync(SEEN_CARS_FILE, 'utf-8');
      const seenData = JSON.parse(data);
      seenCarsUrls = new Set(seenData.urls || []);
      
      // Carica anche i dettagli completi delle auto
      if (seenData.carsDetails && Array.isArray(seenData.carsDetails)) {
        seenCarsDetails = new Map(seenData.carsDetails.map(car => [car.url, car]));
        console.log(`📂 Caricati ${seenCarsUrls.size} annunci già visti dall'archivio (${seenCarsDetails.size} con dettagli)`);
      } else {
        console.log(`📂 Caricati ${seenCarsUrls.size} annunci già visti dall'archivio`);
      }
    } else {
      console.log('📂 Nessun archivio precedente trovato, prima scansione');
    }
  } catch (error) {
    console.error('⚠️  Errore nel caricamento archivio:', error.message);
    seenCarsUrls = new Set();
    seenCarsDetails = new Map();
  }
}

/**
 * Salva gli annunci visti nel file JSON
 */
function saveSeenCars(allCarsWithDetails) {
  try {
    // Aggiorna i dettagli di tutte le auto
    allCarsWithDetails.forEach(car => {
      seenCarsUrls.add(car.url);
      seenCarsDetails.set(car.url, car);
    });
    
    const dataToSave = {
      lastUpdate: new Date().toISOString(),
      totalCars: seenCarsUrls.size,
      urls: Array.from(seenCarsUrls),
      carsDetails: Array.from(seenCarsDetails.values())
    };
    
    fs.writeFileSync(SEEN_CARS_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    console.log(`💾 Archivio aggiornato: ${seenCarsUrls.size} annunci totali`);
  } catch (error) {
    console.error('⚠️  Errore nel salvataggio archivio:', error.message);
  }
}

/**
 * Invia notifica Telegram con link al file Excel su GCS
 * @param {number} newCarsCount - Numero di nuove auto trovate
 * @param {number} totalCarsCount - Numero totale di auto nel database
 * @param {string} gcsUrl - URL pubblico del file su Google Cloud Storage
 */
async function sendTelegramNotification(newCarsCount, totalCarsCount, gcsUrl) {
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
    
    if (!gcsUrl) {
      console.log('⚠️  URL GCS non disponibile, skip invio');
      return;
    }
    
    console.log('\n📤 Invio notifica Telegram...');
    console.log(`📍 ChatID: ${chatId}`);
    
    // Prepara il messaggio in base alla presenza di nuove auto
    let message;
    if (newCarsCount > 0) {
      message = `🚗 <b>Nuove Auto Trovate!</b>\n\n` +
                `✨ <b>${newCarsCount}</b> ${newCarsCount === 1 ? 'nuova auto' : 'nuove auto'} disponibili\n` +
                `📊 Totale auto in catalogo: <b>${totalCarsCount}</b>\n\n` +
                `🔍 Ordinate per anno più recente e km minori\n` +
                `📅 ${new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
                `📥 <a href="${gcsUrl}">Scarica Report Excel</a>`;
    } else {
      message = `✅ <b>Scansione Auto Completata</b>\n\n` +
                `ℹ️  Nessuna nuova auto trovata\n` +
                `📊 Totale auto in catalogo: <b>${totalCarsCount}</b>\n\n` +
                `📅 ${new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
                `📥 <a href="${gcsUrl}">Scarica Report Excel</a>`;
    }
    
    // Invia il messaggio
    const msgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const msgResponse = await axios.post(msgUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });
    console.log(`✅ Notifica inviata! (ID: ${msgResponse.data.result.message_id})`);
    
  } catch (error) {
    console.error('❌ Errore nell\'invio Telegram:', error.message);
  }
}

/**
 * Carica il file Excel su Google Cloud Storage
 * @returns {Promise<string>} - URL pubblico del file
 */
async function uploadExcelToGCS() {
  try {
    console.log('\n☁️  === UPLOAD SU GOOGLE CLOUD STORAGE ===\n');
    
    if (!fs.existsSync(EXCEL_REPORT_PATH)) {
      throw new Error('File Excel non trovato');
    }

    const bucket = storage.bucket(GCS_BUCKET_NAME);
    
    // Upload del file
    console.log(`📤 Caricamento su gs://${GCS_BUCKET_NAME}/${GCS_FILE_NAME}...`);
    await bucket.upload(EXCEL_REPORT_PATH, {
      destination: GCS_FILE_NAME,
      metadata: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cacheControl: 'public, max-age=300', // Cache 5 minuti
      },
      public: true, // Rende il file pubblicamente accessibile
    });

    // URL pubblico del file
    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${GCS_FILE_NAME}`;
    
    console.log(`✅ File caricato con successo!`);
    console.log(`🔗 URL pubblico: ${publicUrl}`);
    
    // Salva l'URL per uso futuro
    fs.writeFileSync(GCS_URL_FILE, publicUrl, 'utf-8');
    
    return publicUrl;
    
  } catch (error) {
    console.error('❌ Errore nel caricamento su GCS:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ GCS_BUCKET_NAME:', GCS_BUCKET_NAME);
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'non impostata');
    // Non blocchiamo l'esecuzione se fallisce l'upload
    return null;
  }
}

/**
 * Carica l'ultimo URL GCS salvato
 * @returns {string|null} - URL precedente o null se non esiste
 */
function getLastGcsUrl() {
  try {
    if (fs.existsSync(GCS_URL_FILE)) {
      const url = fs.readFileSync(GCS_URL_FILE, 'utf-8').trim();
      if (!url) {
        console.log('⚠️  File last_gcs_url.txt esiste ma è vuoto');
        return null;
      }
      console.log(`📎 URL GCS precedente: ${url}`);
      return url;
    }
    console.log('⚠️  File last_gcs_url.txt non trovato');
    return null;
  } catch (error) {
    console.error('❌ Errore nel recupero URL GCS:', error.message);
    return null;
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
 * @param {string} sourceUrl - URL di origine della ricerca
 * @returns {Object|null} - Oggetto con i dettagli dell'auto
 */
async function extractCarDetails(carUrl, sourceUrl = null) {
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
      sourceUrl: sourceUrl, // URL di origine della ricerca
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
  
  // Resetta la mappa per la nuova scansione
  carsBySourceUrl.clear();
  
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
      
      let carDetails = null;
      
      // Se l'auto è già stata vista, prova a usare i dettagli salvati
      if (seenCarsUrls.size > 0 && seenCarsUrls.has(carUrl)) {
        // Recupera i dettagli salvati se disponibili
        if (seenCarsDetails.has(carUrl)) {
          console.log(`  ⏭️  Già visto (cached): ${carUrl.split('/').pop()}`);
          carDetails = {...seenCarsDetails.get(carUrl)}; // Copia i dettagli
          carDetails.isNew = false; // Assicurati che sia marcato come non nuovo
        } else {
          // Auto già vista ma senza dettagli salvati: scarica i dettagli
          console.log(`  🔄 Già visto (recupero dettagli): ${carUrl.split('/').pop()}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          carDetails = await extractCarDetails(carUrl, listUrl);
          if (carDetails) {
            carDetails.isNew = false; // Non è nuova, la conoscevamo già
          }
        }
      } else {
        // Nuova auto: scarica i dettagli
        await new Promise(resolve => setTimeout(resolve, 1000));
        carDetails = await extractCarDetails(carUrl, listUrl);
      }
      
      if (carDetails) {
        allCarsFound.push(carDetails);
        
        // Organizza per URL di origine
        if (!carsBySourceUrl.has(listUrl)) {
          carsBySourceUrl.set(listUrl, []);
        }
        carsBySourceUrl.get(listUrl).push(carDetails);
      }
    }
  }

  // Filtra solo le auto realmente nuove
  const newCars = allCarsFound.filter(car => car.isNew);
  
  console.log(`\n✅ Scansione completata!`);
  console.log(`   📊 Annunci totali trovati: ${allCarUrls.length}`);
  console.log(`   🆕 Nuove auto: ${newCars.length}`);
  console.log(`   ⏭️  Già viste: ${allCarUrls.length - newCars.length}\n`);

  let gcsUrl = null;

  // Se ci sono nuove auto, aggiorna il database e rigenera tutto
  if (newCars.length > 0) {
    // Il database contiene TUTTE le auto (vecchie + nuove)
    carsDatabase = [...allCarsFound];

    // Genera il report console
    generateReport();
    
    // Genera il report Excel con immagini (tutte le auto, nuove in verde)
    await generateExcelReport();
    
    // Carica il report Excel su Google Cloud Storage
    gcsUrl = await uploadExcelToGCS();
    
    // Salva tutti i dettagli nel file di stato
    saveSeenCars(allCarsFound);
    
  } else {
    console.log('ℹ️  Nessuna nuova auto trovata.');
    // Prova prima a usare l'URL precedente
    gcsUrl = getLastGcsUrl();
    console.log(`🔍 DEBUG gcsUrl dopo getLastGcsUrl: "${gcsUrl}" (type: ${typeof gcsUrl}, length: ${gcsUrl ? gcsUrl.length : 'N/A'})`);
    // Se non disponibile, rigenera Excel e carica su GCS
    if (!gcsUrl) {
      console.log('⚠️  URL GCS non trovato, rigenero Excel e ricarico su GCS...');
      console.log(`🔍 DEBUG: allCarsFound.length = ${allCarsFound.length}`);
      console.log(`🔍 DEBUG: carsBySourceUrl.size = ${carsBySourceUrl.size}`);
      carsDatabase = [...allCarsFound];
      await generateExcelReport();
      gcsUrl = await uploadExcelToGCS();
      console.log(`🔍 DEBUG: gcsUrl dopo upload = ${gcsUrl}`);
    }
  }

  // Invia sempre la notifica Telegram con il link GCS
  await sendTelegramNotification(newCars.length, allCarsFound.length, gcsUrl);
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
  // poi per km crescente (meno km prima), infine per prezzo crescente
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
      if (a.km !== b.km) return a.km - b.km;
    } else if (a.km !== null) {
      return -1; // a ha km, b no -> a viene prima
    } else if (b.km !== null) {
      return 1; // b ha km, a no -> b viene prima
    }
    
    // Se anno e km sono uguali, ordina per prezzo (crescente)
    if (a.prezzo !== null && b.prezzo !== null) {
      return a.prezzo - b.prezzo;
    } else if (a.prezzo !== null) {
      return -1; // a ha prezzo, b no -> a viene prima
    } else if (b.prezzo !== null) {
      return 1; // b ha prezzo, a no -> b viene prima
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
 * Scarica un'immagine, la ottimizza e la salva localmente
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
    
    // Salva sempre come JPEG per compatibilità mobile
    const buffer = Buffer.from(response.data);
    
    // Cambia l'estensione in .jpg se necessario
    const jpgPath = outputPath.replace(/\.(png|webp|jpeg)$/i, '.jpg');
    
    fs.writeFileSync(jpgPath, buffer);
    return jpgPath;
  } catch (error) {
    console.error(`  ⚠️  Impossibile scaricare l'immagine: ${error.message}`);
    return null;
  }
}

/**
 * Genera un report Excel con le immagini delle auto
 * Crea un foglio per ogni URL di ricerca
 */
async function generateExcelReport() {
  console.log('\n📊 === GENERAZIONE REPORT EXCEL ===\n');
  
  if (carsDatabase.length === 0) {
    console.log('⚠️  Nessuna auto da esportare.');
    return;
  }
  
  console.log(`📁 Creazione fogli separati per ${carsBySourceUrl.size} ricerche...`);

  // Crea il workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Car Watcher';
  workbook.created = new Date();
  
  // Crea la cartella per le immagini temporanee
  const tempImageDir = path.join(__dirname, '..', 'data', 'temp_images');
  if (!fs.existsSync(tempImageDir)) {
    fs.mkdirSync(tempImageDir, { recursive: true });
  }
  
  let totalImages = 0;
  
  // Per ogni URL di ricerca, crea un foglio separato
  for (const [sourceUrl, cars] of carsBySourceUrl.entries()) {
    const modelName = extractModelNameFromUrl(sourceUrl);
    console.log(`\n📄 Creazione foglio "${modelName}" con ${cars.length} auto...`);
    
    // Ordina le auto di questo foglio
    const sortedCars = [...cars].sort((a, b) => {
      if (a.anno !== null && b.anno !== null) {
        if (b.anno !== a.anno) return b.anno - a.anno;
      } else if (a.anno !== null) {
        return -1;
      } else if (b.anno !== null) {
        return 1;
      }
      
      if (a.km !== null && b.km !== null) {
        if (a.km !== b.km) return a.km - b.km;
      } else if (a.km !== null) {
        return -1;
      } else if (b.km !== null) {
        return 1;
      }
      
      if (a.prezzo !== null && b.prezzo !== null) {
        return a.prezzo - b.prezzo;
      } else if (a.prezzo !== null) {
        return -1;
      } else if (b.prezzo !== null) {
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
        console.log(`  📷 Scarico immagine ${totalImages}...`);
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
          } catch (error) {
            console.error(`  ⚠️  Errore immagine: ${error.message}`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
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
  console.log(`📊 Totale fogli: ${carsBySourceUrl.size}`);
  console.log(`📊 Totale auto: ${carsDatabase.length}\n`);
}

// === ESPORTAZIONE MODULO ===

/**
 * Esegue una scansione completa delle auto
 * Questa è la funzione principale che può essere chiamata dallo scheduler
 */
async function runCarScan() {
  const now = new Date();
  console.log(`\n🚗 === CAR WATCHER - SCANSIONE AVVIATA ===`);
  console.log(`🕒 Ora: ${now.toLocaleString('it-IT')}\n`);
  
  try {
    await processAllUrls();
    console.log(`\n✅ Car Watcher completato alle ${new Date().toLocaleTimeString('it-IT')}`);
  } catch (error) {
    console.error('❌ Errore Car Watcher:', error.message);
    throw error; // Rilancia per permettere allo scheduler di gestire l'errore
  }
}

// Esporta la funzione di scansione per essere usata da scheduler.js e main.js
module.exports = runCarScan;

// Se eseguito direttamente (es: node src/car_watcher.js), esegue una scansione singola
if (require.main === module) {
  console.log('🚗 Car Watcher - Modalità esecuzione diretta\n');
  runCarScan()
    .then(() => {
      console.log('\n✅ Scansione completata. Il processo terminerà ora.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Errore fatale:', error);
      process.exit(1);
    });
}
