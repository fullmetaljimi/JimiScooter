# Subito Notifier

Progetto minimo Node.js che contiene due script:

- `src/send_telegram.js`: invia messaggi via Telegram Bot API
- `src/subito_watcher.js`: interroga pagine di ricerca di subito.it e notifica i nuovi annunci via Telegram

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
