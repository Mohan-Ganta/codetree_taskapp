import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { useAppContext } from '../context/AppContext';
import { LogIn, X, Mail, Eye, EyeOff } from 'lucide-react-native';

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotModalVisible, setForgotModalVisible] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const { login, forgotPassword } = useAppContext();

    const handleLogin = async (usr, pwd) => {
        const success = await login(usr || username, pwd || password);
        if (!success) {
            Alert.alert('Login Failed', 'Invalid username or password');
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
            Alert.alert('Success', 'A new temporary password has been sent to your email.');
        } else {
            Alert.alert('Error', 'Failed to process request. Ensure the email is registered.');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>CODETREE</Text>
                </View>
                <Text style={styles.appName}>Codetree Taskapp</Text>
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Phone Number / Username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <Eye size={20} color={colors.textSecondary} />
                        ) : (
                            <EyeOff size={20} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => handleLogin()}
                >
                    <Text style={styles.loginButtonText}>LOGIN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setForgotModalVisible(true)}
                    style={styles.forgotBtn}
                >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
            </View>

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
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalDesc}>
                            Enter your registered email address to receive a new temporary password.
                        </Text>

                        <View style={styles.inputWrapper}>
                            <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Email Address"
                                value={recoveryEmail}
                                onChangeText={setRecoveryEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.resetBtn, recoveryLoading && { opacity: 0.7 }]}
                            onPress={handleForgotPassword}
                            disabled={recoveryLoading}
                        >
                            {recoveryLoading ? (
                                <ActivityIndicator color={colors.surface} />
                            ) : (
                                <Text style={styles.resetBtnText}>SEND RECOVERY EMAIL</Text>
                            )}
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
        backgroundColor: colors.primary,
        padding: 24,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    appName: {
        color: colors.surface,
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
        maxWidth: '80%',
        lineHeight: 20,
    },
    formContainer: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 32,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 32,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 16,
    },
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    forgotBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    forgotText: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.text,
    },
    modalDesc: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
        lineHeight: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    inputIcon: {
        marginRight: 12,
    },
    modalInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
    },
    resetBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    resetBtnText: {
        color: colors.surface,
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 0.5,
    }
});

export default LoginScreen;
