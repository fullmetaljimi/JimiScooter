/**
 * PM2 Ecosystem Configuration
 * 
 * Questo file configura PM2 per gestire l'applicazione Subito Notifier
 * Documentazione: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      // ========================================
      // Configurazione Base
      // ========================================
      name: 'subito-notifier',
      script: './src/main.js',
      
      // ========================================
      // Modalità Esecuzione
      // ========================================
      instances: 1,           // Una sola istanza (non serve clustering)
      exec_mode: 'fork',      // Modalità fork (non cluster)
      
      // ========================================
      // Auto Restart
      // ========================================
      autorestart: true,      // Riavvia automaticamente se crasha
      watch: false,           // Non watchare i file (consuma risorse)
      max_memory_restart: '200M',  // Riavvia se supera 200MB RAM
      
      // ========================================
      // Restart Policies
      // ========================================
      min_uptime: '10s',      // Minimo uptime prima di considerare avviato
      max_restarts: 10,       // Max restart consecutivi
      restart_delay: 4000,    // Delay tra restart (4 secondi)
      
      // ========================================
      // Logging
      // ========================================
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,       // Unisci log di tutte le istanze
      
      // ========================================
      // Environment Variables
      // ========================================
      env: {
        NODE_ENV: 'production',
        TZ: 'Europe/Rome'
      },
      
      // ========================================
      // Cron Restart (opzionale)
      // ========================================
      // Riavvia l'app ogni giorno alle 4 AM per prevenire memory leaks
      cron_restart: '0 4 * * *',
      
      // ========================================
      // Error Handling
      // ========================================
      kill_timeout: 5000,     // Timeout per SIGINT prima di SIGKILL
      listen_timeout: 3000,   // Timeout per considerare l'app avviata
      shutdown_with_message: true,
      
      // ========================================
      // Source Control
      // ========================================
      ignore_watch: [
        'node_modules',
        'logs',
        'data',
        '*.log',
        '.git'
      ],
      
      // ========================================
      // Advanced
      // ========================================
      wait_ready: false,      // Non aspettare process.send('ready')
      
      // ========================================
      // Post-Deploy Hooks (opzionale)
      // ========================================
      // Esegui comandi dopo il deploy
      post_update: ['npm install', 'echo "✅ Dependencies updated"'],
    }
  ],

  /**
   * Configurazione Deploy (opzionale)
   * Usato solo se usi `pm2 deploy` invece di GitHub Actions
   */
  deploy: {
    production: {
      user: 'node',
      host: 'your-vm-ip',
      ref: 'origin/main',
      repo: 'git@github.com:username/subito-notifier.git',
      path: '/home/node/subito-notifier',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
