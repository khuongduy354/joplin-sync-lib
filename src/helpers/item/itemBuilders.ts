import { v4 } from "uuid";
import path from "path";
import fs from "fs-extra";
import { Item } from "../../types/item";
import { ModelType } from "../../Model";

export function createUUID() {
  return v4().replace(/-/g, "");
}

// Abstract item builder base class
export abstract class ItemBuilder<T extends Item> {
  protected item: Partial<T>;

  constructor(type_: ModelType) {
    this.item = {
      id: createUUID(),
      type_,
    } as Partial<T>;
  }

  public setId(id: string): this {
    this.item.id = id;
    return this;
  }

  public setTitle(title: string): this {
    this.item.title = title;
    return this;
  }

  public setCreatedTime(createdTime: number): this {
    this.item.created_time = createdTime;
    return this;
  }

  public setUpdatedTime(updatedTime: number): this {
    this.item.updated_time = updatedTime;
    return this;
  }

  abstract build(): T;
}

// Note builder
export class NoteBuilder extends ItemBuilder<Item> {
  constructor() {
    super(ModelType.Note);
  }

  public setParentId(parentId: string): this {
    this.item.parent_id = parentId;
    return this;
  }

  public setBody(body: string): this {
    this.item.body = body;
    return this;
  }

  public build(): Item {
    // Set defaults
    this.item.title = this.item.title || "Untitled";
    this.item.body = this.item.body || "";
    this.item.parent_id = this.item.parent_id || ""; // empty string = root notebook

    return this.item as Item;
  }
}

// Resource builder
export class ResourceBuilder extends ItemBuilder<Item> {
  constructor() {
    super(ModelType.Resource);
  }

  public setLocalResourceContentPath(localPath: string): this {
    const resolvedPath = path.resolve(localPath);
    const stats = fs.statSync(resolvedPath);

    if (!stats) {
      throw new Error("Resource not exist in path: " + resolvedPath);
    }

    this.item.localResourceContentPath = resolvedPath;
    this.item.size = stats.size;
    return this;
  }

  public setSize(size: number): this {
    this.item.size = size;
    return this;
  }

  public build(): Item {
    return this.item as Item;
  }
}

// Folder builder
export class FolderBuilder extends ItemBuilder<Item> {
  constructor() {
    super(ModelType.Folder);
  }

  public setParentId(parentId: string): this {
    this.item.parent_id = parentId;
    return this;
  }

  public build(): Item {
    this.item.title = this.item.title || "Untitled Folder";
    return this.item as Item;
  }
}

// Tag builder
export class TagBuilder extends ItemBuilder<Item> {
  constructor() {
    super(ModelType.Tag);
  }

  public build(): Item {
    this.item.title = this.item.title || "Untitled Tag";
    return this.item as Item;
  }
}

// Factory class for creating items
export class ItemFactory {
  static createNote(): NoteBuilder {
    return new NoteBuilder();
  }

  static createResource(): ResourceBuilder {
    return new ResourceBuilder();
  }

  static createFolder(): FolderBuilder {
    return new FolderBuilder();
  }

  static createTag(): TagBuilder {
    return new TagBuilder();
  }
}
