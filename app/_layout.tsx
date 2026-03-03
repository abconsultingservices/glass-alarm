import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';

import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme(); // 'dark' or 'light'

  useEffect(() => {
    //debugger;
    const isWeb = typeof window !== "undefined" && (Platform?.OS === "web" || (Platform as any)?.default?.OS === "web");

    if (isWeb) {
      //(window as any).SQL_WASM_PATH = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm";
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </ThemeProvider>
  );
}