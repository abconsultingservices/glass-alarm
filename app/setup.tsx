import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { GlassFormRenderer, Section } from '../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../utils/ValidationEngine';

export default function Setup() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const SETUP_SCHEMA: Section[] = [
        {
            sectionType: 'pills',
            label: 'INDIVIDUAL PILLS',
            fields: [
                { 
                    key: 'name', 
                    label: 'Name', 
                    validation: [{ type: 'length', minLength: 2, errorMsg: 'Name is too short' }],
                    config: { autoCapitalize: 'words', textContentType: 'name' } 
                },
                {
                    key: 'handle',
                    label: 'User Handle',
                    defaultValue: 'randomhandle',
                    // OVERRIDE: Strict lowercase and numbers only, no symbols at all
                    overrideFilter: /[^a-zA-Z0-9]/g,
                    validation: [{ type: 'length', minLength: 3, errorMsg: 'Too short' }],
                    config: { autoCapitalize: 'none' }
                }
            ]
        },
        {
            sectionType: 'insetGroup',
            label: 'INSET GROUP',
            footer: 'iPhone can securely monitor your profile data and alert you to syncing issues.', // Footnote support
            fields: [
                { 
                    key: 'email', 
                    label: 'Email', 
                    validation: [{ type: 'email', errorMsg: 'Invalid email address' }],
                    config: { autoCapitalize: 'none', keyboardType: 'email-address', textContentType: 'emailAddress' } 
                },
                { 
                    key: 'phone', 
                    label: 'Phone', 
                    subtext: 'Include + and country code for international.',
                    validation: [{ type: 'phone', errorMsg: 'Invalid phone format' }],
                    config: { autoCapitalize: 'none', keyboardType: 'numbers-and-punctuation', textContentType: 'telephoneNumber' } 
                },
            ]
        }
    ];
    const [form, setForm] = useState(() => getInitialFormState(SETUP_SCHEMA));
    const [fieldErrors, setFieldErrors] = useState(() => getInitialErrorState(SETUP_SCHEMA));


    const save = async () => {
        // Simple logic: check if required fields are present and no errors exist
        const hasErrors = Object.values(fieldErrors).some(e => e !== '');
        if (!form.name || !form.email || hasErrors) return;

        try {
            await dbService.createUser(form.name, form.email, form.phone);
            router.replace('/dashboard');
        } catch (e) { 
            console.error(e); 
        }
    };

    const isInvalid = !form.name || !form.email || Object.values(fieldErrors).some(e => e !== '');

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: insets.top }]}>
            <Text style={[styles.title, { marginBottom: 30 }]}>Setup Profile</Text>

            {/* --- 2. The Form Renderer Handles the Rest --- */}
            <GlassFormRenderer 
                schema={SETUP_SCHEMA}
                form={form}
                setForm={setForm}
                errors={fieldErrors}
                setErrors={setFieldErrors}
            />

            {/* The Bottom Anchored Glass Button */}
            <Pressable 
                style={({ pressed }) => [
                    styles.button, 
                    getPressedStyle(pressed),
                    { backgroundColor: isInvalid ? colors.mutedText : colors.primary }
                ]} 
                onPress={save}
            >
                <Text style={styles.buttonText}>Save & Enter</Text>
            </Pressable>
        </View>
    );
}