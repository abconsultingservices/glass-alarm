import React from 'react';
import { View, Text, Pressable, ScrollView, Platform, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export default function SelectionView() {
    const router = useRouter();
    const { key, title, currentValue, options, index, repeaterKey } = useLocalSearchParams();

    const insets = useSafeAreaInsets();
    const { colors, styles, getPressedStyle } = useThemedStyles();
    
    const parsedOptions = JSON.parse(options as string || '[]');

    const handleSelect = (val: string) => {
        // Emit the event to the listener in AddRoutine
        DeviceEventEmitter.emit('FORM_FIELD_UPDATE', {
            key,
            value: val,
            index: index !== undefined ? parseInt(index as string) : undefined,
            repeaterKey
        });
        
        // Go back normally without pushing new params into the URL (prevents reset)
        router.back();
    };

    return (
        <View style={styles.modalContainer}>
            <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
            
            <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                
                <Text style={styles.modalTitle}>{title}</Text>
                <View style={{ width: 44 }} /> 
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.insetGroup}>
                    {parsedOptions.map((opt: any, idx: number) => {
                        const isSelected = currentValue === opt.value;
                        const isLast = idx === parsedOptions.length - 1;

                        return (
                            <View key={opt.value}>
                                <Pressable
                                    onPress={() => handleSelect(opt.value)}
                                    style={({ pressed }) => [
                                        getPressedStyle(pressed),
                                        { 
                                            flexDirection: 'row', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: 16,
                                            minHeight: 54
                                        }
                                    ]}
                                >
                                    <Text style={{ fontSize: 17, color: colors.text }}>
                                        {opt.label}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark" size={20} color={colors.text} />
                                    )}
                                </Pressable>
                                {!isLast && <View style={styles.divider} />}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}