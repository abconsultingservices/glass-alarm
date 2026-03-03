import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../db/client';
import { dbService } from '../services/DatabaseService';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      // Small delay to ensure the Web Worker has initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const exists = await dbService.hasUsers();
      
      if (exists) {
        router.replace('/dashboard');
      } else {
        router.replace('/setup');
      }
    }
    
    // Small timeout ensures the RootLayout useEffect (WASM path) runs first
    const timer = setTimeout(checkUser, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}