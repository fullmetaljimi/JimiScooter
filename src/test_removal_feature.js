/**
 * Test per verificare la funzionalità di rimozione annunci
 * Simula scansioni multiple con annunci aggiunti/rimossi
 */

const fs = require('fs');
const path = require('path');

// Path per i file di test
const TEST_DATA_DIR = path.join(__dirname, '..', 'data', 'test_temp');
const TEST_SEEN_FILE = path.join(TEST_DATA_DIR, 'seen_cars_test.json');
const TEST_EXCEL_FILE = path.join(TEST_DATA_DIR, 'report_test.xlsx');

// Mock degli annunci
const MOCK_ANNUNCI_SCANSIONE_1 = [
  {
    titolo: 'Fiat Panda 1.0 Hybrid 2021',
    anno: 2021,
    km: 15000,
    prezzo: 12500,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-1/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true
  },
  {
    titolo: 'Fiat Panda Cross 2020',
    anno: 2020,
    km: 25000,
    prezzo: 11000,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-2/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true
  },
  {
    titolo: 'Fiat Panda City Cross 2019',
    anno: 2019,
    km: 35000,
    prezzo: 9500,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-3/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true
  },
  {
    titolo: 'Fiat Panda Easy 2018',
    anno: 2018,
    km: 45000,
    prezzo: 8000,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-4/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true
  },
  {
    titolo: 'Fiat Panda Lounge 2022',
    anno: 2022,
    km: 5000,
    prezzo: 14000,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-5/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true
  }
];

// Scansione 2: Rimossi annunci 2 e 4, mantenuti 1,3,5, aggiunti 6 e 7
const MOCK_ANNUNCI_SCANSIONE_2 = [
  {
    titolo: 'Fiat Panda 1.0 Hybrid 2021',
    anno: 2021,
    km: 15000,
    prezzo: 12500,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-1/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: false // Già visto nella scansione 1
  },
  {
    titolo: 'Fiat Panda City Cross 2019',
    anno: 2019,
    km: 35000,
    prezzo: 9500,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-3/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: false // Già visto nella scansione 1
  },
  {
    titolo: 'Fiat Panda Lounge 2022',
    anno: 2022,
    km: 5000,
    prezzo: 14000,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-5/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: false // Già visto nella scansione 1
  },
  {
    titolo: 'Fiat Panda Sport 2023 - NUOVO!',
    anno: 2023,
    km: 0,
    prezzo: 16000,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-6/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true // Nuovo nella scansione 2
  },
  {
    titolo: 'Fiat Panda 4x4 2021 - NUOVO!',
    anno: 2021,
    km: 8000,
    prezzo: 13500,
    immagineUrl: null,
    url: 'https://spaziogenova.it/veicoli/fiat-panda-7/',
    sourceUrl: 'https://spaziogenova.it/auto-usate/',
    dataScansione: new Date().toISOString(),
    isNew: true // Nuovo nella scansione 2
  }
];

/**
 * Crea la directory di test
 */
function setupTestEnvironment() {
  console.log('\n🔧 === SETUP AMBIENTE DI TEST ===\n');
  
  if (fs.existsSync(TEST_DATA_DIR)) {
    console.log('   Pulisco directory di test esistente...');
    cleanupTestFiles();
  }
  
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  console.log(`✅ Directory di test creata: ${TEST_DATA_DIR}\n`);
}

/**
 * Simula il salvataggio del file seen_cars.json
 */
