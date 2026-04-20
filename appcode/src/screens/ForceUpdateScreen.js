import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Image } from 'react-native';
import { colors } from '../theme/colors';

export default function ForceUpdateScreen({ updateUrl, message }) {
    const handleUpdate = () => {
        const url = updateUrl || (Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id0000000000'
            : 'https://play.google.com/store/apps/details?id=com.codetree.taskapp');
        Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.emoji}>🚀</Text>
                <Text style={styles.title}>Update Available</Text>
                <Text style={styles.message}>
                    {message || 'A new version of Codetree Taskapp is available. Please update to continue.'}
                </Text>
                <TouchableOpacity style={styles.button} onPress={handleUpdate}>
                    <Text style={styles.buttonText}>Update Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    emoji: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.primary || '#1E40AF',
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    button: {
        backgroundColor: colors.primary || '#1E40AF',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
