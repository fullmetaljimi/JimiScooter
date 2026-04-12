# 🔧 Fix GCS Upload - Scope OAuth non autorizzati

## 🎯 Problema

Errore durante l'upload su Google Cloud Storage:
```
"code": 403,
"message": "Provided scope(s) are not authorized"
```

**Causa**: La VM non ha gli scope OAuth corretti per accedere a Google Cloud Storage.

---

## ✅ Soluzione: Aggiornare gli Scope della VM

Gli scope OAuth della VM devono essere modificati. Questa operazione richiede l'**arresto** della VM.

### Opzione A: Google Cloud Console (CONSIGLIATO - più semplice)

1. **Vai alla Console GCP**
   - [https://console.cloud.google.com/compute/instances](https://console.cloud.google.com/compute/instances)

2. **Arresta la VM**
   - Clicca sui tre puntini (⋮) accanto alla VM → **Stop**
   - Aspetta che lo stato diventi "Stopped" (circa 30 secondi)

3. **Modifica la VM**
   - Clicca sul nome della VM per aprire i dettagli
   - Clicca su **EDIT** (in alto)

4. **Aggiorna gli Scope**
   - Scorri fino alla sezione **"Access scopes"**
   - Seleziona **"Allow full access to all Cloud APIs"**
     
     **OPPURE** seleziona "Set access for each API" e assicurati che:
     - **Storage** sia impostato su **"Read Write"** o **"Full"**
   
5. **Salva e Riavvia**
   - Clicca **Save** in fondo alla pagina
   - Torna alla lista VM e clicca **START** sulla tua VM

6. **Verifica**
   - Una volta riavviata la VM, connettiti via SSH e testa:
   ```bash
   cd ~/JimiScooter  # o la tua directory
   node -e "
   const {Storage} = require('@google-cloud/storage');
   const storage = new Storage();
   console.log('✅ Storage client inizializzato');
   storage.bucket('subito-notifier-files').getMetadata()
     .then(() => console.log('✅ Accesso al bucket OK!'))
     .catch(e => console.error('❌ Errore:', e.message));
   "
   ```

---

### Opzione B: gcloud CLI

Se preferisci usare il terminale:

```bash
# 1. Imposta il progetto
gcloud config set project YOUR_PROJECT_ID

# 2. Arresta la VM
gcloud compute instances stop YOUR_VM_NAME --zone=YOUR_ZONE

# 3. Aggiorna gli scope (full access a tutte le API Cloud)
gcloud compute instances set-service-account YOUR_VM_NAME \
  --zone=YOUR_ZONE \
  --scopes=https://www.googleapis.com/auth/cloud-platform

# OPPURE scope specifico per Storage:
gcloud compute instances set-service-account YOUR_VM_NAME \
  --zone=YOUR_ZONE \
  --scopes=https://www.googleapis.com/auth/devstorage.read_write,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/compute

# 4. Riavvia la VM
gcloud compute instances start YOUR_VM_NAME --zone=YOUR_ZONE
```

---

## 🧪 Test dopo la modifica

Una volta riavviata la VM, verifica che tutto funzioni:

```bash
# Connettiti alla VM
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE

# Vai alla directory del progetto
cd ~/path/to/JimiScooter

# Testa l'upload GCS
node -e "
const {Storage} = require('@google-cloud/storage');
const fs = require('fs');
const storage = new Storage();

// Test 1: Connessione OK
console.log('🔍 Test 1: Verifica connessione Storage...');
storage.bucket('subito-notifier-files').exists()
  .then(([exists]) => {
    if (exists) {
      console.log('✅ Bucket trovato!');
      
      // Test 2: Upload file di test
      console.log('🔍 Test 2: Upload file di test...');
      const testFile = 'test_upload.txt';
      fs.writeFileSync(testFile, 'Test upload at ' + new Date());
      
      return storage.bucket('subito-notifier-files').upload(testFile, {
        destination: 'test_upload.txt',
        public: true
      });
    } else {
      throw new Error('Bucket non trovato');
    }
  })
  .then(() => {
    console.log('✅ Upload test completato!');
    console.log('🔗 https://storage.googleapis.com/subito-notifier-files/test_upload.txt');
  })
  .catch(e => {
    console.error('❌ Errore:', e.message);
    if (e.code === 403) {
      console.error('⚠️  Gli scope non sono ancora configurati correttamente');
      console.error('💡 Verifica di aver selezionato \"Allow full access to all Cloud APIs\"');
    }
  });
"
```

Se vedi "✅ Upload test completato!", il problema è risolto! 🎉

---

## 🔍 Verifica Scope Attuali (debug)

Per vedere quali scope ha attualmente la VM:

```bash
# Ottieni i metadati della VM
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/scopes

# Dovrebbe includere:
# https://www.googleapis.com/auth/devstorage.read_write
# o
# https://www.googleapis.com/auth/cloud-platform
```

---

## 📝 Note Importanti

1. **Downtime**: L'arresto e riavvio della VM richiede circa 2-3 minuti.

2. **PM2**: Dopo il riavvio della VM, i processi PM2 dovrebbero ripartire automaticamente (se hai configurato `pm2 startup`).

3. **Scope Full Access**: È sicuro usare "Allow full access to all Cloud APIs" per VM dedicate al tuo progetto. I permessi effettivi sono comunque limitati dai ruoli IAM del service account.

4. **Alternative a GOOGLE_APPLICATION_CREDENTIALS**: Non è necessario impostare questa variabile se usi le credenziali di default della VM (come fatto nel codice attuale).

---

## 🎯 Dopo la Risoluzione

Una volta sistemati gli scope:

1. ✅ Verifica PM2 status: `pm2 status`
2. ✅ Controlla i log: `pm2 logs subito-notifier --lines 50`
3. ✅ Aspetta la prossima scansione o fai un test manuale
4. ✅ Controlla Telegram per il messaggio con link

---

## ❓ FAQ

### Perché non posso modificare gli scope con la VM accesa?

Google Cloud richiede l'arresto per motivi di sicurezza - gli scope determinano le credenziali OAuth che possono essere impersonate.

### Devo riconfigurare GitHub Actions?

No, GitHub Actions non è influenzato da questa modifica (usa il suo service account separato).

### E se uso un Service Account personalizzato?

Se la VM usa un service account specifico (non quello di default), verifica che quel service account abbia il ruolo `roles/storage.objectAdmin` o `roles/storage.admin`.

```bash
# Assegna il ruolo al service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

---

## 📚 Link Utili

- [VM Access Scopes Documentation](https://cloud.google.com/compute/docs/access/service-accounts#accesscopesiam)
- [Google Cloud Storage Node.js Client](https://cloud.google.com/nodejs/docs/reference/storage/latest)
- [GCS Authentication](https://cloud.google.com/storage/docs/authentication)
