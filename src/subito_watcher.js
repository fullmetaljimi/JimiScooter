const axios = require('axios');
const cheerio = require('cheerio');

//const URL = 'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=people+125';
let knownUrls = new Set();

const URLS = [
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=people+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=liberty+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=symphony+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=sh+mode+125',
  'https://www.subito.it/annunci-liguria/vendita/moto-e-scooter/genova/?q=agility+125'
];

async function checkNewAds(URL) {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Mostra i primi 2000 caratteri dell'HTML
    //console.log('📄 HTML della pagina:\n', $);
    const scripts = $('script[type="application/ld+json"]'); 
    let newFound = false;

    $('script[type="application/json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        let ar = [];
        ar = json.props.pageProps.initialState.items.list

        const items = Array.isArray(json) ? json : [json];
        console.log(ar.length + ' annunci trovati nella pagina.');
        ar.forEach(item => {

            let title = item.item.subject;
            let url = item.item.urls.default;
            let cc = item.item.features['/cubic_capacity'].values[0].value;
            let price = item.item.features['/price'].values[0].value;
            console.log(`🆕 Nuovo annuncio: ${title} - ${url} - ${cc}cc - €${price}`);


            knownUrls.add(item.url);
            newFound = true;
        //  }
        });
      } catch (err) {
        // Ignora blocchi non validi
      }
    });

    if (!newFound) {
      console.log('⏳ Nessun nuovo annuncio trovato.');
    }
  } catch (error) {
    console.error('❌ Errore durante la richiesta:', error.message);
  }
}

// Avvia subito, poi ogni 10 minuti
//checkNewAds();
checkAllUrls = () => {
  for (const url of URLS) {
    console.log(`\n🔍 Controllo nuovi annunci per: ${url}`);
    checkNewAds(url);
  }
};

checkAllUrls();
setInterval(checkNewAds, 10 * 60 * 1000);
