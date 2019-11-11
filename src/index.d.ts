type Callback = (res: object) => void;
declare function swaggerMockApi(config: object): (req: object, callback: Callback) => Promise<any>;

export = swaggerMockApi;