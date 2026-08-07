import { Platform } from 'react-native';

/* Getting the backup out of the app and back in. Everything here is a thin
   wrapper over a platform module, loaded lazily and behind try/catch so the
   browser preview — where none of these exist — degrades to the paste box
   rather than taking Settings down. The logic worth testing lives in
   backup.ts, which this file deliberately knows nothing about. */

export type SaveResult = 'shared' | 'downloaded' | 'unsupported';

export async function saveBackup(filename: string, contents: string): Promise<SaveResult> {
  if (Platform.OS === 'web') return saveOnWeb(filename, contents);

  try {
    const [{ File, Paths }, Sharing] = await Promise.all([
      import('expo-file-system'),
      import('expo-sharing')
    ]);

    if (!(await Sharing.isAvailableAsync())) return 'unsupported';

    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(contents);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: filename,
      UTI: 'public.json'
    });
    return 'shared';
  } catch {
    return 'unsupported';
  }
}

function saveOnWeb(filename: string, contents: string): SaveResult {
  try {
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  } catch {
    return 'unsupported';
  }
}

/** Returns the file's text, or null when the picker is unavailable or the
 *  user backed out. The paste box is always there as the fallback. */
export async function pickBackup(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const [DocumentPicker, { File }] = await Promise.all([
      import('expo-document-picker'),
      import('expo-file-system')
    ]);

    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true
    });
    if (picked.canceled || !picked.assets?.length) return null;

    return new File(picked.assets[0].uri).text();
  } catch {
    return null;
  }
}

/** Whether the file picker is worth offering at all. */
export const canPickFiles = (): boolean => Platform.OS !== 'web';
