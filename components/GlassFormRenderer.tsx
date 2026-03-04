import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { validateValue, ValidationRule } from '../utils/ValidationEngine';

interface Field {
    key: string;
    label: string;
    subtext?: string;
    validation?: ValidationRule[];
    config?: any;
}

interface Section {
    sectionType: 'pills' | 'insetGroup';
    label?: string;
    footer?: string;
    fields: Field[];
}

interface Props {
    schema: Section[];
    form: any;
    setForm: (form: any) => void;
    errors: any;
    setErrors: (errors: any) => void;
}

export const GlassFormRenderer = ({ schema, form, setForm, errors, setErrors }: Props) => {
    const { styles, colors, getPressedStyle } = useThemedStyles();

    const handleUpdate = (key: string, val: string, rules: ValidationRule[] = []) => {
        setForm((prev: any) => ({ ...prev, [key]: val }));
        const errorMsg = validateValue(val, rules);
        setErrors((prev: any) => ({ ...prev, [key]: errorMsg }));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            {schema.map((section, sIdx) => (
                <View key={`section-${sIdx}`} style={{ marginBottom: 32 }}>
                    {section.label && (
                        <Text style={styles.fieldGroupTitle}>{section.label}</Text>
                    )}

                    <View style={section.sectionType === 'insetGroup' ? styles.insetGroup : null}>
                        {section.fields.map((field, fIdx) => {
                            const isLast = fIdx === section.fields.length - 1;
                            const hasError = !!errors[field.key];
                            const isPill = section.sectionType === 'pills';

                            const inputMarkup = (
                                <View style={isPill 
                                    ? [styles.inputContainer, hasError && { borderColor: colors.error }] 
                                    : styles.inputRow
                                }>
                                    <View style={styles.inputStack}>
                                        <TextInput
                                            style={styles.inputField}
                                            value={form[field.key]}
                                            placeholder={field.label}
                                            placeholderTextColor={colors.placeholderText}
                                            onChangeText={(t) => handleUpdate(field.key, t, field.validation)}
                                            {...field.config}
                                            dataSet={{ 'glass-input': 'true' }}
                                        />
                                        {hasError ? (
                                            <Text style={styles.errorSubtext}>{errors[field.key]}</Text>
                                        ) : field.subtext ? (
                                            <Text style={[styles.errorSubtext, { color: colors.mutedText }]}>
                                                {field.subtext}
                                            </Text>
                                        ) : null}
                                    </View>
                                    
                                    {hasError ? (
                                        <View style={styles.warningIcon}>
                                            <Text style={{ fontSize: 20 }}>⚠️</Text>
                                        </View>
                                    ) : form[field.key]?.length > 0 && (
                                        <Pressable 
                                            onPress={() => handleUpdate(field.key, '', field.validation)}
                                            style={({ pressed }) => [styles.clearIcon, getPressedStyle(pressed)]}
                                        >
                                            <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
                                        </Pressable>
                                    )}
                                </View>
                            );

                            return (
                                <View key={field.key}>
                                    {isPill ? (
                                        <View style={{ marginBottom: 12 }}>{inputMarkup}</View>
                                    ) : (
                                        <>
                                            {inputMarkup}
                                            {!isLast && <View style={styles.divider} />}
                                        </>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                    {section.footer && (
                        <Text style={styles.groupFootnote}>{section.footer}</Text>
                    )}
                </View>
            ))}
        </ScrollView>
    );
};