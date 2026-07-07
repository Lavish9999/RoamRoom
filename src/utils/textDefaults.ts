import { Platform, Text, TextInput } from 'react-native';

import { colors } from '@/theme';

const appFontFamily = Platform.select({
  ios: 'SF Pro Rounded',
  android: 'sans-serif',
  default: undefined,
});

let installed = false;

export function installTextDefaults() {
  if (installed) return;
  installed = true;

  // Base defaults: near-white text so any element that forgets an explicit
  // color stays readable on the dark background (explicit styles still win).
  const base = appFontFamily ? { fontFamily: appFontFamily, color: colors.ink } : { color: colors.ink };

  const text = Text as unknown as { defaultProps?: { style?: unknown; allowFontScaling?: boolean } };
  const input = TextInput as unknown as { defaultProps?: { style?: unknown; allowFontScaling?: boolean } };

  text.defaultProps = text.defaultProps ?? {};
  text.defaultProps.allowFontScaling = false;
  text.defaultProps.style = [base, text.defaultProps.style];

  input.defaultProps = input.defaultProps ?? {};
  input.defaultProps.allowFontScaling = false;
  input.defaultProps.style = [base, input.defaultProps.style];
}
