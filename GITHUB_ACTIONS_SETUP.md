# GitHub Actions Setup per Deploy con IAP

## Problema Risolto
Il workflow ora usa **IAP (Identity-Aware Proxy) tunneling** per connettersi alla VM GCP senza bisogno di un IP esterno pubblico. Questo risolve l'errore "not authorized" configurando correttamente l'autenticazione GCP.

## 🔑 Secret da Configurare su GitHub

Vai su GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret

### 1. `GCP_SA_KEY` (Service Account Key)
Chiave JSON del service account con permessi per IAP e Compute.

**Creare il service account:**
```bash
# Crea il service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"

# Assegna i ruoli necessari
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iap.tunnelResourceAccessor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/compute.viewer"

# Crea e scarica la chiave
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Copia il contenuto di key.json nel secret GCP_SA_KEY
cat key.json
```

### 2. `GCP_PROJECT`
L'ID del tuo progetto GCP (es. `my-project-123456`)

### 3. `GCP_ZONE`
La zona dove si trova la VM (es. `europe-west1-b`)

### 4. `VM_NAME`
Il nome della VM (es. `subito-notifier-vm`)

### 5. `DEPLOY_PATH`
Il percorso dove si trova il codice sulla VM (es. `/home/user/subito-notifier`)

## 🔒 Configurare IAP sulla VM

### Abilitare IAP per SSH:
```bash
# Abilita IAP
gcloud compute firewall-rules create allow-ssh-ingress-from-iap \
  --direction=INGRESS \
  --action=allow \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=allow-ssh-from-iap

# Aggiungi il tag alla VM
gcloud compute instances add-tags YOUR_VM_NAME \
  --zone=YOUR_ZONE \
  --tags=allow-ssh-from-iap
```

### Verifica permessi IAP:
```bash
# Testa la connessione IAP localmente
gcloud compute ssh YOUR_VM_NAME \
  --project=YOUR_PROJECT_ID \
  --zone=YOUR_ZONE \
  --tunnel-through-iap
```

## 📋 Checklist Pre-Deploy

- [ ] Service account creato e chiave JSON configurata in `GCP_SA_KEY`
- [ ] Tutti i 5 secret configurati su GitHub
- [ ] Firewall rule per IAP creata
- [ ] Tag `allow-ssh-from-iap` aggiunto alla VM
- [ ] IAP tunnel funzionante (testato localmente)
- [ ] Git configurato sulla VM con accesso al repository
- [ ] Node.js e PM2 installati sulla VM

## 🚀 Deploy

Il deploy si avvia automaticamente:
- Push su branch `main` o `master`
- Oppure manualmente da: Actions → Deploy to Google Cloud VM → Run workflow

## ⚠️ Alternativa: SSH Diretto con IP Esterno

Se preferisci NON usare IAP e vuoi tornare a SSH diretto:

1. **Assegna IP esterno statico alla VM**
2. **Configura firewall per SSH pubblico**
3. **Ripristina il workflow precedente** (sostituire l'autenticazione GCP con l'approccio SSH-key tradizionale)

### Pro/Contro IAP vs SSH Diretto:

**IAP Tunneling** ✅
- ✅ Più sicuro (nessun IP pubblico)
- ✅ Nessun costo per IP statico
- ✅ Controllo accessi centralizzato
- ❌ Setup più complesso
- ❌ Richiede autenticazione GCP

**SSH Diretto** 
- ✅ Setup più semplice
- ✅ Funziona ovunque
- ❌ IP pubblico esposto
- ❌ Costo per IP statico (~$3-5/mese)
- ❌ Necessita firewall rules

## 🐛 Troubleshooting

### Errore "not authorized" (4033)
- Verifica che il service account abbia il ruolo `roles/iap.tunnelResourceAccessor`
- Verifica che il firewall IAP sia configurato correttamente

### Errore "permission denied"
- Verifica che sulla VM sia presente la chiave SSH pubblica del service account
- Oppure che l'OS Login sia abilitato

### Timeout sulla connessione
- Verifica che la VM sia running
- Verifica che il tag `allow-ssh-from-iap` sia presente
- Controlla i firewall rules

## 📚 Documentazione GCP

- [IAP for TCP forwarding](https://cloud.google.com/iap/docs/using-tcp-forwarding)
- [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [IAP Roles](https://cloud.google.com/iap/docs/managing-access)
