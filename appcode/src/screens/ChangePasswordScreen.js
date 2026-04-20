import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { useAppContext } from '../context/AppContext';
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react-native';

const ChangePasswordScreen = () => {
    const { user, changePassword, logout } = useAppContext();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!password || !confirmPassword) {
            return Alert.alert('Error', 'Please fill in all fields.');
        }

        if (password.length < 6) {
            return Alert.alert('Error', 'Password must be at least 6 characters long.');
        }

        if (password !== confirmPassword) {
            return Alert.alert('Error', 'Passwords do not match.');
        }

        setLoading(true);
        const success = await changePassword(user.id, password);
        setLoading(false);

        if (success) {
            Alert.alert('Success', 'Your password has been updated. Please login again.', [
                { text: 'OK', onPress: logout }
            ]);
        } else {
            Alert.alert('Error', 'Failed to update password. Please try again.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <ShieldCheck size={60} color={colors.primary} />
                </View>

                <Text style={styles.title}>Secure Your Account</Text>
                <Text style={styles.subtitle}>
                    Hi {user.name}, you are using a temporary password. Please set a new secure password to continue.
                </Text>

                <View style={styles.inputGroup}>
                    <View style={styles.inputIcon}>
                        <Lock size={18} color={colors.textSecondary} />
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        {showPassword ? <Eye size={20} color={colors.textSecondary} /> : <EyeOff size={20} color={colors.textSecondary} />}
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.inputIcon}>
                        <Lock size={18} color={colors.textSecondary} />
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.btn, loading && { opacity: 0.7 }]}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.surface} />
                    ) : (
                        <>
                            <Text style={styles.btnText}>UPDATE PASSWORD</Text>
                            <ArrowRight size={20} color={colors.surface} />
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Cancel & Logout</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 30,
        padding: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 15,
        marginBottom: 16,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: colors.text,
    },
    eyeIcon: {
        paddingHorizontal: 10,
    },
    btn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 15,
        marginTop: 10,
        elevation: 4,
    },
    btnText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 16,
        marginRight: 10,
        letterSpacing: 1,
    },
    logoutBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    logoutText: {
        color: colors.danger,
        fontWeight: '700',
    }
});

export default ChangePasswordScreen;
