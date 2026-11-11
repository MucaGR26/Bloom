/**
 * Abre uma imagem escolhida pelo usuário e devolve uma versão reduzida em JPEG (data URL),
 * pequena o bastante para caber no localStorage. GIFs são mantidos inteiros para continuarem animados.
 * - square: corta no centro e gera maxSize × maxSize (foto de perfil)
 * - senão: mantém a proporção, com o maior lado limitado a maxSize (imagem de fundo)
 */
export function resizeImage(file: File, maxSize: number, square = false): Promise<string> {
  if (file.type === 'image/gif') return readGif(file);
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const [sx, sy, sw, sh] = square
        ? [(img.width - side) / 2, (img.height - side) / 2, side, side]
        : [0, 0, img.width, img.height];
      const scale = Math.min(1, maxSize / Math.max(sw, sh));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível abrir essa imagem.'));
    };
    img.src = url;
  });
}

/** Limite por GIF: ele é guardado inteiro, sem reduzir. */
const MAX_GIF_BYTES = 5 * 1024 * 1024;

/**
 * GIF não passa pelo canvas (isso pararia a animação): é guardado como está.
 * O recorte/ajuste fica por conta do CSS (object-cover / background-size: cover).
 */
function readGif(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_GIF_BYTES) {
      return reject(new Error('Esse GIF é grande demais. Escolha um de até 5 MB.'));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível abrir esse GIF.'));
    reader.readAsDataURL(file);
  });
}
