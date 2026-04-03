# 🚀 Car Watcher - Deployment su Linux VM

## Quick Start

### 1. Prerequisiti sulla VM Linux
```bash
# Aggiorna il sistema
sudo apt update && sudo apt upgrade -y

# Installa Node.js (versione 18 o superiore)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifica installazione
node --version
npm --version

# Installa git (se non presente)
sudo apt install -y git
```

### 2. Clone e Setup del Progetto
```bash
# Clone del repository
cd /home/node  # o la directory che preferisci
git clone <repository-url> subito-notifier
cd subito-notifier

# Installa dipendenze
npm install

# Configura Telegram (se non già fatto)
cp config/config.example.json config/config.json
nano config/config.json
# Inserisci botToken e chatId
```

### 3. Configura gli URL da Monitorare
```bash
nano src/car_watcher.js
# Modifica l'array URLS con i siti da monitorare
```

### 4. Test Manuale
```bash
# Prima esecuzione di test
npm run start:car-watcher

# Dovresti vedere:
# - Scansione iniziale
# - Generazione Excel
# - Invio Telegram (se ci sono auto nuove)
# - Scheduler attivo

# CTRL+C per fermare
```

### 5. Deploy in Produzione (PM2 - CONSIGLIATO)
```bash
# Installa PM2
sudo npm install -g pm2

# Avvia il watcher
pm2 start src/car_watcher.js --name car-watcher

# Salva configurazione
pm2 save

# Configura avvio automatico al boot
pm2 startup
# Esegui il comando che PM2 ti mostra

# Verifica che sia attivo
pm2 status
pm2 logs car-watcher
```

## 📅 Scheduling

Il watcher esegue scansioni automatiche:
- **12:00** (mezzogiorno)
- **18:00** (sera)

Timezone: **Europe/Rome**

## 🔍 Monitoraggio

### Verificare che il servizio sia attivo
```bash
pm2 status
```

### Vedere i log in tempo reale
```bash
pm2 logs car-watcher
```

### Vedere gli ultimi 100 log
```bash
pm2 logs car-watcher --lines 100
```

### Controllare l'archivio auto
```bash
cat data/seen_cars.json | head -5
```

## 🔧 Gestione del Servizio

### Riavviare
```bash
pm2 restart car-watcher
```

### Fermare
```bash
pm2 stop car-watcher
```

### Rimuovere
```bash
pm2 delete car-watcher
```

### Aggiornare il codice
```bash
# Ferma il servizio
pm2 stop car-watcher

# Aggiorna il codice
git pull

# Installa eventuali nuove dipendenze
npm install

# Riavvia
pm2 restart car-watcher
```

## 📱 Notifiche Telegram

Il bot invia messaggi **SOLO quando trova auto nuove**:
- Messaggio di riepilogo
- File Excel con foto e dettagli
- Ordinamento per anno recente + km bassi

### Nessuna notifica se:
- ❌ Tutte le auto sono già state viste
- ❌ Il sito non risponde
- ❌ Errori di rete

## 🗂️ Struttura File

```
/home/node/subito-notifier/
├── config/
│   └── config.json              ← Configurazione Telegram
├── data/
│   ├── seen_cars.json          ← Archivio auto viste (ID univoci)
│   └── report_auto.xlsx        ← Ultimo report Excel generato
├── src/
│   └── car_watcher.js          ← Main script con scheduler
├── setup-linux.sh              ← Script di setup
├── car-watcher.service         ← Systemd service (opzionale)
└── package.json
```

## 🛡️ Sicurezza

### Backup Automatici
```bash
# Crea backup giornaliero dell'archivio
crontab -e

# Aggiungi questa riga:
0 3 * * * cd /home/node/subito-notifier && cp data/seen_cars.json data/backup_$(date +\%Y\%m\%d).json
```

### Limitare Permessi
```bash
# Crea utente dedicato (opzionale)
sudo useradd -m -s /bin/bash nodeapp
sudo chown -R nodeapp:nodeapp /home/node/subito-notifier

# Esegui come utente dedicato
sudo -u nodeapp pm2 start src/car_watcher.js --name car-watcher
```

### Firewall
```bash
# Se necessario, apri porte per debug
sudo ufw allow 22/tcp  # SSH
# Non servono altre porte, il watcher fa solo richieste outbound
```

## 🐛 Troubleshooting

### Il servizio non si avvia
```bash
# Controlla errori
pm2 logs car-watcher --err

# Verifica configurazione
cat config/config.json

# Test manuale
npm run start:car-watcher
```

### Non ricevo notifiche Telegram
```bash
# Testa il bot Telegram
npm run start:bot

# Verifica configurazione
cat config/config.json | grep -A2 telegram
```

### Memoria/CPU elevati
```bash
# Monitora risorse
pm2 monit

# Riavvia se necessario
pm2 restart car-watcher
```

### Reset completo dell'archivio
```bash
# Backup dell'archivio esistente
cp data/seen_cars.json data/seen_cars_old.json

# Rimuovi archivio
rm data/seen_cars.json

# Riavvia (farà scansione completa)
pm2 restart car-watcher
```

## 📊 Risorse VM Consigliate

### Minime
- **CPU**: 1 vCPU
- **RAM**: 512 MB
- **Disco**: 10 GB
- **OS**: Ubuntu 20.04 / 22.04 LTS o Debian 11/12

### Ottimali
- **CPU**: 1-2 vCPU
- **RAM**: 1 GB
- **Disco**: 20 GB SSD

Il processo usa circa:
- **~50-80 MB RAM** a riposo
- **~150-200 MB RAM** durante scansione (con download immagini)
- **CPU**: <5% in media

## 🔄 Aggiornamenti

### Update Manuale
```bash
cd /home/node/subito-notifier
git pull
npm install
pm2 restart car-watcher
```

### Update con Zero-Downtime
```bash
# Avvia nuova versione
pm2 reload car-watcher
```

## 📝 Log Management

### Rotazione log con PM2
```bash
# Installa modulo logrotate di PM2
pm2 install pm2-logrotate

# Configura rotazione
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Log con systemd (se usi systemd)
```bash
# Log vanno in:
/var/log/car-watcher.log
/var/log/car-watcher-error.log

# Configura logrotate
sudo nano /etc/logrotate.d/car-watcher
```

## 🎯 Prossimi Step Consigliati

1. ✅ Deploy iniziale su VM
2. ✅ Test scansione manuale
3. ✅ Configura PM2 con avvio automatico
4. ✅ Setup backup automatici
5. ✅ Configura monitoring (opzionale)
6. 🎉 Goditi le notifiche automatiche!

---

**Supporto**: Consulta [SCHEDULING_INFO.md](SCHEDULING_INFO.md) per dettagli su scheduling e configurazioni avanzate.
