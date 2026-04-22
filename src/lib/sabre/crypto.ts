import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { getEncryptionKey } from './config';

export interface EncryptedBlob {
  ciphertext: string;
  iv: string;
  tag: string;
}

export const encryptJson = (value: unknown): EncryptedBlob => {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64')
  };
};

export const decryptJson = <T>(blob: EncryptedBlob): T => {
  const key = getEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(plaintext.toString('utf8')) as T;
};
