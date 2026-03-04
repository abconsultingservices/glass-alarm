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
            glassBackground: this.getOpacityColor(theme.colors.text, 0.12),
            glassBorder: this.getOpacityColor(theme.colors.text, 0.05),
            borderMuted: this.getOpacityColor(theme.colors.border, 0.5),
            
            // Semantic Colors
            error: '#FF4444',
            success: '#4CAF50',
            warning: '#FFBB33',
            info: '#0099CC',
            
            overlay: this.getOpacityColor(isDark ? '#000000' : '#FFFFFF', 0.8)
        };
    }

    static getPressedStyle = (pressed: boolean) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }] 
    });

    static getCommonStyles(colors: any) {
        const systemFont = Platform.select({
            ios: 'System', // This maps directly to SF Pro
            web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            default: 'System',
        });
        console.log(systemFont);
        return StyleSheet.create({
            container: {
                fontFamily: systemFont,
                flex: 1,
                backgroundColor: colors.background,
                ...Platform.select({
                    ios: {
                        padding: 8,
                        paddingHorizontal: 8
                    },
                    web: {
                        padding: 16,
                        paddingHorizontal: 16
                    }
                })
            },
            title: {
                fontFamily: systemFont,
                fontSize: 34,
                fontWeight: '800', // Extra bold for that iOS Setup feel
                color: colors.text,
                letterSpacing: 0.5,
            },
            // THE LIQUID GLASS PILL
            inputContainer: {
                fontFamily: systemFont,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.glassBackground,
                borderRadius: 35,
                height: 42, // Taller for better touch targets
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                overflow: 'hidden', // Forces inner inputs to respect the pill shape
            },
            inputField: {
                fontFamily: systemFont,
                flex: 1,
                color: colors.text,
                fontSize: 17,
                height: '100%',
                marginHorizontal: 16,
                //paddingHorizontal: 16, // Padding inside the input nukes the "black ends"
                backgroundColor: 'transparent',
                ...Platform.select({
                    ios: {
                        letterSpacing: -0.4,
                        fontWeight: 500
                    },
                    web: {
                        outlineStyle: 'none',
                        // This shadow hack keeps the glass look during autofill
                        WebkitBoxShadow: `0 0 0px 1000px transparent inset`,
                        WebkitTextFillColor: colors.text,
                        fontWeight: 200,
                    }
                })
            },
            clearIcon: {
                paddingRight: 15,
                justifyContent: 'center',
            },
            // THE FIGMA-STYLE PRIMARY BUTTON
            button: { 
                fontFamily: systemFont,
                backgroundColor: colors.primary,
                paddingVertical: 16,
                borderRadius: 30, 
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 'auto', // Pushes the button to the bottom in flex containers
                // Subtle Glow/Shadow
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
                color: '#FFFFFF', // High contrast for primary action
                ...Platform.select({
                    web: {
                        fontWeight: 300,
                    }
                }),
                fontSize: 18,
                letterSpacing: -0.5,
            },
            fieldGroupTitle: {
                color: colors.mutedText, 
                fontFamily: systemFont,
                fontSize: 13,
                fontWeight: '800',
                letterSpacing: 0.5,
                marginBottom: 10,
                marginHorizontal: 16
            },
            insetGroup: {
                backgroundColor: colors.glassBackground, // Use the 0.12 alpha we discussed
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.glassBorder,
                marginBottom: 30,
                ...Platform.select({
                    ios: {
                        borderRadius: 20
                    },
                    web: {
                        borderRadius: 20
                    }
                })
            },
            inputRow: {
                flexDirection: 'row',
                alignItems: 'center',
                ...Platform.select({
                    ios: {
                        minHeight: 42
                    },
                    web: {
                        height: 54
                    }
                })
            },
            divider: {
                height: 1,
                backgroundColor: colors.glassBorder,
                marginHorizontal: 16// Figma dividers usually start after the label/icon
            },
            inputFieldInset: {
                flex: 1,
                color: colors.text,
                fontSize: 17,
                fontFamily: systemFont,
                fontWeight: '400', 
                backgroundColor: 'transparent',
                // ... keep your webkit overrides here
            },
            inputStack: {
                flex: 1,
                justifyContent: 'center',
                paddingVertical: 8, // Adds breathing room for the two lines
            },
            errorSubtext: {
                fontFamily: systemFont,
                fontSize: 12, // Standard iOS footnote size
                color: colors.error,
                marginTop: 2,
                fontWeight: '400',
                marginHorizontal: 16,

            },
            warningIcon: {
                marginLeft: 10,
                marginRight: 16,
                justifyContent: 'center',
            },
            warningIconText: { 
                fontFamily: systemFont,
                color: colors.error, 
                fontSize: 16 
            }
        });
    }
}