import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../db/client';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      try {
        console.log("Waiting for DB and checking users...");
        
        // On Web, the first query might fail if the WASM worker isn't hot.
        // We wrap it in a retry or a small delay if needed.
        const allUsers = await db.query.users.findMany();
        
        if (allUsers && allUsers.length > 0) {
          router.replace('/dashboard');
        } else {
          router.replace('/setup');
        }
      } catch (e) {
        console.error("Drizzle Query Error:", e);
        // If the table doesn't exist yet (first run), we must go to setup
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