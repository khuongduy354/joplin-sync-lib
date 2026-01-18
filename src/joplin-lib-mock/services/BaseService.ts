// Mock BaseService class
export default class BaseService {
	protected logger_: any;

	public constructor() {
		this.logger_ = {
			info: (...args: any[]) => console.log('[INFO]', ...args),
			warn: (...args: any[]) => console.warn('[WARN]', ...args),
			error: (...args: any[]) => console.error('[ERROR]', ...args),
			debug: (...args: any[]) => console.log('[DEBUG]', ...args),
		};
	}

	public logger() {
		return this.logger_;
	}

	public static instance_: any = null;

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new this();
		}
		return this.instance_;
	}
}
