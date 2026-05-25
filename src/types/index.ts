export type Disposable = { dispose(): void };

export interface DocId {
  readonly id: string;
}

export interface FileEntry {
  path: string;
  name: string;
  isDir: boolean;
}

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
