import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../hooks/useThemedStyles';

interface Task {
  id: string;
  text: string;
}

export const GlassTaskList = ({ tasks, setTasks }: { tasks: Task[], setTasks: (t: Task[]) => void }) => {
  const { colors, styles, getPressedStyle } = useThemedStyles();

  const addTask = () => {
    setTasks([...tasks, { id: Date.now().toString(), text: '' }]);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, text: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, text } : t));
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
            isActive && { borderRadius: 12, borderWeight: 1, borderColor: colors.glassBorder }
          ]}
        >
          {/* Drag Handle */}
          <View style={{ paddingLeft: 16 }}>
            <Ionicons name="reorder-three" size={24} color={colors.mutedText} />
          </View>

          {/* Task Input */}
          <TextInput
            style={[styles.inputField, { flex: 1, paddingLeft: 12 }]}
            value={item.text}
            placeholder="New Task..."
            placeholderTextColor={colors.placeholderText}
            onChangeText={(text) => updateTask(item.id, text)}
          />

          {/* Delete Button */}
          <Pressable 
            onPress={() => removeTask(item.id)}
            style={({ pressed }) => [getPressedStyle(pressed), { paddingHorizontal: 16 }]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </Pressable>
        <View style={styles.divider} />
      </ScaleDecorator>
    );
  };

  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={styles.fieldGroupTitle}>TASKS</Text>
      <View style={styles.insetGroup}>
        <DraggableFlatList
          data={tasks}
          onDragEnd={({ data }) => setTasks(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false} // Since it's inside the Form's ScrollView
        />
        
        {/* Add Task Button */}
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
    </View>
  );
};