import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';

export default function Index() {
  const router = useRouter();
  const { colors } = useThemedStyles();

  useEffect(() => {
    async function checkUserStatus() {
      try {
        await dbService.initialize();
        router.replace('/calendar');
      } catch (e) {
        console.error("Index: Auth check failed", e);
        // Fallback to setup as a safety measure
        router.replace('/calendar');
      }
    }
    
    // Slight delay to allow RootLayout's initialization to breathe
    const timer = setTimeout(checkUserStatus, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: colors.background 
    }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}