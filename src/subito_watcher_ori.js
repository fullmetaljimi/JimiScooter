require('dotenv').config();

const axios = require('axios');

const cheerio = require('cheerio');

const fs = require('fs');

const path = require('path')

const { sendMessage } = require('./send_telegram');


const CONFIG_PATH = path.join(__dirname, '..', 'config', 'config.json');

const SEEN_PATH = path.join(__dirname, '..', 'data', 'seen.json');



// Carica la configurazione da config.jsonconst { sendMessage } = require('./send_telegram');const { sendMessage } = require('./send_telegram');

function loadConfig() {

  try {

    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  } catch (err) {

    console.error('Errore caricamento config:', err.message);

    process.exit(1);//

  }

}



// Carica gli annunci già visti da seen.json// Carica la configurazione da config.json// Carica la configurazione da config.json

function loadSeen() {

  try {

      if (!fs.existsSync(SEEN_PATH)) return {};

      return JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8'));
  } catch (err) {

    return {};    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  }

}  

// Salva gli annunci visti in seen.json    console.error('Errore caricamento config:', err.message);    console.error('Errore caricamento config:', err.message);

function saveSeen(seen) {

  try {    
    const dir = path.dirname(SEEN_PATH);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });  

    fs.writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2));

  } catch (err) {

    console.error('Errore salvataggio seen:', err.message);

  }

}

// Carica gli annunci già visti da seen.json// Carica gli annunci già visti da seen.json

// Esegue la ricerca su Subito.it

async function fetchSearch(url) {

  try {

    const resp = await axios.get(url, { 

      timeout: 20000,

      headers: {    

        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',    

        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',

        'Cache-Control': 'no-cache',  

        'Pragma': 'no-cache',

        'Upgrade-Insecure-Requests': '1'   

      }

    }); 

    

    // Debug: salva l'HTML e l'URL}}

    const debugInfo = `URL: ${url}\n\nHeaders:\n${JSON.stringify(resp.headers, null, 2)}\n\nHTML:\n${resp.data}`;

    fs.writeFileSync('debug_response.txt', debugInfo);

    

    console.log('\nRisposta ricevuta:', {// Salva gli annunci visti in seen.json// Salva gli annunci visti in seen.json

      status: resp.status,

      contentType: resp.headers['content-type'],

      length: resp.data.length

    });  

    

    return resp.data;    

  } catch (err) {

    console.error('Errore fetch URL:', url, err.message);    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (err.response) {

      console.error('Dettagli errore:', {   

        status: err.response.status,

        headers: err.response.headers,  

        data: err.response.data?.substring(0, 200)

      });    console.error('Errore salvataggio seen:', err.message);    console.error('Errore salvataggio seen:', err.message);

    }

    return null;  }  }





// Estrae gli annunci dalla pagina HTML

