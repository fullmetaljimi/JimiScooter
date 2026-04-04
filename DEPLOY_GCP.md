# 🚀 Deploy Automatico su Google Cloud Platform

Guida completa per configurare il deploy automatico su una VM Google Cloud con GitHub Actions e PM2.

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Setup Iniziale VM](#setup-iniziale-vm)
3. [Configurazione GitHub](#configurazione-github)
4. [Test del Deploy](#test-del-deploy)
5. [Gestione PM2](#gestione-pm2)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica

### Come Funziona

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   GitHub    │──1──▶│    GitHub    │──2──▶│   GCP VM    │
│  git push   │      │   Actions    │      │   PM2 App   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ├─ Pull code
                            ├─ npm install
                            └─ PM2 restart
```

**Workflow:**
1. Fai commit e push su `main` o `master` (deploy automatico)
   - **OPPURE** esegui deploy manuale dalla UI GitHub Actions
2. GitHub Actions si attiva automaticamente
3. Connessione SSH alla VM
4. Pull del codice, install dipendenze
5. Restart automatico PM2

💡 **Deploy manuale**: Puoi anche avviare il deploy dalla UI di GitHub senza fare push (utile per rideploy urgenti).

---

## 🖥️ Setup Iniziale VM

### 1. Crea e Accedi alla VM Google Cloud

#### Opzione A: Google Cloud Console (CONSIGLIATO - più semplice)

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Menu → **Compute Engine → VM instances**
3. Trova la tua VM nella lista
4. Click sul pulsante **"SSH"** (accanto al nome della VM)
   - Si aprirà una finestra del browser con terminale SSH già connesso ✅

#### Opzione B: gcloud CLI

```bash
# Prima autenticati (se non l'hai già fatto)
gcloud auth login
gcloud config set project YOUR-PROJECT-ID

# Poi connettiti alla VM
gcloud compute ssh your-vm-name --zone=your-zone
```

**Se ricevi errore "insufficient authentication scopes":**

```bash
# Re-autenticati forzando nuovi scopes
gcloud auth application-default login

# Oppure usa l'Opzione A (SSH dal browser)
```

#### Opzione C: SSH diretto (se hai già configurato le chiavi)

```bash
# Usa l'IP esterno della VM
ssh USERNAME@EXTERNAL-IP

# Esempio:
ssh lucamuscari@34.123.45.67
```

### 2. Installa Node.js e PM2

```bash
# Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# Installa Node.js 18+ (o versione LTS più recente)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifica installazione
node --version
npm --version

# Installa PM2 globalmente
sudo npm install -g pm2

# Verifica PM2
pm2 --version
```

### 3. Installa Git

```bash
sudo apt install -y git

# Configura git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 4. Genera SSH Key per GitHub

```bash
# Genera nuova SSH key (premi Enter per accettare defaults)
ssh-keygen -t ed25519 -C "your.email@example.com" -f ~/.ssh/github_deploy

# Visualizza la chiave pubblica
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJObOz3SnfHFy0F2HMdd8taMtbX1fYwaVBXfk4rYKTtc muscari.luca@gmail.com

cat ~/.ssh/github_deploy.pub
```

**📝 Copia l'output** - dovrai aggiungerlo a GitHub come Deploy Key.

### 5. Aggiungi GitHub ai known_hosts

```bash
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

### 6. Configura SSH Config (opzionale ma consigliato)

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

### 7. Aggiungi la Deploy Key a GitHub

1. Vai su GitHub: **Repository → Settings → Deploy keys**
2. Click **Add deploy key**
3. **Title:** `GCP VM Deploy Key`
4. **Key:** Incolla la chiave pubblica copiata prima
5. ✅ Seleziona **Allow write access** (importante!)
6. Click **Add key**

### 8. Clone Iniziale del Repository

```bash
# Crea directory (modifica il path se necessario)
cd ~
git clone git@github.com:USERNAME/REPO-NAME.git subito-notifier
cd subito-notifier

# Installa dipendenze
npm install

# Configura Telegram (se non già fatto)
cp config/config.example.json config/config.json
nano config/config.json
# Inserisci botToken e chatId
```

### 9. Test Manuale

```bash
# Test singola esecuzione
node src/main.js

# Se funziona, premi CTRL+C e procedi con PM2
```

### 10. Avvia con PM2

```bash
# Start PM2
pm2 start ecosystem.config.js

# Verifica status
pm2 status

# Logs in real-time
pm2 logs subito-notifier

# Salva configurazione PM2
pm2 save

# Setup PM2 startup (auto-start al boot)
pm2 startup
# Esegui il comando sudo mostrato nell'output
```

---

## 🔐 Configurazione GitHub

### 1. Genera SSH Key per GitHub Actions

**Sulla VM**, genera una chiave separata per GitHub Actions:

```bash
# Genera chiave SSH (SENZA passphrase!)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Visualizza chiave PRIVATA (da copiare in GitHub Secrets)
cat ~/.ssh/github_actions
# Copia TUTTO l'output (da -----BEGIN fino a -----END-----)
#-----BEGIN OPENSSH PRIVATE KEY-----
#b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
#QyNTUxOQAAACChR/mQ6iffVZ3/bd83kaktZYXm9yH3G45aPHjoRnbh5AAAAJhv49TBb+PU
#wQAAAAtzc2gtZWQyNTUxOQAAACChR/mQ6iffVZ3/bd83kaktZYXm9yH3G45aPHjoRnbh5A
#AAAEBTo7hj16AzxJ7uJEVgsMwdl4PxgTO/1aplVNhCKgo756FH+ZDqJ99Vnf9t3zeRqS1l
#heb3Ifcbjlo8eOhGduHkAAAADmdpdGh1Yi1hY3Rpb25zAQIDBAUGBw==
#-----END OPENSSH PRIVATE KEY-----

# Aggiungi chiave PUBBLICA agli authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. Configura GitHub Secrets

Vai su **GitHub Repository → Settings → Secrets and variables → Actions → Tab "Secrets"**

**⚠️ IMPORTANTE:** GitHub non ti chiede automaticamente i nomi dei secrets - devi crearli **manualmente uno per uno**.

#### 📝 Processo per creare ogni secret:

1. Click **"New repository secret"** (pulsante verde in alto a destra)
2. Nel campo **"Name"**: inserisci il nome esatto del secret (es: `VM_HOST`)
   - ⚠️ Le maiuscole sono importanti! Usa esattamente i nomi indicati sotto
3. Nel campo **"Secret"**: inserisci il valore corrispondente (es: `34.123.45.67`)
4. Click **"Add secret"**
5. **Ripeti per tutti e 4 i secrets**

#### 🔑 Secrets da creare:

| Secret Name | Valore | Esempio |
|-------------|--------|---------|
| `SSH_PRIVATE_KEY` | Chiave privata generata (`cat ~/.ssh/github_actions`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VM_HOST` | IP pubblico della VM | `34.123.45.67` |
| `VM_USER` | Username sulla VM | `your-username` (es: `node` o il tuo user) |
| `DEPLOY_PATH` | Path completo del progetto | `/home/node/subito-notifier` |

#### Come ottenere i valori:

```bash
# VM_HOST - IP pubblico VM
curl -s ifconfig.me

# VM_USER - il tuo username
whoami

# DEPLOY_PATH - path completo
pwd
# Output esempio: /home/node/subito-notifier
```

### 3. Configura Git Branch Protection (opzionale)

Per sicurezza, configura branch protection su `main`:

1. **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. ✅ Require status checks to pass before merging
4. Salva

---

## 🧪 Test del Deploy

### Test Locale del Workflow

Prima di committare, verifica che i file siano corretti:

```bash
# Sulla tua macchina locale
git status

# Dovrai vedere:
# - .github/workflows/deploy.yml
# - ecosystem.config.js
# - deploy.sh
```

### Primo Deploy

```bash
# Commit e push
git add .
git commit -m "feat: add CI/CD with GitHub Actions and PM2"
git push origin main
```

### Deploy Manuale (senza fare push)

Puoi anche eseguire il deploy **manualmente** dalla UI di GitHub senza fare commit:

1. Vai su **GitHub → Actions**
2. Nella sidebar sinistra, click su **"Deploy to Google Cloud VM"**
3. Click sul pulsante **"Run workflow"** (in alto a destra)
4. Seleziona il branch (es: `main`)
5. Click **"Run workflow"** verde

Il deploy partirà immediatamente! Utile per:
- 🔄 Rideploy dopo fix su VM
- 🧪 Testare il workflow senza modificare codice
- 🚀 Deploy urgente senza commit

### Monitora il Deploy

1. Vai su **GitHub → Actions**
2. Dovresti vedere il workflow "Deploy to Google Cloud VM" in esecuzione
3. Click sul workflow per vedere i dettagli
4. Ogni step mostra il log in tempo reale

### Verifica sulla VM

```bash
# SSH nella VM
gcloud compute ssh your-vm-name

# Verifica PM2
pm2 status

# Verifica logs
pm2 logs subito-notifier --lines 50
```

---

## 🔧 Gestione PM2

### Comandi Essenziali

```bash
# Status di tutti i processi
pm2 status

# Logs in real-time
pm2 logs subito-notifier

# Logs ultimi 100 righe
pm2 logs subito-notifier --lines 100

# Stop il processo
pm2 stop subito-notifier

# Restart il processo
pm2 restart subito-notifier

# Reload (zero-downtime restart)
pm2 reload subito-notifier

# Monitor CPU/RAM in tempo reale
pm2 monit

# Info dettagliate sul processo
pm2 describe subito-notifier

# Elimina processo
pm2 delete subito-notifier
```

### PM2 Dashboard Web (opzionale)

PM2 offre una dashboard web gratuita:

```bash
# Registrati e collega PM2
pm2 register

# Oppure login se già registrato
pm2 link <secret_key> <public_key>
```

Poi vai su: https://app.pm2.io

### Comandi Avanzati

```bash
# Flush logs (pulisci log vecchi)
pm2 flush

# Salva configurazione corrente
pm2 save

# Resurrect (ripristina PM2 dopo reboot)
pm2 resurrect

# Update PM2
npm install -g pm2 && pm2 update
```

---

## 🛠️ Troubleshooting

### ❌ gcloud: "Request had insufficient authentication scopes"

**Problema:** `gcloud compute ssh` restituisce errore di autenticazione

**Soluzione rapida:**
```bash
# Opzione 1: Re-autenticati con gcloud
gcloud auth login
gcloud auth application-default login

# Opzione 2: USA IL BROWSER (più semplice!)
# Vai su Google Cloud Console → Compute Engine → VM instances
# Click sul pulsante "SSH" accanto alla tua VM
# Si aprirà un terminale nel browser già connesso ✅
```

**Soluzione definitiva:**
```bash
# Configura correttamente gcloud
gcloud auth login
gcloud config set project YOUR-PROJECT-ID
gcloud compute ssh your-vm-name --zone=your-zone
```

💡 **CONSIGLIATO**: Usa il pulsante SSH dal browser di Google Cloud Console - è più affidabile!

---

### ❌ Deploy Fallisce - SSH Authentication Failed

**Problema:** GitHub Actions non riesce a connettersi alla VM

**Soluzione:**
```bash
# Sulla VM, verifica che la chiave sia in authorized_keys
cat ~/.ssh/authorized_keys | grep github-actions

# Se manca, ri-aggiungila
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Verifica permessi directory .ssh
chmod 700 ~/.ssh
```

### ❌ GitHub Actions: "Command failed: ssh-add -" (Setup SSH)

**Problema:** GitHub Actions fallisce nello step "Setup SSH" con errore `ssh-add -`

**Causa:** Il secret `SSH_PRIVATE_KEY` è malformato o incompleto

**Soluzione:**

1. **Sulla VM**, rigenera e visualizza correttamente la chiave:

```bash
# Visualizza la chiave privata COMPLETA
cat ~/.ssh/github_actions

# L'output deve essere ESATTAMENTE così (con BEGIN e END):
# -----BEGIN OPENSSH PRIVATE KEY-----
# b3BlbnNzaC1rZXktdjEAAAA...
# (molte righe)
# ...AAAADmdpdGh1Yi1hY3Rpb25z
# -----END OPENSSH PRIVATE KEY-----
```

2. **Copia TUTTA la chiave** (incluse le righe BEGIN/END)
   - Seleziona dall'inizio di `-----BEGIN` fino alla fine di `-----END-----`
   - ⚠️ Non aggiungere spazi, a-capo extra, o commenti

3. **Su GitHub**, aggiorna il secret:
   - Vai su **Repository → Settings → Secrets and variables → Actions**
   - Trova `SSH_PRIVATE_KEY`
   - Click sull'icona **matita** (Edit) o **Remove** e ricrealo
   - Incolla la chiave ESATTAMENTE come copiata
   - **NON** aggiungere nulla prima o dopo

4. **Verifica formato corretto**:

```bash
# Sulla VM, conta le righe della chiave
cat ~/.ssh/github_actions | wc -l
# Dovrebbe essere circa 7-8 righe

# Verifica inizio e fine
head -n 1 ~/.ssh/github_actions
# Output: -----BEGIN OPENSSH PRIVATE KEY-----

tail -n 1 ~/.ssh/github_actions  
# Output: -----END OPENSSH PRIVATE KEY-----
```

**❌ Errori comuni:**
- Copiare solo parte della chiave
- Aggiungere `#` all'inizio delle righe
- Aggiungere spazi extra o tab
- Copiare dal browser che aggiunge caratteri invisibili

**💡 Consiglio:** 
```bash
# Copia la chiave in un file temporaneo per essere sicuro
cat ~/.ssh/github_actions > /tmp/key.txt
cat /tmp/key.txt
# Copia da qui e incolla su GitHub
```

5. **Riprova il deploy:**
   - Fai un commit dummy per riattivare Actions
   ```bash
   git commit --allow-empty -m "fix: update SSH key"
   git push origin main
   ```

### ❌ PM2 Non Parte Dopo Reboot

**Problema:** PM2 non si avvia automaticamente dopo il riavvio della VM

**Soluzione:**
```bash
# Verifica startup script
pm2 startup

# Esegui il comando sudo mostrato
# Poi salva configurazione
pm2 save
```

### ❌ PM2 Gira Come Root (IMPORTANTE!)

**Problema:** PM2 è stato avviato con `sudo` e ora gira come root invece che come il tuo user

**Come verificare:**
```bash
# Verifica chi sta eseguendo PM2
ps aux | grep PM2

# Se vedi "root" invece del tuo username, hai questo problema!
```

**Perché è un problema:**
- ❌ **Sicurezza**: App con privilegi root (pericoloso)
- ❌ **Permessi**: File creati come root non accessibili dal tuo user
- ❌ **GitHub Actions**: Il deploy SSH usa il tuo user, non root
- ❌ **Conflitti**: PM2 root e PM2 user sono istanze separate

**Soluzione - Migrare PM2 da root al tuo user:**

```bash
# 1. Ferma PM2 root
sudo pm2 stop all
sudo pm2 delete all
sudo pm2 kill

# 2. Rimuovi startup root
sudo pm2 unstartup

# 3. Verifica che sia tutto pulito
sudo pm2 status
# Dovrebbe dire "No process found"

# 4. Torna al tuo user normale (NON usare sudo!)
cd ~/subito-notifier

# 5. Avvia PM2 come TUO USER (senza sudo!)
pm2 start ecosystem.config.js

# 6. Verifica che giri come tuo user
pm2 status
ps aux | grep PM2
# Dovresti vedere il TUO username, non root!

# 7. Salva configurazione
pm2 save

# 8. Setup startup come tuo user
pm2 startup
# Esegui il comando sudo mostrato nell'output (normale che richieda sudo per creare il systemd service)

# 9. Salva di nuovo dopo startup
pm2 save
```

**Verifica finale:**
```bash
# Controlla proprietà dei file
ls -la ~/subito-notifier/logs/
# Dovresti vedere il TUO username, non root

# Test reboot
sudo reboot
# Dopo il reboot, riconnettiti e verifica:
pm2 status
# Dovrebbe mostrare l'app running automaticamente
```

**⚠️ RICORDA**: Non usare mai `sudo pm2` - PM2 deve girare come il tuo user normale!

### ❌ Git/File con Permessi Root

**Problema:** File del repository appartengono a root invece che al tuo user

**Come verificare:**
```bash
# Controlla proprietà dei file del progetto
ls -la ~/subito-notifier/
# Se vedi "root root" invece del tuo username → problema!

# Controlla chi ha clonato il repository
ls -la ~/subito-notifier/.git/
```

**⚠️ IMPORTANTE - Chiarimento:**
- ✅ **Git installato globalmente come root è OK**: `sudo apt install git` è corretto
- ❌ **Usare git con sudo è SBAGLIATO**: `sudo git clone`, `sudo git pull` creano file root

**Soluzione - Cambia proprietà dei file al tuo user:**

```bash
# 1. Verifica il tuo username
whoami
# Output esempio: lucamuscari

# 2. Cambia proprietà di TUTTI i file del progetto al tuo user
cd ~
sudo chown -R $(whoami):$(whoami) ~/subito-notifier/

# 3. Verifica il fix
ls -la ~/subito-notifier/
# Ora dovresti vedere il TUO username, non root ✅

# 4. Verifica directory critiche
ls -la ~/subito-notifier/data/
ls -la ~/subito-notifier/logs/
ls -la ~/subito-notifier/node_modules/
# Tutte devono appartenere al tuo user
```

**Prevenzione futura:**
```bash
# ❌ MAI fare questo:
sudo git clone ...
sudo git pull
sudo npm install

# ✅ SEMPRE fare questo (senza sudo):
git clone ...
git pull
npm install
```

**Se GitHub Actions continua a fallire dopo il fix:**
```bash
# Rimuovi e ri-clona il repository come tuo user
cd ~
rm -rf subito-notifier  # ATTENZIONE: backup config.json prima!
git clone git@github.com:USERNAME/REPO.git subito-notifier
cd subito-notifier
npm install
# Ripristina config.json
pm2 start ecosystem.config.js
pm2 save
```

### ❌ "npm install" Fallisce Durante Deploy

**Problema:** Errore durante installazione dipendenze

**Soluzione:**
```bash
# SSH nella VM e pulisci cache npm
cd ~/subito-notifier
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Se risolve, fai un commit per aggiornare package-lock.json
git add package-lock.json
git commit -m "fix: update package-lock.json"
git push
```

### ❌ Port Already in Use

**Problema:** Se la tua app usa porte specifiche

**Soluzione:**
```bash
# Trova processo che usa la porta (es: 3000)
sudo lsof -i :3000

# Killa il processo
sudo kill -9 <PID>

# Restart PM2
pm2 restart subito-notifier
```

### ❌ Git Pull Fallisce - Conflitti

**Problema:** Modifiche locali impediscono il pull

**Soluzione:**
```bash
# SSH nella VM
cd ~/subito-notifier

# Opzione 1: Stash modifiche locali
git stash
git pull origin main

# Opzione 2: Hard reset (ATTENZIONE: perdi modifiche locali!)
git fetch origin
git reset --hard origin/main
```

### 🔍 Debug Avanzato

```bash
# Verifica memoria disponibile
free -h

# Verifica spazio disco
df -h

# Verifica processi
ps aux | grep node

# Network test
ping github.com

# DNS test
nslookup github.com
```

---

## 📊 Monitoraggio e Logs

### Logs PM2

```bash
# Log file si trovano in:
ls -la ~/subito-notifier/logs/

# Visualizza log errori
tail -f ~/subito-notifier/logs/pm2-error.log

# Visualizza log output
tail -f ~/subito-notifier/logs/pm2-out.log
```

### Rotation Logs (previeni file enormi)

PM2 ha un modulo per ruotare i log:

```bash
# Installa pm2-logrotate
pm2 install pm2-logrotate

# Configura (es: ruota quando supera 10MB)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 🚀 Deploy Manuale Via SSH (alternativo a GitHub Actions)

Se preferisci fare deploy **completamente manuale** bypassando GitHub Actions:

```bash
# Sulla tua macchina locale, connettiti via SSH
ssh your-vm-user@your-vm-ip

# Sulla VM
cd ~/subito-notifier
./deploy.sh
```

Lo script `deploy.sh` fa automaticamente:
- Pull del codice
- Install dipendenze
- Restart PM2

**💡 Differenza con "Run workflow" di GitHub:**
- **"Run workflow" su GitHub**: Esegue il workflow automatico via GitHub Actions (consigliato)
- **SSH + deploy.sh**: Bypassa GitHub Actions, deploy completamente manuale dalla VM

---

## 🎯 Best Practices

### Sicurezza

- ✅ Usa chiavi SSH separate per deploy e GitHub
- ✅ Non committare mai `config.json` (è in .gitignore)
- ✅ Usa GitHub Secrets per dati sensibili
- ✅ Abilita firewall sulla VM (solo porte necessarie)

### Performance

- ✅ Usa `npm install --production` (risparmia spazio)
- ✅ Configura log rotation per evitare file enormi
- ✅ Monitora RAM con `pm2 monit`
- ✅ Configura `max_memory_restart` in ecosystem.config.js

### Manutenzione

- ✅ Aggiorna PM2: `npm install -g pm2 && pm2 update`
- ✅ Aggiorna Node.js periodicamente
- ✅ Fai backup di `config.json` e `data/seen.json`
- ✅ Monitora i log settimanalmente

---

## 📚 Risorse Utili

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Google Cloud Compute Engine](https://cloud.google.com/compute/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## 🆘 Supporto

Se riscontri problemi:

1. Controlla i **GitHub Actions logs**
2. Verifica i **PM2 logs**: `pm2 logs subito-notifier`
3. Controlla la sezione [Troubleshooting](#troubleshooting)

---

**🎉 Setup Completato!**

Ora ogni push su `main` attiverà automaticamente il deploy sulla tua VM Google Cloud.
