import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft, User, Send, Flag, Calendar, Search, X, ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateTask = ({ navigation }) => {
    const { officers, tasks, addTask, addOfficer, user } = useAppContext();
    const isOfficer = user?.role === 'Officer';

    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState(isOfficer ? user.name : '');
    const [assignedToId, setAssignedToId] = useState(isOfficer ? user.id : '');
    const [priority, setPriority] = useState('Medium');
    const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 7 days from now
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [officerSearch, setOfficerSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    // Add Officer Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newOfficer, setNewOfficer] = useState({ name: '', designation: '', department: 'ITE&C', email: '', phoneNumber: '' });
    const [addLoading, setAddLoading] = useState(false);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);

    const filteredOfficers = useMemo(() => {
        if (isOfficer) return [];
        
        // 1. Calculate task counts and sort
        const officerStats = officers.map(off => ({
            ...off,
            activeTasks: tasks.filter(t => t.assignedTo == (off.id || off._id) && t.status !== 'Closed').length
        }));

        // 2. Sort by Task Count (Desc) then Name (Asc)
        const sorted = officerStats.sort((a, b) => {
            if (b.activeTasks !== a.activeTasks) return b.activeTasks - a.activeTasks;
            return a.name.localeCompare(b.name);
        });

        // 3. Filter by search query
        if (!officerSearch) return isSearchFocused ? sorted : [];
        
        return sorted.filter(o =>
            o.name.toLowerCase().includes(officerSearch.toLowerCase()) ||
            o.designation.toLowerCase().includes(officerSearch.toLowerCase())
        );
    }, [officerSearch, officers, tasks, isOfficer, isSearchFocused]);

    const handleQuickAddOfficer = async () => {
        const { name, designation, email, phoneNumber } = newOfficer;
        if (!name || !designation || !email || !phoneNumber) return Alert.alert('Error', 'Please fill all fields');
        
        setAddLoading(true);
        const success = await addOfficer(newOfficer);
        setAddLoading(false);

        if (success) {
            setShowAddModal(false);
            setAssignedTo(success.name);
            setAssignedToId(success.id || success._id);
            setNewOfficer({ name: '', designation: '', department: 'ITE&C', email: '', phoneNumber: '' });
            Alert.alert('Success', 'Officer added and assigned to this task.');
        } else {
            Alert.alert('Error', 'Failed to add officer.');
        }
    };

    const handleSubmit = async () => {
        if (!description || (!isOfficer && !assignedToId)) {
            return Alert.alert('Error', 'Please fill in all required fields.');
        }

        const generatedTitle = description.length > 40
            ? description.substring(0, 37) + '...'
            : description;

        setAddLoading(true);
        const success = await addTask({
            title: generatedTitle,
            description,
            assignedTo: assignedToId,
            assignedToName: assignedTo,
            priority,
            suggestedTimeline: date.toLocaleDateString(),
        });
        setAddLoading(false);

        if (success) {
            navigation.goBack();
        }
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const PriorityBtn = ({ val }) => (
        <TouchableOpacity
            style={[
                styles.prioBtn,
                priority === val && { backgroundColor: val === 'High' ? colors.danger : val === 'Medium' ? colors.warning : colors.success },
                priority === val && styles.activePrio
            ]}
            onPress={() => setPriority(val)}
        >
            <Text style={[styles.prioText, priority === val && { color: colors.surface }]}>{val}</Text>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Assign New Task</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>DESCRIPTION / TASK DETAILS</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Provide complete instructions..."
                        multiline
                        numberOfLines={6}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {!isOfficer ? (
                    <View style={styles.inputGroup}>
                        <View style={styles.row}>
                            <User size={16} color={colors.textSecondary} />
                            <Text style={[styles.label, { marginLeft: 8, marginBottom: 0 }]}>ASSIGN TO OFFICER</Text>
                        </View>

                        <View style={styles.searchWrapper}>
                            <View style={[styles.searchBar, isSearchFocused && styles.searchBarActive]}>
                                <Search size={20} color={isSearchFocused ? colors.primary : colors.textSecondary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Select or Search Officer..."
                                    value={officerSearch}
                                    onChangeText={setOfficerSearch}
                                    onFocus={() => setIsSearchFocused(true)}
                                    autoCorrect={false}
                                />
                                <TouchableOpacity 
                                    style={styles.quickAddBtn}
                                    onPress={() => setShowAddModal(true)}
                                >
                                    <Text style={styles.quickAddText}>+ ADD NEW</Text>
                                </TouchableOpacity>
                            </View>

                            {isSearchFocused && filteredOfficers.length > 0 && (
                                <View style={styles.dropdown}>
                                    <View style={styles.dropdownHeader}>
                                        <Text style={styles.dropdownHeaderText}>SELECT OFFICER (SORTED BY WORKLOAD)</Text>
                                        <TouchableOpacity onPress={() => setIsSearchFocused(false)}>
                                            <Text style={styles.closeDropdown}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView style={{ maxHeight: 250 }} keyboardShouldPersistTaps="handled">
                                        {filteredOfficers.map((off) => (
                                            <TouchableOpacity 
                                                key={off._id} 
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setAssignedTo(off.name);
                                                    setAssignedToId(off.id || off._id);
                                                    setOfficerSearch('');
                                                    setIsSearchFocused(false);
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={styles.dropName}>{off.name}</Text>
                                                        <View style={styles.taskBadge}>
                                                            <Text style={styles.taskBadgeText}>{off.activeTasks} Tasks</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.dropRole}>{off.designation} • {off.department}</Text>
                                                </View>
                                                <ChevronRight size={16} color={colors.primary} />
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {assignedTo ? (
                            <View style={styles.selectedOfficer}>
                                <Text style={styles.selectedLabel}>CURRENTLY ASSIGNED TO:</Text>
                                <Text style={styles.selectedName}>{assignedTo}</Text>
                                <TouchableOpacity onPress={() => { setAssignedTo(''); setAssignedToId(''); }}>
                                    <Text style={styles.changeBtn}>Change</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                ) : (
                    <View style={styles.inputGroup}>
                        <View style={styles.selectedOfficer}>
                            <Text style={styles.selectedLabel}>SELF-ASSIGNED TO:</Text>
                            <Text style={styles.selectedName}>{user.name}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <View style={styles.row}>
                        <Flag size={16} color={colors.textSecondary} />
                        <Text style={[styles.label, { marginLeft: 8, marginBottom: 0 }]}>PRIORITY LEVEL</Text>
                    </View>
                    <View style={styles.prioRow}>
                        <PriorityBtn val="Low" />
                        <PriorityBtn val="Medium" />
                        <PriorityBtn val="High" />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>SUGGESTED TIME LINE</Text>
                    <TouchableOpacity
                        style={styles.datePickerBtn}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Calendar size={20} color={colors.primary} />
                        <Text style={styles.dateText}>{date.toDateString()}</Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    )}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitBtnText}>CREATE & ASSIGN TASK</Text>
                    <Send size={18} color={colors.surface} />
                </TouchableOpacity>

                {/* Quick Add Officer Modal */}
                <Modal
                    visible={showAddModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowAddModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Quick Add Officer</Text>
                                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalForm}>
                                <Text style={styles.modalLabel}>Name</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Ramesh Varma"
                                    value={newOfficer.name}
                                    onChangeText={(val) => setNewOfficer({ ...newOfficer, name: val })}
                                />

                                <Text style={styles.modalLabel}>Designation</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Tahshildar"
                                    value={newOfficer.designation}
                                    onChangeText={(val) => setNewOfficer({ ...newOfficer, designation: val })}
                                />

                                <Text style={styles.modalLabel}>Department</Text>
                                <View style={styles.deptToggle}>
                                    {['RTG', 'ITE&C'].map(d => (
                                        <TouchableOpacity 
                                            key={d}
                                            style={[styles.deptBtn, newOfficer.department === d && styles.deptBtnActive]}
                                            onPress={() => setNewOfficer({ ...newOfficer, department: d })}
                                        >
                                            <Text style={[styles.deptBtnText, newOfficer.department === d && styles.deptBtnActiveText]}>{d}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.modalLabel}>Email</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="official@ap.gov.in"
                                    value={newOfficer.email}
                                    autoCapitalize="none"
                                    onChangeText={(val) => setNewOfficer({ ...newOfficer, email: val })}
                                />

                                <Text style={styles.modalLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="10-digit number"
                                    keyboardType="phone-pad"
                                    value={newOfficer.phoneNumber}
                                    onChangeText={(val) => setNewOfficer({ ...newOfficer, phoneNumber: val })}
                                />

                                <TouchableOpacity 
                                    style={styles.modalSubmit}
                                    onPress={handleQuickAddOfficer}
                                    disabled={addLoading}
                                >
                                    {addLoading ? (
                                        <ActivityIndicator color={colors.surface} />
                                    ) : (
                                        <Text style={styles.modalSubmitText}>ADD AND ASSIGN</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
    inputGroup: {
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: 12,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        marginVertical: 4,
    },
    officerChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 10,
    },
    activeChip: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
    },
    activeChipText: {
        color: colors.surface,
    },
    prioRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    prioBtn: {
        flex: 0.3,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activePrio: {
        borderColor: 'transparent',
        elevation: 3,
    },
    prioText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginTop: 32,
        elevation: 4,
    },
    submitBtnText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 15,
        marginRight: 12,
        letterSpacing: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        padding: 14,
        fontSize: 15,
        color: colors.text,
    },
    dropdown: {
        position: 'absolute',
        top: 55,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderRadius: 12,
        maxHeight: 250,
        elevation: 5,
        zIndex: 100,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    assignBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    assignBtnText: {
        color: colors.surface,
        fontSize: 12,
        fontWeight: 'bold',
    },
    dropName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.text,
    },
    dropRole: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    selectedOfficer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
        position: 'absolute',
        top: 6,
        left: 12,
    },
    selectedName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginTop: 10,
        flex: 1,
    },
    changeBtn: {
        color: colors.danger,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 10,
    },
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateText: {
        fontSize: 16,
        color: colors.text,
        marginLeft: 12,
        fontWeight: '600',
    },
    quickAddBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    quickAddText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    searchBarActive: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    dropdownHeader: {
        padding: 10,
        backgroundColor: colors.background,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownHeaderText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    closeDropdown: {
        color: colors.danger,
        fontSize: 10,
        fontWeight: '800',
    },
    taskBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    taskBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 30,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    modalForm: {
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 15,
        letterSpacing: 0.5,
    },
    modalInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    modalSubmit: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    modalSubmitText: {
        color: colors.surface,
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 1,
    },
    deptToggle: {
        flexDirection: 'row',
        gap: 10,
    },
    deptBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    deptBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    deptBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    deptBtnActiveText: {
        color: colors.surface,
    }
});

export default CreateTask;
