// main.js
// Script centralizzato per avviare sia subito_watcher che il listener Telegram

const { sendMessage, listenForMessages } = require('./send_telegram');
const startSubitoWatcher = require('./subito_watcher');

// Avvia subito_watcher (assicurati che esporti una funzione di avvio)
if (typeof startSubitoWatcher === 'function') {
  startSubitoWatcher();
}

// Avvia il listener Telegram per la keyword 'keepalive'
listenForMessages('Keepalive', (msg) => {
  sendMessage('JimiScooter bot is running', { chat_id: msg.chat.id });
});

console.log('Main script avviato: subito_watcher + telegram listener');
