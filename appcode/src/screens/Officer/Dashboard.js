import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { ClipboardList, AlertCircle, CheckCircle2, Clock, ChevronRight, LogOut, Plus } from 'lucide-react-native';
import { StatusBadge } from '../../components/StatusBadge';

const { width } = Dimensions.get('window');

const OfficerDashboard = ({ navigation }) => {
    const { user, tasks, logout, fetchTasks } = useAppContext();

    // Refresh on focus and poll in background
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchTasks();
        });
        return unsubscribe;
    }, [navigation]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const myTasks = tasks.filter(t => String(t.assignedTo) === String(user.id || user._id));
    const openTasks = myTasks.filter(t => t.status === 'Open');

    const today = new Date().toISOString().split('T')[0];
    const submittedToday = myTasks.filter(t => t.dailyUpdates.some(u => u.date === today));
    const notSubmittedToday = openTasks.filter(t => !t.dailyUpdates.some(u => u.date === today));

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>{greeting},</Text>
                    <Text style={styles.userName}>{user.name.split(' ')[0]}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        style={styles.headerActionBtn}
                        onPress={() => navigation.navigate('CreateTask')}
                    >
                        <Plus size={18} color={colors.surface} />
                        <Text style={styles.headerActionText}>CREATE TASK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <LogOut size={22} color={colors.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileBadge}>
                        <Text style={styles.profileText}>{user.name[0]}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {notSubmittedToday.length > 0 && (
                <TouchableOpacity
                    style={styles.alertCard}
                    onPress={() => navigation.navigate('My Tasks', { filter: 'Open' })}
                >
                    <AlertCircle size={24} color={colors.surface} />
                    <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>Daily Update Required</Text>
                        <Text style={styles.alertSub}>{notSubmittedToday.length} task(s) need your update for today.</Text>
                    </View>
                </TouchableOpacity>
            )}

            <View style={styles.statsRow}>
                <TouchableOpacity
                    style={styles.statBox}
                    onPress={() => navigation.navigate('My Tasks', { filter: 'Open' })}
                >
                    <Text style={styles.statNum}>{openTasks.length}</Text>
                    <Text style={styles.statLabel}>Assigned</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.statBox}
                    onPress={() => navigation.navigate('My Tasks', { filter: 'All' })}
                >
                    <Text style={[styles.statNum, { color: colors.success }]}>{submittedToday.length}</Text>
                    <Text style={styles.statLabel}>Submitted (Today)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.statBox}
                    onPress={() => navigation.navigate('My Tasks', { filter: 'Open' })}
                >
                    <Text style={[styles.statNum, { color: colors.danger }]}>{notSubmittedToday.length}</Text>
                    <Text style={styles.statLabel}>Not Submitted (Today)</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>My Current Tasks</Text>

            {myTasks.length === 0 ? (
                <View style={styles.emptyState}>
                    <ClipboardList size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>No tasks assigned to you currently.</Text>
                </View>
            ) : (
                myTasks.map((task, index) => (
                    <TouchableOpacity
                        key={task._id || index}
                        style={styles.taskCard}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: task._id })}
                    >
                        <View style={styles.taskHeader}>
                            <View style={styles.taskInfo}>
                                <Text style={styles.taskTitle}>{task.title}</Text>
                                <StatusBadge status={task.status} />
                            </View>
                            <ChevronRight size={20} color={colors.textSecondary} />
                        </View>
                        <View style={styles.taskStatusContainer}>
                            <Text style={styles.statusLabel}>STATUS:</Text>
                            <Text style={styles.statusValue}>{task.progressStatus?.toUpperCase() || 'OPEN'}</Text>
                        </View>
                        <View style={styles.taskFooter}>
                            <View style={styles.footerItem}>
                                <Clock size={12} color={colors.textSecondary} />
                                <Text style={styles.footerText}>Last update: {task.dailyUpdates[task.dailyUpdates.length - 1]?.date || 'Never'}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    welcome: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
    },
    profileBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileText: {
        color: colors.surface,
        fontWeight: 'bold',
        fontSize: 18,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoutBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        elevation: 2,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    headerActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        marginRight: 10,
    },
    headerActionText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 11,
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    alertCard: {
        backgroundColor: colors.danger,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 4,
    },
    alertContent: {
        marginLeft: 12,
    },
    alertTitle: {
        color: colors.surface,
        fontWeight: 'bold',
        fontSize: 16,
    },
    alertSub: {
        color: colors.surface,
        opacity: 0.9,
        fontSize: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statBox: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        width: (width - 64) / 3,
        elevation: 2,
    },
    statNum: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    taskCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    taskInfo: {
        flex: 1,
        marginRight: 8,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 6,
    },
    taskStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginRight: 6,
    },
    statusValue: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    }
});

export default OfficerDashboard;
