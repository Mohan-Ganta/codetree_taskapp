import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { Search, ChevronRight, Clock, MessageSquare, Send, X, ChevronDown, Check, RotateCcw, Info } from 'lucide-react-native';
import { Alert } from 'react-native';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';

const TableHeader = () => (
    <View style={styles.tableRow}>
        <View style={[styles.cell, { width: 50 }]}><Text style={styles.headerText}>S.No</Text></View>
        <View style={[styles.cell, { width: 180 }]}><Text style={styles.headerText}>Description</Text></View>
        <View style={[styles.cell, { width: 130 }]}><Text style={styles.headerText}>Suggested Time Line</Text></View>
        <View style={[styles.cell, { width: 120 }]}><Text style={styles.headerText}>Status (Today)</Text></View>
        <View style={[styles.cell, { width: 180 }]}><Text style={styles.headerText}>Remarks by Officer</Text></View>
        <View style={[styles.cell, { width: 180 }]}><Text style={styles.headerText}>Principle Secretary Remarks</Text></View>
    </View>
);

const TableRow = ({ item, index, navigation, onResponse, onReopen }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    const todayUpdate = (item.dailyUpdates || []).find(u => u.date === todayStr);
    const yesterdayUpdate = (item.dailyUpdates || []).find(u => u.date === yesterdayStr);

    const getRowBackground = () => {
        if (item.status === 'Closed') return 'rgba(16, 185, 129, 0.08)'; // Success Green
        const progress = item.progressStatus;
        if (progress === 'Delayed') return 'rgba(239, 68, 68, 0.08)'; // Danger Red
        if (progress === 'On Hold') return 'rgba(245, 158, 11, 0.08)'; // Warning Amber
        if (todayUpdate) return 'rgba(37, 99, 235, 0.04)'; // Info Blue (Active)
        return index % 2 === 1 ? '#F8FAFC' : 'white'; // Default Zebra
    };

    return (
        <TouchableOpacity
            style={[styles.tableRow, { backgroundColor: getRowBackground() }]}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
        >
            <View style={[styles.cell, { width: 50 }]}><Text style={styles.cellText}>{index + 1}</Text></View>
            <View style={[styles.cell, { width: 180 }]}><Text style={styles.cellText}>{item.title}</Text></View>
            <View style={[styles.cell, { width: 130 }]}><Text style={styles.timelineText}>{item.suggestedTimeline || 'N/A'}</Text></View>
            <View style={[styles.cell, { width: 120 }]}>
                <View style={[
                    styles.statusPill,
                    {
                        backgroundColor: (item.progressStatus === 'Delayed') ? 'rgba(239, 68, 68, 0.1)' :
                            (item.status === 'Closed') ? 'rgba(16, 185, 129, 0.1)' :
                                'rgba(37, 99, 235, 0.1)'
                    }
                ]}>
                    <Text style={[
                        styles.statusText,
                        {
                            color: (item.progressStatus === 'Delayed') ? colors.danger :
                                (item.status === 'Closed') ? colors.success :
                                    colors.primary
                        }
                    ]}>
                        {item.progressStatus || todayUpdate?.status || item.status || 'Open'}
                    </Text>
                </View>
            </View>
            <View style={[styles.cell, { width: 180 }]}><Text style={styles.remarkText} numberOfLines={3}>{todayUpdate?.remark || 'No remark'}</Text></View>
            <TouchableOpacity 
                style={[styles.cell, { width: 180 }]} 
                onPress={() => item.status === 'Closed' ? onReopen(item) : onResponse(item)}
            >
                <Text style={styles.adminRemarkText} numberOfLines={3}>{item.adminRemarks || 'Click to respond'}</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const TaskList = ({ navigation, route }) => {
    const { tasks, officers, user, updateTask } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState(route.params?.filter || 'All');

    // Response Modal State
    const [responseModalVisible, setResponseModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [adminRemark, setAdminRemark] = useState('');
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [tempStatus, setTempStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const adminStatuses = ['In Progress', 'On Hold', 'Delayed', 'Closed'];

    // Header Info Icon
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => setInfoModalVisible(true)}
                    style={{ marginRight: 15 }}
                >
                    <Info size={22} color="#FFFFFF" />
                </TouchableOpacity>
            )
        });
    }, [navigation]);

    useEffect(() => {
        if (route.params?.filter) {
            setActiveFilter(route.params.filter);
        }
    }, [route.params?.filter]);

    const baseTasks = useMemo(() => {
        let list = user.role === 'MainOfficer'
            ? tasks
            : tasks.filter(t => t.assignedTo == user.id);
            
        if (searchQuery) {
            list = list.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.assignedToName && t.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }
        return list;
    }, [tasks, user, searchQuery]);

    const filterCounts = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return {
            'All': baseTasks.length,
            'Submitted Today': baseTasks.filter(t => (t.dailyUpdates || []).some(u => u.date === todayStr)).length,
            'Not Submitted Today': baseTasks.filter(t => t.status === 'Open' && !(t.dailyUpdates || []).some(u => u.date === todayStr)).length,
            'Closed': baseTasks.filter(t => t.status.toLowerCase() === 'closed').length
        };
    }, [baseTasks]);

    const filteredTasks = useMemo(() => {
        let list = [...baseTasks];
        const todayStr = new Date().toISOString().split('T')[0];

        if (activeFilter === 'Submitted Today') {
            list = list.filter(t => (t.dailyUpdates || []).some(u => u.date === todayStr));
        } else if (activeFilter === 'Not Submitted Today') {
            list = list.filter(t => t.status === 'Open' && !(t.dailyUpdates || []).some(u => u.date === todayStr));
        } else if (activeFilter !== 'All') {
            list = list.filter(t => t.status.toLowerCase() === activeFilter.toLowerCase());
        }

        return list;
    }, [baseTasks, activeFilter]);

    const groupedTasks = useMemo(() => {
        const groups = {};
        filteredTasks.forEach(task => {
            const officer = task.assignedToName || 'Unassigned';
            if (!groups[officer]) groups[officer] = [];
            groups[officer].push(task);
        });
        return groups;
    }, [filteredTasks]);

    useEffect(() => {
        const initialExpanded = {};
        Object.keys(groupedTasks).forEach(officer => {
            initialExpanded[officer] = true;
        });
        setExpandedGroups(initialExpanded);
    }, [Object.keys(groupedTasks).length]);

    const toggleGroup = (officer) => {
        setExpandedGroups(prev => ({
            ...prev,
            [officer]: !prev[officer]
        }));
    };

    // Prepare flattened items for sticky headers
    const { flattenedRenderItems, stickyHeaderIndices } = useMemo(() => {
        const items = [];
        const sticky = [];
        Object.entries(groupedTasks).forEach(([officer, officerTasks]) => {
            const officerInfo = officers.find(o => o.name === officer);
            
            sticky.push(items.length);
            items.push({
                type: 'header',
                key: `header-${officer}`,
                officer,
                designation: officerInfo?.designation || '',
                department: officerInfo?.department || '',
                officerTasksLength: officerTasks.length
            });

            if (expandedGroups[officer]) {
                officerTasks.forEach((task, idx) => {
                    items.push({
                        type: 'row',
                        key: task._id,
                        item: task,
                        indexInGroup: idx
                    });
                });
            }
        });
        return { flattenedRenderItems: items, stickyHeaderIndices: sticky };
    }, [groupedTasks, expandedGroups]);


    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item._id })}
        >
            <View style={styles.cardLeft}>
                <View style={styles.cardHeader}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <PriorityBadge priority={item.priority} />
                </View>
                <Text style={styles.officer}>{item.assignedToName || 'Subordinate Officer'}</Text>
                <View style={styles.progressRow}>
                    <Text style={styles.progressLabelText}>STATUS:</Text>
                    <Text style={styles.progressValueText}>{item.progressStatus?.toUpperCase() || 'OPEN'}</Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                <StatusBadge status={item.status} />
                <ChevronRight size={18} color={colors.textSecondary} style={{ marginTop: 12 }} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search by title or officer..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.filterBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {['All', 'Submitted Today', 'Not Submitted Today', 'Closed'].map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterBtn, activeFilter === filter && styles.activeFilterBtn]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                                {filter} ({filterCounts[filter] || 0})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {user.role === 'MainOfficer' ? (
                <ScrollView horizontal>
                    <View>
                        <TableHeader />
                        <ScrollView
                            style={{ maxHeight: 600 }}
                            stickyHeaderIndices={stickyHeaderIndices}
                        >
                            {flattenedRenderItems.map((item, index) => {
                                if (item.type === 'header') {
                                    return (
                                        <TouchableOpacity
                                            key={item.key}
                                            style={styles.groupHeader}
                                            onPress={() => toggleGroup(item.officer)}
                                            activeOpacity={0.7}
                                        >
                                            <ChevronRight
                                                size={18}
                                                color={colors.primary}
                                                style={{
                                                    transform: [{ rotate: expandedGroups[item.officer] ? '90deg' : '0deg' }],
                                                    marginRight: 8
                                                }}
                                            />
                                            <Text style={styles.groupHeaderText}>
                                                {item.officer.toUpperCase()}   |   {item.designation.toUpperCase()}   |   {item.department.toUpperCase()}   |   {item.officerTasksLength} TASKS
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }
                                return (
                                    <TableRow
                                        key={item.key}
                                        item={item.item}
                                        index={item.indexInGroup}
                                        navigation={navigation}
                                        onResponse={(t) => {
                                            setSelectedTask(t);
                                            setAdminRemark(t.adminRemarks || '');
                                            setTempStatus(t.progressStatus || t.status || 'Open');
                                            setResponseModalVisible(true);
                                        }}
                                        onReopen={(t) => {
                                            Alert.alert('Reopen Task', 'Are you sure you want to reopen this task?', [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Reopen',
                                                    onPress: async () => {
                                                        await updateTask(t._id, { status: 'Open', progressStatus: 'In Progress' });
                                                    }
                                                }
                                            ]);
                                        }}
                                    />
                                );
                            })}
                        </ScrollView>
                        {flattenedRenderItems.length === 0 && (
                            <View style={[styles.emptyState, { width: 840 }]}>
                                <Text style={styles.emptyText}>No tasks found matching criteria.</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    data={filteredTasks}
                    renderItem={renderItem}
                    keyExtractor={item => (item.id || item._id).toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No tasks found matching your criteria.</Text>
                        </View>
                    }
                />
            )}

            {/* Admin Response Modal */}
            <Modal visible={responseModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Principle Secretary Response</Text>
                            <TouchableOpacity onPress={() => setResponseModalVisible(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalTaskTitle}>{selectedTask?.title}</Text>

                        {/* Task Context Section */}
                        <View style={styles.contextContainer}>
                            <View style={styles.contextRow}>
                                <Text style={styles.contextLabel}>Current Status:</Text>
                                <Text style={[styles.contextValue, { color: colors.primary }]}>
                                    {selectedTask?.progressStatus?.toUpperCase() || 'OPEN'}
                                </Text>
                            </View>
                            <View style={styles.contextLine} />
                            <Text style={styles.contextLabel}>Officer's Last Remark:</Text>
                            <Text style={styles.lastRemarkText}>
                                {selectedTask?.dailyUpdates?.length > 0
                                    ? `"${selectedTask.dailyUpdates[selectedTask.dailyUpdates.length - 1].remark}"`
                                    : "No updates submitted yet."}
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>Update Task Status</Text>
                        <TouchableOpacity
                            style={styles.dropdownTrigger}
                            onPress={() => setStatusModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.dropdownValue}>{tempStatus || 'Open'}</Text>
                            <ChevronDown size={20} color={colors.primary} />
                        </TouchableOpacity>

                        {/* Admin Status Dropdown Modal */}
                        <Modal visible={statusModalVisible} transparent animationType="fade">
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => setStatusModalVisible(false)}
                            >
                                <View style={styles.dropdownModal}>
                                    <View style={styles.innerModalHeader}>
                                        <Text style={styles.modalHeaderTitle}>Set Task Status</Text>
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

                        <Text style={[styles.modalLabel, { marginTop: 20 }]}>Remarks/Instructions</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter your instructions or remarks..."
                            multiline
                            numberOfLines={4}
                            value={adminRemark}
                            onChangeText={setAdminRemark}
                        />
                        <TouchableOpacity
                            style={[styles.modalSubmitBtn, isSaving && { opacity: 0.7 }]}
                            onPress={async () => {
                                if (isSaving) return;
                                setIsSaving(true);
                                try {
                                    const finalStatus = tempStatus === 'Closed' ? 'Closed' : 'Open';
                                    await updateTask(selectedTask?._id, {
                                        status: finalStatus,
                                        progressStatus: tempStatus,
                                        adminRemarks: adminRemark
                                    });
                                    setResponseModalVisible(false);
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            disabled={isSaving}
                        >
                            <Send size={18} color={colors.surface} />
                            <Text style={styles.modalSubmitText}>
                                {isSaving ? 'SAVING...' : 'SEND RESPONSE'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Status Legend Info Modal */}
            <Modal visible={infoModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setInfoModalVisible(false)}
                >
                    <View style={styles.legendModal}>
                        <View style={styles.legendHeader}>
                            <Text style={styles.legendTitle}>Table Color Guide</Text>
                            <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]} />
                            <View>
                                <Text style={styles.legendLabel}>SUCCESS / CLOSED</Text>
                                <Text style={styles.legendDesc}>Task is successfully completed and closed.</Text>
                            </View>
                        </View>

                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} />
                            <View>
                                <Text style={styles.legendLabel}>CRITICAL / DELAYED</Text>
                                <Text style={styles.legendDesc}>Priority attention needed. Officer reported delay.</Text>
                            </View>
                        </View>

                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]} />
                            <View>
                                <Text style={styles.legendLabel}>WARNING / ON HOLD</Text>
                                <Text style={styles.legendDesc}>Task is currently paused or stuck.</Text>
                            </View>
                        </View>

                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]} />
                            <View>
                                <Text style={styles.legendLabel}>ACTIVE / UPDATED</Text>
                                <Text style={styles.legendDesc}>Work is in progress with an update sent today.</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.legendCloseBtn}
                            onPress={() => setInfoModalVisible(false)}
                        >
                            <Text style={styles.legendCloseText}>GOT IT</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View >
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        padding: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
    },
    filterBar: {
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterScroll: {
        paddingHorizontal: 16,
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeFilterBtn: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    activeFilterText: {
        color: colors.surface,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        elevation: 2,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardLeft: {
        flex: 1,
        paddingRight: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
        marginRight: 10,
    },
    officer: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    progressLabelText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginRight: 6,
    },
    progressValueText: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    cardRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    // Table Styles
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 12,
        paddingLeft: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        width: 840, // Matches table width
    },
    groupHeaderText: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 1,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    cell: {
        padding: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.border,
        minHeight: 60,
    },
    headerText: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    cellText: {
        fontSize: 13,
        color: colors.text,
        textAlign: 'center',
    },
    officerName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
    },
    timelineText: {
        fontSize: 12,
        color: colors.info,
        fontWeight: '700',
        textAlign: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '900',
        textAlign: 'center',
    },
    statusPill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    remarkText: {
        fontSize: 11,
        color: colors.text,
        fontStyle: 'italic',
    },
    adminRemarkText: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    actionCell: {
        alignItems: 'center',
    },
    updateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    actionUpdateText: {
        fontSize: 10,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    actionStatusText: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 6,
    },
    tableActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    tableActionBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        marginLeft: 4,
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    // Modal Styles in TaskList
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    innerModalHeader: {
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
        marginBottom: 8,
    },
    dropdownValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    modalTaskTitle: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        textAlignVertical: 'top',
        minHeight: 120,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalSubmitBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    modalSubmitText: {
        color: colors.surface,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    contextContainer: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    contextLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    contextValue: {
        fontSize: 12,
        fontWeight: '900',
    },
    contextLine: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 8,
    },
    lastRemarkText: {
        fontSize: 13,
        color: colors.text,
        fontStyle: 'italic',
        lineHeight: 18,
        marginTop: 4,
    },
    // Legend Styles
    legendModal: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 24,
        width: '85%',
        elevation: 10,
    },
    legendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    legendTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    legendColor: {
        width: 40,
        height: 40,
        borderRadius: 12,
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    legendLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 2,
    },
    legendDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        maxWidth: 200,
    },
    legendCloseBtn: {
        marginTop: 10,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    legendCloseText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    }
});

export default TaskList;
