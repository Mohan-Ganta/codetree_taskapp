import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, Linking, Modal, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { colors } from '../../theme/colors';
import { useAppContext } from '../../context/AppContext';
import { Calendar, Clock, User, Check, X, Video, ExternalLink, CalendarClock } from 'lucide-react-native';

const AppointmentManagement = ({ route }) => {
    const { appointments, updateAppointmentStatus } = useAppContext();
    const [activeTab, setActiveTab] = useState(route?.params?.activeTab || 'Pending'); // 'Pending', 'Today', 'Future'
    
    // Modal state
    const [slotModalVisible, setSlotModalVisible] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);

    // Update tab if navigated from dashboard with specific param
    React.useEffect(() => {
        if (route?.params?.activeTab) {
            setActiveTab(route.params.activeTab);
        }
    }, [route?.params?.activeTab]);

    // Correctly get local date string (YYYY-MM-DD)
    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString();

    const filteredAppointments = useMemo(() => {
        if (activeTab === 'Pending') {
            return appointments.filter(a => a.status === 'Pending');
        } else if (activeTab === 'Today') {
            return appointments.filter(a => a.status === 'Scheduled' && a.date === todayStr);
        } else if (activeTab === 'Future') {
            return appointments.filter(a => a.status === 'Scheduled' && a.date > todayStr);
        } else if (activeTab === 'History') {
            return appointments.filter(a => (a.status === 'Scheduled' && a.date < todayStr) || a.status === 'Rejected');
        }
        return [];
    }, [appointments, activeTab, todayStr]);

    const handleAccept = async (item) => {
        setSelectedItem(item);
        setLoadingSlots(true);
        setSlotModalVisible(true);
        
        try {
            const apiBase = process.env.EXPO_PUBLIC_API_URL || 'https://codetree.ctapps.in/api';
            const res = await axios.get(`${apiBase}/appointments/slots?date=${item.date}`);
            setAvailableSlots(res.data);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not fetch available slots.');
            setSlotModalVisible(false);
        } finally {
            setLoadingSlots(false);
        }
    };

    const confirmSlot = async (slot) => {
        setSlotModalVisible(false);
        const success = await updateAppointmentStatus(selectedItem.id || selectedItem._id, 'Scheduled', '', slot);
        if (success) {
            Alert.alert('Success', `Appointment confirmed for ${slot}. Google Meet link and invitation have been sent to the applicant.`);
        }
    };

    const handleReject = (item) => {
        Alert.alert(
            'Confirm Reject',
            `Are you sure you want to reject this appointment request? No email will be sent.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reject', style: 'destructive', onPress: () => updateAppointmentStatus(item.id || item._id, 'Rejected') }
            ]
        );
    };

    // State for expanded descriptions
    const [expandedItems, setExpandedItems] = useState({});

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardBody}>
                <View style={styles.cardLeft}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                    </View>

                    <View style={styles.dateTimeRow}>
                        <View style={styles.infoItem}>
                            <Calendar size={14} color={colors.primary} />
                            <Text style={styles.infoText}>{item.date}</Text>
                        </View>
                        <View style={[styles.infoItem, { marginLeft: 15 }]}>
                            <Clock size={14} color={colors.primary} />
                            <Text style={styles.infoText}>{item.time || 'SLOT PENDING'}</Text>
                        </View>
                    </View>

                    <Text 
                        style={styles.subjectListText} 
                        numberOfLines={expandedItems[item.id || item._id] ? undefined : 2}
                    >
                        {item.subject}
                    </Text>
                    
                    <TouchableOpacity onPress={() => toggleExpand(item.id || item._id)} style={styles.viewMoreBtn}>
                        <Text style={styles.viewMoreText}>
                            {expandedItems[item.id || item._id] ? "Hide Details" : "View Details"}
                        </Text>
                    </TouchableOpacity>

                    {item.idProofUrl && expandedItems[item.id || item._id] && (
                        <TouchableOpacity 
                            style={styles.idProofBtn}
                            onPress={() => {
                                const url = `${(process.env.EXPO_PUBLIC_API_URL || 'https://codetree.ctapps.in/api').replace('/api', '')}${item.idProofUrl}`;
                                Linking.openURL(url);
                            }}
                        >
                            <ExternalLink size={14} color={colors.primary} />
                            <Text style={styles.idProofText}>VIEW ID PROOF</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.cardRight}>
                    {item.status === 'Scheduled' ? (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Check size={12} color={colors.success} />
                            <Text style={[styles.statusBadgeText, { color: colors.success }]}>CONFIRMED</Text>
                        </View>
                    ) : item.status === 'Pending' ? (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <Clock size={12} color={colors.warning} />
                            <Text style={[styles.statusBadgeText, { color: colors.warning }]}>PENDING</Text>
                        </View>
                    ) : (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <X size={12} color={colors.danger} />
                            <Text style={[styles.statusBadgeText, { color: colors.danger }]}>REJECTED</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Actions Bottom Row */}
            <View style={styles.cardFooter}>
                {item.status === 'Scheduled' ? (
                    <TouchableOpacity
                        style={styles.meetBtn}
                        onPress={() => item.meetLink && Linking.openURL(item.meetLink)}
                    >
                        <Video size={18} color={colors.surface} />
                        <Text style={styles.meetBtnText}>JOIN GOOGLE MEET</Text>
                        <ExternalLink size={14} color={colors.surface} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                ) : item.status === 'Pending' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleReject(item)}
                        >
                            <X size={18} color={colors.danger} />
                            <Text style={styles.rejectBtnText}>REJECT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => handleAccept(item)}
                        >
                            <Check size={18} color={colors.surface} />
                            <Text style={styles.acceptBtnText}>ACCEPT</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                {['Pending', 'Today', 'Future', 'History'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                        {tab === 'Pending' && appointments.filter(a => a.status === 'Pending').length > 0 && (
                            <View style={styles.dot} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredAppointments}
                renderItem={renderItem}
                keyExtractor={item => (item.id || item._id).toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Calendar size={60} color={colors.border} />
                        <Text style={styles.emptyText}>No appointments found.</Text>
                    </View>
                }
            />

            {/* Slot Selection Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={slotModalVisible}
                onRequestClose={() => setSlotModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <CalendarClock size={24} color={colors.primary} />
                            <Text style={styles.modalTitle}>Assign Time Slot</Text>
                            <TouchableOpacity onPress={() => setSlotModalVisible(false)} style={styles.closeBtn}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalSubHeader}>
                            <Text style={styles.modalSubTitle}>{selectedItem?.date}</Text>
                            <Text style={styles.modalDesc}>Select a 5-minute meeting slot (4 PM - 5 PM window)</Text>
                        </View>

                        {loadingSlots ? (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={styles.loadingText}>Fetching available slots...</Text>
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={styles.slotsGrid}>
                                {availableSlots.length > 0 ? (
                                    availableSlots.map((slot, index) => (
                                        <TouchableOpacity 
                                            key={index} 
                                            style={styles.slotItem}
                                            onPress={() => confirmSlot(slot)}
                                        >
                                            <Text style={styles.slotText}>{slot}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noSlotsText}>All slots are booked for this day.</Text>
                                )}
                            </ScrollView>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.cancelModalBtn}
                            onPress={() => setSlotModalVisible(false)}
                        >
                            <Text style={styles.cancelModalBtnText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        marginHorizontal: 5,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.surface,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.danger,
        marginLeft: 5,
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardBody: {
        flexDirection: 'row',
    },
    cardLeft: {
        flex: 1,
        paddingRight: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    subjectListText: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 18,
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        marginLeft: 4,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
        marginLeft: 5,
    },
    cardFooter: {
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    rejectBtn: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.danger,
    },
    acceptBtn: {
        backgroundColor: colors.primary,
    },
    rejectBtnText: {
        color: colors.danger,
        fontWeight: '800',
        fontSize: 13,
        marginLeft: 8,
    },
    acceptBtnText: {
        color: colors.surface,
        fontWeight: '800',
        fontSize: 13,
        marginLeft: 8,
    },
    viewMoreBtn: {
        marginTop: 4,
        paddingVertical: 4,
    },
    viewMoreText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    idProofBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(0, 51, 102, 0.05)',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    idProofText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.primary,
        marginLeft: 6,
    },
    meetBtn: {
        backgroundColor: colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
    },
    meetBtnText: {
        color: colors.surface,
        fontWeight: '900',
        fontSize: 13,
        marginLeft: 10,
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 20,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
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
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginLeft: 12,
        flex: 1,
    },
    closeBtn: {
        padding: 5,
    },
    modalSubHeader: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 15,
    },
    modalSubTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    modalDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    loaderContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        color: colors.textSecondary,
        fontSize: 14,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    slotItem: {
        width: '48%',
        backgroundColor: colors.background,
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    slotText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    noSlotsText: {
        width: '100%',
        textAlign: 'center',
        color: colors.danger,
        padding: 20,
        fontWeight: '600',
    },
    cancelModalBtn: {
        marginTop: 10,
        padding: 15,
        alignItems: 'center',
    },
    cancelModalBtnText: {
        color: colors.textSecondary,
        fontWeight: '800',
        letterSpacing: 1,
    }
});

export default AppointmentManagement;
