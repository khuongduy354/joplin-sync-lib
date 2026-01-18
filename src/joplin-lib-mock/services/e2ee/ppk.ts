import EncryptionService, { EncryptionMethod } from './EncryptionService';
import { RSA, RSAKeyPair } from './types';

interface PrivateKey {
	encryptionMethod: EncryptionMethod;
	ciphertext: string;
}

export type PublicKey = string;

export interface PublicPrivateKeyPair {
	id: string;
	keySize: number;
	publicKey: PublicKey;
	privateKey: PrivateKey;
	createdTime: number;
}

let rsa_: RSA = null;

export const setRSA = (rsa: RSA) => {
	rsa_ = rsa;
};

export const rsa = (): RSA => {
	if (!rsa_) throw new Error('RSA handler has not been set!!');
	return rsa_;
};

export async function generateKeyPair(encryptionService: EncryptionService, password: string): Promise<PublicPrivateKeyPair> {
	const keySize = 2048;
	const keyPair = await rsa().generateKeyPair(keySize);

	return {
		id: `ppk_${Date.now()}`,
		keySize,
		privateKey: {
			encryptionMethod: EncryptionMethod.SJCL4,
			ciphertext: await encryptionService.encrypt(EncryptionMethod.SJCL4, password, rsa().privateKey(keyPair)),
		},
		publicKey: rsa().publicKey(keyPair),
		createdTime: Date.now(),
	};
}

export async function decryptPrivateKey(encryptionService: EncryptionService, encryptedKey: PrivateKey, password: string): Promise<string> {
	return encryptionService.decrypt(encryptedKey.encryptionMethod, password, encryptedKey.ciphertext);
}
