require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Try environment variables first, otherwise load config/config.json
function loadConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) return { token, chatId };

  try {
    const cfgPath = path.join(__dirname, '..', 'config', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      return {
        token: cfg.telegram && cfg.telegram.botToken,
        chatId: cfg.telegram && cfg.telegram.chatId
      };
    }
  } catch (err) {
    // ignore and fallthrough
  }

  return { token: null, chatId: null };
}

async function sendMessage(text, opts = {}) {
  const { token, chatId } = loadConfig();
  if (!token || !chatId) {
    throw new Error('Telegram token or chatId not configured. Set TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID or config/config.json');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: opts.parse_mode || 'HTML',
    disable_web_page_preview: opts.disable_web_page_preview || false
  };

  const resp = await axios.post(url, payload, { timeout: 15000 });
  return resp.data;
}

// Funzione per ascoltare messaggi e gestire keyword
function listenForMessages(keyword, callback) {
  let lastUpdateId = 0;
  const { token } = loadConfig();
  const API_URL = `https://api.telegram.org/bot${token}`;
  setInterval(async () => {
    try {
      const res = await axios.get(`${API_URL}/getUpdates?offset=${lastUpdateId + 1}`);
      const updates = res.data.result;
      updates.forEach(update => {
        lastUpdateId = update.update_id;
        const message = update.message && update.message.text;
        if (message && message.includes(keyword)) {
          callback(update.message);
        }
      });
    } catch (err) {
      // Ignora errori temporanei
    }
  }, 2000);
}

// Esempio: rispondi con messaggio keepalive
/*listenForMessages('keepalive', (msg) => {
  sendMessage('JimiScooter bot is running', { chat_id: msg.chat.id });
});*/

module.exports = { sendMessage, listenForMessages };

// If run directly, send the provided argv as a message (or a test message)
if (require.main === module) {
  const msg = process.argv.slice(2).join(' ') || 'Messaggio di prova dal bot';
  sendMessage(msg)
    .then(r => {
      console.log('Messaggio inviato', r && r.ok);
    })
    .catch(err => {
      console.error('Errore invio telegram:', err.message || err);
      process.exit(2);
    });
}
