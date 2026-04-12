#!/bin/bash

###############################################################################
# Script per verificare gli scope OAuth della VM GCP
# Uso: ./check-scopes.sh
###############################################################################

echo ""
echo "🔍 Verifica Scope OAuth VM Google Cloud"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verifica se siamo su una VM GCP
if ! curl -s -H "Metadata-Flavor: Google" --max-time 2 \
  http://metadata.google.internal/computeMetadata/v1/instance/id &>/dev/null; then
  echo -e "${YELLOW}⚠️  Questo script deve essere eseguito su una VM Google Cloud${NC}"
  echo ""
  exit 1
fi

echo -e "${BLUE}📋 Scope configurati sulla VM:${NC}"
echo ""

# Ottieni gli scope
SCOPES=$(curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/scopes)

if [ -z "$SCOPES" ]; then
  echo -e "${RED}❌ Impossibile recuperare gli scope${NC}"
  exit 1
fi

# Verifica scope per Storage
HAS_STORAGE=false
HAS_CLOUD_PLATFORM=false

while IFS= read -r scope; do
  scope_name=$(basename "$scope")
  
  if [[ "$scope" == *"devstorage.read_write"* ]] || [[ "$scope" == *"devstorage.full_control"* ]]; then
    echo -e "   ${GREEN}✅ $scope_name${NC}"
    HAS_STORAGE=true
  elif [[ "$scope" == *"cloud-platform"* ]]; then
    echo -e "   ${GREEN}✅ $scope_name (include Storage)${NC}"
    HAS_CLOUD_PLATFORM=true
  elif [[ "$scope" == *"devstorage"* ]]; then
    echo -e "   ${YELLOW}⚠️  $scope_name (read-only?)${NC}"
  else
    echo -e "   ℹ️  $scope_name"
  fi
done <<< "$SCOPES"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Risultato finale
if [ "$HAS_STORAGE" = true ] || [ "$HAS_CLOUD_PLATFORM" = true ]; then
  echo -e "${GREEN}✅ SCOPE OK: La VM può accedere a Google Cloud Storage${NC}"
  echo ""
  echo -e "${BLUE}💡 Test completo upload GCS:${NC}"
  echo -e "   ${BLUE}node test_gcs_scopes.js${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}❌ PROBLEMA: Scope per Storage NON trovati${NC}"
  echo ""
  echo -e "${YELLOW}💡 SOLUZIONE:${NC}"
  echo -e "   1. Console GCP → Compute Engine → Arresta la VM"
  echo -e "   2. Modifica VM → Access scopes → \"Allow full access to all Cloud APIs\""
  echo -e "   3. Riavvia la VM"
  echo ""
  echo -e "${BLUE}📖 Guida completa: FIX_GCS_SCOPES.md${NC}"
  echo ""
  exit 1
fi
