import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { GlassFormRenderer, Section } from '../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../utils/ValidationEngine';

const SETUP_SCHEMA: Section[] = [
    {
        sectionType: 'pills',
        label: 'PROFILE BASICS',
        fields: [
            { 
                key: 'firstName', 
                label: 'First Name', 
                validation: [{ type: 'required', errorMsg: 'First name is required' }],
                config: { autoCapitalize: 'words', textContentType: 'givenName' } 
            },
            { 
                key: 'lastName', 
                label: 'Last Name', 
                validation: [{ type: 'required', errorMsg: 'Last name is required' }],
                config: { autoCapitalize: 'words', textContentType: 'familyName' } 
            }
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'ACCOUNT & FAMILY',
        footer: 'All data remains local on this device. We never upload your routines.',
        fields: [
            { 
                key: 'email', 
                label: 'Email Address', 
                validation: [{ type: 'email', errorMsg: 'Invalid email address' }],
                config: { autoCapitalize: 'none', keyboardType: 'email-address', textContentType: 'emailAddress' } 
            },
            { 
                key: 'groupName', 
                label: 'Group Name', 
                validation: [{ type: 'required', errorMsg: 'A group name is required' }],
                config: { autoCapitalize: 'words', placeholder: 'e.g. The Smiths' } 
            },
        ]
    }
];

export default function Setup() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const [form, setForm] = useState(() => getInitialFormState(SETUP_SCHEMA));
    const [fieldErrors, setFieldErrors] = useState(() => getInitialErrorState(SETUP_SCHEMA));
    const [isRecovering, setIsRecovering] = useState(true);

    // --- RECOVERY CHECK ---
    useEffect(() => {
        const verifySession = async () => {
            // Ensure GUIDs are present before letting user interact
            await dbService.recoverSetupGuids();
            setIsRecovering(false);
        };
        verifySession();
    }, []);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    const isInvalid = !form.firstName || !form.lastName || !form.email || !form.groupName || 
                       Object.values(fieldErrors).some(e => e !== '');

    const handlePress = async () => {
        if (isInvalid) {
            triggerShake();
            return;
        }

        try {
            const success = await dbService.updateSetupData(
                form.firstName,
                form.lastName,
                form.email,
                form.groupName
            );

            if (success) {
                router.replace('/calendar');
            } else {
                alert("Setup failed: Could not connect to your local profile. Please restart the app.");
            }
        } catch (e) { 
            console.error("Setup handlePress error:", e); 
        }
    };

    if (isRecovering) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: insets.top }]}>
            <Text style={[styles.title, { marginBottom: 30, paddingHorizontal: 20 }]}>
                Setup Profile
            </Text>

            <GlassFormRenderer 
                schema={SETUP_SCHEMA}
                form={form}
                setForm={setForm}
                errors={fieldErrors}
                setErrors={setFieldErrors}
            />

            <Animated.View 
                style={[
                    styles.floatingButtonContainer, 
                    { 
                        bottom: Math.max(insets.bottom, 20), 
                        transform: [{ translateX: shakeAnim }] 
                    }
                ]}
            >         
                <Pressable 
                    style={({ pressed }) => [
                        styles.button, 
                        getPressedStyle(pressed),
                        { backgroundColor: isInvalid ? colors.mutedText : colors.primary }
                    ]} 
                    onPress={handlePress}
                >
                    <Text style={styles.buttonText}>Start My Routines</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}