function parseAds(html) {

  if (!html) return [];// Esegue la ricerca su Subito.it// Esegue la ricerca su Subito.it

  const $ = cheerio.load(html);

  const ads = [];
  
  async function fetchSearch(url) {


  // Debug: salva l'HTML per ispezione  try {  try {

  fs.writeFileSync('debug_page.html', html);

  console.log('\nAnalisi pagina HTML...');    
  
  const resp = await axios.get(url, {   



  // Cerca gli elementi che contengono annunci veri      timeout: 20000,      timeout: 20000,

  console.log('\n=== ANNUNCI TROVATI ===');

        headers: {      headers: {

  // Cerca tutti gli script JSON-LD

  const scripts = $('script[type="application/ld+json"]');        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

  const products = [];

        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',

  scripts.each((i, el) => {

    try {        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',

      const data = JSON.parse($(el).html());

      console.log('Analisi script JSON-LD:', i + 1);        'Cache-Control': 'no-cache',        'Cache-Control': 'no-cache',

      

      // Gestisce il caso di un array @graph con ImageObject        'Pragma': 'no-cache',        'Pragma': 'no-cache',

      if (Array.isArray(data['@graph'])) {

        data['@graph'].forEach(item => {        'Upgrade-Insecure-Requests': '1'        'Upgrade-Insecure-Requests': '1'

          if (item['@type'] === 'ImageObject' && item.description && item.caption) {

            try {      }      }

              const title = item.caption;

              let price = '';    });    });

              let location = '';

                      

              const desc = item.description;

              const priceMatch = desc.match(/(\d[\d.,]*)\s*€/);    // Debug: salva l'HTML e l'URL    // Debug: salva l'HTML e l'URL

              if (priceMatch) price = priceMatch[0];

                  const debugInfo = `URL: ${url}\n\nHeaders:\n${JSON.stringify(resp.headers, null, 2)}\n\nHTML:\n${resp.data}`;    const debugInfo = `URL: ${url}\n\nHeaders:\n${JSON.stringify(resp.headers, null, 2)}\n\nHTML:\n${resp.data}`;

              const locationMatch = desc.match(/Genova\s*\([^)]+\)/);

              if (locationMatch) location = locationMatch[0];    fs.writeFileSync('debug_response.txt', debugInfo);    fs.writeFileSync('debug_response.txt', debugInfo);

              

              let url = '';        

              const urlMatch = desc.match(/https?:\/\/[^\s]+/);

              if (urlMatch) url = urlMatch[0];    console.log('\nRisposta ricevuta:', {    console.log('\nRisposta ricevuta:', {

              

              if (title && (price || location) && url) {      status: resp.status,      status: resp.status,

                products.push({ title, price, location, url });

                console.log('Trovato annuncio da ImageObject:', { title, price });      contentType: resp.headers['content-type'],      contentType: resp.headers['content-type'],

              }

            } catch (err) {      length: resp.data.length      length: resp.data.length

              console.error('Errore parsing ImageObject:', err.message);

            }    });    });

          }

        });        

      }

          return resp.data;    return resp.data;

      // Gestisce il caso di un singolo Product con offers

      if (data['@type'] === 'Product' && data.offers) {  } catch (err) {  } catch (err) {

        try {

          const title = data.name;    console.error('Errore fetch URL:', url, err.message);    console.error('Errore fetch URL:', url, err.message);

          const price = `${data.offers.lowPrice} - ${data.offers.highPrice} €`;

          const location = 'Genova'; // La località è implicita nella ricerca    if (err.response) {    if (err.response) {

          const url = data.url || ''; // L'URL potrebbe essere nella pagina

                console.error('Dettagli errore:', {      console.error('Dettagli errore:', {

          if (title && price) {

            products.push({ title, price, location, url });        status: err.response.status,        status: err.response.status,

            console.log('Trovato Product con prezzo range:', { title, price });

          }        headers: err.response.headers,        headers: err.response.headers,

        } catch (err) {

          console.error('Errore parsing Product:', err.message);        data: err.response.data?.substring(0, 200)        data: err.response.data?.substring(0, 200)

        }

      }      });      });

    } catch (err) {

      console.error('Errore parsing script JSON-LD:', err.message);    }    }

    }

  });    return null;    return null;



  // Se non trova annunci nel JSON-LD, cerca nel DOM  }  }

  if (products.length === 0) {

    console.log('Nessun annuncio trovato nel JSON-LD, cerco nel DOM...');}}

    

    $('a[href*="/annuncio-"]').each((i, el) => {

      try {

        const $link = $(el);// Estrae gli annunci dalla pagina HTML// Estrae gli annunci dalla pagina HTML

        const href = $link.attr('href');

        const title = $link.text().trim();function parseAds(html) {function parseAds(html) {

        

        // Cerca il container dell'annuncio  if (!html) return [];  if (!html) return [];

        const $container = $link.closest('div');

          const $ = cheerio.load(html);  const $ = cheerio.load(html);

        // Cerca prezzo e località nel container

        const price = $container.find('*').filter((i, el) => {  const ads = [];  const ads = [];

          const text = $(el).text().trim();

          return text.match(/[\d.,]+\s*€/) && text.length < 50;

        }).first().text().trim();

          // Debug: salva l'HTML per ispezione  // Debug: salva l'HTML per ispezione

        const location = $container.find('*').filter((i, el) => {

          const text = $(el).text().trim();  fs.writeFileSync('debug_page.html', html);  fs.writeFileSync('debug_page.html', html);

          return text.match(/Genova\s*\([^)]+\)/);

        }).first().text().trim();  console.log('\nAnalisi pagina HTML...');  console.log('\nAnalisi pagina HTML...');

        

        if (href && title && (price || location)) {

          const url = href.startsWith('http') ? href : `https://www.subito.it${href}`;

          console.log('\nAnnuncio trovato (DOM):', {  // Cerca gli elementi che contengono annunci veri  // Cerca gli elementi che contengono annunci veri

            title,

            price,  console.log('\n=== ANNUNCI TROVATI ===');  console.log('\n=== ANNUNCI TROVATI ===');

            location,

            url: url.substring(0, 100)    

          });

            // Cerca tutti gli script JSON-LD  // Cerca lo schema JSON-LD che contiene i dati degli annunci

          products.push({

            url,  const scripts = $('script[type="application/ld+json"]');  const scripts = $('script[type="application/ld+json"]');

            title,

            price,  const products = [];  let jsonData = null;

            location

          });  scripts.each((i, el) => {

        }

      } catch (err) {  scripts.each((i, el) => {    try {

        console.error('Errore parsing annuncio DOM:', err.message);

      }    try {      const data = JSON.parse($(el).html());

    });

  }      const data = JSON.parse($(el).html());      if (Array.isArray(data['@graph'])) {



  // Aggiunge i prodotti trovati alla lista degli annunci      console.log('Analisi script JSON-LD:', i + 1);        jsonData = data['@graph'];

  for (const product of products) {

    ads.push({              return false; // break the loop

      ...product,

      timestamp: Date.now()      // Gestisce il caso di un array @graph con ImageObject      }

    });

  }      if (Array.isArray(data['@graph'])) {    } catch (e) {



  // Log del totale annunci trovati        data['@graph'].forEach(item => {      // ignora errori di parsing JSON

  console.log(`\nTotale annunci trovati: ${ads.length}`);

  if (ads.length > 0) {          if (item['@type'] === 'ImageObject' && item.description && item.caption) {    }

    console.log('\nPrimi 3 annunci trovati:');

    ads.slice(0, 3).forEach((ad, i) => {            try {  });

      console.log(`\nAnnuncio ${i + 1}:`, {

        title: ad.title,              const title = item.caption;

        price: ad.price,

        location: ad.location,              let price = '';  if (jsonData) {

        url: ad.url

      });              let location = '';    console.log('Trovati dati JSON-LD degli annunci');

    });

  }                  



  return ads;              const desc = item.description;    // Prima cerca annunci nel formato array di ImageObject

}

              const priceMatch = desc.match(/(\d[\d.,]*)\s*€/);    jsonData.forEach(item => {

// Controlla nuovi annunci per una keyword

async function checkKeyword(baseUrl, keyword, seen) {              if (priceMatch) price = priceMatch[0];      if (item['@type'] === 'ImageObject' && item.description && item.caption) {

  // Costruisce l'URL mantenendo il formato corretto

  const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(keyword);                      try {

  console.log(`\n=== CONTROLLO RICERCA ===`);

  console.log(`Keyword: ${keyword}`);              const locationMatch = desc.match(/Genova\s*\([^)]+\)/);          // Estrai i dati dall'oggetto JSON-LD

  console.log(`URL ricerca: ${url}`);

                if (locationMatch) location = locationMatch[0];          const title = item.caption;

  const html = await fetchSearch(url);

  if (!html) {                        let price = '';

    console.log('Nessuna risposta HTML ricevuta');

    return;              let url = '';          let location = '';

  }

                const urlMatch = desc.match(/https?:\/\/[^\s]+/);          

  const ads = parseAds(html);

                if (urlMatch) url = urlMatch[0];          // Cerca prezzo e località nella descrizione

  // Calcola un ID univoco per ogni annuncio (usando titolo e prezzo)

  function getAdId(ad) {                        const desc = item.description;

    return `${keyword}:${ad.title}:${ad.price || 'no-price'}`;

  }              if (title && (price || location) && url) {          const priceMatch = desc.match(/(\d[\d.,]*)\s*€/);

  

  // Filtra gli annunci già visti usando l'ID univoco                products.push({ title, price, location, url });          if (priceMatch) price = priceMatch[0];

  const adsToNotify = ads.filter(ad => {

    const adId = getAdId(ad);                console.log('Trovato annuncio da ImageObject:', { title, price });          

    const isNew = !seen[adId];

    console.log(`Annuncio ${adId}: ${isNew ? 'NUOVO' : 'già visto'}`);              }          const locationMatch = desc.match(/Genova\s*\([^)]+\)/);

    return isNew;

  });            } catch (err) {          if (locationMatch) location = locationMatch[0];

  

  if (adsToNotify.length > 0) {              console.error('Errore parsing ImageObject:', err.message);          

    console.log(`Trovati ${adsToNotify.length} annunci per "${keyword}"`);

                }          // Costruisci l'URL dell'annuncio dalla descrizione

    // Invia una notifica per ogni annuncio

    for (const ad of adsToNotify) {          }          let url = '';

      const message = formatMessage(keyword, ad);

      try {        });          const urlMatch = desc.match(/https?:\/\/[^\s]+/);

        await sendMessage(message, { parse_mode: 'HTML' });

        const adId = getAdId(ad);      }          if (urlMatch) url = urlMatch[0];

        seen[adId] = {

          url: ad.url,                

          keyword,

          title: ad.title,      // Gestisce il caso di un singolo Product con offers          if (title && (price || location) && url) {

          price: ad.price,

          timestamp: ad.timestamp      if (data['@type'] === 'Product' && data.offers) {            console.log('\nAnnuncio trovato:', {

        };

        console.log('Notificato:', ad.url);        try {              title,

      } catch (err) {

        console.error('Errore invio notifica:', err.message);          const title = data.name;              price,

      }

    }          const price = `${data.offers.lowPrice} - ${data.offers.highPrice} €`;              location,

  } else {

    console.log(`Nessun annuncio per "${keyword}"`);          const location = 'Genova'; // La località è implicita nella ricerca              url: url.substring(0, 100)

  }

}          const url = data.url || ''; // L'URL potrebbe essere nella pagina            });



// Formatta il messaggio Telegram                      

function formatMessage(keyword, ad) {

  let msg = `🏍 <b>Nuovo annuncio per ${keyword}</b>\n\n`;          if (title && price) {            ads.push({

  msg += `${ad.title}\n`;

  if (ad.price) msg += `💰 ${ad.price}\n`;            products.push({ title, price, location, url });              url,

  if (ad.location) msg += `📍 ${ad.location}\n`;

  msg += `\n🔗 ${ad.url}`;            console.log('Trovato Product con prezzo range:', { title, price });              title,

  return msg;

}          }              price,



// Funzione principale        } catch (err) {              location,

async function main() {

  console.log('=== AVVIO WATCHER ===');          console.error('Errore parsing Product:', err.message);              timestamp: Date.now()

  

  const config = loadConfig();        }            });

  console.log('Config caricata:', config);

        }          }

  const seen = loadSeen();

  console.log('Annunci visti:', Object.keys(seen).length);    } catch (err) {        } catch (err) {

  

  const once = process.argv.includes('--once');      console.error('Errore parsing script JSON-LD:', err.message);          console.error('Errore parsing annuncio ImageObject:', err.message);

  console.log('Modalità:', once ? 'singola' : 'continua');

  console.log('Intervallo:', config.pollIntervalSeconds, 'secondi');    }        }



  // Funzione che esegue un ciclo di controllo  });      }

  async function runCheck() {

    console.log('\n=== Inizio controllo:', new Date().toISOString(), '===');      // Cerca anche annunci nel formato Product con AggregateOffer

    

    // Prendi la prima (e unica) ricerca configurata  // Se non trova annunci nel JSON-LD, cerca nel DOM      else if (item['@type'] === 'Product' && item.offers && item.offers['@type'] === 'AggregateOffer') {

    const search = config.searches[0];

      if (products.length === 0) {        try {

    // Controlla ogni keyword

    for (const keyword of search.queries) {    console.log('Nessun annuncio trovato nel JSON-LD, cerco nel DOM...');          const title = item.name;

      await checkKeyword(search.baseUrl, keyword, seen);

    }              const price = `${item.offers.lowPrice} - ${item.offers.highPrice} €`;

    

    // Salva gli annunci visti    $('a[href*="/annuncio-"]').each((i, el) => {          const location = 'Genova'; // La località è implicita nella ricerca

    saveSeen(seen);

    console.log('=== Fine controllo ===\n');      try {          const url = item.url || window.location.href; // Usa l'URL corrente se non specificato

  }

        const $link = $(el);          

  // Esegui il primo controllo

  await runCheck();        const href = $link.attr('href');          console.log('\nAnnuncio trovato (Product):', {



  // Se non è modalità singola, imposta l'intervallo        const title = $link.text().trim();            title,

  if (!once) {

    setInterval(runCheck, config.pollIntervalSeconds * 1000);                    price,

  } else {

    process.exit(0);        // Cerca il container dell'annuncio            location,

  }

}        const $container = $link.closest('div');            url: url.substring(0, 100)



// Avvio del programma                  });

if (require.main === module) {

  main().catch(err => {        // Cerca prezzo e località nel container          

    console.error('Errore fatale:', err);

    process.exit(1);        const price = $container.find('*').filter((i, el) => {          ads.push({

  });

}          const text = $(el).text().trim();            url,

          return text.match(/[\d.,]+\s*€/) && text.length < 50;            title, 

        }).first().text().trim();            price,

                    location,

        const location = $container.find('*').filter((i, el) => {            timestamp: Date.now()

          const text = $(el).text().trim();          });

          return text.match(/Genova\s*\([^)]+\)/);        } catch (err) {

        }).first().text().trim();          console.error('Errore parsing annuncio Product:', err.message);

                }

        if (href && title && (price || location)) {      }

          const url = href.startsWith('http') ? href : `https://www.subito.it${href}`;    });

          console.log('\nAnnuncio trovato (DOM):', {        } catch (err) {

            title,          console.error('Errore parsing annuncio:', err.message);

            price,        }

            location,      }

            url: url.substring(0, 100)    });

          });  } else {

              // Fallback: cerca gli annunci nel DOM

          products.push({    console.log('Nessun dato JSON-LD trovato, cerco nel DOM...');

            url,    

            title,    $('a[href*="/annuncio-"]').each((i, el) => {

            price,      try {

            location        const $link = $(el);

          });        const href = $link.attr('href');

        }        const title = $link.text().trim();

      } catch (err) {        

        console.error('Errore parsing annuncio DOM:', err.message);        // Cerca il container dell'annuncio

      }        const $container = $link.closest('div');

    });        

  }        // Cerca prezzo e località nel container

        const price = $container.find('*').filter((i, el) => {

  // Aggiunge i prodotti trovati alla lista degli annunci          const text = $(el).text().trim();

  for (const product of products) {          return text.match(/[\d.,]+\s*€/) && text.length < 50;

    ads.push({        }).first().text().trim();

      ...product,        

      timestamp: Date.now()        const location = $container.find('*').filter((i, el) => {

    });          const text = $(el).text().trim();

  }          return text.match(/Genova\s*\([^)]+\)/);

        }).first().text().trim();

  // Log del totale annunci trovati        

  console.log(`\nTotale annunci trovati: ${ads.length}`);        if (href && title && (price || location)) {

  if (ads.length > 0) {          const url = href.startsWith('http') ? href : `https://www.subito.it${href}`;

    console.log('\nPrimi 3 annunci trovati:');          console.log('\nAnnuncio trovato (DOM):', {

    ads.slice(0, 3).forEach((ad, i) => {            title,

      console.log(`\nAnnuncio ${i + 1}:`, {            price,

        title: ad.title,            location,

        price: ad.price,            url: url.substring(0, 100)

        location: ad.location,          });

        url: ad.url          

      });          ads.push({

    });            url,

  }            title,

            price,

  return ads;            location,

}            timestamp: Date.now()

          });