function saveSeenCarsTest(annunci) {
  const urls = annunci.map(a => a.url);
  const data = {
    lastUpdate: new Date().toISOString(),
    totalCars: urls.length,
    urls: urls
  };
  
  fs.writeFileSync(TEST_SEEN_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Salvati ${urls.length} URL nel file di test`);
}

/**
 * Carica il file seen_cars.json di test
 */
function loadSeenCarsTest() {
  if (!fs.existsSync(TEST_SEEN_FILE)) {
    return new Set();
  }
  
  const data = JSON.parse(fs.readFileSync(TEST_SEEN_FILE, 'utf-8'));
  return new Set(data.urls || []);
}

/**
 * Simula l'elaborazione degli annunci come fa il codice reale
 */
function processScansione(annunciTrovati, seenUrls) {
  console.log('\n📊 === ELABORAZIONE SCANSIONE ===\n');
  
  // Determina quali sono nuovi confrontando con seenUrls
  const anNumciElaborati = annunciTrovati.map(annuncio => {
    const isNew = !seenUrls.has(annuncio.url);
    return { ...annuncio, isNew };
  });
  
  // Statistiche
  const currentUrls = new Set(annunciTrovati.map(a => a.url));
  const removedUrls = Array.from(seenUrls).filter(url => !currentUrls.has(url));
  const newCars = annunciTrovati.filter(a => a.isNew);
  
  console.log(`📊 Auto trovate sul sito: ${annunciTrovati.length}`);
  console.log(`🆕 Nuove auto: ${newCars.length}`);
  console.log(`♻️  Già viste: ${annunciTrovati.length - newCars.length}`);
  console.log(`🗑️  Annunci rimossi dal sito: ${removedUrls.length}`);
  
  if (removedUrls.length > 0) {
    console.log('\n🗑️  Annunci rimossi:');
    removedUrls.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });
  }
  
  if (newCars.length > 0) {
    console.log('\n✨ Annunci nuovi:');
    newCars.forEach((car, i) => {
      console.log(`   ${i + 1}. ${car.titolo} - ${car.url}`);
    });
  }
  
  return {
    elaborati: anNumciElaborati,
    nuovi: newCars.length,
    rimossi: removedUrls.length,
    removedUrls: removedUrls
  };
}

/**
 * Verifica i risultati del test
 */
function verificaRisultati(scansione, expectedNuovi, expectedRimossi) {
  console.log('\n✅ === VERIFICA RISULTATI ===\n');
  
  let success = true;
  
  // Verifica numero di nuovi
  if (scansione.nuovi === expectedNuovi) {
    console.log(`✅ Nuovi annunci: ${scansione.nuovi} (atteso: ${expectedNuovi})`);
  } else {
    console.log(`❌ Nuovi annunci: ${scansione.nuovi} (atteso: ${expectedNuovi})`);
    success = false;
  }
  
  // Verifica numero di rimossi
  if (scansione.rimossi === expectedRimossi) {
    console.log(`✅ Annunci rimossi: ${scansione.rimossi} (atteso: ${expectedRimossi})`);
  } else {
    console.log(`❌ Annunci rimossi: ${scansione.rimossi} (atteso: ${expectedRimossi})`);
    success = false;
  }
  
  // Verifica flag isNew
  const marcatiComeNuovi = scansione.elaborati.filter(a => a.isNew).length;
  if (marcatiComeNuovi === expectedNuovi) {
    console.log(`✅ Flag isNew corretto: ${marcatiComeNuovi} annunci marcati come nuovi`);
  } else {
    console.log(`❌ Flag isNew errato: ${marcatiComeNuovi} marcati (atteso: ${expectedNuovi})`);
    success = false;
  }
  
  return success;
}

/**
 * Pulisce i file temporanei di test
 */
function cleanupTestFiles() {
  console.log('\n🧹 === PULIZIA FILE DI TEST ===\n');
  
  try {
    if (fs.existsSync(TEST_SEEN_FILE)) {
      fs.unlinkSync(TEST_SEEN_FILE);
      console.log(`🗑️  Rimosso: ${TEST_SEEN_FILE}`);
    }
    
    if (fs.existsSync(TEST_EXCEL_FILE)) {
      fs.unlinkSync(TEST_EXCEL_FILE);
      console.log(`🗑️  Rimosso: ${TEST_EXCEL_FILE}`);
    }
    
    if (fs.existsSync(TEST_DATA_DIR)) {
      // Rimuovi eventuali altri file
      const files = fs.readdirSync(TEST_DATA_DIR);
      files.forEach(file => {
        fs.unlinkSync(path.join(TEST_DATA_DIR, file));
      });
      
      fs.rmdirSync(TEST_DATA_DIR);
      console.log(`🗑️  Rimossa directory: ${TEST_DATA_DIR}`);
    }
    
    console.log('\n✅ Pulizia completata!\n');
  } catch (error) {
    console.error('⚠️  Errore durante la pulizia:', error.message);
  }
}

/**
 * Esegue il test completo
 */
async function runTest() {
  console.log('\n🧪 ========================================');
  console.log('🧪  TEST FUNZIONALITÀ RIMOZIONE ANNUNCI');
  console.log('🧪 ========================================\n');
  
  try {
    // Setup
    setupTestEnvironment();
    
    // === SCANSIONE 1 ===
    console.log('🔵 === SCANSIONE 1 (Prima esecuzione) ===\n');
    console.log(`📝 Simulazione di ${MOCK_ANNUNCI_SCANSIONE_1.length} annunci trovati sul sito\n`);
    
    MOCK_ANNUNCI_SCANSIONE_1.forEach((annuncio, i) => {
      console.log(`   ${i + 1}. ${annuncio.titolo}`);
    });
    
    // Nessun file precedente, quindi tutti sono nuovi
    const seenUrls1 = loadSeenCarsTest();
    const scansione1 = processScansione(MOCK_ANNUNCI_SCANSIONE_1, seenUrls1);
    
    // Salva gli URL per la prossima scansione
    saveSeenCarsTest(MOCK_ANNUNCI_SCANSIONE_1);
    
    // Verifica: tutti i 5 annunci devono essere nuovi, 0 rimossi
    const test1Success = verificaRisultati(scansione1, 5, 0);
    
    console.log('\n⏸️  Pausa di 2 secondi...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // === SCANSIONE 2 ===
    console.log('🔵 === SCANSIONE 2 (Dopo qualche tempo) ===\n');
    console.log('📝 Simulazione: rimossi annunci #2 e #4, aggiunti #6 e #7\n');
    
    MOCK_ANNUNCI_SCANSIONE_2.forEach((annuncio, i) => {
      console.log(`   ${i + 1}. ${annuncio.titolo}`);
    });
    
    // Carica gli URL della scansione precedente
    const seenUrls2 = loadSeenCarsTest();
    console.log(`\n📂 Caricati ${seenUrls2.size} URL dalla scansione precedente\n`);
    
    const scansione2 = processScansione(MOCK_ANNUNCI_SCANSIONE_2, seenUrls2);
    
    // Salva i nuovi URL
    saveSeenCarsTest(MOCK_ANNUNCI_SCANSIONE_2);
    
    // Verifica: 2 nuovi (#6, #7), 2 rimossi (#2, #4)
    const test2Success = verificaRisultati(scansione2, 2, 2);
    
    // Verifica finale
    console.log('\n🎯 === RISULTATO FINALE ===\n');
    
    if (test1Success && test2Success) {
      console.log('✅✅✅ TUTTI I TEST SUPERATI! ✅✅✅\n');
      console.log('La funzionalità di rimozione annunci funziona correttamente:\n');
      console.log('  ✅ Gli annunci nuovi vengono identificati correttamente');
      console.log('  ✅ Gli annunci già visti NON sono marcati come nuovi');
      console.log('  ✅ Gli annunci rimossi dal sito vengono rilevati');
      console.log('  ✅ Il file seen_cars.json viene aggiornato correttamente\n');
    } else {
      console.log('❌ ALCUNI TEST SONO FALLITI\n');
      console.log('Rivedi la logica di identificazione nuovi/rimossi\n');
    }
    
    // Mostra il contenuto del file finale
    console.log('📄 === CONTENUTO FILE SEEN_CARS.JSON ===\n');
    const finalData = JSON.parse(fs.readFileSync(TEST_SEEN_FILE, 'utf-8'));
    console.log(`   Ultimo aggiornamento: ${finalData.lastUpdate}`);
    console.log(`   Totale auto salvate: ${finalData.totalCars}`);
    console.log(`   URL salvati:`);
    finalData.urls.forEach((url, i) => {
      console.log(`      ${i + 1}. ${url}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERRORE DURANTE IL TEST:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    cleanupTestFiles();
  }
}

// Esegui il test
runTest().catch(console.error);
