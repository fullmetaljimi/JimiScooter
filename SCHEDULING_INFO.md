# 🕒 Scheduling Automatico Car Watcher

## Panoramica

Il modulo **car_watcher** ora include uno **scheduler automatico** che esegue scansioni:
- ⏰ **12:00** (mezzogiorno)
- ⏰ **18:00** (sera)

Ogni giorno, senza intervento manuale!

## Come Funziona

### 1. All'Avvio
- ✅ Esegue una scansione immediata
- ✅ Carica l'archivio delle auto già viste
- ✅ Attiva lo scheduler in background
- ✅ Rimane in esecuzione

### 2. Alle 12:00 e 18:00
- 🔍 Scansiona i siti configurati
- 📊 Confronta con l'archivio `data/seen_cars.json`
- 🆕 Se trova auto nuove:
  - Genera Excel con foto
  - Invia notifica + file su Telegram
  - Aggiorna l'archivio
- ⏭️ Se non trova novità: non fa nulla

## Avvio del Scheduler

### Setup Iniziale (Linux VM)

1. **Clone del repository sulla VM**:
```bash
cd /home/node
git clone <repository-url> subito-notifier
cd subito-notifier
```

2. **Esegui lo script di setup**:
```bash
chmod +x setup-linux.sh
./setup-linux.sh
```

### Opzioni di Avvio

#### Opzione 1: Test / Sviluppo (console visibile)
```bash
npm run start:car-watcher
```
Il programma resta attivo e mostra i messaggi. Premi **CTRL+C** per terminare.

#### Opzione 2: PM2 - Process Manager (CONSIGLIATO)
PM2 è il modo più semplice per gestire processi Node.js in produzione.

**Installazione e avvio**:
```bash
# Installa PM2 globalmente
npm install -g pm2

# Avvia car-watcher
pm2 start src/car_watcher.js --name car-watcher

# Salva la configurazione
pm2 save

# Configura avvio automatico al boot della VM
pm2 startup
# Copia ed esegui il comando che PM2 ti mostra
```

**Comandi utili PM2**:
```bash
pm2 list              # Vedi processi attivi
pm2 logs car-watcher  # Vedi i log in tempo reale
pm2 logs car-watcher --lines 100  # Ultimi 100 righe
pm2 stop car-watcher  # Ferma il processo
pm2 restart car-watcher  # Riavvia
pm2 delete car-watcher   # Rimuovi
pm2 monit            # Dashboard interattiva
```

#### Opzione 3: Systemd Service (Linux nativo)
Per un'integrazione completa con Linux.

**Installazione**:
```bash
# Modifica il file car-watcher.service con i percorsi corretti
sudo nano car-watcher.service

# Copia il file service
sudo cp car-watcher.service /etc/systemd/system/

# Ricarica systemd
sudo systemctl daemon-reload

# Abilita avvio automatico
sudo systemctl enable car-watcher

# Avvia il servizio
sudo systemctl start car-watcher
```

**Comandi utili systemd**:
```bash
sudo systemctl status car-watcher   # Verifica stato
sudo systemctl stop car-watcher     # Ferma
sudo systemctl restart car-watcher  # Riavvia
sudo journalctl -u car-watcher -f   # Vedi i log in tempo reale
sudo journalctl -u car-watcher --since today  # Log di oggi
```

#### Opzione 4: Screen / Tmux (alternativa leggera)
Per sessioni persistenti senza installare PM2.

**Con screen**:
```bash
# Installa screen (se non presente)
sudo apt install screen

# Avvia una nuova sessione
screen -S car-watcher

# Esegui il watcher
npm run start:car-watcher

# Stacca dalla sessione: CTRL+A poi D
# Riattacca: screen -r car-watcher
```

**Con tmux**:
```bash
# Installa tmux (se non presente)
sudo apt install tmux

# Avvia una nuova sessione
tmux new -s car-watcher

# Esegui il watcher
npm run start:car-watcher

# Stacca dalla sessione: CTRL+B poi D
# Riattacca: tmux attach -t car-watcher
```

## Configurazione

### Modificare gli Orari

Modifica il file [src/car_watcher.js](src/car_watcher.js) alle righe dello scheduler:

```javascript
// Scansione alle 12:00 (mezzogiorno)
cron.schedule('0 12 * * *', () => {
  runScheduledScan();
}, {
  timezone: 'Europe/Rome'
});

// Scansione alle 18:00 (sera)
cron.schedule('0 18 * * *', () => {
  runScheduledScan();
}, {
  timezone: 'Europe/Rome'
});
```

#### Sintassi Cron:
```
┌────────────── minuto (0-59)
│ ┌──────────── ora (0-23)
│ │ ┌────────── giorno del mese (1-31)
│ │ │ ┌──────── mese (1-12)
│ │ │ │ ┌────── giorno della settimana (0-7, 0 e 7 = domenica)
│ │ │ │ │
* * * * *
```

**Esempi**:
- `0 12 * * *` → Ogni giorno alle 12:00
- `0 */6 * * *` → Ogni 6 ore
- `30 8,20 * * *` → Alle 8:30 e 20:30
- `0 9 * * 1-5` → Lun-Ven alle 9:00
- `0 10,14,18 * * *` → Alle 10:00, 14:00 e 18:00

