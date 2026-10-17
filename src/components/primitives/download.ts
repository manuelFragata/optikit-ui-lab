/** Hand the viewer a file to save (an image, an export). */
export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

/** Hand the viewer a text file to save (a CSV, a design file). */
export function download(fileName: string, text: string, type = 'text/plain') {
  downloadBlob(fileName, new Blob([text], { type }));
}
