const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const url = 'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda&_sfm_prezzo=8400+34060';

async function inspectPage() {
  try {
    console.log('Scarico la pagina...\n');
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const $ = cheerio.load(data);
    
    console.log('=== STRUTTURA PAGINA ===\n');
    
    // Cerca tutti i link
    console.log('Link trovati:');
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (href.includes('auto') || href.includes('usato') || href.includes('fiat') || href.includes('panda'))) {
        console.log(`  ${i}: ${text.substring(0, 50)} -> ${href}`);
      }
    });
    
    console.log('\n=== CLASSI COMUNI ===\n');
    const classes = new Set();
    $('[class]').each((_, el) => {
      const classList = $(el).attr('class').split(' ');
      classList.forEach(c => {
        if (c.includes('car') || c.includes('vehicle') || c.includes('item') || c.includes('product') || c.includes('auto')) {
          classes.add(c);
        }
      });
    });
    console.log(Array.from(classes).join(', '));
    
    console.log('\n=== ARTICLE TAGS ===\n');
    $('article').each((i, el) => {
      console.log(`Article ${i}: class="${$(el).attr('class')}", id="${$(el).attr('id')}"`);
      const firstLink = $(el).find('a').first();
      if (firstLink.length) {
        console.log(`  -> Link: ${firstLink.attr('href')}`);
      }
    });
    
  } catch (error) {
    console.error('Errore:', error.message);
  }
}

inspectPage();
