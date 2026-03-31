import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../hooks/useThemedStyles';
import * as Crypto from 'expo-crypto'; // Need this for valid DB IDs

interface Task {
  id: string;
  title: string; // Changed from 'text' to 'title' to match RoutineService
  completed?: boolean;
}

export const GlassTaskList = ({ tasks, setTasks }: { tasks: Task[], setTasks: (t: Task[]) => void }) => {
  const { colors, styles, getPressedStyle } = useThemedStyles();

  const addTask = () => {
    // 1. Use Crypto.randomUUID() so the database accepts the new ID
    // 2. Use 'title' instead of 'text' to stay in sync with the service
    setTasks([...tasks, { 
        id: Crypto.randomUUID(), 
        title: '', 
        completed: false 
    }]);
  };

  const toggleComplete = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const updateTask = (id: string, title: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title } : t));
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.inputRow,
            { backgroundColor: isActive ? colors.glassBackground : 'transparent' },
            isActive && { borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder }
          ]}
        >
          <View style={{ paddingLeft: 16 }}>
            <Ionicons name="reorder-three" size={24} color={colors.mutedText} />
          </View>

          <TextInput
            style={[
              styles.inputField, 
              { flex: 1, paddingLeft: 12 },
              item.completed && { textDecorationLine: 'line-through', opacity: 0.5 }
            ]}
            // Using title here
            value={item.title} 
            placeholder="Task description..."
            placeholderTextColor={colors.placeholderText}
            onChangeText={(text) => updateTask(item.id, text)}
          />

          <Pressable 
            onPress={() => toggleComplete(item.id)}
            style={({ pressed }) => [getPressedStyle(pressed), { paddingHorizontal: 16 }]}
          >
            <Ionicons 
              name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
              size={24} 
              color={item.completed ? colors.success : colors.mutedText} 
            />
          </Pressable>
        </Pressable>
        <View style={styles.divider} />
      </ScaleDecorator>
    );
  };

  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={styles.fieldGroupTitle}>ROUTINE TASKS</Text>
      <View style={styles.insetGroup}>
        <DraggableFlatList
          data={tasks}
          onDragEnd={({ data }) => setTasks(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false} 
        />
        
        <Pressable
          onPress={addTask}
          style={({ pressed }) => [
            getPressedStyle(pressed),
            { flexDirection: 'row', alignItems: 'center', padding: 16 }
          ]}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.success} />
          <Text style={{ color: colors.success, fontSize: 17, marginLeft: 8, fontWeight: '500' }}>
            Add Task
          </Text>
        </Pressable>
      </View>
      <Text style={styles.fieldGroupFooter}>Check off items or reorder as needed.</Text>
    </View>
  );
};