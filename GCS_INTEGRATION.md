# Google Cloud Storage Integration

## Panoramica

Il report Excel generato dal car watcher viene automaticamente caricato su **Google Cloud Storage** e reso disponibile pubblicamente tramite un URL.

## Setup

### 1. Crea il bucket GCS

Dalla **Cloud Shell di GCP**, esegui:

```bash
# Rendi eseguibile lo script
chmod +x setup-gcs-bucket.sh

# Esegui lo script
./setup-gcs-bucket.sh
```

Lo script ti chiederà:
- **Nome del bucket** (default: `subito-notifier-files`)
- **Region** (default: `europe-west1`)

### 2. Installa le dipendenze

```bash
npm install
```

Questo installerà `@google-cloud/storage` aggiunto alle dipendenze.

### 3. Configura la variabile d'ambiente (opzionale)

Se hai usato un nome diverso da `subito-notifier-files`:

```bash
export GCS_BUCKET_NAME=tuo-bucket-name
```

Oppure aggiungi al `~/.bashrc` o `~/.profile` per renderla permanente.

## Funzionamento

Quando il car watcher trova nuove auto:

1. ✅ Genera il report Excel locale (`data/report_auto.xlsx`)
2. ☁️  **Upload automatico su Google Cloud Storage**
3. 📤 Invia il file Excel via Telegram con link pubblico al Cloud Storage
4. 💾 Salva lo stato locale

## URL pubblico

Il file sarà accessibile pubblicamente a:

```
https://storage.googleapis.com/subito-notifier-files/report_auto.xlsx
```

Questo URL può essere:
- ✅ Condiviso con chiunque (non serve autenticazione)
- ✅ Aperto direttamente nel browser
- ✅ Scaricato con `curl` o `wget`
- ✅ Integrato in altre applicazioni

## Permessi necessari

Il service account configurato per GitHub Actions ha già i permessi necessari:
- `roles/compute.instanceAdmin.v1` - include accesso a Storage
- Oppure aggiungi esplicitamente: `roles/storage.objectAdmin`

## Costi

Google Cloud Storage è **gratuito** fino a:
- 5 GB di storage
- 1 GB di bandwidth in uscita/mese (region US)

Per un file Excel di ~500KB aggiornato più volte al giorno, il costo è **trascurabile o gratuito**.

## Sicurezza

- ✅ Il file è **pubblicamente leggibile** (chiunque con il link può scaricarlo)
- ✅ **Solo l'applicazione può scriverlo** (richiede autenticazione GCP)
- ⚠️  **Non condividere dati sensibili** nel file Excel

## Troubleshooting

### ❌ Errore: "Provided scope(s) are not authorized" (403)

**Problema più comune!** La VM non ha gli scope OAuth corretti per accedere a GCS.

**Soluzione**: Vedi la guida completa in **[FIX_GCS_SCOPES.md](FIX_GCS_SCOPES.md)**

**Quick fix:**
1. Console GCP → Compute Engine → Arresta la VM
2. Modifica VM → Access scopes → "Allow full access to all Cloud APIs"  
3. Riavvia la VM

---

### Errore: "Bucket not found"

Verifica che il bucket sia stato creato:
```bash
gsutil ls gs://subito-notifier-files
```

### Errore: "Permission denied"

Il service account sulla VM deve avere i permessi di scrittura:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Upload fallisce ma l'app continua

È normale! L'upload su GCS è opzionale e non blocca l'esecuzione. Il file viene comunque inviato via Telegram.

### Testare l'upload manualmente

Dal terminale sulla VM:
```bash
node -e "
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
storage.bucket('subito-notifier-files').upload('data/report_auto.xlsx', {
  destination: 'test.xlsx',
  public: true
}).then(() => console.log('✅ Upload OK!'))
  .catch(e => console.error('❌', e.message));
"
```

## Link utili

- [GCS Node.js Client](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [GCS Pricing](https://cloud.google.com/storage/pricing)
- [Making data public](https://cloud.google.com/storage/docs/access-control/making-data-public)
