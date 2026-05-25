/// <reference types="vite/client" />

declare module "*?worker" {
  const WorkerCtor: { new (): Worker };
  export default WorkerCtor;
}

declare module "*?worker&inline" {
  const WorkerCtor: { new (): Worker };
  export default WorkerCtor;
}

declare module "markdown-it-task-lists";

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_LOG_LEVEL: "debug" | "info" | "warn" | "error";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
