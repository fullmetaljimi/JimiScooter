# 🚨 RISOLUZIONE RAPIDA - GCS Upload 403

## Il Problema

Il messaggio con il link Excel non arriva su Telegram perché l'upload su Google Cloud Storage fallisce con errore:

```
"code": 403,
"message": "Provided scope(s) are not authorized"
```

## ✅ Soluzione (5 minuti)

### Passo 1: Verifica il problema

Sulla VM, esegui:

```bash
cd ~/percorso/progetto
chmod +x check-scopes.sh
./check-scopes.sh
```

Se vedi "❌ PROBLEMA: Scope per Storage NON trovati" → procedi con il Passo 2.

### Passo 2: Correggi gli scope (richiede riavvio VM)

#### Opzione A: Console Web (CONSIGLIATO)

1. Vai su [https://console.cloud.google.com/compute/instances](https://console.cloud.google.com/compute/instances)
2. **Arresta** la VM (⋮ menu → Stop)
3. Clicca sul **nome della VM** → **EDIT** (in alto)
4. Scorri a **"Access scopes"**
5. Seleziona **"Allow full access to all Cloud APIs"**
6. **Save** e **Start** la VM

#### Opzione B: gcloud CLI

```bash
# Sostituisci con i tuoi valori
PROJECT_ID="tuo-progetto"
VM_NAME="tua-vm"
ZONE="europe-west1-b"

# Arresta
gcloud compute instances stop $VM_NAME --zone=$ZONE --project=$PROJECT_ID

# Aggiorna scope
gcloud compute instances set-service-account $VM_NAME \
  --zone=$ZONE \
  --project=$PROJECT_ID \
  --scopes=https://www.googleapis.com/auth/cloud-platform

# Riavvia
gcloud compute instances start $VM_NAME --zone=$ZONE --project=$PROJECT_ID
```

### Passo 3: Verifica che funzioni

Una volta riavviata la VM:

```bash
cd ~/percorso/progetto

# Test 1: Verifica scope
./check-scopes.sh

# Test 2: Test upload completo
node test_gcs_scopes.js

# Test 3: Controlla che PM2 sia ripartito
pm2 status
pm2 logs car-watcher --lines 30
```

Se tutto è OK, vedrai:
- ✅ SCOPE OK
- ✅ TUTTI I TEST SUPERATI
- ✅ PM2 running

### Passo 4: Aspetta la prossima scansione (o fai un test manuale)

Il car watcher parte automaticamente alle 12:00 e 18:00.

Per testare subito:

```bash
# Esecuzione manuale
cd ~/percorso/progetto
node src/car_watcher.js
```

Dovresti vedere su Telegram il messaggio con il link al file Excel! 🎉

---

## 📚 Documentazione Completa

- [FIX_GCS_SCOPES.md](FIX_GCS_SCOPES.md) - Guida dettagliata con FAQ
- [GCS_INTEGRATION.md](GCS_INTEGRATION.md) - Setup completo GCS
- [README.md](README.md) - Troubleshooting generale

---

## ❓ Domande Frequenti

**Q: Perderò i dati durante il riavvio?**  
A: No, PM2 riavvierà automaticamente l'applicazione (se hai configurato `pm2 startup`).

**Q: Quanto tempo ci vuole?**  
A: 2-3 minuti (arresto, modifica, avvio).

**Q: Posso evitare il riavvio?**  
A: No, gli scope OAuth richiedono l'arresto della VM per motivi di sicurezza.

**Q: È sicuro usare "Allow full access"?**  
A: Sì, per una VM dedicata. I permessi effettivi sono comunque limitati dai ruoli IAM del service account.
