import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, Modal,
    ActivityIndicator, ScrollView, Image
} from 'react-native';
import { colors } from '../theme/colors';
import { useAppContext } from '../context/AppContext';
import { X, Mail, Eye, EyeOff, Lock, User } from 'lucide-react-native';

const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotModalVisible, setForgotModalVisible] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, forgotPassword } = useAppContext();

    const handleLogin = async () => {
        if (!username || !password) {
            return Alert.alert('Required', 'Please enter username and password.');
        }
        setIsLoading(true);
        const success = await login(username, password);
        setIsLoading(false);
        if (!success) {
            Alert.alert('Login Failed', 'Invalid username or password.');
        }
    };

    const handleForgotPassword = async () => {
        if (!recoveryEmail || !recoveryEmail.includes('@')) {
            return Alert.alert('Error', 'Please enter a valid email address');
        }
        setRecoveryLoading(true);
        const success = await forgotPassword(recoveryEmail);
        setRecoveryLoading(false);
        if (success) {
            setForgotModalVisible(false);
            setRecoveryEmail('');
            Alert.alert('Email Sent', 'A temporary password has been sent to your registered email.');
        } else {
            Alert.alert('Error', 'Failed to process request. Ensure the email is registered.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo Section */}
                <View style={styles.logoSection}>
                    <Image
                        source={{ uri: 'https://codetree.in/images/logo.png' }}
                        style={styles.logo}
                        resizeMode="contain"
                        onError={() => {}}
                    />
                    <Text style={styles.companyName}>Code Tree</Text>
                    <Text style={styles.companyTagline}>Software Solutions</Text>
                    <View style={styles.divider} />
                    <Text style={styles.appName}>Task Management</Text>
                </View>

                {/* Login Card */}
                <View style={styles.card}>
                    <Text style={styles.welcomeText}>Welcome Back</Text>
                    <Text style={styles.welcomeSub}>Sign in to continue</Text>

                    {/* Username */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Username</Text>
                        <View style={styles.inputRow}>
                            <User size={17} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone number or username"
                                placeholderTextColor={colors.textSecondary}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={styles.inputRow}>
                            <Lock size={17} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Enter your password"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                {showPassword
                                    ? <Eye size={17} color={colors.textSecondary} />
                                    : <EyeOff size={17} color={colors.textSecondary} />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginBtn, isLoading && { opacity: 0.8 }]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.85}
                    >
                        {isLoading
                            ? <ActivityIndicator color={colors.surface} />
                            : <Text style={styles.loginBtnText}>SIGN IN</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setForgotModalVisible(true)}
                        style={styles.forgotBtn}
                    >
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.version}>v1.0.0 · codetree.in</Text>
            </ScrollView>

            {/* Forgot Password Modal */}
            <Modal
                visible={isForgotModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setForgotModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reset Password</Text>
                            <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                                <X size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>
                            Enter your registered email to receive a temporary password.
                        </Text>
                        <View style={styles.inputRow}>
                            <Mail size={17} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Email Address"
                                placeholderTextColor={colors.textSecondary}
                                value={recoveryEmail}
                                onChangeText={setRecoveryEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.loginBtn, { marginTop: 20 }, recoveryLoading && { opacity: 0.7 }]}
                            onPress={handleForgotPassword}
                            disabled={recoveryLoading}
                        >
                            {recoveryLoading
                                ? <ActivityIndicator color={colors.surface} />
                                : <Text style={styles.loginBtnText}>SEND RECOVERY EMAIL</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 28,
        paddingBottom: 32,
        justifyContent: 'center',
    },

    // Logo Section
    logoSection: {
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 40,
    },
    logo: {
        width: 130,
        height: 130,
        marginBottom: 14,
    },
    companyName: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.primaryDark,
        letterSpacing: 0.5,
    },
    companyTagline: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
        marginTop: 2,
        letterSpacing: 0.3,
    },
    divider: {
        width: 40,
        height: 3,
        backgroundColor: colors.primary,
        borderRadius: 2,
        marginVertical: 14,
    },
    appName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // Card
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 28,
        elevation: 4,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    },
    welcomeSub: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 28,
    },

    // Fields
    fieldGroup: {
        marginBottom: 18,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: colors.text,
    },
    eyeBtn: {
        padding: 8,
    },

    // Button
    loginBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        elevation: 3,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    loginBtnText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 2,
    },
    forgotBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    forgotText: {
        color: colors.primaryLight,
        fontWeight: '600',
        fontSize: 13,
    },

    // Version
    version: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 24,
        opacity: 0.7,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 28,
        width: '100%',
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    modalDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 20,
        lineHeight: 20,
    },
});

export default LoginScreen;
