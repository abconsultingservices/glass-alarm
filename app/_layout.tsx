import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useThemedStyles } from '../hooks/useThemedStyles';



export default function RootLayout() {
  const { isDark, styles, colors } = useThemedStyles(); 

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
          /* This overrides the specific shadow seen in your inspector */
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
      `;
      document.head.appendChild(style);
      
      // Cleanup function to remove style tag if component unmounts
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
      </Stack>
    </ThemeProvider>
  );
}