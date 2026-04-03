# Car Watcher - Documentazione

## Panoramica
Il modulo `car_watcher.js` è progettato per scansionare automaticamente siti web di vendita auto, estrarre informazioni dettagliate su ogni veicolo e generare report ordinati.

## Funzionalità
- ✅ Scansiona URL multipli configurabili
- ✅ Estrae automaticamente: anno, chilometraggio, prezzo
- ✅ Genera report ordinato per:
  1. Anno più recente (decrescente)
  2. Chilometraggio minore (crescente)
- ✅ Evita duplicati memorizzando gli URL già processati
- ✅ Esportazione report in JSON
- ✅ Scansione periodica opzionale

## Configurazione

### 1. Aggiorna config/config.json
Gli URL da monitorare sono configurabili nel file `config.json`:

```json
"carWatcher": {
  "enabled": true,
  "urls": [
    "https://example-auto-site.com/annunci/auto-usate",
    "https://another-car-site.com/lista-auto"
  ],
  "scanIntervalMinutes": 30,
  "exportReportToJson": true,
  "reportPath": "./data/car_report.json"
}
```

### 2. Personalizza i selettori CSS
⚠️ **IMPORTANTE**: Devi adattare i selettori CSS nel file `src/car_watcher.js` in base al sito web target.

Cerca queste sezioni nel codice e personalizzale:

**Per estrarre i link dalla lista:**
```javascript
// Linea ~35 circa
$('a[href*="/annuncio/"], a.item-link, .car-listing a').each((_, el) => {
  // Adatta questi selettori al tuo sito
});
```

**Per estrarre i dettagli dell'auto:**
```javascript
// Linea ~80 circa
const annoMatch = data.match(/(?:Anno|Year|Immatricolazione)[:\s]*(\d{4})/i);
const kmMatch = data.match(/(?:Chilometr|Km|Mileage)[:\s]*([\d.]+)/i);
const prezzoMatch = data.match(/(?:Prezzo|Price|€)[:\s]*([\d.]+)/i);
```

## Come Usare

### Avvio Singolo
Esegui una scansione singola:
```bash
npm run start:car-watcher
```

### Scansione Periodica
Per abilitare la scansione periodica, decomenta le ultime righe del file `car_watcher.js`:

```javascript
const INTERVALLO_MINUTI = 30;
setInterval(() => {
  console.log('\n🔄 Avvio nuova scansione periodica...\n');
  processAllUrls();
}, INTERVALLO_MINUTI * 60 * 1000);
```

### Esportare il Report JSON
Per esportare i risultati in JSON, decomenta questa linea:

```javascript
exportReportToJson('./data/car_report.json');
```

## Output del Report

Il report mostra tutte le auto trovate ordinate per:
1. **Anno più recente** (le auto del 2026 prima, poi 2025, ecc.)
2. **Chilometraggio minore** (a parità di anno, quelle con meno km vengono prima)

### Esempio Output Console:
```
📊 === REPORT AUTO TROVATE ===

Totale auto nel database: 15

════════════════════════════════════════════════════════════════════════════════

1. Fiat 500X 1.6 Multijet
   Anno:    2025
   Km:      12,000 km
   Prezzo:  €18,500
   Link:    https://example.com/auto/123
────────────────────────────────────────────────────────────────────────────────

2. Volkswagen Golf 1.5 TSI
   Anno:    2025
   Km:      8,500 km
   Prezzo:  €22,000
   Link:    https://example.com/auto/456
────────────────────────────────────────────────────────────────────────────────
...
```

## Integrazione con subito_watcher

I due moduli funzionano in modo indipendente e possono essere eseguiti contemporaneamente:

### Terminale 1 - Subito Watcher:
```bash
npm run start:watch
```

### Terminale 2 - Car Watcher:
```bash
npm run start:car-watcher
```

## Note Tecniche

### Evitare il Ban
Il modulo include:
- Pausa di 1 secondo tra richieste consecutive
- User-Agent configurato per simulare un browser
- Memorizzazione degli URL già processati per evitare richieste duplicate

### Gestione Errori
- Errori di rete vengono catturati e loggati
- JSON non validi vengono ignorati
- Continua a processare anche se un singolo annuncio fallisce

### Dati Mancanti
Se un dato (anno, km, prezzo) non viene trovato, viene mostrato come "❓ N/A" nel report.

## Personalizzazione Avanzata

### Modifica l'ordinamento
Nella funzione `generateReport()` puoi cambiare la logica di sorting:

```javascript
const sortedCars = [...carsDatabase].sort((a, b) => {
  // Esempio: ordina solo per prezzo crescente
  if (a.prezzo !== null && b.prezzo !== null) {
    return a.prezzo - b.prezzo;
  }
  return 0;
});
```

### Aggiungere filtri
Puoi filtrare le auto prima di generare il report:

```javascript
// Mostra solo auto con meno di 50.000 km e prezzo sotto €20.000
const filteredCars = sortedCars.filter(car => 
  car.km !== null && car.km < 50000 &&
  car.prezzo !== null && car.prezzo < 20000
);
```

## Troubleshooting

### "Trovati 0 annunci nella lista"
- Verifica che gli URL siano corretti e accessibili
- Controlla che i selettori CSS siano adatti al sito target
- Usa gli strumenti di sviluppo del browser (F12) per ispezionare l'HTML

### "Anno/Km/Prezzo mostrano N/A"
- I pattern regex potrebbero non corrispondere al formato del sito
- Aggiungi stampe di debug per vedere l'HTML grezzo:
```javascript
console.log('HTML:', data.substring(0, 1000));
```

### Errori 403/429
- Il sito potrebbe bloccare richieste automatiche
- Aumenta la pausa tra richieste
- Aggiungi più header HTTP per simulare un browser reale
