const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Encrypt data with AES-256-GCM
function encryptData(data, encryptionKey) {
  try {
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex')
    };
  } catch (e) {
    console.error('Encryption failed', e);
    return null;
  }
}

// Decrypt data with AES-256-GCM
function decryptData(encryptedData, encryptionKey) {
  try {
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}

// Create encrypted backup of critical data
function createBackup(data, backupDir) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.json.enc`);
    
    const encryptionKey = process.env.DATA_ENCRYPTION_KEY || config.dataEncryptionKey;
    if (!encryptionKey || encryptionKey.length < 64) {
      console.warn('⚠️ Encryption key not properly configured; backup not encrypted');
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
      return backupPath;
    }
    
    const encrypted = encryptData(data, encryptionKey);
    fs.writeFileSync(backupPath, JSON.stringify(encrypted, null, 2));
    console.log(`✅ Backup created: ${backupPath}`);
    return backupPath;
  } catch (e) {
    console.error('Backup creation failed', e);
    return null;
  }
}

// Restore from encrypted backup
function restoreBackup(backupPath, encryptionKey) {
  try {
    const content = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // If it has encryption structure, decrypt it
    if (content.encrypted && content.iv) {
      return decryptData(content, encryptionKey);
    }
    
    // Otherwise return as-is (unencrypted backup)
    return content;
  } catch (e) {
    console.error('Backup restoration failed', e);
    return null;
  }
}

// Clean up old backups based on retention policy
function pruneOldBackups(backupDir, retentionDays) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > retentionMs) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    });
  } catch (e) {
    console.error('Backup pruning failed', e);
  }
}

module.exports = {
  encryptData,
  decryptData,
  createBackup,
  restoreBackup,
  pruneOldBackups
};
