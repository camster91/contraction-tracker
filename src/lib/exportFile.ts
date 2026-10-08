import { Capacitor } from '@capacitor/core';
import { isShareCancellation } from './shareCancellation.ts';

/** Native exports use a local cache file and the OS share sheet, never a server. */
export async function exportTextFile(text: string, filename: string, mime: string, title: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `olive-exports/${Date.now()}-${safeName}`;
    const result = await Filesystem.writeFile({ path, data: text, directory: Directory.Cache,
      encoding: Encoding.UTF8, recursive: true });
    try {
      await Share.share({ title, files: [result.uri], dialogTitle: 'Save or share your Olive file' });
    } catch (error) {
      if (isShareCancellation(error)) return false;
      throw error;
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});
    }
    return true;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Keep the blob alive until the browser has accepted the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
