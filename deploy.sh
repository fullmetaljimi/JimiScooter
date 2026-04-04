#!/bin/bash

###############################################################################
# Deploy Script per Subito Notifier
# 
# Questo script viene eseguito sulla VM per aggiornare l'applicazione.
# Può essere eseguito manualmente o tramite GitHub Actions.
#
# Uso: ./deploy.sh
###############################################################################

set -e  # Esci immediatamente se un comando fallisce

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directory del progetto (modifica se necessario)
PROJECT_DIR="${PROJECT_DIR:-$HOME/subito-notifier}"
BRANCH="${BRANCH:-main}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Subito Notifier - Deploy Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verifica che la directory esista
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}❌ Directory $PROJECT_DIR non trovata${NC}"
  echo -e "${YELLOW}💡 Esegui prima il setup iniziale${NC}"
  exit 1
fi

# Naviga nella directory
echo -e "${YELLOW}📂 Navigating to $PROJECT_DIR${NC}"
cd "$PROJECT_DIR"

# Salva modifiche locali non committate (se esistono)
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  Modifiche locali rilevate - stashing...${NC}"
  git stash save "Auto-stash before deploy $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Pull delle ultime modifiche
echo -e "${YELLOW}🔄 Pulling latest changes from $BRANCH...${NC}"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Installa/aggiorna dipendenze
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production

# Crea directory logs se non esiste
if [ ! -d "logs" ]; then
  echo -e "${YELLOW}📁 Creating logs directory...${NC}"
  mkdir -p logs
fi

# Verifica se PM2 è installato
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}❌ PM2 non installato${NC}"
  echo -e "${YELLOW}💡 Installazione PM2...${NC}"
  npm install -g pm2
fi

# Gestione PM2
echo -e "${YELLOW}🔧 Managing PM2 process...${NC}"

if pm2 describe subito-notifier > /dev/null 2>&1; then
  # Il processo esiste già - restart
  echo -e "${GREEN}♻️  Restarting existing PM2 process...${NC}"
  pm2 restart subito-notifier
  pm2 save
else
  # Prima volta - start
  echo -e "${GREEN}🆕 Starting PM2 for the first time...${NC}"
  pm2 start ecosystem.config.js
  pm2 save
  
  # Setup startup script (richiede sudo, potrebbe chiedere password)
  echo -e "${YELLOW}🔧 Setting up PM2 startup script...${NC}"
  pm2 startup
  echo -e "${YELLOW}⚠️  Se richiesto, esegui il comando sudo mostrato sopra${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Mostra stato PM2
echo -e "${YELLOW}📊 PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}📋 PM2 Logs (last 15 lines):${NC}"
pm2 logs subito-notifier --lines 15 --nostream

echo ""
echo -e "${GREEN}🎉 All done!${NC}"
echo -e "${BLUE}💡 Comandi utili:${NC}"
echo -e "   - Logs in real-time: ${YELLOW}pm2 logs subito-notifier${NC}"
echo -e "   - Stop:              ${YELLOW}pm2 stop subito-notifier${NC}"
echo -e "   - Restart:           ${YELLOW}pm2 restart subito-notifier${NC}"
echo -e "   - Status:            ${YELLOW}pm2 status${NC}"
echo -e "   - Monitor:           ${YELLOW}pm2 monit${NC}"
echo ""
