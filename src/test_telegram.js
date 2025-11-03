const { sendMessage } = require('./send_telegram');

async function testTelegramMessage() {
    try {
        const result = await sendMessage('🔔 Questo è un messaggio di test!\n\nSe lo vedi, la configurazione del bot Telegram funziona correttamente. ✅');
        console.log('✅ Messaggio inviato con successo!');
        console.log('Dettagli risposta:', result);
    } catch (error) {
        console.error('❌ Errore durante l\'invio del messaggio:', error.message);
        console.log('\nAssicurati di aver configurato correttamente:');
        console.log('1. Il token del bot in TELEGRAM_BOT_TOKEN o config/config.json');
        console.log('2. L\'ID della chat in TELEGRAM_CHAT_ID o config/config.json');
    }
}

testTelegramMessage();