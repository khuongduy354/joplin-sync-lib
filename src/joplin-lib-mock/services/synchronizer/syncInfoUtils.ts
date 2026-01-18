import { PublicPrivateKeyPair } from '../e2ee/ppk';

export interface SyncInfoValuePublicPrivateKeyPair {
	id: string;
	value: PublicPrivateKeyPair;
}

// Mock functions
export const getActiveMasterKeyId = (): string => {
	return '';
};

export const setActiveMasterKeyId = (id: string): void => {
	// Mock implementation
};

export const getEncryptionEnabled = (): boolean => {
	return false;
};
