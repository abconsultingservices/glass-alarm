import { StyleSheet, Platform } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export class ThemeUtils {
    static isWeb() {
        return (Platform?.OS === "web" || (Platform as any)?.default?.OS === "web")
    }

    static getOpacityColor(color: string, opacity: number): string {
        if (!color) return 'transparent';
        if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        }
        const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return color + alpha;
    }

    static getColors(colorScheme: 'light' | 'dark' | null | undefined) {
        const isDark = colorScheme === 'dark';
        
        // --- 2026 IC SEMANTIC PALETTE ---
        // Maps directly to Apple's Human Interface Guidelines (HIG)
        const palette = {
            dark: {
                base: '#000000',           // System Background (Base)
                elevated: '#1C1C1E',       // Secondary System Background (Sheets/Modals)
                component: '#2C2C2E',      // Tertiary System Background (Inset Groups)
                text: '#FFFFFF',
                border: 'rgba(255, 255, 255, 0.1)',
                elevatedBorder: 'rgba(255, 255, 255, 0.3)',
                primary: '#0A84FF',        // iOS System Blue (Dark)
            },
            light: {
                base: '#F2F2F7',           // System Gray 6 (Base)
                elevated: '#FFFFFF',       // System Background (Sheets/Modals)
                component: '#F2F2F7',      // Secondary System Grouped (Inset Groups)
                text: '#000000',
                border: 'rgba(0, 0, 0, 0.05)',
                elevatedBorder: 'rgba(0, 0, 0, 0.2)',
                primary: '#007AFF',        // iOS System Blue (Light)
            }
        };

        const active = isDark ? palette.dark : palette.light;
        
        return {
            isDark,
            text: active.text,
            background: active.base,       
            modalBackground: active.elevated, 
            insetGroupBackground: active.component,
            primary: active.primary,
            
            mutedText: this.getOpacityColor(active.text, 0.6),
            placeholderText: this.getOpacityColor(active.text, 0.25), // Lightened for Liquid Glass
            
            // Glass & Borders
            glassBackground: active.component,
            glassBorder: active.border,
            glassBorderElevated: active.elevatedBorder,
            borderMuted: this.getOpacityColor(active.text, 0.05),
            
            // Semantic Colors
            error: isDark ? '#FF453A' : '#FF3B30',
            success: '#34C759',
            warning: '#FF9F0A',
            info: '#64D2FF',
            overlay: this.getOpacityColor(isDark ? '#000000' : '#FFFFFF', 0.8)
        };
    }

    static getPressedStyle = (pressed: boolean) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }] 
    });

    static getCommonStyles(colors: any) {
        const systemFont = Platform.select({
            ios: 'System', 
            web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            default: 'System',
        });

        return StyleSheet.create({
            container: {
                fontFamily: systemFont,
                flex: 1,
                backgroundColor: colors.background,
                ...Platform.select({
                    ios: { padding: 8 },
                    web: { padding: 16 }
                })
            },
            // --- NEW: NATIVE SHEET UI ---
            sheetHandleContainer: {
                width: '100%',
                alignItems: 'center',
                paddingTop: 8,
                paddingBottom: 4,
            },
            sheetHandle: {
                width: 36,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: colors.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            },

            modalHeader: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                height: 56,
            },
            // --- MODAL / SHEET SPECIFIC CONTAINER ---
            setupContainer: {
                flex: 1,
                backgroundColor: colors.background,
            },
            modalContainer: {
                flex: 1,
                backgroundColor: colors.modalBackground,
            },
            title: {
                fontFamily: systemFont,
                fontSize: 34,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: 0.5,
            },
            setupTitle: {
                fontSize: 34,
                fontWeight: '700',
                color: colors.text,
                letterSpacing: 0.41,
                paddingHorizontal: 20,
                marginBottom: 20,
            },
            // THE LIQUID GLASS PILL (Standard Inputs)
            inputContainer: {
                fontFamily: systemFont,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.insetGroupBackground, //glassBackground,
                borderRadius: 35,
                height: 42,
                marginBottom: 4,
                borderWidth: Platform.OS === 'ios' ? 0 : 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden',
            },
            errorSubtext: { 
                color: colors.error, 
                fontSize: 12, 
                marginTop: 2, // TIGHT spacing
                marginLeft: 16, 
                fontWeight: '500',
                marginBottom: 4, // Adds space before the next element
            },
            inputField: {
                fontFamily: systemFont,
                flex: 1,
                color: colors.text,
                fontSize: 16,
                fontWeight: '400',
                height: '100%',
                paddingHorizontal: 16,
                backgroundColor: 'transparent',
                ...Platform.select({
                    ios: { letterSpacing: -0.4},
                    web: { 
                        fontSize: 14,
                        outlineStyle: 'none',
                        WebkitBoxShadow: `0 0 0px 1000px transparent inset`,
                        WebkitTextFillColor: colors.text,
                    }
                })
            },
            clearIcon: {
                paddingRight: 15,
                justifyContent: 'center',
            },
            // --- INSET GROUPS (APPLE STYLE) ---
            insetGroup: {
                backgroundColor: colors.insetGroupBackground, 
                overflow: 'hidden',
                borderWidth: Platform.OS === 'ios' ? 0 : 1,
                borderColor: colors.glassBorder,
                marginBottom: 24,
                borderRadius: 20, // Deep Curve
            },
            inputRow: {
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 44,
            },
            divider: {
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.glassBorder,
                marginHorizontal: 16,
            },
            inputStack: {
                flex: 1,
                justifyContent: 'center',
                paddingVertical: 10,
            },
            fieldGroupTitle: {
                color: colors.mutedText, 
                fontFamily: systemFont,
                fontSize: 13,
                fontWeight: '400',
                textTransform: 'uppercase',
                marginBottom: 8,
                marginHorizontal: 16,
                letterSpacing: 0.5,
            },
            groupFootnote: {
                fontFamily: systemFont,
                fontSize: 13,
                color: colors.mutedText,
                marginTop: 8,
                paddingHorizontal: 16,
                lineHeight: 18,
            },
            // --- BUTTONS ---
            floatingButtonContainer: {
                position: 'absolute',
                left: 20,
                right: 20,
                zIndex: 10,
            },
            button: { 
                fontFamily: systemFont,
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: 30, // Pill style button
                justifyContent: 'center',
                alignItems: 'center',
                ...Platform.select({
                    ios: {
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                    },
                    web: {
                        boxShadow: `0px 8px 20px ${this.getOpacityColor(colors.primary, 0.3)}`,
                    }
                })
            },
            buttonText: { 
                fontFamily: systemFont,
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '600',
                letterSpacing: -0.5,
            },
            // --- CALENDAR & HEADER COMPONENTS ---
            calendarHeaderRow: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 54,
            },
            glassPill: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.glassBackground,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 24,
                gap: 12,
                borderWidth: 1,
                borderColor: colors.glassBorder,
            },
            pillDivider: {
                width: 1,
                height: 18,
                backgroundColor: colors.glassBorder,
            },
            largeMonthLabel: {
                fontSize: 34,
                fontWeight: 'bold',
                color: colors.text,
                paddingHorizontal: 20,
                marginTop: 8,
                letterSpacing: 0.41,
            },
            calendarFooter: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                backgroundColor: 'transparent',
            },
            // --- IOS MODAL / SHEET STYLES ---
            modalHeader: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                height: 56,
                marginBottom: 8,
            },
            modalTitle: {
                fontSize: 17,
                fontWeight: '600',
                color: colors.text,
            },
            circularButton: {
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.glassBorderElevated,
                backgroundColor: colors.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
                justifyContent: 'center',
                alignItems: 'center',
            },
            segmentContainer: {
                paddingHorizontal: 16,
                marginBottom: 20,
            },
            segmentBackground: {
                flexDirection: 'row',
                backgroundColor: colors.isDark ? '#2C2C2E' : '#E3E3E8',
                borderRadius: 24,
                padding: 2,
                height: 34,
            },
            segmentItem: {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 22,
            },
            segmentItemActive: {
                backgroundColor: colors.isDark ? '#636366' : '#FFFFFF',
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.12,
                        shadowRadius: 1,
                    }
                })
            },
            segmentText: {
                fontSize: 13,
                fontWeight: '500',
                color: colors.text,
            },
            floatingHeaderContainer: {
                position: 'absolute',
                top: Platform.OS === 'ios' ? 60 : 20, // Adjust for status bar
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                zIndex: 100, // Vital: Keeps icons above the scrollable content
            },
            headerPill: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: ThemeUtils.getOpacityColor(colors.modalBackground, 0.7), // Glass effect
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 25,
                borderWidth: 1,
                borderColor: colors.glassBorderElevated,
                gap: 8,
            },
            headerPillText: {
                color: colors.text,
                fontSize: 15,
                fontWeight: '600',
                letterSpacing: -0.3,
            }
        });
    }
}