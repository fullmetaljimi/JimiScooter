# Subito Notifier + Car Watcher

Progetto Node.js che contiene:

- `src/send_telegram.js`: invia messaggi via Telegram Bot API
- `src/subito_watcher.js`: interroga pagine di ricerca di subito.it e notifica i nuovi annunci via Telegram
- **`src/car_watcher.js`**: monitora siti di auto con scheduling automatico (12:00 e 18:00), genera Excel con foto e notifica solo le novità

## 🚗 Car Watcher - Monitoraggio Auto Automatico

Il modulo **car_watcher** è pensato per essere deployato su una **VM Linux** e include:
- ✅ Scansioni automatiche alle 12:00 e 18:00 ogni giorno
- ✅ Persistenza: memorizza auto già viste in `data/seen_cars.json`
- ✅ Report Excel con foto di ogni auto
- ✅ Notifiche Telegram solo per auto nuove
- ✅ Ordinamento intelligente: anno recente → km bassi

### Quick Start (Linux VM)
```bash
# Setup
npm install
chmod +x setup-linux.sh
./setup-linux.sh

# Avvio in produzione con PM2
npm install -g pm2
pm2 start src/car_watcher.js --name car-watcher
pm2 save
pm2 startup
```

📖 **Documentazione completa**: [DEPLOY_LINUX.md](DEPLOY_LINUX.md)

### 🚀 Deploy Automatico su Google Cloud

Per configurare il **deploy automatico** su Google Cloud Platform con GitHub Actions e PM2:

```bash
# Sulla VM Google Cloud
./setup-gcp.sh
```

Ogni push su `main` attiverà automaticamente:
- 🔄 Pull del codice
- 📦 Installazione dipendenze
- ♻️ Restart PM2

📖 **Guida completa**: [DEPLOY_GCP.md](DEPLOY_GCP.md)

---

## Subito.it Watcher (originale)

Installazione

1. Installa dipendenze:

```powershell
npm install
```

2. Copia `config/config.example.json` in `config/config.json` oppure modifica `config/config.json` con il tuo token e chat id (il file `config/config.json` è incluso nella .gitignore di default qui).

3. Aggiungi le URL di ricerca che ti interessano dentro `config/config.json` -> `searches`.

Esempi di esecuzione

Eseguire il watcher in loop (polling every pollIntervalSeconds):

```powershell
npm run start:watch
```

Eseguire il watcher una sola volta (utile per test):

```powershell
npm run start:watch:once
```

Inviare un messaggio di prova con il bot (usa config o variabili d'ambiente):

```powershell
npm run start:bot -- "Messaggio di prova"
```

Note di sicurezza

- Non committare il `config/config.json` con token reali in repository pubblici. Questo scaffold aggiunge `config/config.json` a `.gitignore`.

Limitazioni

- Il parser di `subito_watcher` usa una euristica semplice per estrarre link e titoli. Se Subito.it cambia markup potrebbe essere necessario adattarlo.
