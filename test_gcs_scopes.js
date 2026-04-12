#!/usr/bin/env node

/**
 * Test Script per verificare gli scope OAuth e l'accesso a Google Cloud Storage
 * 
 * Uso: node test_gcs_scopes.js
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'subito-notifier-files';

console.log('\n🔍 TEST SCOPE GOOGLE CLOUD STORAGE\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testScopes() {
  // Test 1: Verifica scope dalla VM metadata
  console.log('📋 Test 1: Verifica Scope OAuth VM\n');
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/scopes', {
      headers: { 'Metadata-Flavor': 'Google' }
    });
    
    if (response.ok) {
      const scopes = (await response.text()).split('\n').filter(s => s);
      console.log('✅ Scope configurati sulla VM:');
      scopes.forEach(scope => {
        const scopeName = scope.split('/').pop();
        const icon = scope.includes('devstorage') || scope.includes('cloud-platform') ? '✅' : '⚠️';
        console.log(`   ${icon} ${scopeName}`);
      });
      
      const hasStorage = scopes.some(s => 
        s.includes('devstorage.read_write') || 
        s.includes('devstorage.full_control') ||
        s.includes('cloud-platform')
      );
      
      if (!hasStorage) {
        console.error('\n❌ PROBLEMA: Nessuno scope per Storage trovato!');
        console.error('💡 Scope necessari:');
        console.error('   - https://www.googleapis.com/auth/devstorage.read_write');
        console.error('   - O: https://www.googleapis.com/auth/cloud-platform');
        console.error('\n📖 Soluzione: FIX_GCS_SCOPES.md\n');
        return false;
      } else {
        console.log('\n✅ Scope Storage OK!\n');
      }
    } else {
      console.warn('⚠️  Non riesco ad accedere ai metadata (potrebbe non essere una VM GCP)\n');
    }
  } catch (error) {
    console.warn('⚠️  Errore lettura metadata:', error.message);
    console.warn('   (Ignora se non sei su una VM GCP)\n');
  }
  
  // Test 2: Inizializzazione Storage client
  console.log('📋 Test 2: Inizializzazione Storage Client\n');
  let storage;
  try {
    storage = new Storage();
    console.log('✅ Storage client inizializzato\n');
  } catch (error) {
    console.error('❌ Errore inizializzazione:', error.message);
    return false;
  }
  
  // Test 3: Verifica esistenza bucket
  console.log(`📋 Test 3: Verifica bucket "${GCS_BUCKET_NAME}"\n`);
  try {
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const [exists] = await bucket.exists();
    
    if (!exists) {
      console.error(`❌ Bucket "${GCS_BUCKET_NAME}" non trovato`);
      console.error('\n💡 Crea il bucket con:');
      console.error('   ./setup-gcs-bucket.sh\n');
      return false;
    }
    
    console.log(`✅ Bucket "${GCS_BUCKET_NAME}" trovato\n`);
  } catch (error) {
    console.error('❌ Errore verifica bucket:', error.message);
    if (error.code === 403) {
      console.error('\n🔧 ERRORE 403: Scope non autorizzati!');
      console.error('📖 Soluzione: FIX_GCS_SCOPES.md\n');
    }
    return false;
  }
  
  // Test 4: Upload file di test
  console.log('📋 Test 4: Upload file di test\n');
  const testFileName = `test_upload_${Date.now()}.txt`;
  const testFilePath = path.join(__dirname, testFileName);
  
  try {
    // Crea file di test
    fs.writeFileSync(testFilePath, `Test upload at ${new Date().toISOString()}\n`);
    
    // Upload
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    await bucket.upload(testFilePath, {
      destination: testFileName,
      metadata: {
        contentType: 'text/plain',
      },
      public: true,
    });
    
    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${testFileName}`;
    console.log('✅ Upload completato con successo!');
    console.log(`🔗 URL pubblico: ${publicUrl}\n`);
    
    // Cleanup
    fs.unlinkSync(testFilePath);
    
    // Elimina il file di test dal bucket
    console.log('🧹 Cleanup file di test...');
    await bucket.file(testFileName).delete();
    console.log('✅ File di test eliminato\n');
    
  } catch (error) {
    console.error('❌ Errore durante upload:', error.message);
    if (error.code === 403) {
      console.error('\n🔧 ERRORE 403: Scope non autorizzati!');
      console.error('\n💡 SOLUZIONE:');
      console.error('   1. Console GCP → Compute Engine');
      console.error('   2. Arresta la VM');
      console.error('   3. Modifica → Access scopes → "Allow full access to all Cloud APIs"');
      console.error('   4. Riavvia la VM');
      console.error('\n📖 Guida completa: FIX_GCS_SCOPES.md\n');
    }
    // Cleanup file locale se esiste
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    return false;
  }
  
  return true;
}

// Esegui test
testScopes()
  .then(success => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    if (success) {
      console.log('🎉 TUTTI I TEST SUPERATI!');
      console.log('✅ GCS è configurato correttamente\n');
      process.exit(0);
    } else {
      console.log('❌ ALCUNI TEST FALLITI');
      console.log('📖 Consulta FIX_GCS_SCOPES.md per risolvere\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ ERRORE FATALE:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
