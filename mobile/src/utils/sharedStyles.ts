import { StyleSheet } from 'react-native';

export const createStyles = (theme) => StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.headerBg,
    },
    scrollContent: {
        paddingBottom: 32,
    },

    // Cards
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardFlat: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },

    // Text
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    body: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    secondaryText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    mutedText: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },

    // Section
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.divider,
        marginVertical: 12,
    },

    // Input
    input: {
        backgroundColor: theme.colors.inputBg,
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: theme.colors.text,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },

    // Buttons
    buttonPrimary: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: theme.colors.textOnPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },

    // Badge
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
