import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform, Animated, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { GlassFormRenderer } from '../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../utils/ValidationEngine';

const SETTINGS_SCHEMA: any[] = [
    {
        sectionType: 'pills',
        label: 'PROFILE BASICS',
        fields: [
            { 
                key: 'firstName', 
                label: 'First Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'First name is required' }],
                config: { autoCapitalize: 'words' } 
            },
            { 
                key: 'lastName', 
                label: 'Last Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'Last name is required' }],
                config: { autoCapitalize: 'words' } 
            }
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'ACCOUNT & FAMILY',
        footer: 'All data remains local on this device for maximum privacy.',
        fields: [
            { 
                key: 'email', 
                label: 'Email', 
                type: 'text',
                validation: [{ type: 'email', errorMsg: 'Invalid email' }],
                config: { autoCapitalize: 'none', keyboardType: 'email-address' } 
            },
            { 
                key: 'groupName', 
                label: 'Group Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'Group name is required' }],
                config: { autoCapitalize: 'words', placeholder: 'e.g. The Smiths' } 
            }
        ]
    }
];

export default function Settings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, styles, getPressedStyle } = useThemedStyles(); 

    const [form, setForm] = useState(() => getInitialFormState(SETTINGS_SCHEMA));
    const [fieldErrors, setFieldErrors] = useState(() => getInitialErrorState(SETTINGS_SCHEMA));
    const [loading, setLoading] = useState(true);
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loadData = async () => {
            const user = await dbService.getLatestUser();
            const group = await dbService.getLatestGroup(); 
            
            if (user) {
                setForm({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    groupName: group?.name || 'My Family'
                });
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    const hasErrors = Object.values(fieldErrors).some(e => e !== '') || 
                      !form.firstName || !form.lastName || !form.groupName;

    const handleSave = async () => {
        if (hasErrors) {
            triggerShake();
            return;
        }

        const success = await dbService.updateSetupData(
            form.firstName,
            form.lastName,
            form.email,
            form.groupName
        );

        if (success) {
            router.back();
        }
    };

    const handleResetData = async () => {
        const success = await dbService.resetApp();
        if (success) {
            setShowConfirmReset(false);
            router.replace('/'); 
        }
    };

    if (loading) {
        return (
            <View style={[styles.modalContainer, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <View style={styles.modalContainer}>
            <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
            
            <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                
                <Text style={styles.modalTitle}>Settings</Text>

                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <Pressable 
                        onPress={handleSave} 
                        style={({ pressed }) => [
                            styles.circularButton, 
                            getPressedStyle(pressed),
                            { backgroundColor: hasErrors ? colors.glassBorder : colors.success + '15' }
                        ]}
                    >
                        <Ionicons 
                            name="checkmark" 
                            size={24} 
                            color={hasErrors ? colors.mutedText : colors.success} 
                        />
                    </Pressable>
                </Animated.View>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 20, marginTop: 10 }}>
                <GlassFormRenderer 
                    schema={SETTINGS_SCHEMA}
                    form={form}
                    setForm={setForm}
                    errors={fieldErrors}
                    setErrors={setFieldErrors}
                />
            </View>

            <View style={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
                <Pressable 
                    style={({ pressed }) => [
                        styles.button, 
                        getPressedStyle(pressed),
                        { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)', borderWidth: 1 }
                    ]} 
                    onPress={() => setShowConfirmReset(true)}
                >
                    <Text style={[styles.buttonText, { color: colors.error }]}>
                        Reset All Data
                    </Text>
                </Pressable>
            </View>

            {/* --- CONFIRMATION OVERLAY --- */}
            <Modal
                transparent
                visible={showConfirmReset}
                animationType="fade"
                onRequestClose={() => setShowConfirmReset(false)}
            >
                <View style={localStyles.overlay}>
                    <View style={[localStyles.alertBox, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}>
                        <Ionicons name="warning" size={48} color={colors.error} style={{ marginBottom: 15 }} />
                        
                        <Text style={[localStyles.alertTitle, { color: colors.text }]}>
                            Are you absolutely sure?
                        </Text>
                        
                        <Text style={[localStyles.alertMessage, { color: colors.mutedText }]}>
                            This will permanently delete your profile, routines, and progress. This action cannot be undone.
                        </Text>

                        <View style={localStyles.buttonRow}>
                            <Pressable 
                                onPress={() => setShowConfirmReset(false)}
                                style={({ pressed }) => [localStyles.cancelButton, getPressedStyle(pressed)]}
                            >
                                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                            </Pressable>

                            <Pressable 
                                onPress={handleResetData}
                                style={({ pressed }) => [
                                    localStyles.confirmButton, 
                                    { backgroundColor: colors.error },
                                    getPressedStyle(pressed)
                                ]}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Delete Everything</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const localStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30
    },
    alertBox: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center'
    },
    alertMessage: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    cancelButton: {
        flex: 1,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    confirmButton: {
        flex: 2,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    }
});