### Disattivare la Scansione Iniziale

Se non vuoi la scansione all'avvio, modifica:

```javascript
const SCAN_ON_STARTUP = false; // Cambia true in false
```

## File di Memoria

### `data/seen_cars.json`
Contiene tutti gli URL delle auto già viste:

```json
{
  "lastUpdate": "2026-04-03T19:54:50.948Z",
  "totalCars": 24,
  "urls": [
    "https://spaziogenova.it/veicoli/fiat-panda-...",
    ...
  ]
}
```

### Reset Archivio
Per forzare una scansione completa elimina il file:
```bash
Remove-Item data\seen_cars.json
```

## Notifiche Telegram

### Quando Ricevi Notifiche
📱 Ricevi un messaggio Telegram **SOLO** quando vengono trovate auto nuove:

```
🚗 Nuove Auto Trovate!

✨ 3 nuove auto disponibili
📊 Report Excel allegato con tutti i dettagli

🔍 Ordinate per anno più recente e km minori
```

+ File Excel allegato con foto

### Nessuna Notifica Se
- ❌ Nessuna auto nuova (tutte già viste)
- ❌ Il sito è irraggiungibile
- ❌ Errore durante la scansione

## Monitoraggio

### Verifica che lo Scheduler sia Attivo

#### Con PM2:
```bash
pm2 status
pm2 logs car-watcher --lines 50
```

#### Con systemd:
```bash
sudo systemctl status car-watcher
sudo journalctl -u car-watcher -n 50
```

#### Cerca il processo Node manualmente:
```bash
ps aux | grep car_watcher
# oppure
pgrep -f car_watcher
```

### Verifica Ultima Scansione
Controlla il file di archivio:
```bash
head -n 3 data/seen_cars.json
# oppure
cat data/seen_cars.json | jq '.lastUpdate, .totalCars'
```

Mostra la data dell'ultimo aggiornamento in `lastUpdate`.

## Log e Debugging

### Vedere i Log in Tempo Reale
Se usi PM2:
```bash
pm2 logs car-watcher --lines 100
```

### Testare Manualmente la Scansione
```bash
npm run start:car-watcher
```

Poi premi CTRL+C appena finisce la scansione iniziale.

## Troubleshooting

### "Lo scheduler non parte"
1. Verifica che node-cron sia installato:
   ```bash
   npm install
   ```
2. Controlla errori nel codice:
   ```bash
   node src/car_watcher.js
   ```

### "Non ricevo notifiche Telegram"
1. Verifica configurazione in `config/config.json`:
   ```json
   {
     "telegram": {
       "botToken": "TUO_TOKEN",
       "chatId": "TUO_CHAT_ID"
     }
   }
   ```
2. Testa manualmente:
   ```bash
   npm run start:bot
   ```

### "Trova sempre le stesse auto come nuove"
Il file `data/seen_cars.json` potrebbe essere corrotto:
```bash
rm data/seen_cars.json
npm run start:car-watcher
```

## Best Practices

### 1. **Backup Periodici**
Fai backup di `data/seen_cars.json` per non perdere lo storico:
```bash
# Backup manuale
cp data/seen_cars.json data/seen_cars_backup_$(date +%Y%m%d).json

# Cronjob automatico (ogni giorno alle 3 AM)
crontab -e
# Aggiungi:
# 0 3 * * * cd /home/node/subito-notifier && cp data/seen_cars.json data/seen_cars_backup_$(date +\%Y\%m\%d).json
```

### 2. **Più Siti**
Aggiungi altri URL da monitorare in `URLS`:
```javascript
const URLS = [
  'https://spaziogenova.it/auto-usate-e-km-zero/?...',
  'https://altro-sito.com/auto?marca=Fiat',
  'https://terzo-sito.it/usato'
];
```

### 3. **Filtri Personalizzati**
Modifica gli URL per raffinare la ricerca:
```
?_sfm_marca=FIAT&_sfm_modello=Panda&_sfm_prezzo=8400+15000
```

### 4. **Evita Sovraccarico**
Non esagerare con la frequenza:
- ✅ 2 volte al giorno → OK
- ⚠️ Ogni ora → Eccessivo, rischio ban
- ❌ Ogni minuto → Mai!

## Riepilogo Comandi

| Comando | Descrizione |
|---------|-------------|
| `npm run start:car-watcher` | Avvia scheduler (console) |
| `pm2 start src/car_watcher.js --name car-watcher` | Avvia come servizio background |
| `pm2 stop car-watcher` | Ferma il servizio |
| `pm2 logs car-watcher` | Vedi i log |
| `pm2 restart car-watcher` | Riavvia |
| CTRL+C | Termina (se in console) |

## Prossimi Passi

1. ✅ Avvia lo scheduler
2. ✅ Lascia il programma in esecuzione
3. ✅ Ricevi notifiche automatiche
4. 🎉 Goditi le notifiche solo per auto nuove!

---

**Nota**: Il programma usa il fuso orario `Europe/Rome`. Se sei in un altro fuso, modifica `timezone` nel codice.
