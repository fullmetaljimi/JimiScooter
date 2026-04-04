// scheduler.js
// Gestisce tutti i job schedulati (cron) per il sistema di notifiche

const cron = require('node-cron');

/**
 * Configura e avvia tutti i job schedulati
 * 
 * @param {Array} jobConfigs - Array di configurazioni job
 * @param {string} jobConfigs[].name - Nome del job (es: "Car Watcher")
 * @param {string} [jobConfigs[].icon] - Emoji/icona per i log (es: "🚗")
 * @param {Function} jobConfigs[].handler - Funzione async da eseguire
 * @param {Array<string|Object>} jobConfigs[].schedules - Pattern cron o oggetti con pattern + label
 * 
 * @example
 * startScheduler([
 *   {
 *     name: 'Car Watcher',
 *     icon: '🚗',
 *     handler: runCarScan,
 *     schedules: [
 *       { pattern: '0 12 * * *', label: 'mezzogiorno' },
 *       { pattern: '0 18 * * *', label: 'sera' }
 *     ]
 *   },
 *   {
 *     name: 'Subito Watcher',
 *     icon: '🛵',
 *     handler: runSubitoScan,
 *     schedules: ['0 9 * * *']  // Pattern semplice senza label
 *   }
 * ])
 */
function startScheduler(jobConfigs = []) {
  console.log('\n⏰ === SCHEDULER CENTRALE ===\n');
  
  const scheduledJobs = [];
  
  // Itera su ogni configurazione di job
  jobConfigs.forEach(config => {
    const { name, icon = '📅', handler, schedules } = config;
    
    // Validazione
    if (!name || typeof handler !== 'function' || !Array.isArray(schedules) || schedules.length === 0) {
      console.warn(`⚠️  Configurazione job non valida, saltato:`, config);
      return;
    }
    
    console.log(`${icon} ${name} schedulato:`);
    
    // Crea un cron job per ogni schedule
    schedules.forEach((schedule, index) => {
      let pattern, label;
      
      // Supporta sia stringhe semplici che oggetti { pattern, label }
      if (typeof schedule === 'string') {
        pattern = schedule;
        label = pattern; // Usa il pattern come label se non specificato
      } else if (schedule.pattern) {
        pattern = schedule.pattern;
        label = schedule.label || pattern;
      } else {
        console.warn(`⚠️  Schedule non valido per ${name}, saltato:`, schedule);
        return;
      }
      
      console.log(`   ⏰ ${label} (${pattern})`);
      
      // Crea il cron job
      const cronJob = cron.schedule(pattern, async () => {
        const now = new Date();
        console.log(`\n🔔 === ${name.toUpperCase()} SCHEDULATO ===`);
        console.log(`🕒 ${label} - ${now.toLocaleString('it-IT')}\n`);
        
        try {
          await handler();
          console.log(`✅ ${name} completato alle ${new Date().toLocaleTimeString('it-IT')}\n`);
        } catch (error) {
          console.error(`❌ Errore ${name} (${label}):`, error.message);
        }
      }, {
        timezone: 'Europe/Rome'
      });
      
      scheduledJobs.push({ 
        name: `${name} - ${label}`, 
        job: cronJob 
      });
    });
    
    console.log(''); // Riga vuota tra job diversi
  });
  
  console.log(`✅ Scheduler avviato con ${scheduledJobs.length} job attivi`);
  console.log('🛡️  I job resteranno in esecuzione in background...');
  console.log('🚫 Per terminare premi CTRL+C\n');
  
  return {
    jobs: scheduledJobs,
    stop: () => {
      console.log('\n⏹️  Fermando tutti i job schedulati...');
      scheduledJobs.forEach(({ name, job }) => {
        job.stop();
        console.log(`   ✅ ${name} fermato`);
      });
      console.log('✅ Scheduler fermato\n');
    }
  };
}

/**
 * Esempi di pattern cron comuni
 * 
 * Formato: 'minuto ora giorno-mese mese giorno-settimana'
 * 
 * '0 12 * * *'      - Ogni giorno alle 12:00
 * '30 8 * * *'      - Ogni giorno alle 8:30
 * '0 9,18 * * *'    - Ogni giorno alle 9:00 e 18:00
 * /
 */

module.exports = startScheduler;
