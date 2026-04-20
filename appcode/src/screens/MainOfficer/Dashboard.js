import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { LayoutDashboard, LogOut, Plus, CheckCircle2, AlertCircle, Clock, FileText, ChevronRight, CalendarDays } from 'lucide-react-native';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';

const { width } = Dimensions.get('window');

const SummaryCard = ({ title, count, icon: Icon, color, onPress }) => (
    <TouchableOpacity
        style={[styles.summaryCard, { borderLeftColor: color, borderLeftWidth: 4 }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.cardHeader}>
            <Icon size={20} color={color} />
            <Text style={[styles.cardTitle, { color }]}>{title}</Text>
        </View>
        <Text style={styles.cardCount}>{count}</Text>
    </TouchableOpacity>
);

const MainDashboard = ({ navigation }) => {
    const { user, tasks, appointments, logout, fetchTasks, fetchAppointments } = useAppContext();

    // Auto-refresh tasks on focal
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchTasks();
            fetchAppointments();
        });
        return unsubscribe;
    }, [navigation]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    // Metrics calculation
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const openTasks = tasks.filter(t => t.status === 'Open');

        return {
            assigned: openTasks.length,
            submittedToday: tasks.filter(t => (t.dailyUpdates || []).some(u => u.date === today)).length,
            notSubmittedToday: openTasks.filter(t => !(t.dailyUpdates || []).some(u => u.date === today)).length,
            // Appointment Stats
            pendingAppointments: appointments.filter(a => a.status === 'Pending').length,
            scheduledToday: appointments.filter(a => a.status === 'Scheduled' && a.date === today).length,
            scheduledFuture: appointments.filter(a => a.status === 'Scheduled' && a.date > today).length
        };
    }, [tasks, appointments]);

    const renderTaskItem = ({ item }) => (
        <TouchableOpacity
            style={styles.taskItem}
            key={item._id}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
        >
            <View style={styles.taskPrimary}>
                <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.taskAssignee}>{item.assignedToName || 'Unassigned'}</Text>
            </View>
            <View style={styles.taskSecondary}>
                <StatusBadge status={item.status} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSubtitle}>{greeting},</Text>
                    <Text style={styles.headerTitle} numberOfLines={2} adjustsFontSizeToFit>{user?.name}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => navigation.navigate('CreateTask')} style={styles.headerActionBtn}>
                        <Plus size={18} color={colors.surface} />
                        <Text style={styles.headerActionText}>NEW TASK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={[styles.headerBtn, { marginLeft: 12 }]}>
                        <LogOut size={22} color={colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.summaryGrid}>
                <SummaryCard
                    title="Assigned by you" count={stats.assigned} icon={LayoutDashboard} color={colors.primary}
                    onPress={() => navigation.navigate('Tasks', { filter: 'All' })}
                />
                <SummaryCard
                    title="Submitted (Today)" count={stats.submittedToday} icon={CheckCircle2} color={colors.success}
                    onPress={() => navigation.navigate('Tasks', { filter: 'Submitted Today' })}
                />
                <View style={styles.fullWidthCard}>
                    <SummaryCard
                        title="Not Submitted (Today)" count={stats.notSubmittedToday} icon={AlertCircle} color={colors.danger}
                        onPress={() => navigation.navigate('Tasks', { filter: 'Not Submitted Today' })}
                    />
                </View>

                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CalendarDays size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Appointments</Text>
                    </View>
                </View>

                <View style={styles.summaryGrid}>
                    <SummaryCard
                        title="Pending"
                        count={stats.pendingAppointments}
                        icon={Clock}
                        color={colors.warning}
                        onPress={() => navigation.navigate('Appointments', { activeTab: 'Pending' })}
                    />
                    <SummaryCard
                        title="Scheduled (Today)"
                        count={stats.scheduledToday}
                        icon={CheckCircle2}
                        color={colors.success}
                        onPress={() => navigation.navigate('Appointments', { activeTab: 'Today' })}
                    />
                    <View style={styles.fullWidthCard}>
                        <SummaryCard
                            title="Scheduled (Future)"
                            count={stats.scheduledFuture}
                            icon={CalendarDays}
                            color={colors.primary}
                            onPress={() => navigation.navigate('Appointments', { activeTab: 'Future' })}
                        />
                    </View>
                </View>
            </View>
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
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        maxWidth: 200,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerActionText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 12,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    summaryCard: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 16,
        width: (width - 50) / 2,
        marginBottom: 10,
        elevation: 2,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    fullWidthCard: {
        width: '100%',
        marginBottom: 20,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 16,
        backgroundColor: colors.surface,
        elevation: 2,
    },
    reportContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reportText: {
        fontSize: 14,
        fontWeight: '900',
        marginLeft: 12,
        letterSpacing: 0.5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    cardCount: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    viewAll: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionBtn: {
        backgroundColor: colors.primary,
        padding: 20,
        borderRadius: 16,
        width: (width - 50) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
    },
    actionText: {
        color: colors.surface,
        marginTop: 8,
        fontWeight: '700',
        fontSize: 13,
    },
    taskListContainer: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 8,
        elevation: 2,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    taskPrimary: {
        flex: 1,
        marginRight: 12,
    },
    taskTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    taskAssignee: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    taskSecondary: {
        alignItems: 'flex-end',
    },
    newBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    newBadgeText: {
        color: colors.surface,
        fontSize: 10,
        fontWeight: '900',
    },
    appointmentShortcut: {
        backgroundColor: colors.surface,
        width: '100%',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        marginBottom: 30,
    },
    appointmentIconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appointmentTextBox: {
        flex: 1,
        marginLeft: 16,
    },
    appointmentTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    appointmentSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    appointmentCountBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appointmentCount: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.primary,
        marginRight: 8,
    }
});

export default MainDashboard;
