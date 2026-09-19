import { SERVER_URL } from './authService';

export type UploadedFile = {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
};

type PickedFile = {
  file: File;
  uri: string; // object URL, utile pour un aperçu immédiat
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function pickFile(accept: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    // Si l'utilisateur ferme le sélecteur sans choisir de fichier, on résout avec null.
    // 'change' ne se déclenche pas dans ce cas, donc on écoute aussi 'focus' de retour sur window.
    let resolved = false;
    const cleanup = () => {
      window.removeEventListener('focus', onFocusBack);
      input.remove();
    };

    const onFocusBack = () => {
      // Laisse le temps à 'change' de se déclencher en premier s'il y a un fichier.
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, 300);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      resolved = true;
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        file,
        uri: URL.createObjectURL(file),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
    };

    window.addEventListener('focus', onFocusBack);
    document.body.appendChild(input);
    input.click();
  });
}

class UploadService {
  async pickImage(): Promise<PickedFile | null> {
    return pickFile('image/*');
  }

  async pickDocument(): Promise<PickedFile | null> {
    return pickFile('*/*');
  }

  async uploadFile(fileOrAsset: File | PickedFile, contentType: string): Promise<UploadedFile> {
    const file = fileOrAsset instanceof File ? fileOrAsset : fileOrAsset.file;

    const formData = new FormData();
    formData.append('file', file, file.name || `file_${Date.now()}`);
    formData.append('contentType', contentType);

    // ⚠️ Ne pas fixer 'Content-Type' manuellement : le navigateur doit
    // générer lui-même le boundary multipart, sinon l'upload échoue silencieusement.
    const response = await fetch(`${SERVER_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur upload');
    }

    return data; // { fileUrl, fileName, fileSize, fileMimeType }
  }
}

export default new UploadService();