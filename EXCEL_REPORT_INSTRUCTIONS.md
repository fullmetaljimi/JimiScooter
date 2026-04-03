# 📊 Report Excel con Immagini - Istruzioni

## Nuove Funzionalità

Il modulo `car_watcher.js` è stato aggiornato per generare automaticamente un **report Excel** con:

✅ **Foto principale di ogni auto**  
✅ Dettagli completi (Anno, Km, Prezzo)  
✅ Link cliccabili agli annunci  
✅ Ordinamento automatico (anno recente + km bassi)  
✅ Formattazione professionale con colori e bordi  

## Come Usare

### 1. Configura gli URL
Modifica il file `src/car_watcher.js` e inserisci gli URL delle pagine con le liste di auto:

```javascript
const URLS = [
  'https://spaziogenova.it/auto-usate-e-km-zero/?_sfm_marca=FIAT&_sfm_modello=Panda',
  'https://altro-sito.com/auto',
  // Aggiungi altri URL qui
];
```

### 2. Avvia la Scansione
Esegui il comando:

```bash
npm run start:car-watcher
```

### 3. Trova il Report Excel
Il file verrà salvato automaticamente in:

```
📁 data/report_auto.xlsx
```

## Struttura del Report Excel

| Foto | Titolo | Anno | Km | Prezzo (€) | Link |
|------|--------|------|----|-----------:|------|
| 🖼️ | Fiat Panda 1.2 | 2025 | 12,000 | 15,500 | [Apri annuncio] |
| 🖼️ | Fiat Panda 0.9 Twinair | 2024 | 5,000 | 14,800 | [Apri annuncio] |
| ... | ... | ... | ... | ... | ... |

### Caratteristiche:

- **Riga intestazione**: Blu con testo bianco in grassetto
- **Foto**: Dimensioni ottimizzate (130x90px) nella prima colonna
- **Altezza righe**: Automatiche per contenere le immagini
- **Link**: Cliccabili direttamente da Excel
- **Ordinamento**: Per anno decrescente, poi km crescente
- **Bordi**: Tabella con bordi su tutte le celle

## Personalizzazione Selettori

### Immagini
Se le immagini non vengono estratte correttamente, modifica i selettori CSS in `car_watcher.js` (linea ~85):

```javascript
const imgSelectors = [
  'meta[property="og:image"]',      // Open Graph (più comune)
  'img.main-image',                  // Classe immagine principale
  'img.car-image',                   // Classe specifica per auto
  '.gallery img',                    // Prima immagine della gallery
  'img[itemprop="image"]',          // Schema.org
  '.product-image img'              // Immagine prodotto
];
```

### Dati Auto
I pattern regex per estrarre anno, km e prezzo sono alla linea ~100-120:

```javascript
const annoMatch = data.match(/(?:Anno|Year|Immatricolazione)[:\s]*(\d{4})/i);
const kmMatch = data.match(/(?:Chilometr|Km|Mileage)[:\s]*([\d.]+)/i);
const prezzoMatch = data.match(/(?:Prezzo|Price|€)[:\s]*([\d.]+)/i);
```

## Risoluzione Problemi

### ❌ "Nessuna auto trovata"
**Soluzione**: Verifica che i selettori CSS per i link delle auto siano corretti:

```javascript
// Linea ~35 in extractCarLinksFromList()
$('a[href*="/annuncio/"], a.item-link, .car-listing a').each((_, el) => {
```

Usa gli strumenti di sviluppo del browser (F12) per ispezionare il sito e trovare il selettore corretto.

### ⚠️ "Impossibile scaricare l'immagine"
**Cause possibili**:
- L'immagine richiede autenticazione
- L'URL è malformato
- Il server blocca il download

**Soluzione**: Il report verrà comunque generato senza l'immagine.

### ⚠️ Foto non visualizzate in Excel
**Soluzione**: 
1. Controlla che il selettore delle immagini sia corretto
2. Verifica che gli URL delle immagini siano assoluti (non relativi)
3. Assicurati che le immagini siano in formato JPG o PNG

### 📁 File Excel non si apre
**Soluzione**: 
- Chiudi Excel se è già aperto sul file
- Controlla che la cartella `data/` esista
- Verifica i permessi di scrittura

## Esempio di Utilizzo Completo

```bash
# 1. Installa le dipendenze (prima volta)
npm install

# 2. Modifica gli URL nel file src/car_watcher.js
# (usa il tuo editor preferito)

# 3. Avvia la scansione
npm run start:car-watcher

# 4. Attendi il completamento
# Output: "✅ Report Excel generato con successo!"

# 5. Apri il file Excel
start data/report_auto.xlsx   # Su Windows
# oppure
open data/report_auto.xlsx    # Su Mac
```

## Formati Immagine Supportati

- ✅ JPG/JPEG
- ✅ PNG
- ✅ GIF
- ⚠️ WEBP (potrebbe richiedere conversione)

## Performance

- **Tempo medio per auto**: ~2-3 secondi (incluso download immagine)
- **Pausa tra richieste**: 1 secondo (per evitare il ban)
- **Pausa tra download immagini**: 0.5 secondi

### Per 50 auto:
- Scansione: ~2-3 minuti
- Download immagini: ~30 secondi
- Creazione Excel: ~5 secondi
- **Totale**: ~3-4 minuti

## Note Importanti

### 📵 Telegram
Come richiesto, **nessun messaggio verrà inviato su Telegram**. Il modulo si limita a:
- Scansionare i siti
- Generare il report console
- Creare il file Excel

### 🔄 Aggiornamenti
Per rieseguire la scansione e aggiornare il report:
```bash
npm run start:car-watcher
```

Il file `data/report_auto.xlsx` verrà sovrascritto con i nuovi dati.

### 💾 Backup
Se vuoi conservare i report precedenti, rinominali prima di rieseguire:
```bash
# Windows PowerShell
Move-Item data/report_auto.xlsx data/report_auto_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').xlsx

# Linux/Mac
mv data/report_auto.xlsx data/report_auto_backup_$(date +%Y%m%d_%H%M%S).xlsx
```

## Prossimi Sviluppi Possibili

- [ ] Filtri avanzati (per anno, km, prezzo)
- [ ] Grafici automatici in Excel
- [ ] Confronto prezzi tra scansioni
- [ ] Notifiche solo per nuove auto (senza spam)
- [ ] Export in formato PDF

## Supporto

Per problemi o domande, controlla:
1. La console per messaggi di errore dettagliati
2. Il file `CAR_WATCHER_README.md` per info generali
3. Gli esempi di personalizzazione in questo file
