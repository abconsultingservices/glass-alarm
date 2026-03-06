import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useThemedStyles } from '../hooks/useThemedStyles';

export default function RootLayout() {
  const { isDark, colors } = useThemedStyles(); 

  useEffect(() => {
    const isWeb = typeof window !== "undefined" && (Platform?.OS === "web" || (Platform as any)?.default?.OS === "web");

    if (isWeb) {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Nuke the black ends and white boxes */
        [data-glass-input="true"],
        [data-glass-input="true"] input {
          background-color: transparent !important;
          background: transparent !important;
          box-shadow: none !important;
          -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
          outline-width: 0 !important;
          appearance: none !important;
          border: none !important;
        }

        /* Target autofill for these specific inputs */
        [data-glass-input="true"]:-webkit-autofill,
        [data-glass-input="true"]:-webkit-autofill:hover, 
        [data-glass-input="true"]:-webkit-autofill:focus {
          -webkit-text-fill-color: ${isDark ? '#ffffff' : '#000000'} !important;
          box-shadow: 0 0 0px 1000px transparent inset !important;
          -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
          transition: background-color 5000s ease-in-out 0s !important;
          background-color: transparent !important;
        }

        [data-glass-input="true"]::placeholder {
          color: ${colors.placeholderText} !important;
          opacity: 1 !important; 
          font-weight: 500 !important;
          -webkit-text-fill-color: ${colors.placeholderText} !important;
        }

        [data-glass-input="true"]::-webkit-input-placeholder {
          color: ${colors.placeholderText} !important;
          font-weight: 500 !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [isDark, colors]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="dashboard" />
        
        {/* Dynamic Edit Route Configuration */}
        <Stack.Screen 
          name="edit/[field]" 
          options={{ 
            presentation: 'card', 
            gestureEnabled: true,
            animation: 'slide_from_right' // Native iOS feel
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}