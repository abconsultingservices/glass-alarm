import { useColorScheme } from 'react-native';
import { ThemeUtils } from '../utils/ThemeUtils';

export function useThemedStyles(extraStylesFactory?: (colors: any) => any) {
  const colorScheme = useColorScheme();
  const colors = ThemeUtils.getColors(colorScheme);
  const common = ThemeUtils.getCommonStyles(colors);
  
  // If the component needs custom styles, merge them
  const extra = extraStylesFactory ? extraStylesFactory(colors) : {};

  return {
    styles: { ...common, ...extra },
    colors,
    isDark: colors.isDark,
    getPressedStyle: ThemeUtils.getPressedStyle,
    isWeb: ThemeUtils.isWeb()
  };
}