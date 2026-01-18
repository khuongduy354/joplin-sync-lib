// Mock JoplinDatabase class
export interface TableField {
	name: string;
	type: string;
}

export default class JoplinDatabase {
	private db_: any;

	public constructor(driver: any) {
		this.db_ = null;
	}

	public db() {
		return this.db_;
	}

	public setDb(db: any) {
		this.db_ = db;
	}

	public logger() {
		return {
			info: (...args: any[]) => console.log('[INFO]', ...args),
			warn: (...args: any[]) => console.warn('[WARN]', ...args),
			error: (...args: any[]) => console.error('[ERROR]', ...args),
			debug: (...args: any[]) => console.log('[DEBUG]', ...args),
		};
	}

	public async open(options: any) {
		// Mock implementation
	}

	public tableFieldNames(tableName: string): string[] {
		return [];
	}

	public fieldDefaultValue(tableName: string, fieldName: string): any {
		return null;
	}
}
