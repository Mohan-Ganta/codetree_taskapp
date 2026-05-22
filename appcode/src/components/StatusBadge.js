import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const StatusBadge = ({ status }) => {
    const getStatusStyle = () => {
        if (!status) return { backgroundColor: '#F3F4F6', color: '#374151', label: 'Unknown' };
        switch (status.toLowerCase()) {
            case 'open':
                return { backgroundColor: '#E8F5EE', color: '#1B6B3A', label: 'Open' };
            case 'submitted':
                return { backgroundColor: '#FEF3C7', color: '#92400E', label: 'Request Closed' };
            case 'closed':
                return { backgroundColor: '#D1FAE5', color: '#065F46', label: 'Closed' };
            case 'pending update':
                return { backgroundColor: '#FEE2E2', color: '#991B1B', label: 'Pending Update' };
            default:
                return { backgroundColor: '#F3F4F6', color: '#374151', label: status };
        }
    };

    const style = getStatusStyle();

    return (
        <View style={[styles.badge, { backgroundColor: style.backgroundColor }]}>
            <Text style={[styles.text, { color: style.color }]}>{style.label}</Text>
        </View>
    );
};

export const PriorityBadge = ({ priority }) => {
    const getPriorityStyle = () => {
        if (!priority) return { backgroundColor: '#F3F4F6', color: '#374151' };
        switch (priority.toLowerCase()) {
            case 'high':
                return { backgroundColor: '#FEE2E2', color: '#991B1B' };
            case 'medium':
                return { backgroundColor: '#FEF3C7', color: '#92400E' };
            case 'low':
                return { backgroundColor: '#D1FAE5', color: '#065F46' };
            default:
                return { backgroundColor: '#F3F4F6', color: '#374151' };
        }
    };

    const style = getPriorityStyle();

    return (
        <View style={[styles.badge, { backgroundColor: style.backgroundColor, borderRadius: 4 }]}>
            <Text style={[styles.text, { color: style.color, fontSize: 10 }]}>{priority}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});
