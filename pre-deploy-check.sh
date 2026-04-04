#!/bin/bash

###############################################################################
# Pre-Deploy Checklist
# 
# Esegui questo script prima del primo deploy per verificare che tutto
# sia configurato correttamente.
###############################################################################

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}✅ Pre-Deploy Checklist${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# 1. Verifica file necessari
echo -e "${YELLOW}📁 Verifico file necessari...${NC}"

FILES=(
  ".github/workflows/deploy.yml"
  "ecosystem.config.js"
  "deploy.sh"
  "setup-gcp.sh"
  "src/main.js"
  "package.json"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "   ${GREEN}✅${NC} $file"
  else
    echo -e "   ${RED}❌${NC} $file ${RED}NON TROVATO${NC}"
    ((ERRORS++))
  fi
done

echo ""

# 2. Verifica config.json
echo -e "${YELLOW}⚙️  Verifico configurazione...${NC}"

if [ -f "config/config.json" ]; then
  echo -e "   ${GREEN}✅${NC} config/config.json esiste"
  
  # Verifica che non sia l'example
  if grep -q "YOUR_BOT_TOKEN" config/config.json; then
    echo -e "   ${YELLOW}⚠️${NC}  Sembra essere ancora config.example.json"
    echo -e "   ${YELLOW}→${NC}  Configura botToken e chatId"
    ((WARNINGS++))
  fi
else
  echo -e "   ${RED}❌${NC} config/config.json ${RED}NON TROVATO${NC}"
  echo -e "   ${YELLOW}→${NC}  Copia config.example.json e configuralo"
  ((ERRORS++))
fi

echo ""

# 3. Verifica GitHub Secrets (informativo)
echo -e "${YELLOW}🔐 GitHub Secrets da configurare:${NC}"
echo -e "   ${BLUE}ℹ️${NC}  SSH_PRIVATE_KEY"
echo -e "   ${BLUE}ℹ️${NC}  VM_HOST"
echo -e "   ${BLUE}ℹ️${NC}  VM_USER"
echo -e "   ${BLUE}ℹ️${NC}  DEPLOY_PATH"
echo -e "   ${YELLOW}→${NC}  Verifica su GitHub → Settings → Secrets"

echo ""

# 4. Verifica .gitignore
echo -e "${YELLOW}🚫 Verifico .gitignore...${NC}"

IGNORE_PATTERNS=(
  "node_modules"
  "config.json"
  "data/"
  "logs/"
  "*.log"
)

for pattern in "${IGNORE_PATTERNS[@]}"; do
  if grep -q "$pattern" .gitignore 2>/dev/null; then
    echo -e "   ${GREEN}✅${NC} $pattern ignorato"
  else
    echo -e "   ${YELLOW}⚠️${NC}  $pattern non in .gitignore"
    ((WARNINGS++))
  fi
done

echo ""

# 5. Verifica dipendenze
echo -e "${YELLOW}📦 Verifico dipendenze...${NC}"

if [ -d "node_modules" ]; then
  echo -e "   ${GREEN}✅${NC} node_modules installato"
else
  echo -e "   ${YELLOW}⚠️${NC}  node_modules non trovato"
  echo -e "   ${YELLOW}→${NC}  Esegui: npm install"
  ((WARNINGS++))
fi

echo ""

# 6. Verifica permessi script
echo -e "${YELLOW}🔧 Verifico permessi script...${NC}"

SCRIPTS=(
  "deploy.sh"
  "setup-gcp.sh"
  "setup-linux.sh"
)

for script in "${SCRIPTS[@]}"; do
  if [ -f "$script" ]; then
    if [ -x "$script" ]; then
      echo -e "   ${GREEN}✅${NC} $script eseguibile"
    else
      echo -e "   ${YELLOW}⚠️${NC}  $script non eseguibile"
      echo -e "   ${YELLOW}→${NC}  Esegui: chmod +x $script"
      ((WARNINGS++))
    fi
  fi
done

echo ""

# Riepilogo
echo -e "${BLUE}========================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ TUTTO OK! Pronto per il deploy${NC}"
  echo ""
  echo -e "${BLUE}Prossimi passi:${NC}"
  echo -e "1. Configura GitHub Secrets"
  echo -e "2. Push su main/master"
  echo -e "3. Verifica GitHub Actions"
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) trovati${NC}"
  echo -e "${YELLOW}Puoi procedere ma controlla i warning sopra${NC}"
else
  echo -e "${RED}❌ ${ERRORS} errore(i) trovati${NC}"
  echo -e "${RED}Risolvi gli errori prima del deploy${NC}"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo ""
