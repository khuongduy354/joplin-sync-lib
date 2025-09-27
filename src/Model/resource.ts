import BaseModel, { BaseItemData, ModelType } from "./BaseModel";

export interface ResourceData extends BaseItemData {
  mime?: string;
  file_extension?: string;
  filename?: string;
  size?: number;
  share_id?: string;
  is_shared?: number;
  blob_updated_time?: number;
  ocr_text?: string;
  ocr_status?: number;
  ocr_details?: string;
  ocr_error?: string;
  master_key_id?: string;
  localResourceContentPath?: string;
  updateBlob?: boolean;
}

export class Resource extends BaseModel {
  public mime?: string;
  public file_extension?: string;
  public filename?: string;
  public size?: number;
  public share_id?: string;
  public is_shared?: number;
  public blob_updated_time?: number;
  public ocr_text?: string;
  public ocr_status?: number;
  public ocr_details?: string;
  public ocr_error?: string;
  public master_key_id?: string;
  public localResourceContentPath?: string;
  public updateBlob?: boolean;

  constructor(data: ResourceData) {
    super({ ...data, type_: ModelType.Resource });

    this.mime = data.mime;
    this.file_extension = data.file_extension;
    this.filename = data.filename;
    this.size = data.size;
    this.share_id = data.share_id;
    this.is_shared = data.is_shared;
    this.blob_updated_time = data.blob_updated_time;
    this.ocr_text = data.ocr_text;
    this.ocr_status = data.ocr_status;
    this.ocr_details = data.ocr_details;
    this.ocr_error = data.ocr_error;
    this.master_key_id = data.master_key_id;
    this.localResourceContentPath = data.localResourceContentPath;
    this.updateBlob = data.updateBlob;
  }

  getFieldNames(): string[] {
    return [
      "id",
      "mime",
      "file_extension",
      "title",
      "filename",
      "created_time",
      "updated_time",
      "encryption_blob_encrypted",
      "encryption_applied",
      "size",
      "share_id",
      "is_shared",
      "blob_updated_time",
      "ocr_text",
      "ocr_status",
      "ocr_details",
      "ocr_error",
      "encryption_cipher_text",
      "type_",
      "master_key_id",
    ];
  }
}

export default Resource;
