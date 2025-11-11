const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./send_telegram');
const express = require('express');
const app = express();

app.get('/keepalive', (req, res) => {
  res.send('JimiScooter bot is running');
});

app.listen(8080, () => {
  console.log('Listener attivo su porta 8080 per uptime robot');
});

const SEEN_PATH = path.join(__dirname, '..', 'data', 'seen.json');

//const URL = 'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=people+125';
let knownUrls = new Set();

const URLS = [
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=people+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=liberty+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=symphony+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=sh+mode+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=agility+125'
];

function loadSeen() {
console.log("Caricamento file dei visti...");
  try {

      // crea la cartella data se non esiste
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Cartella data creata!');
      }
      // crea file dei visti vuoto come oggetto se non esiste
      if (!fs.existsSync(SEEN_PATH))  {
        console.log("non c'è file dei visti, lo creo...");
        fs.writeFileSync(SEEN_PATH, JSON.stringify({}, null, 2), 'utf8');
        console.log('File SEEN vuoto creato con successo!');
      }
      return JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8'));
  } catch (err) {

    console.log("Errore ad aprire seen.json " + err.message);

  }

} 

async function checkNewAds(URL) {
  try {
    const { data } = await axios.get(URL, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://www.google.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    // Mostra i primi 2000 caratteri dell'HTML
    //console.log('📄 HTML della pagina:\n', $);
    const scripts = $('script[type="application/ld+json"]'); 
    let newFound = false;
  // ...existing code...
    $('script[type="application/json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        let ar = [];
        ar = json.props.pageProps.initialState.items.list

        const items = Array.isArray(json) ? json : [json];
        ar.forEach(item => {
            let title = item.item.subject;
            let url = item.item.urls.default;
            let cc = item.item.features['/cubic_capacity']?.values[0].value;
            let price = item.item.features['/price']?.values[0].value;
            if (!knownUrls.has(url)) {
              console.log(`🆕 Nuovo annuncio: ${title} - ${url} - ${cc} - €${price}`);
              knownUrls.add(url);
              newFound = true;
              // Invia messaggio Telegram
              const msg = `🆕 ${title}\nPrezzo: €${price}\nURL: ${url}`;
              sendMessage(msg)
                .then(() => console.log(`Messaggio Telegram: ${url} inviato!`))
                .catch(err => console.error('Errore invio Telegram:', err));
            }
        });
      } catch (err) {
        console.log("c'è stato un errore: " + JSON.stringify(err) + " message: " + err.message + "  nello script: " + $(el).html().substring(0, 100) + "...")
      }
      
    });

    if (!newFound) {
      console.log('⏳ Nessun nuovo annuncio trovato.');
    } else {
      // Salva il Set come array di titoli
      fs.writeFileSync(SEEN_PATH, JSON.stringify(Array.from(knownUrls), null, 2), 'utf8');
    }
  } catch (error) {
    console.log(JSON.stringify(error));
    console.error('❌ Errore durante la richiesta: ', error.message);
  }
}

startAllStuff = () => {
  // Carica i visti come array di URL e aggiorna il Set globale
  const seenArr = loadSeen();
  knownUrls = new Set(Array.isArray(seenArr) ? seenArr : []);
  checkAllUrls();
}

// Avvia subito, poi ogni 10 minuti
//checkNewAds();
checkAllUrls = () => {
  for (const url of URLS) {
    console.log(`\n🔍 Controllo nuovi annunci per: ${url}`);
    checkNewAds(url);
  }
};
startAllStuff();
setInterval(startAllStuff, 10 * 60 * 1000);
