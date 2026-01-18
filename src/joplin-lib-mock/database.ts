// Mock database module
export default class Database {
	public async query(sql: string, params?: any[]): Promise<any> {
		return [];
	}

	public async exec(sql: string): Promise<void> {
		// Mock exec
	}

	public async selectOne(sql: string, params?: any[]): Promise<any> {
		return null;
	}

	public async selectAll(sql: string, params?: any[]): Promise<any[]> {
		return [];
	}
}