// Controlla nuovi annunci per una keyword        }

async function checkKeyword(baseUrl, keyword, seen) {      } catch (err) {

  // Costruisce l'URL mantenendo il formato corretto        // Ignora errori di parsing

  const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(keyword);      }

  console.log(`\n=== CONTROLLO RICERCA ===`);    });

  console.log(`Keyword: ${keyword}`);  }

  console.log(`URL ricerca: ${url}`);

    return ads;

  const html = await fetchSearch(url);

  if (!html) {  console.log(`\nTotale annunci trovati: ${ads.length}`);

    console.log('Nessuna risposta HTML ricevuta');  if (ads.length > 0) {

    return;    console.log('\nPrimi 3 annunci trovati:');

  }    ads.slice(0, 3).forEach((ad, i) => {

        console.log(`\nAnnuncio ${i + 1}:`, {

  const ads = parseAds(html);        title: ad.title,

          price: ad.price,

  // Calcola un ID univoco per ogni annuncio (usando titolo e prezzo)        location: ad.location,

  function getAdId(ad) {        url: ad.url

    return `${keyword}:${ad.title}:${ad.price || 'no-price'}`;      });

  }    });

    }

  // Filtra gli annunci già visti usando l'ID univoco

  const adsToNotify = ads.filter(ad => {  return ads;

    const adId = getAdId(ad);}

    const isNew = !seen[adId];

    console.log(`Annuncio ${adId}: ${isNew ? 'NUOVO' : 'già visto'}`);// Controlla nuovi annunci per una keyword

    return isNew;async function checkKeyword(baseUrl, keyword, seen) {

  });  // Costruisce l'URL mantenendo il formato corretto

    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(keyword);

  if (adsToNotify.length > 0) {  console.log(`\n=== CONTROLLO RICERCA ===`);

    console.log(`Trovati ${adsToNotify.length} annunci per "${keyword}"`);  console.log(`Keyword: ${keyword}`);

      console.log(`URL ricerca: ${url}`);

    // Invia una notifica per ogni annuncio  

    for (const ad of adsToNotify) {  const html = await fetchSearch(url);

      const message = formatMessage(keyword, ad);  if (!html) {

      try {    console.log('Nessuna risposta HTML ricevuta');

        await sendMessage(message, { parse_mode: 'HTML' });    return;

        const adId = getAdId(ad);  }

        seen[adId] = {  

          url: ad.url,  const ads = parseAds(html);

          keyword,  

          title: ad.title,  // Calcola un ID univoco per ogni annuncio (usando titolo e prezzo)

          price: ad.price,  function getAdId(ad) {

          timestamp: ad.timestamp    return `${keyword}:${ad.title}:${ad.price || 'no-price'}`;

        };  }

        console.log('Notificato:', ad.url);  

      } catch (err) {  // Filtra gli annunci già visti usando l'ID univoco

        console.error('Errore invio notifica:', err.message);  const adsToNotify = ads.filter(ad => {

      }    const adId = getAdId(ad);

    }    const isNew = !seen[adId];

  } else {    console.log(`Annuncio ${adId}: ${isNew ? 'NUOVO' : 'già visto'}`);

    console.log(`Nessun annuncio per "${keyword}"`);    return isNew;

  }  });

}  

  if (adsToNotify.length > 0) {

// Formatta il messaggio Telegram    console.log(`Trovati ${adsToNotify.length} annunci per "${keyword}"`);

function formatMessage(keyword, ad) {    

  let msg = `🏍 <b>Nuovo annuncio per ${keyword}</b>\n\n`;    // Invia una notifica per ogni annuncio

  msg += `${ad.title}\n`;    for (const ad of adsToNotify) {

  if (ad.price) msg += `💰 ${ad.price}\n`;      const message = formatMessage(keyword, ad);

  if (ad.location) msg += `📍 ${ad.location}\n`;      try {

  msg += `\n🔗 ${ad.url}`;        await sendMessage(message, { parse_mode: 'HTML' });

  return msg;        const adId = getAdId(ad);

}        seen[adId] = {

          url: ad.url,

// Funzione principale          keyword,

async function main() {          title: ad.title,

  console.log('=== AVVIO WATCHER ===');          price: ad.price,

            timestamp: ad.timestamp

  const config = loadConfig();        };

  console.log('Config caricata:', config);        console.log('Notificato:', ad.url);

        } catch (err) {

  const seen = loadSeen();        console.error('Errore invio notifica:', err.message);

  console.log('Annunci visti:', Object.keys(seen).length);      }

      }

  const once = process.argv.includes('--once');  } else {

  console.log('Modalità:', once ? 'singola' : 'continua');    console.log(`Nessun annuncio per "${keyword}"`);

  console.log('Intervallo:', config.pollIntervalSeconds, 'secondi');  }

}

  // Funzione che esegue un ciclo di controllo

  async function runCheck() {// Formatta il messaggio Telegram

    console.log('\n=== Inizio controllo:', new Date().toISOString(), '===');function formatMessage(keyword, ad) {

      let msg = `🏍 <b>Nuovo annuncio per ${keyword}</b>\n\n`;

    // Prendi la prima (e unica) ricerca configurata  msg += `${ad.title}\n`;

    const search = config.searches[0];  if (ad.price) msg += `💰 ${ad.price}\n`;

      if (ad.location) msg += `📍 ${ad.location}\n`;

    // Controlla ogni keyword  msg += `\n🔗 ${ad.url}`;

    for (const keyword of search.queries) {  return msg;

      await checkKeyword(search.baseUrl, keyword, seen);}

    }

    // Funzione principale

    // Salva gli annunci vistiasync function main() {

    saveSeen(seen);  console.log('=== AVVIO WATCHER ===');

    console.log('=== Fine controllo ===\n');  

  }  const config = loadConfig();

  console.log('Config caricata:', config);

  // Esegui il primo controllo  

  await runCheck();  const seen = loadSeen();

  console.log('Annunci visti:', Object.keys(seen).length);

  // Se non è modalità singola, imposta l'intervallo  

  if (!once) {  const once = process.argv.includes('--once');

    setInterval(runCheck, config.pollIntervalSeconds * 1000);  console.log('Modalità:', once ? 'singola' : 'continua');

  } else {  console.log('Intervallo:', config.pollIntervalSeconds, 'secondi');

    process.exit(0);

  }  // Funzione che esegue un ciclo di controllo

}  async function runCheck() {

    console.log('\n=== Inizio controllo:', new Date().toISOString(), '===');

// Avvio del programma    

if (require.main === module) {    // Prendi la prima (e unica) ricerca configurata

  main().catch(err => {    const search = config.searches[0];

    console.error('Errore fatale:', err);    

    process.exit(1);    // Controlla ogni keyword

  });    for (const keyword of search.queries) {

}      await checkKeyword(search.baseUrl, keyword, seen);
    }
    
    // Salva gli annunci visti
    saveSeen(seen);
    console.log('=== Fine controllo ===\n');
  }

  // Esegui il primo controllo
  await runCheck();

  // Se non è modalità singola, imposta l'intervallo
  if (!once) {
    setInterval(runCheck, config.pollIntervalSeconds * 1000);
  } else {
    process.exit(0);
  }
}

// Avvio del programma
if (require.main === module) {
  main().catch(err => {
    console.error('Errore fatale:', err);
    process.exit(1);
  });
}
