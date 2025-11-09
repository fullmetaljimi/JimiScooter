// test_telegram_message.js
// Script di test per invio messaggio Telegram tramite send_telegram.js

const { sendMessage } = require('./send_telegram');

const message = "Script di test telegram - hi from Jimiscooter bot";

sendMessage(message)
  .then(() => console.log('Messaggio Telegram inviato!'))
  .catch(err => console.error('Errore invio Telegram:', err));
