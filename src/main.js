// main.js
// Script centralizzato per avviare tutto il sistema di notifiche

const { sendMessage, listenForMessages } = require('./send_telegram');
const startSubitoWatcher = require('./subito_watcher');
const runCarScan = require('./car_watcher');
const startScheduler = require('./scheduler');

console.log('\n🚀 === AVVIO SISTEMA COMPLETO ===\n');

// ========================================
// 🛵 SUBITO WATCHER (Scooter - Continuo)
// ========================================
if (typeof startSubitoWatcher === 'function') {
  console.log('🛵 Avvio Subito Watcher (modalità continua)...');
  startSubitoWatcher();
}

// ========================================
// 🚗 CAR WATCHER (Auto - Scansione Iniziale)
// ========================================
console.log('🚗 Eseguo scansione iniziale Car Watcher...\n');
runCarScan()
  .then(() => {
    console.log('✅ Scansione iniziale Car Watcher completata\n');
  })
  .catch((error) => {
    console.error('❌ Errore scansione iniziale Car Watcher:', error.message);
  });

// ========================================
// ⏰ SCHEDULER (Scansioni Programmate)
// ========================================
const scheduler = startScheduler([
  {
    name: 'Car Watcher',
    icon: '🚗',
    handler: runCarScan,
    schedules: [
      { pattern: '0 12 * * *', label: 'ore 12:00 (mezzogiorno)' },
      { pattern: '0 18 * * *', label: 'ore 18:00 (sera)' }
    ]
  }
  // Esempio per aggiungere altri moduli in futuro:
  // {
  //   name: 'Subito Watcher',
  //   icon: '🛵',
  //   handler: runSubitoScan,
  //   schedules: [
  //     { pattern: '*/30 * * * *', label: 'ogni 30 minuti' }
  //   ]
  // }
]);

// ========================================
// 📱 TELEGRAM LISTENER (Keepalive)
// ========================================
listenForMessages('Keepalive', (msg) => {
  sendMessage('JimiScooter bot is running', { chat_id: msg.chat.id });
});

console.log('✅ Sistema completo avviato:');
console.log('   🛵 Subito Watcher (modalità continua)');
console.log('   🚗 Car Watcher (scansione iniziale completata)');
console.log('   ⏰ Scheduler (cron job alle 12:00 e 18:00)');
console.log('   📱 Telegram Listener (keepalive)\n');

// Gestione pulizia alla chiusura
process.on('SIGINT', () => {
  console.log('\n\n🛑 Ricevuto segnale di interruzione...');
  if (scheduler && scheduler.stop) {
    scheduler.stop();
  }
  console.log('👋 Arrivederci!\n');
  process.exit(0);
});
