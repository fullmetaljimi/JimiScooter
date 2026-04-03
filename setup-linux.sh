#!/bin/bash
# Setup script per Car Watcher su Linux VM

echo ""
echo "========================================="
echo "  CAR WATCHER - SETUP LINUX"
echo "========================================="
echo ""

# Vai alla directory del progetto
cd "$(dirname "$0")"

echo "📦 Installazione dipendenze..."
npm install

echo ""
echo "✅ Setup completato!"
echo ""
echo "🚀 Avvio opzioni:"
echo ""
echo "1. Avvio diretto (per test):"
echo "   npm run start:car-watcher"
echo ""
echo "2. Avvio con PM2 (consigliato per produzione):"
echo "   npm install -g pm2"
echo "   pm2 start src/car_watcher.js --name car-watcher"
echo "   pm2 save"
echo "   pm2 startup  # Configura avvio automatico al boot"
echo ""
echo "3. Avvio come servizio systemd:"
echo "   sudo cp car-watcher.service /etc/systemd/system/"
echo "   sudo systemctl enable car-watcher"
echo "   sudo systemctl start car-watcher"
echo ""
