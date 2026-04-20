import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { CheckCircle2, X, ChevronDown, Check } from 'lucide-react-native';
import { Modal } from 'react-native';
import Slider from '@react-native-community/slider';

const DailyUpdate = ({ route, navigation }) => {
    const { taskId } = route.params;
    const { tasks, addDailyUpdate } = useAppContext();
    const task = tasks.find(t => (t._id == taskId || t.id == taskId));

    const [remark, setRemark] = useState('');
    const [status, setStatus] = useState(task?.progressStatus || 'In Progress');
    const [modalVisible, setModalVisible] = useState(false);

    if (!task) return null;

    const statuses = ['In Progress', 'On Hold', 'Delayed', 'Request for Closure'];

    const handleSubmit = () => {
        if (!remark) return Alert.alert('Error', 'Please enter a remark for today.');
        addDailyUpdate(task._id, remark, status);
        navigation.goBack();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Daily Status Update</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <X size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.taskSummary}>
                    <Text style={styles.taskLabel}>UPDATING TASK</Text>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Work Done Today</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Describe what you achieved today..."
                        multiline
                        numberOfLines={4}
                        value={remark}
                        onChangeText={setRemark}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Update Task Status</Text>
                    <TouchableOpacity
                        style={styles.dropdownTrigger}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.dropdownValue}>{status}</Text>
                        <ChevronDown size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Custom Styled Dropdown Modal */}
                <Modal visible={modalVisible} transparent animationType="fade">
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    >
                        <View style={styles.dropdownModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalHeaderTitle}>Select Status</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <X size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            {statuses.map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.optionItem,
                                        status === s && styles.selectedOption
                                    ]}
                                    onPress={() => {
                                        setStatus(s);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        status === s && styles.selectedOptionText
                                    ]}>{s}</Text>
                                    {status === s && <Check size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <CheckCircle2 size={20} color={colors.surface} />
                    <Text style={styles.submitBtnText}>SUBMIT UPDATE</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    content: {
        padding: 24,
    },
    taskSummary: {
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
    },
    taskLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    inputGroup: {
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
    },
    textArea: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 120,
    },
    dropdownTrigger: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    dropdownValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dropdownModal: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        width: '100%',
        padding: 8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    modalHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    optionItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 2,
    },
    selectedOption: {
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    selectedOptionText: {
        color: colors.primary,
        fontWeight: '800',
    },
    submitBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginTop: 20,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    submitBtnText: {
        color: colors.surface,
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 10,
        letterSpacing: 1,
    }
});

export default DailyUpdate;
