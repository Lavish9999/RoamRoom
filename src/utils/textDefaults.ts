import { Platform, Text, TextInput } from 'react-native';

const appFontFamily = Platform.select({
  ios: 'SF Pro Rounded',
  android: 'sans-serif',
  default: undefined,
});

let installed = false;

export function installTextDefaults() {
  if (installed || !appFontFamily) return;
  installed = true;

  const text = Text as unknown as { defaultProps?: { style?: unknown; allowFontScaling?: boolean } };
  const input = TextInput as unknown as { defaultProps?: { style?: unknown; allowFontScaling?: boolean } };

  text.defaultProps = text.defaultProps ?? {};
  text.defaultProps.allowFontScaling = false;
  text.defaultProps.style = [{ fontFamily: appFontFamily }, text.defaultProps.style];

  input.defaultProps = input.defaultProps ?? {};
  input.defaultProps.allowFontScaling = false;
  input.defaultProps.style = [{ fontFamily: appFontFamily }, input.defaultProps.style];
}
