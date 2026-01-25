// New code should make use of this enum
export enum ModelType {
	Note = 1,
	Folder = 2,
	Setting = 3,
	Resource = 4,
	Tag = 5,
	NoteTag = 6,
	Search = 7,
	Alarm = 8,
	MasterKey = 9,
	ItemChange = 10,
	NoteResource = 11,
	ResourceLocalState = 12,
	Revision = 13,
	Migration = 14,
	SmartFilter = 15,
	Command = 16,
}

export interface DeleteOptions {
	idFieldName?: string;
	changeSource?: number;
	deleteChildren?: boolean;
	trackDeleted?: boolean;
	disableReadOnlyCheck?: boolean;
	sourceDescription?: string;
}

export default class BaseModel {
	public static typeEnum_: any[] = [
		['TYPE_NOTE', ModelType.Note],
		['TYPE_FOLDER', ModelType.Folder],
		['TYPE_SETTING', ModelType.Setting],
		['TYPE_RESOURCE', ModelType.Resource],
		['TYPE_TAG', ModelType.Tag],
		['TYPE_NOTE_TAG', ModelType.NoteTag],
		['TYPE_SEARCH', ModelType.Search],
		['TYPE_ALARM', ModelType.Alarm],
		['TYPE_MASTER_KEY', ModelType.MasterKey],
		['TYPE_ITEM_CHANGE', ModelType.ItemChange],
		['TYPE_NOTE_RESOURCE', ModelType.NoteResource],
		['TYPE_RESOURCE_LOCAL_STATE', ModelType.ResourceLocalState],
		['TYPE_REVISION', ModelType.Revision],
		['TYPE_MIGRATION', ModelType.Migration],
		['TYPE_SMART_FILTER', ModelType.SmartFilter],
		['TYPE_COMMAND', ModelType.Command],
	];

	public static TYPE_NOTE = ModelType.Note;
	public static TYPE_FOLDER = ModelType.Folder;
	public static TYPE_SETTING = ModelType.Setting;
	public static TYPE_RESOURCE = ModelType.Resource;
	public static TYPE_TAG = ModelType.Tag;
	public static TYPE_NOTE_TAG = ModelType.NoteTag;
	public static TYPE_SEARCH = ModelType.Search;
	public static TYPE_ALARM = ModelType.Alarm;
	public static TYPE_MASTER_KEY = ModelType.MasterKey;
	public static TYPE_ITEM_CHANGE = ModelType.ItemChange;
	public static TYPE_NOTE_RESOURCE = ModelType.NoteResource;
	public static TYPE_RESOURCE_LOCAL_STATE = ModelType.ResourceLocalState;
	public static TYPE_REVISION = ModelType.Revision;
	public static TYPE_MIGRATION = ModelType.Migration;
	public static TYPE_SMART_FILTER = ModelType.SmartFilter;
	public static TYPE_COMMAND = ModelType.Command;

	public static dispatch: Function = function() {};
	private static saveMutexes_: any = {};
	private static db_: any;

	public static modelType(): ModelType {
		throw new Error('Must be overriden');
	}

	public static tableName(): string {
		throw new Error('Must be overriden');
	}

	public static setDb(db: any) {
		this.db_ = db;
	}

	public static db() {
		return this.db_;
	}

	public static addModelMd(model: any): any {
		if (!model) return model;

		if (Array.isArray(model)) {
			const output = [];
			for (let i = 0; i < model.length; i++) {
				output.push(this.addModelMd(model[i]));
			}
			return output;
		} else {
			model = { ...model };
			model.type_ = this.modelType();
			return model;
		}
	}

	public static logger() {
		return this.db().logger();
	}

	public static useUuid() {
		return false;
	}

	public static byId(items: any[], id: string) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id === id) return items[i];
		}
		return null;
	}

	public static modelTypeToName(type: number) {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			if (e[1] === type) return e[0].substr(5).toLowerCase();
		}
		throw new Error(`Unknown model type: ${type}`);
	}

	public static modelNameToType(name: string) {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			const eName = e[0].substr(5).toLowerCase();
			if (eName === name) return e[1];
		}
		throw new Error(`Unknown model name: ${name}`);
	}

	// Stub implementations for methods used by BaseItem
	public static async load(id: string, options: any = null): Promise<any> {
		// Mock implementation - override in subclasses
		return null;
	}

	public static async loadByField(field: string, value: any, options: any = null): Promise<any> {
		// Mock implementation - override in subclasses
		return null;
	}

	public static async loadByFields(fields: any, options: any = null): Promise<any> {
		// Mock implementation - override in subclasses
		return null;
	}

	public static async modelSelectAll(sql: string): Promise<any[]> {
		// Mock implementation - override in subclasses
		return [];
	}

	public static escapeIdsForSql(ids: string[]): string {
		// Escape IDs for SQL IN clause
		return ids.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
	}

	public static async batchDelete(ids: string[], options: DeleteOptions = {}): Promise<void> {
		// Mock implementation - override in subclasses
		console.log('BaseModel.batchDelete called with', ids.length, 'ids');
	}

	public static filter(item: any): any {
		// Remove undefined values and return a clean object
		const output: any = {};
		for (const key in item) {
			if (item[key] !== undefined) {
				output[key] = item[key];
			}
		}
		return output;
	}

	public static fieldNames(param?: any): string[] {
		// Override in subclasses to return field names
		// param can be boolean (withPrefix) or string (context) depending on subclass
		return [];
	}
}
