import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { Users, UserPlus, User, ChevronRight, Briefcase, ListTodo, X, Edit2, Trash2, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const OfficerManagement = () => {
    const { officers, addOfficer, updateOfficer, deleteOfficer, tasks } = useAppContext();
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedOfficerId, setSelectedOfficerId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        designation: '',
        department: 'ITE&C',
        email: '',
        phoneNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);

    const filteredOfficers = officers.filter(o =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ name: '', designation: '', department: 'ITE&C', email: '', phoneNumber: '' });
        setModalVisible(true);
    };

    const handleEditPress = (officer) => {
        setIsEditing(true);
        setSelectedOfficerId(officer.id || officer._id);
        setFormData({
            name: officer.name,
            designation: officer.designation,
            department: officer.department || 'ITE&C',
            email: officer.email,
            phoneNumber: officer.phoneNumber
        });
        setModalVisible(true);
    };

    const handleAddOfficer = async () => {
        const { name, designation, email, phoneNumber, department } = formData;
        
        // 1. Basic empty check
        if (!name || !designation || !email || !phoneNumber || !department) {
            return Alert.alert('Error', 'Please fill all mandatory fields');
        }

        // 2. Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Alert.alert('Invalid Email', 'Please enter a valid official email address');
        }

        // 3. Phone validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number');
        }

        setLoading(true);
        let success;
        if (isEditing) {
            success = await updateOfficer(selectedOfficerId, formData);
        } else {
            success = await addOfficer(formData);
        }
        setLoading(false);

        if (success) {
            setModalVisible(false);
            setFormData({ name: '', designation: '', department: 'ITE&C', email: '', phoneNumber: '' });
            Alert.alert('Success', isEditing ? 'Officer updated successfully' : 'Officer created. Login details sent to their email.');
        } else {
            Alert.alert('Error', 'Failed to save officer. This email might already be in use.');
        }
    };

    const handleDeleteOfficer = (id, name) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete officer ${name}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteOfficer(id)
                }
            ]
        );
    };

    const getTaskCount = (officerId) => {
        return tasks.filter(t => t.assignedTo == officerId && t.status !== 'Closed').length;
    };

    const renderItem = ({ item }) => (
        <View style={styles.contactContainer}>
            <TouchableOpacity style={styles.contactItem} activeOpacity={0.7}>
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.contactInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <View style={[styles.deptBadge, { backgroundColor: item.department === 'RTG' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                            <Text style={[styles.deptBadgeText, { color: item.department === 'RTG' ? colors.danger : colors.success }]}>{item.department || 'ITE&C'}</Text>
                        </View>
                    </View>
                    <Text style={styles.contactRole}>{item.designation}</Text>
                    <Text style={styles.contactSubText}>{item.email}</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.actionRow}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{getTaskCount(item.id || item._id)} Active Tasks</Text>
                </View>
                <View style={styles.iconActions}>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => handleEditPress(item)}
                    >
                        <Edit2 size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={() => handleDeleteOfficer(item.id || item._id, item.name)}
                    >
                        <Trash2 size={18} color={colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Officers</Text>
                <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={openAddModal}
                >
                    <UserPlus size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by name or role"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredOfficers}
                renderItem={renderItem}
                keyExtractor={item => (item.id || item._id).toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No officers found</Text>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Edit Officer' : 'Add New Officer'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Ramesh Varma"
                                value={formData.name}
                                onChangeText={(val) => setFormData({ ...formData, name: val })}
                            />

                            <Text style={styles.label}>Designation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Tahshildar"
                                value={formData.designation}
                                onChangeText={(val) => setFormData({ ...formData, designation: val })}
                            />

                            <Text style={styles.label}>Department</Text>
                            <TouchableOpacity 
                                style={styles.dropdown} 
                                onPress={() => setShowDeptDropdown(!showDeptDropdown)}
                            >
                                <Text style={styles.dropdownText}>{formData.department}</Text>
                                <ChevronRight size={18} color={colors.textSecondary} style={{ transform: [{ rotate: showDeptDropdown ? '90deg' : '0deg' }] }} />
                            </TouchableOpacity>
                            
                            {showDeptDropdown && (
                                <View style={styles.dropdownList}>
                                    {['RTG', 'ITE&C'].map(dept => (
                                        <TouchableOpacity 
                                            key={dept} 
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setFormData({ ...formData, department: dept });
                                                setShowDeptDropdown(false);
                                            }}
                                        >
                                            <Text style={[styles.dropdownItemText, formData.department === dept && { color: colors.primary, fontWeight: '800' }]}>{dept}</Text>
                                            {formData.department === dept && <Check size={16} color={colors.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="ramesh@example.com"
                                value={formData.email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={(val) => setFormData({ ...formData, email: val })}
                            />

                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="10-digit mobile number"
                                value={formData.phoneNumber}
                                keyboardType="phone-pad"
                                onChangeText={(val) => setFormData({ ...formData, phoneNumber: val })}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                                onPress={handleAddOfficer}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.surface} />
                                ) : (
                                    <Text style={styles.submitBtnText}>{isEditing ? 'UPDATE OFFICER' : 'CREATE ACCOUNT'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Fixed missing imports from lucide
import { UserPlus as UserPlusIcon } from 'lucide-react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: colors.text,
    },
    headerIconBtn: {
        padding: 8,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    searchBar: {
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: colors.text,
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    contactContainer: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.primary,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    contactRole: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    contactSubText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    iconActions: {
        flexDirection: 'row',
    },
    actionIcon: {
        padding: 8,
        marginLeft: 10,
        backgroundColor: colors.background,
        borderRadius: 10,
    },
    badge: {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '700',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    modalForm: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: colors.text,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: 15,
        padding: 18,
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 10,
        elevation: 4,
    },
    submitBtnText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    deptBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    deptBadgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    dropdown: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '600',
    },
    dropdownList: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        marginTop: 4,
        overflow: 'hidden',
    },
    dropdownItem: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownItemText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});

export default OfficerManagement;
