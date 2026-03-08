// app/calendar/day.tsx
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function DayDetail() {
  const { date } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#fff' }}>Viewing Events for: {date}</Text>
    </View>
  );
}