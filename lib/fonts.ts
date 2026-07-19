import { Platform } from 'react-native';

export const serif = Platform.select({ ios: 'Palatino', android: 'serif', default: 'serif' });
export const serifItalic = Platform.select({
  ios: 'Palatino-Italic',
  android: 'serif',
  default: 'serif',
});
