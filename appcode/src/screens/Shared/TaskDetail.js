import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { Clock, User, AlertCircle, CheckCircle2, RotateCcw, Plus, Send, ChevronDown, Check, X, MessageSquare } from 'lucide-react-native';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';

const TaskDetail = ({ route, navigation }) => {
    const { taskId } = route.params;
    const { tasks, user, reopenTask, closeTask, submitTask, updateTask } = useAppContext();
    const task = tasks.find(t => (t._id == taskId || t.id == taskId));

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState(''); // 'reopen', 'close', 'admin_response'
    const [remark, setRemark] = useState('');
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [tempStatus, setTempStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const adminStatuses = ['In Progress', 'On Hold', 'Delayed', 'Closed'];

    if (!task) return null;

    const handleAction = () => {
        if (modalType === 'reopen' || modalType === 'reject') {
            if (!remark) return Alert.alert('Error', 'Please provide a reason.');
            reopenTask(task._id, remark);
        } else if (modalType === 'admin_response') {
            if (!remark) return Alert.alert('Error', 'Please provide a response.');
            updateTask(task._id, { adminRemarks: remark });
        } else {
            closeTask(task._id, remark);
        }
        setModalVisible(false);
        setRemark('');
    };

    const renderTimelineItem = (item, index) => {
        let icon = <Plus size={16} color={colors.primary} />;
        let color = colors.primary;

        if (item.type === 'submitted') {
            icon = <Send size={16} color={colors.warning} />;
            color = colors.warning;
        } else if (item.type === 'reopened') {
            icon = <RotateCcw size={16} color={colors.danger} />;
            color = colors.danger;
        } else if (item.type === 'closed') {
            icon = <CheckCircle2 size={16} color={colors.success} />;
            color = colors.success;
        } else if (item.type === 'admin_response') {
            icon = <MessageSquare size={16} color={colors.primary} />;
            color = colors.primary;
        }

        return (
            <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                    <View style={[styles.timelineIcon, { borderColor: color }]}>{icon}</View>
                    {index < task.timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineRight}>
                    <Text style={styles.timelineType}>{item.type.toUpperCase()}</Text>
                    <Text style={styles.timelineUser}>by {item.user}</Text>
                    <Text style={styles.timelineDate}>{item.date}</Text>
                    {item.reason && <Text style={[styles.timelineReason, item.type === 'admin_response' && { backgroundColor: '#F0F9FF', color: colors.text }]}>
                        {item.type === 'admin_response' ? 'Instruction: ' : 'Reason: '}{item.reason}
                    </Text>}
                    {item.closingRemark && <Text style={styles.timelineReason}>Remark: {item.closingRemark}</Text>}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                    </View>
                    <Text style={styles.title}>{task.title}</Text>
                    <Text style={styles.description}>{task.description}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <User size={16} color={colors.textSecondary} />
                            <Text style={styles.metaText}>{task.assignedToName || 'Unassigned'}</Text>
                        </View>
                        <View style={[styles.metaItem, { marginLeft: 20 }]}>
                            <Clock size={16} color={colors.textSecondary} />
                            <Text style={styles.metaText}>{task.suggestedTimeline || '7 Days'}</Text>
                        </View>
                    </View>

                    {task.adminRemarks && (
                        <View style={styles.adminRemarksBox}>
                            <Text style={styles.adminRemarksLabel}>INDIRA VARA PRASAD SEERLA, MD — REMARKS</Text>
                            <Text style={styles.adminRemarksText}>{task.adminRemarks}</Text>
                        </View>
                    )}

                    <View style={styles.progressContainer}>
                        <Text style={styles.progressLabel}>Current Progress Status</Text>
                        <View style={[styles.statusIndicator, {
                            backgroundColor:
                                task.progressStatus === 'In Progress' ? colors.info :
                                    task.progressStatus === 'On Hold' ? colors.warning :
                                        task.progressStatus === 'Delayed' ? colors.danger :
                                            task.progressStatus === 'Request for Closure' ? colors.success : colors.border
                        }]}>
                            <Text style={styles.statusIndicatorText}>
                                {task.progressStatus?.toUpperCase() || 'OPEN'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Task Timeline</Text>
                </View>

                <View style={styles.card}>
                    {task.timeline?.map((item, index) => renderTimelineItem(item, index))}
                    {task.dailyUpdates?.map((update, index) => (
                        <View key={`upd-${index}`} style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                                <View style={[styles.timelineIcon, { borderColor: colors.info }]}>
                                    <Clock size={14} color={colors.info} />
                                </View>
                                {index < task.dailyUpdates.length - 1 || task.timeline.length > 0 ? <View style={styles.timelineLine} /> : null}
                            </View>
                            <View style={styles.timelineRight}>
                                <Text style={[styles.timelineType, { color: colors.info }]}>DAILY UPDATE - {update.status?.toUpperCase()}</Text>
                                <Text style={styles.timelineDate}>{update.date}</Text>
                                <Text style={styles.timelineRemark}>"{update.remark}"</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
                {user.role === 'Officer' && task.status === 'Open' && (
                    <TouchableOpacity
                        style={[styles.btn, styles.primaryBtn, { flex: 1, width: '100%' }]}
                        onPress={() => navigation.navigate('DailyUpdate', { taskId: task._id })}
                    >
                        <Plus size={20} color={colors.surface} />
                        <Text style={styles.primaryBtnText}>ADD DAILY UPDATE</Text>
                    </TouchableOpacity>
                )}

                {user.role === 'MainOfficer' && (
                    <View>
                        {task.status === 'Submitted' && (
                            <View style={[styles.row, { marginBottom: 12 }]}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.dangerBtn]}
                                    onPress={() => { setModalType('reject'); setModalVisible(true); }}
                                >
                                    <RotateCcw size={20} color={colors.surface} />
                                    <Text style={styles.primaryBtnText}>REJECT</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.successBtn]}
                                    onPress={() => { setModalType('close'); setModalVisible(true); }}
                                >
                                    <CheckCircle2 size={20} color={colors.surface} />
                                    <Text style={styles.primaryBtnText}>APPROVE</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {task.status === 'Closed' && (
                            <View style={[styles.row, { marginBottom: 12 }]}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.warningBtn, { flex: 1 }]}
                                    onPress={() => { setModalType('reopen'); setModalVisible(true); }}
                                >
                                    <RotateCcw size={20} color={colors.surface} />
                                    <Text style={styles.primaryBtnText}>REOPEN TASK</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.btn, styles.secondaryBtn, { flex: 1, width: '100%' }]}
                            onPress={() => {
                                setModalType('admin_response');
                                setRemark(task.adminRemarks || '');
                                setTempStatus(task.progressStatus || task.status || 'Open');
                                setModalVisible(true);
                            }}
                        >
                            <Send size={20} color={colors.primary} />
                            <Text style={styles.secondaryBtnText}>COLLECTOR'S RESPONSE</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {modalType === 'reopen' || modalType === 'reject' ? 'Reopen/Reject' :
                                    modalType === 'admin_response' ? 'Indira Vara Prasad Seerla, MD — Response' : 'Close/Approve'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            {modalType === 'reopen' || modalType === 'reject'
                                ? 'Provide a reason for the officer to address.'
                                : modalType === 'admin_response'
                                    ? 'Send instructions or feedback to the officer.'
                                    : 'Write a final remark before closing.'}
                        </Text>

                        {modalType === 'admin_response' && (
                            <View>
                                {/* Context Info */}
                                <View style={styles.contextBox}>
                                    <View style={styles.contextRow}>
                                        <Text style={styles.contextLabel}>Officer's Last Remark:</Text>
                                        <Text style={styles.contextValue} numberOfLines={2}>
                                            {task.dailyUpdates?.length > 0
                                                ? `"${task.dailyUpdates[task.dailyUpdates.length - 1].remark}"`
                                                : "No updates submitted yet."}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Update Task Status</Text>
                                <TouchableOpacity
                                    style={styles.dropdownTrigger}
                                    onPress={() => setStatusModalVisible(true)}
                                >
                                    <Text style={styles.dropdownValue}>{tempStatus || 'Open'}</Text>
                                    <ChevronDown size={20} color={colors.primary} />
                                </TouchableOpacity>

                                {/* Nested Status Dropdown Modal */}
                                <Modal visible={statusModalVisible} transparent animationType="fade">
                                    <TouchableOpacity
                                        style={styles.overlay}
                                        activeOpacity={1}
                                        onPress={() => setStatusModalVisible(false)}
                                    >
                                        <View style={styles.dropdownPicker}>
                                            <View style={styles.pickerHeader}>
                                                <Text style={styles.pickerTitle}>Set Task Status</Text>
                                                <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                                    <X size={20} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                            {adminStatuses.map(s => (
                                                <TouchableOpacity
                                                    key={s}
                                                    style={[
                                                        styles.optionItem,
                                                        tempStatus === s && styles.selectedOption
                                                    ]}
                                                    onPress={() => {
                                                        setTempStatus(s);
                                                        setStatusModalVisible(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.optionText,
                                                        tempStatus === s && styles.selectedOptionText
                                                    ]}>{s}</Text>
                                                    {tempStatus === s && <Check size={18} color={colors.primary} />}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </TouchableOpacity>
                                </Modal>
                            </View>
                        )}

                        <Text style={styles.inputLabel}>
                            {modalType === 'admin_response' ? 'Remarks/Instructions' : 'Remarks'}
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Write here..."
                            multiline
                            numberOfLines={4}
                            value={remark}
                            onChangeText={setRemark}
                        />

                        <TouchableOpacity
                            style={[
                                styles.fullBtn,
                                { backgroundColor: modalType === 'reopen' ? colors.danger : colors.primary },
                                isSaving && { opacity: 0.7 }
                            ]}
                            onPress={async () => {
                                if (isSaving) return;
                                if (modalType === 'admin_response') {
                                    setIsSaving(true);
                                    try {
                                        const finalStatus = tempStatus === 'Closed' ? 'Closed' : 'Open';
                                        await updateTask(task._id, {
                                            status: finalStatus,
                                            progressStatus: tempStatus,
                                            adminRemarks: remark
                                        });
                                        setModalVisible(false);
                                    } finally {
                                        setIsSaving(false);
                                    }
                                } else {
                                    handleAction();
                                }
                            }}
                            disabled={isSaving}
                        >
                            <Text style={styles.fullBtnText}>
                                {isSaving ? 'SAVING...' : 'SEND RESPONSE'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    headerCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        elevation: 3,
        marginBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginLeft: 6,
        fontWeight: '700',
    },
    adminRemarksBox: {
        backgroundColor: '#F0F9FF',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        marginBottom: 20,
    },
    adminRemarksLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.primary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    adminRemarksText: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 18,
    },
    progressContainer: {
        marginTop: 10,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    progressValue: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.primary,
    },
    statusIndicator: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    statusIndicatorText: {
        color: colors.surface,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    card: {
        backgroundColor: colors.surface,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    timelineLeft: {
        width: 32,
        alignItems: 'center',
    },
    timelineIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    timelineLine: {
        position: 'absolute',
        top: 32,
        bottom: -24,
        width: 2,
        backgroundColor: colors.border,
    },
    timelineRight: {
        flex: 1,
        marginLeft: 16,
        paddingBottom: 8,
    },
    timelineType: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: 2,
    },
    timelineUser: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    timelineDate: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    timelineReason: {
        marginTop: 8,
        fontSize: 13,
        color: colors.danger,
        fontStyle: 'italic',
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    timelineRemark: {
        marginTop: 6,
        fontSize: 14,
        color: colors.text,
        fontStyle: 'italic',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    btn: {
        flex: 0.48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 2,
    },
    primaryBtn: {
        backgroundColor: colors.primary,
    },
    primaryBtnText: {
        color: colors.surface,
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
    secondaryBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    secondaryBtnText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
    dangerBtn: {
        backgroundColor: colors.danger,
    },
    successBtn: {
        backgroundColor: colors.success,
    },
    warningBtn: {
        backgroundColor: colors.warning,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 32,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 24,
    },
    modalInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        textAlignVertical: 'top',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBtnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalCancel: {
        flex: 0.45,
        padding: 16,
        alignItems: 'center',
    },
    modalCancelText: {
        color: colors.textSecondary,
        fontWeight: 'bold',
    },
    modalConfirm: {
        flex: 0.45,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: colors.surface,
        fontWeight: 'bold',
    },
    // Enhanced Modal Styles
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    contextBox: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contextRow: {
        flexDirection: 'row',
        flexDirection: 'column',
    },
    contextLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    contextValue: {
        fontSize: 13,
        color: colors.text,
        fontStyle: 'italic',
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
        marginBottom: 20,
    },
    dropdownValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dropdownPicker: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        width: '100%',
        padding: 8,
        elevation: 10,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
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
    fullBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    fullBtnText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 1,
    }
});

export default TaskDetail;
