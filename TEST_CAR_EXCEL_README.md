# 🧪 Test Excel + Telegram - Car Watcher

## Descrizione

Questo test genera un **report Excel** con auto di esempio e lo invia via **Telegram**, simulando completamente il comportamento del sistema `car_watcher.js`.

## File Creato

📄 **`src/test_car_excel_telegram.js`** - Script di test completo

## Cosa Fa il Test

1. ✅ Crea 5 auto di esempio con dati realistici
2. ✅ Genera un report Excel con:
   - Fogli separati per modello auto
   - Foto scaricate da internet
   - Formattazione professionale
   - Link cliccabili
   - Evidenziazione delle auto nuove
3. ✅ Invia il report via Telegram con:
   - Messaggio di notifica
   - File Excel allegato

## Come Usare

### Metodo 1: npm script (consigliato)

```bash
npm run test:car-excel
```

### Metodo 2: Node diretto

```bash
node src/test_car_excel_telegram.js
```

## Prerequisiti

1. **Configurazione Telegram**
   - File `config/config.json` deve esistere
   - Deve contenere `botToken` e `chatId` validi

2. **Connessione Internet**
   - Necessaria per scaricare le immagini di test
   - Necessaria per inviare il messaggio Telegram

## Output

Il test genera:

- 📁 **File Excel**: `data/test_report_auto.xlsx`
- 📤 **Messaggio Telegram** con allegato Excel
- 📊 **Console log** dettagliato del processo

## Dettagli Auto di Test

Il test include 5 auto simulate:

1. **Fiat Panda 1.2 Easy** (2024, 5.000 km) - ✨ NUOVO
2. **Fiat Panda Cross 4x4** (2023, 15.000 km) - ✨ NUOVO
3. **Fiat Panda 0.9 TwinAir Lounge** (2024, 2.000 km)
4. **Fiat Pandina Hybrid** (2025, 0 km) - ✨ NUOVO
5. **Fiat Panda City Life 1.0** (2023, 18.500 km)

## Troubleshooting

### ❌ "Configurazione Telegram non trovata"

**Soluzione**: Crea il file `config/config.json`:

```json
{
  "telegram": {
    "botToken": "TUO_BOT_TOKEN",
    "chatId": "TUO_CHAT_ID"
  }
}
```

### ❌ "Errore download immagini"

**Soluzione**: 
- Verifica la connessione internet
- Il test continuerà comunque (creerà l'Excel senza immagini)

### ❌ "Errore invio Telegram"

**Soluzione**:
- Verifica token e chatId nel config
- Il file Excel sarà comunque generato in `data/test_report_auto.xlsx`

## Differenze con Car Watcher Reale

| Caratteristica | Test | Car Watcher Reale |
|----------------|------|-------------------|
| Fonte dati | Auto simulate | Scraping siti web |
| Nome file | `test_report_auto.xlsx` | `report_auto.xlsx` |
| Messaggio | Marcato come TEST | Messaggio standard |
| Scheduling | Esecuzione singola | Cron job automatico |

## Output Console (Esempio)

```
🧪 ======================================
🚗 TEST EXCEL + TELEGRAM - CAR WATCHER
======================================

📊 Auto di test da processare: 5
✨ Auto marcate come "nuove": 3

📝 STEP 1: Generazione Excel...

📊 === GENERAZIONE REPORT EXCEL DI TEST ===

📁 Creazione fogli separati per 3 ricerche...

📄 Creazione foglio "Panda" con 3 auto...
  📝 Riga 2: Fiat Panda 1.2 Easy
  📷 Immagine 1/5:
    📥 Download: https://images.unsplash.com/photo...
    ✅ Salvata localmente
    ✅ Immagine aggiunta all'Excel
  ...

✅ Foglio "Panda" completato (3 auto)

📄 Creazione foglio "Panda Cross" con 1 auto...
  ...

✅ Report Excel di test generato con successo!
📁 Percorso: c:\subito-notifier\data\test_report_auto.xlsx
📊 Totale fogli: 3
📊 Totale auto: 5
📷 Totale immagini: 5

📨 STEP 2: Invio via Telegram...

📤 === INVIO TELEGRAM ===

📍 Chat ID: 123456789
📊 Auto da notificare: 3
📨 Invio messaggio di testo...
✅ Messaggio inviato! (ID: 987)
📎 Invio file Excel...
✅ File Excel inviato! (ID: 988)

✅ Report inviato su Telegram con successo!

======================================
✅ TEST COMPLETATO CON SUCCESSO!
======================================
📊 Excel generato: c:\subito-notifier\data\test_report_auto.xlsx
📤 Messaggio e file inviati su Telegram
🚗 Auto totali: 5
✨ Auto nuove: 3
```

## Note

- ⚠️ Il messaggio Telegram è marcato come "TEST" per distinguerlo dalle notifiche reali
- 📷 Le immagini sono scaricate da Unsplash (auto generiche)
- 🧹 Le immagini temporanee vengono automaticamente rimosse dopo la generazione
- 📊 Il file Excel rimane in `data/test_report_auto.xlsx` per ispezione

## Prossimi Passi

Dopo aver verificato che il test funziona:

1. ✅ Controlla l'Excel generato
2. ✅ Verifica la ricezione su Telegram
3. ✅ Esegui il car_watcher reale con `npm run start:car-watcher`
