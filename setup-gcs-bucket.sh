#!/bin/bash
# Setup script per Google Cloud Storage bucket

set -e

echo "🪣 === SETUP GOOGLE CLOUD STORAGE BUCKET ==="
echo ""

# Chiedi il nome del bucket (opzionale)
read -p "Nome del bucket (default: subito-notifier-files): " BUCKET_NAME
BUCKET_NAME=${BUCKET_NAME:-subito-notifier-files}

# Chiedi la region
read -p "Region (default: europe-west1): " REGION
REGION=${REGION:-europe-west1}

echo ""
echo "📋 Configurazione:"
echo "   Bucket: gs://$BUCKET_NAME"
echo "   Region: $REGION"
echo ""

# Verifica che gcloud sia configurato
if ! gcloud config get-value project &> /dev/null; then
  echo "❌ Errore: gcloud non configurato. Esegui 'gcloud init' prima."
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project)
echo "🔧 Progetto GCP: $PROJECT_ID"
echo ""

# Crea il bucket
echo "📦 Creazione bucket..."
if gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
  echo "ℹ️  Bucket $BUCKET_NAME già esistente"
else
  gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME
  echo "✅ Bucket creato!"
fi

# Imposta il bucket come pubblico per la lettura
echo "🔓 Configurazione accesso pubblico..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
echo "✅ Accesso pubblico configurato!"

# Configura CORS (opzionale, per accesso da browser)
echo "🌐 Configurazione CORS..."
cat > /tmp/cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://$BUCKET_NAME
rm /tmp/cors.json
echo "✅ CORS configurato!"

# Mostra l'URL di esempio
echo ""
echo "✅ === SETUP COMPLETATO ==="
echo ""
echo "📋 Dettagli:"
echo "   Bucket: gs://$BUCKET_NAME"
echo "   URL pubblico: https://storage.googleapis.com/$BUCKET_NAME/"
echo ""
echo "🔗 I file caricati saranno accessibili pubblicamente via:"
echo "   https://storage.googleapis.com/$BUCKET_NAME/report_auto.xlsx"
echo ""
echo "📝 Ricorda di aggiungere la variabile d'ambiente sulla VM (opzionale):"
echo "   export GCS_BUCKET_NAME=$BUCKET_NAME"
echo ""
echo "   Oppure nel config/config.json aggiungere:"
echo '   "gcs": {'
echo "     \"bucketName\": \"$BUCKET_NAME\""
echo '   }'
echo ""
