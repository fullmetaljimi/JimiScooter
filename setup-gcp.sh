#!/bin/bash

###############################################################################
# Setup Script per Prima Installazione su GCP VM
# 
# Questo script automatizza il setup iniziale della VM Google Cloud.
# Eseguilo UNA SOLA VOLTA dopo aver clonato il repository.
#
# Uso: ./setup-gcp.sh
###############################################################################

set -e  # Esci se un comando fallisce

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Subito Notifier - GCP VM Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verifica che siamo nella directory corretta
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Errore: package.json non trovato${NC}"
  echo -e "${YELLOW}💡 Esegui questo script dalla root del progetto${NC}"
  exit 1
fi

# 1. Verifica Node.js
echo -e "${YELLOW}🔍 Verifico Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js non trovato${NC}"
  echo -e "${YELLOW}📦 Installazione Node.js...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# 2. Verifica npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm non trovato${NC}"
  exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# 3. Installa dipendenze
echo ""
echo -e "${YELLOW}📦 Installazione dipendenze...${NC}"
npm install

# 4. Crea directory necessarie
echo ""
echo -e "${YELLOW}📁 Creazione directory...${NC}"
mkdir -p logs
mkdir -p data
echo -e "${GREEN}✅ Directory create${NC}"

# 5. Configura config.json
echo ""
if [ ! -f "config/config.json" ]; then
  echo -e "${YELLOW}⚙️  Configurazione Telegram...${NC}"
  cp config/config.example.json config/config.json
  echo -e "${YELLOW}📝 Modifica config/config.json con i tuoi dati Telegram${NC}"
  echo -e "${BLUE}   Premi INVIO quando hai configurato...${NC}"
  read
else
  echo -e "${GREEN}✅ config.json già esistente${NC}"
fi

# 6. Verifica/Installa PM2
echo ""
echo -e "${YELLOW}🔍 Verifico PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}📦 Installazione PM2 globalmente...${NC}"
  sudo npm install -g pm2
  echo -e "${GREEN}✅ PM2 installato${NC}"
else
  echo -e "${GREEN}✅ PM2 $(pm2 --version)${NC}"
fi

# 7. Configura PM2 startup
echo ""
echo -e "${YELLOW}🔧 Configurazione PM2 startup...${NC}"
echo -e "${BLUE}ℹ️  Il prossimo comando potrebbe richiedere sudo${NC}"
pm2 startup || echo -e "${YELLOW}⚠️  Esegui manualmente il comando sudo mostrato sopra${NC}"

# 8. Test esecuzione
echo ""
echo -e "${YELLOW}🧪 Test esecuzione...${NC}"
echo -e "${BLUE}ℹ️  Avvio test di 5 secondi...${NC}"
timeout 5s node src/main.js || true
echo -e "${GREEN}✅ Test completato${NC}"

# 9. Avvia con PM2
echo ""
echo -e "${YELLOW}🚀 Avvio applicazione con PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Setup completato con successo!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 10. Mostra status
echo -e "${YELLOW}📊 PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}📋 Prossimi passi:${NC}"
echo ""
echo -e "1️⃣  Configura GitHub Deploy Key:"
echo -e "   ${BLUE}cat ~/.ssh/github_deploy.pub${NC}"
echo -e "   (Copia e aggiungi a GitHub → Settings → Deploy keys)"
echo ""
echo -e "2️⃣  Genera chiave per GitHub Actions:"
echo -e "   ${BLUE}ssh-keygen -t ed25519 -C \"github-actions\" -f ~/.ssh/github_actions -N \"\"${NC}"
echo -e "   ${BLUE}cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys${NC}"
echo ""
echo -e "3️⃣  Configura GitHub Secrets:"
echo -e "   - SSH_PRIVATE_KEY: ${BLUE}cat ~/.ssh/github_actions${NC}"
echo -e "   - VM_HOST: ${BLUE}$(curl -s ifconfig.me)${NC}"
echo -e "   - VM_USER: ${BLUE}$(whoami)${NC}"
echo -e "   - DEPLOY_PATH: ${BLUE}$(pwd)${NC}"
echo ""
echo -e "4️⃣  Test logs:"
echo -e "   ${BLUE}pm2 logs subito-notifier${NC}"
echo ""
echo -e "${GREEN}🎉 Tutto pronto per il deploy automatico!${NC}"
echo ""
