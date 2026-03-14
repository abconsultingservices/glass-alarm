import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { useThemedStyles } from '../hooks/useThemedStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '../services/DatabaseService';

export default function RootLayout() {
  const { isDark, colors } = useThemedStyles(); 
  const router = useRouter();
  const segments = useSegments();
  const [isDbReady, setIsDbReady] = useState(false);

  // --- 1. DATABASE INITIALIZATION & NAVIGATION RESTORE ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // --- TEMPORARY: NUKE OLD SCHEMA ---
        // Uncomment the next line, run the app once, then comment it back out.
        // await dbService.resetApp(); 
        
        // 1. Ensure DB is ready and seeded
        await dbService.initialize();
        setIsDbReady(true);

        // 2. Only run navigation restoration at the app root entry point
        if (segments.length === 0 || segments[0] === 'index') {
          const lastView = await AsyncStorage.getItem('calendar_zoom_level');
          const lastDate = await AsyncStorage.getItem('calendar_last_date');
          const today = new Date().toISOString().split('T')[0];
          const targetDate = lastDate || today;

          if (lastView === 'year') {
            router.replace('/calendar/year');
          } else if (lastView === 'day') {
            router.replace({
              pathname: '/calendar/day',
              params: { date: targetDate }
            });
          } else if (lastView === 'month') {
            router.replace('/calendar');
          }
          // If no lastView, it stays on the 'index' (usually Welcome or Setup)
        }
      } catch (e) {
        console.error("Failed to initialize app state", e);
      }
    };

    initializeApp();
  }, []);

  // --- 2. Web CSS Injection for Glass Inputs ---
  useEffect(() => {
    const isWeb = typeof window !== "undefined" && (Platform?.OS === "web" || (Platform as any)?.default?.OS === "web");

    if (isWeb) {
      const style = document.createElement('style');
      style.innerHTML = `
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
        [data-glass-input="true"]:-webkit-autofill {
          -webkit-text-fill-color: ${isDark ? '#ffffff' : '#000000'} !important;
          box-shadow: 0 0 0px 1000px transparent inset !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
        [data-glass-input="true"]::placeholder {
          color: ${colors.placeholderText} !important;
          opacity: 1 !important; /* Forces the browser to use our exact opacity from getColors */
          font-weight: 400 !important;     /* Matches the light iOS placeholder weight */
           -webkit-text-fill-color: ${colors.placeholderText}  !important;
        }
        [data-glass-input="true"]::-webkit-input-placeholder {
          color: ${colors.placeholderText}  !important;
          opacity: 1 !important; 
          font-weight: 400 !important;     /* Matches the light iOS placeholder weight */
        }

        .glass-pill-web {
          background-color: rgba(44, 44, 46, 0.7) !important; /* colors.glassBackground with transparency */
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `;
      document.head.appendChild(style);
      return () => { if (document.head.contains(style)) document.head.removeChild(style); };
    }
  }, [isDark, colors]);

  // --- 3. LOADING STATE GUARD ---
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="calendar/index" />
        <Stack.Screen name="calendar/year" />
        <Stack.Screen 
          name="calendar/add-routine" 
          options={{ 
            presentation: 'modal', // Key for bottom-up slide
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen name="settings" />
        <Stack.Screen 
          name="edit/[field]" 
          options={{ 
            presentation: 'modal', 
            gestureEnabled: true,
            animation: 'slide_from_bottom' 
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}