export interface UploadFormState {
  repo: string;
  isPrivate: boolean;
  createIfMissing: boolean;
  basePath: string;
  branch: string;
}

type Listener = (state: UploadFormState) => void;

let state: UploadFormState = {
  repo: "",
  isPrivate: false,
  createIfMissing: true,
  basePath: "",
  branch: ""
};

const listeners = new Set<Listener>();

export function getUploadFormState(): UploadFormState {
  return state;
}

export function subscribeUploadFormState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function setUploadFormState(partial: Partial<UploadFormState>): void {
  state = { ...state, ...partial };
  listeners.forEach((l) => l(state));
}

export function resetUploadFormState(): void {
  state = {
    repo: "",
    isPrivate: false,
    createIfMissing: true,
    basePath: "",
    branch: ""
  };
  listeners.forEach((l) => l(state));
}

export interface PickedFileRef {
  file: File;
  id: string;
  relativePath: string;
}

type FilesListener = (files: PickedFileRef[]) => void;

let pickedFiles: PickedFileRef[] = [];
const filesListeners = new Set<FilesListener>();

export function getPickedFiles(): PickedFileRef[] {
  return pickedFiles;
}

export function subscribePickedFiles(listener: FilesListener): () => void {
  filesListeners.add(listener);
  listener(pickedFiles);
  return () => filesListeners.delete(listener);
}

export function setPickedFiles(files: PickedFileRef[]): void {
  pickedFiles = files;
  filesListeners.forEach((l) => l(pickedFiles));
}
