abstract class BaseFileApiAdapter {
    protected api_: any;

    constructor(api: any) {
        if (this.constructor === BaseFileApiAdapter) {
            throw new TypeError("Abstract class 'AbstractFileApiDriver' cannot be instantiated directly.");
        }
        this.api_ = api;
    }

    abstract api(): any;
    abstract makePath_(path: string): string;
    abstract stat(path: string): Promise<any>;
    abstract list(path: string): Promise<any>;
    abstract get(path: string, options?: any): Promise<any>;
    abstract mkdir(path: string): Promise<any>;
    abstract put(path: string, content: any, options?: any): Promise<any>;
    abstract delete(path: string): Promise<any>;
    abstract move(): Promise<any>;
    abstract format(): any;
    abstract clearRoot(): Promise<any>;
}