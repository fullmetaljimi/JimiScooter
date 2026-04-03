const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const url = 'https://spaziogenova.it/veicoli/fiat-panda-iii-2021-1-0-firefly-hybrid-ss-70cv-10837468/';

async function inspectCarPage() {
  try {
    console.log('Scarico pagina auto...\n');
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const $ = cheerio.load(data);
    
    // Salva l'HTML per analisi
    fs.writeFileSync('debug_car_page.html', data, 'utf-8');
    console.log('✅ HTML salvato in debug_car_page.html\n');
    
    console.log('=== TITOLO ===');
    console.log('h1:', $('h1').text().trim());
    console.log('.title:', $('.title').text().trim());
    console.log('.car-title:', $('.car-title').text().trim());
    
    console.log('\n=== PREZZO ===');
    console.log('Cerca "prezzo" nel testo...');
    const pricePatterns = [
      /prezzo[:\s]*€?\s*([\d.]+)/i,
      /€\s*([\d.]+)/,
      /(\d[\d.]*)\s*€/,
      /price[:\s]*€?\s*([\d.]+)/i
    ];
    pricePatterns.forEach((pattern, i) => {
      const match = data.match(pattern);
      if (match) console.log(`  Pattern ${i}: ${match[0]} -> ${match[1]}`);
    });
    
    console.log('\n=== KM ===');
    console.log('Cerca "km" nel testo...');
    const kmPatterns = [
      /chilometr[ia][:\s]*([\d.]+)\s*km/i,
      /km[:\s]*([\d.]+)/i,
      /(\d[\d.]*)\s*km/i,
      /mileage[:\s]*([\d.]+)/i
    ];
    kmPatterns.forEach((pattern, i) => {
      const match = data.match(pattern);
      if (match) console.log(`  Pattern ${i}: ${match[0]} -> ${match[1]}`);
    });
    
    console.log('\n=== ANNO ===');
    console.log('Cerca anno nel testo...');
    const yearPatterns = [
      /anno[:\s]*(\d{4})/i,
      /immatricolazione[:\s]*(\d{4})/i,
      /year[:\s]*(\d{4})/i,
      /\b(20[0-2]\d)\b/
    ];
    yearPatterns.forEach((pattern, i) => {
      const match = data.match(pattern);
      if (match) console.log(`  Pattern ${i}: ${match[0]} -> ${match[1]}`);
    });
    
    console.log('\n=== JSON-LD ===');
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const json = JSON.parse($(el).html());
        console.log(`JSON ${i}:`, JSON.stringify(json, null, 2).substring(0, 500));
      } catch (e) {
        console.log(`JSON ${i}: errore parsing`);
      }
    });
    
    console.log('\n=== META TAGS ===');
    console.log('og:title:', $('meta[property="og:title"]').attr('content'));
    console.log('og:description:', $('meta[property="og:description"]').attr('content'));
    console.log('og:image:', $('meta[property="og:image"]').attr('content'));
    
    console.log('\n=== IMMAGINI ===');
    $('img').slice(0, 5).each((i, el) => {
      console.log(`Img ${i}: src="${$(el).attr('src')}", class="${$(el).attr('class')}"`);
    });
    
  } catch (error) {
    console.error('Errore:', error.message);
  }
}

inspectCarPage();
