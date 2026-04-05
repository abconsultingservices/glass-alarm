import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { useThemedStyles } from '../hooks/useThemedStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '../services/DatabaseService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
        
        await dbService.initialize();
        
        // Update state to allow the Stack to render
        setIsDbReady(true);

        // 2. Only run navigation restoration
        if (segments.length === 0 || segments[0] === 'index' || segments[0] === '(tabs)') {
          const lastView = await AsyncStorage.getItem('calendar_zoom_level');
          const lastDate = await AsyncStorage.getItem('calendar_last_date');
          const today = new Date().toISOString().split('T')[0];
          const targetDate = lastDate || today;

          setTimeout(() => {
            requestAnimationFrame(() => {
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
            });
        }, 100);
        }
      } catch (e) {
        console.error("Failed to initialize app state", e);
        setIsDbReady(true); // Don't leave them on a black screen if DB fails
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
          color: ${colors.text} !important;
          -webkit-text-fill-color: ${colors.text} !important;
        }
        [data-glass-input="true"]:-webkit-autofill {
          box-shadow: 0 0 0px 1000px transparent inset !important;
          transition: background-color 5000s ease-in-out 0s !important;
          color: ${colors.text} !important;
          -webkit-text-fill-color: ${colors.text} !important;
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

        /* Liquid Glass Web Picker Overrides */
        @media (prefers-color-scheme: dark) {
            :root { color-scheme: dark; }
            input[type="date"], input[type="time"] { color-scheme: dark; }
        }

        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            cursor: pointer;
            opacity: 0; /* Keeps it invisible while allowing click-through */
            z-index: 10;
        }

        /* Fix for the white popover context on web */
        @media (prefers-color-scheme: dark) {
            :root {
                color-scheme: dark;
            }
        }

        /* Restyling the actual dropdown popup for Chrome/Edge/Safari */
        ::-webkit-datetime-edit-text { color: var(--text-color); padding: 0 2px; }
        ::-webkit-datetime-edit-month-field { color: var(--text-color); }
        ::-webkit-datetime-edit-day-field { color: var(--text-color); }
        ::-webkit-datetime-edit-year-field { color: var(--text-color); }
        ::-webkit-datetime-edit-hour-field { color: var(--text-color); }
        ::-webkit-datetime-edit-minute-field { color: var(--text-color); }
        ::-webkit-datetime-edit-ampm-field { color: var(--text-color); }

        /* Force the internal picker popover to inherit theme colors where possible */
        input::-webkit-calendar-picker-indicator {
            filter: invert(var(--icon-invert)); /* 1 for dark theme, 0 for light */
        }

        [data-glass-input="true"],
        [data-inset-input="true"] input {
          color: ${colors.mutedText} !important;
          -webkit-text-fill-color: ${colors.mutedText} !important;
        }

        [data-inset-input="true"]:-webkit-autofill  {
          color: ${colors.mutedText} !important;
          -webkit-text-fill-color: ${colors.mutedText} !important;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="calendar/index" />
          <Stack.Screen name="calendar/year" />
          <Stack.Screen 
            name="calendar/routines" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: true,
            }} 
          />
          <Stack.Screen 
            name="calendar/add-routine" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: true,
            }} 
          />
          <Stack.Screen 
            name="calendar/view-tasks" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: true,
            }} 
          />
          <Stack.Screen name="calendar/setup" 
            options={{ 
                presentation: 'modal',
                headerShown: false,
                gestureEnabled: true,
              }} 
          />
          <Stack.Screen 
            name="calendar/selection-view" 
            options={{ 
              presentation: 'transparentModal',
              animation: 'slide_from_right',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="settings" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: true,
            }} 
          />
          <Stack.Screen 
            name="edit/[field]" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: true,
            }} 
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}