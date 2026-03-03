// utils/ThemeUtils.ts
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
        const theme = isDark ? DarkTheme : DefaultTheme;
        return {
        ...theme.colors,
        isDark,
        mutedText: this.getOpacityColor(theme.colors.text, 0.6),
        placeholderText: this.getOpacityColor(theme.colors.text, 0.3),
        
        // Glass & Borders
        glassBackground: this.getOpacityColor(theme.colors.text, 0.05),
        glassBorder: this.getOpacityColor(theme.colors.text, 0.1),
        borderMuted: this.getOpacityColor(theme.colors.border, 0.5),
        
        // Semantic Colors (Standard for iOS/Android)
        error: '#FF4444',
        success: '#4CAF50',
        warning: '#FFBB33',
        info: '#0099CC',
        
        // Overlays (Useful for Modals or subtle card lifts)
        overlay: this.getOpacityColor(isDark ? '#000000' : '#FFFFFF', 0.8)
        };
    }

    static getPressedStyle = (pressed: boolean) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }] // Subtle "sink" effect for M3/iOS
        });

  // The "Source of Truth" for your UI Look & Feel
  static getCommonStyles(colors: any) {
    return StyleSheet.create({
        container: {
            flex: 1,
            padding: 40,
            backgroundColor: colors.background,
            justifyContent: 'center',
        },
        title: {
            fontSize: 32,
            fontWeight: 'bold',
            marginBottom: 40,
            color: colors.text,
        },
        center: { 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: colors.background
        },
        card: {
            backgroundColor: colors.card,
            padding: 20,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: colors.border,
            // Standard Shadow for iOS/Web
            ...Platform.select({
                ios: {
                    shadowColor: colors.text,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                },
                web: {
                    boxShadow: `0px 4px 10px ${this.getOpacityColor(colors.text, 0.1)}`,
                }
            }),
        },
        label: {
            fontSize: 16,
            color: colors.mutedText, // Uses our opacity fix!
            marginBottom: 10,
        },
        value: {
            color: colors.text,
            fontWeight: '600',
        },
        input: { 
            borderBottomWidth: 1, 
            borderBottomColor: colors.border, 
            marginBottom: 30, 
            padding: 10, 
            fontSize: 18,
            color: colors.text // Ensures typed text is visible in Dark Mode
        },
        button: { 
            backgroundColor: colors.primary, // Or use '#000' / '#fff' depending on your preference
            padding: 20, 
            borderRadius: 12, 
            alignItems: 'center',
            marginTop: 20,
            // Add a slight border in dark mode so the button doesn't vanish
            borderWidth: 1,
            borderColor: colors.border
        },
        buttonText: { 
            color: colors.card, // This usually flips (Dark background = Light text)
            fontWeight: 'bold', 
            fontSize: 16 
        },
        // Add these to getCommonStyles in ThemeUtils.ts
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.glassBackground,
            borderRadius: 35,
            paddingHorizontal: 20,
            height: 55,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            overflow: 'hidden'
        },
        inputField: {
            flex: 1,
            color: colors.text,
            fontSize: 16,
            height: '100%',
            backgroundColor: 'transparent',
            ...Platform.select({
                "web": {
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    outlineStyle: 'none',
                    WebkitBoxShadow: `0 0 0px 1000px ${colors.glassBackground} inset`,
                    WebkitTextFillColor: colors.text
                }
            })
        },
        clearIcon: {
            padding: 5,
            marginLeft: 10,
        }
    });
  }
}