// Used for tracking state of current Sync API instance
export class LocalInfo {
  e2eEnabled: boolean;
  masterKeyId: string | null = null;
  context: any;
}
