const MAX_IMAGE_DIMENSION = 1600;
const TARGET_BYTES = 1_500_000;

export async function compressEvidenceFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size <= TARGET_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); return file; }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  if (!blob || blob.size >= file.size) return file;
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-compressed.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export async function compressEvidence(files: File[]) {
  return Promise.all(files.map(file => compressEvidenceFile(file)));
}
