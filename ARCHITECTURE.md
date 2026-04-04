# 📋 Sistema di Notifiche - Architettura

## 🏗️ Struttura Modulare

Il sistema è ora organizzato in moduli separati per massima flessibilità:

```
src/
├── main.js              ← 🎯 PUNTO DI INGRESSO PRINCIPALE
├── scheduler.js         ← ⏰ Gestione cron job schedulati
├── car_watcher.js       ← 🚗 Logica scansione auto (esportabile)
├── subito_watcher.js    ← 🛵 Logica scansione scooter
└── send_telegram.js     ← 📱 Funzioni Telegram
```

## 🚀 Come Avviare

### Tutto insieme (CONSIGLIATO)
```bash
node src/main.js
```

Avvia:
- 🛵 Subito Watcher (modalità continua)
- 🚗 Car Watcher (scansione iniziale + scheduling)
- ⏰ Scheduler (cron alle 12:00 e 18:00)
- 📱 Telegram Listener

### Singolarmente (per test)

```bash
# Solo Car Watcher (esegue 1 scan e termina)
node src/car_watcher.js

# Solo Subito Watcher
node src/subito_watcher.js

# Solo Test Excel
npm run test:car-excel
```

## ⏰ Scheduling

I job schedulati sono gestiti in **`scheduler.js`** con una **configurazione completamente flessibile**:

### API dello Scheduler

Lo scheduler accetta un **array di configurazioni** - ogni modulo può specificare:
- **Nome** e **icona** del job
- **Funzione handler** da eseguire  
- **Uno o più schedule** (pattern cron) con label opzionali

```javascript
startScheduler([
  {
    name: 'Car Watcher',           // Nome del modulo
    icon: '🚗',                     // Emoji per i log
    handler: runCarScan,            // Funzione async da eseguire
    schedules: [                    // Array di schedule
      { pattern: '0 12 * * *', label: 'ore 12:00 (mezzogiorno)' },
      { pattern: '0 18 * * *', label: 'ore 18:00 (sera)' }
    ]
  },
  {
    name: 'Subito Watcher',
    icon: '🛵',
    handler: runSubitoScan,
    schedules: ['*/30 * * * *']     // Anche stringhe semplici (senza label)
  }
])
```

### Attualmente configurati:
- 🚗 **Car Watcher**: 12:00 e 18:00 (ogni giorno)

### Pattern Cron comuni:
```
'0 12 * * *'      → Ogni giorno alle 12:00
'30 8 * * *'      → Ogni giorno alle 8:30  
'0 9,18 * * *'    → Ogni giorno alle 9:00 e 18:00
'*/15 * * * *'    → Ogni 15 minuti
'0 0 1 * *'       → Il 1° di ogni mese
'0 9 * * 1'       → Ogni lunedì alle 9:00
```

## 📁 Architettura dei Moduli

### `main.js` (Orchestratore)
- Importa tutti i moduli
- Avvia i watcher
- Configura lo scheduler
- Gestisce il graceful shutdown

### `scheduler.js` (Timing)
- **Completamente generico** e configurabile
- Accetta array di job con pattern cron personalizzabili
- Ogni job può avere multipli schedule
- Supporta label personalizzate per i log
- Fornisce metodo `.stop()` per graceful shutdown

### `car_watcher.js` (Logica Auto)
- Esporta `runCarScan()` come funzione
- Può essere usato da scheduler o eseguito direttamente
- Modalità standalone: esegue 1 scan e termina

### `subito_watcher.js` (Logica Scooter)
- Modalità continua (polling costante)
- Gestione propria del timing

## 🛠️ Vantaggi Architettura

✅ **Modulare**: Ogni componente ha una responsabilità chiara  
✅ **Testabile**: Ogni modulo può essere eseguito/testato separatamente  
✅ **Flessibile**: Facile aggiungere nuovi scheduler o watcher  
✅ **Manutenibile**: Modifiche isolate non impattano altri moduli  

## 🔧 Aggiungere Nuovi Job Schedulati

**Processo semplificato** - tutto si configura in `main.js`:

### 1. Crea/esporta la funzione da schedulare
```javascript
// src/mio_nuovo_watcher.js
async function runMioScan() {
  console.log('Eseguo la mia scansione...');
  // La tua logica qui
}

module.exports = runMioScan;
```

### 2. Importa e aggiungi allo scheduler in `main.js`
```javascript
const runMioScan = require('./mio_nuovo_watcher');

const scheduler = startScheduler([
  {
    name: 'Car Watcher',
    icon: '🚗',
    handler: runCarScan,
    schedules: [
      { pattern: '0 12 * * *', label: 'ore 12:00' },
      { pattern: '0 18 * * *', label: 'ore 18:00' }
    ]
  },
  {
    // ← NUOVO JOB
    name: 'Mio Watcher',
    icon: '⭐',
    handler: runMioScan,
    schedules: [
      { pattern: '0 10 * * *', label: 'ore 10:00 del mattino' }
    ]
  }
]);
```

### 3. Fatto! ✅

**Non serve modificare `scheduler.js`** - è completamente generico e gestisce automaticamente tutti i job che gli passi.

### Vantaggi:
- ✅ **Zero modifiche** allo scheduler
- ✅ **Configurazione centralizzata** in main.js
- ✅ **Massima flessibilità** - ogni job può avere multipli orari
- ✅ **Label personalizzabili** per log più chiari

## 🛑 Fermata Pulita

Premi `CTRL+C` - lo scheduler fermerà ordinatamente tutti i job attivi.
