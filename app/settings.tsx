import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Pressable, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { GlassFormRenderer } from '../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../utils/ValidationEngine';

// Define the schema locally to ensure it is always fresh and has the correct types
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
                config: { autoCapitalize: 'words', textContentType: 'givenName' } 
            },
            { 
                key: 'lastName', 
                label: 'Last Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'Last name is required' }],
                config: { autoCapitalize: 'words', textContentType: 'familyName' } 
            }
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'CONTACT INFO',
        fields: [
            { 
                key: 'email', 
                label: 'Email', 
                type: 'email',
                validation: [{ type: 'email', errorMsg: 'Invalid email' }],
                config: { autoCapitalize: 'none', keyboardType: 'email-address' } 
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
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // --- LOAD DATA ON MOUNT ---
    useEffect(() => {
        const loadData = async () => {
            const user = await dbService.getLatestUser();
            if (user) {
                setForm({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    uguid: user.uguid
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

    const hasErrors = Object.values(fieldErrors).some(e => e !== '') || !form.firstName || !form.lastName;

    const handleSave = async () => {
        if (hasErrors) {
            triggerShake();
            return;
        }

        const success = await dbService.updateSetupData(
            form.firstName,
            form.lastName,
            form.email,
            'My Family' // Keeping group name static or you could add it to the schema
        );

        if (success) {
            router.back();
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
            
            {/* --- HEADER --- */}
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

            {/* --- FORM --- */}
            <View style={{ flex: 1, paddingHorizontal: 20, marginTop: 10 }}>
                <GlassFormRenderer 
                    schema={SETTINGS_SCHEMA}
                    form={form}
                    setForm={setForm}
                    errors={fieldErrors}
                    setErrors={setFieldErrors}
                />
            </View>

            {/* --- RESET --- */}
            <View style={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
                <Pressable 
                    style={({ pressed }) => [
                        styles.button, 
                        getPressedStyle(pressed),
                        { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)', borderWidth: 1 }
                    ]} 
                    onPress={async () => {
                        if (await dbService.resetApp()) router.replace('/');
                    }}
                >
                    <Text style={[styles.buttonText, { color: colors.error }]}>
                        Reset All Data
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}