import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync, sendLocalNotification } from '../utils/notifications';

const AppContext = createContext();
// Update the URL below in your .env file located at codetree-taskapp/.env
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://codetree.ctapps.in/api';
console.log('🌐 App using BASE_URL:', BASE_URL);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updateInfo, setUpdateInfo] = useState(null); // { required, message, url }

    // Load User from Storage on boot
    useEffect(() => {
        const loadUser = async () => {
            const storedUser = await AsyncStorage.getItem('codetree_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    // Version check on boot
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const { default: Constants } = await import('expo-constants');
                const currentVersion = Constants.expoConfig?.version || '1.0.0';
                const res = await axios.get(`${BASE_URL}/app-version`);
                const { latestVersion, forceUpdate, updateMessage, androidUrl, iosUrl } = res.data;

                const parseVer = (v) => v.split('.').map(Number);
                const [cMaj, cMin, cPat] = parseVer(currentVersion);
                const [lMaj, lMin, lPat] = parseVer(latestVersion);

                const isOutdated =
                    lMaj > cMaj ||
                    (lMaj === cMaj && lMin > cMin) ||
                    (lMaj === cMaj && lMin === cMin && lPat > cPat);

                if (isOutdated) {
                    const { Platform } = await import('react-native');
                    const storeUrl = Platform.OS === 'ios' ? iosUrl : androidUrl;

                    if (forceUpdate) {
                        // Block the app — show force update screen
                        setUpdateInfo({ required: true, message: updateMessage, url: storeUrl });
                    } else {
                        // Soft update — show an alert with option to dismiss
                        const { Alert } = await import('react-native');
                        Alert.alert(
                            '🚀 Update Available',
                            updateMessage,
                            [
                                { text: 'Later', style: 'cancel' },
                                { text: 'Update Now', onPress: () => { const { Linking } = require('react-native'); Linking.openURL(storeUrl); } }
                            ]
                        );
                    }
                }
            } catch (err) {
                console.log('Version check failed (non-critical):', err.message);
            }
        };
        checkVersion();
    }, []);

    // Sync data and polling
    useEffect(() => {
        let interval;
        if (user) {
            fetchTasks();
            fetchNotifications(); // Initial check
            if (user.role === 'MainOfficer') {
                fetchOfficers();
                fetchAppointments();
            }

            // Background polling for real-time updates every 10 seconds
            interval = setInterval(() => {
                fetchTasks();
                fetchNotifications();
                if (user.role === 'MainOfficer') fetchAppointments();
            }, 10000);
        }
        return () => clearInterval(interval);
    }, [user]);

    // Push Token Sync
    useEffect(() => {
        if (user) {
            const syncToken = async () => {
                try {
                    const token = await registerForPushNotificationsAsync();
                    if (token) {
                        console.log('📡 Syncing Push Token:', token);
                        await axios.put(`${BASE_URL}/auth/push-token`, {
                            userId: user.id || user._id,
                            pushToken: token
                        });
                    }
                } catch (pushErr) {
                    console.log('Push token sync failed (probably simulator or Expo Go):', pushErr.message);
                }
            };
            syncToken();
        }
    }, [user]);

    const normalize = (data) => {
        if (!data) return data;
        if (Array.isArray(data)) return data.map(item => {
            const idValue = item.id || item._id;
            const newItem = { ...item };
            
            if (idValue) {
                newItem._id = idValue.toString();
                const parsed = parseInt(idValue);
                newItem.id = isNaN(parsed) ? null : parsed;
            }

            if (newItem.assignedTo) {
                newItem.assignedToOriginal = newItem.assignedTo;
                newItem.assignedTo = newItem.assignedTo.toString(); 
            }
            return newItem;
        });
        
        const idValue = data.id || data._id;
        const newItem = { ...data };
        if (idValue) {
            newItem._id = idValue.toString();
            const parsed = parseInt(idValue);
            newItem.id = isNaN(parsed) ? null : parsed;
        }
        
        if (newItem.assignedTo) {
            newItem.assignedToOriginal = newItem.assignedTo;
            newItem.assignedTo = newItem.assignedTo.toString();
        }
        return newItem;
    };

    const fetchTasks = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/tasks`);
            setTasks(normalize(res.data));
        } catch (err) {
            console.error('Fetch tasks error:', err);
        }
    };

    const fetchAppointments = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/appointments`);
            setAppointments(normalize(res.data));
        } catch (err) {
            console.error('Fetch appointments error:', err);
        }
    };

    const updateAppointmentStatus = async (id, status, meetLink = '', time = '') => {
        try {
            const res = await axios.put(`${BASE_URL}/appointments/${id}/status`, { status, meetLink, time });
            setAppointments(prev => prev.map(a => (a._id == id || a.id == id) ? normalize(res.data) : a));
            return true;
        } catch (err) {
            console.error('Update appointment error:', err);
            return false;
        }
    };

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await axios.get(`${BASE_URL}/notifications/${user.id}`);
            const newNotes = normalize(res.data);

            for (const note of newNotes) {
                try {
                    // Mark as delivered/read on server instantly
                    const noteId = note.id || note._id;
                    
                    // VALIDATION: Skip if the ID is missing, NaN, or the string 'undefined'
                    if (noteId && noteId !== 'undefined' && noteId !== 'null' && !isNaN(noteId)) {
                        await axios.put(`${BASE_URL}/notifications/${noteId}/read`);
                    } else if (typeof noteId === 'string' && noteId.length > 5) {
                        // Handle potential MongoDB string IDs that fail numeric check
                        await axios.put(`${BASE_URL}/notifications/${noteId}/read`);
                    }
                } catch (noteErr) {
                    console.error('Marking individual notification as read failed:', noteErr.message);
                }
            }
        } catch (err) {
            console.error('Fetch notifications error:', err);
        }
    };

    const fetchOfficers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/officers`);
            setOfficers(normalize(res.data));
        } catch (err) {
            console.error('Fetch officers error:', err);
        }
    };

    const login = async (username, password) => {
        try {
            console.log('🔍 Attempting login to:', `${BASE_URL}/auth/login`);
            const res = await axios.post(`${BASE_URL}/auth/login`, { username, password });
            const userData = normalize(res.data.user);
            setUser(userData);
            await AsyncStorage.setItem('codetree_user', JSON.stringify(userData));
            console.log('✅ Login successful for:', username);
            return true;
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            console.error('❌ Login failed details:', {
                message: errorMsg,
                status: err.response?.status,
                url: `${BASE_URL}/auth/login`,
                data: err.response?.data
            });
            Alert.alert('Login Error', `Unable to connect to server: ${errorMsg}\n\nURL: ${BASE_URL}`);
            return false;
        }
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('codetree_user');
    };

    const addTask = async (taskData) => {
        try {
            if (!user) throw new Error('User not logged in');
            const res = await axios.post(`${BASE_URL}/tasks`, {
                ...taskData,
                createdBy: user.role === 'MainOfficer' ? user.name : 'Principle Secretary'
            });
            const newTask = normalize(res.data);
            setTasks([newTask, ...tasks]);
            return newTask;
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            console.error('❌ Add task failed:', errorMsg);
            Alert.alert('Task Creation Error', errorMsg);
            return null;
        }
    };

    const addDailyUpdate = async (taskId, remark, status) => {
        try {
            const date = new Date().toISOString().split('T')[0];
            const res = await axios.put(`${BASE_URL}/tasks/${taskId}/daily-update`, {
                remark, status, date
            });
            setTasks(prev => prev.map(t => (t._id == taskId || t.id == taskId) ? normalize(res.data) : t));
        } catch (err) {
            console.error('Daily update failed:', err);
        }
    };

    const submitTask = async (taskId) => {
        try {
            const res = await axios.put(`${BASE_URL}/tasks/${taskId}/submit`, { user: user.name });
            setTasks(prev => prev.map(t => (t._id == taskId || t.id == taskId) ? normalize(res.data) : t));
        } catch (err) {
            console.error('Submit task failed:', err);
        }
    };

    const reopenTask = async (taskId, reason) => {
        try {
            const res = await axios.put(`${BASE_URL}/tasks/${taskId}/reopen`, {
                user: user.name,
                reason
            });
            setTasks(prev => prev.map(t => (t._id == taskId || t.id == taskId) ? normalize(res.data) : t));
        } catch (err) {
            console.error('Reopen failed:', err);
        }
    };

    const closeTask = async (taskId, closingRemark) => {
        try {
            const res = await axios.put(`${BASE_URL}/tasks/${taskId}/close`, {
                user: user.name,
                closingRemark
            });
            setTasks(prev => prev.map(t => (t._id == taskId || t.id == taskId) ? normalize(res.data) : t));
        } catch (err) {
            console.error('Close task failed:', err);
        }
    };

    const updateTask = async (taskId, updateData) => {
        try {
            const res = await axios.put(`${BASE_URL}/tasks/${taskId}`, updateData);
            if (res.data) {
                const updated = normalize(res.data);
                setTasks(prev => prev.map(t => (t._id == taskId || t.id == taskId) ? updated : t));
                // Optional: Sync everything to be 100% sure
                await fetchTasks();
                return updated;
            }
            return null;
        } catch (err) {
            console.error('Update task failed:', err.response?.data?.message || err.message);
            return null;
        }
    };

    const addOfficer = async (officerData) => {
        try {
            const res = await axios.post(`${BASE_URL}/officers`, officerData);
            const newOfficer = normalize(res.data);
            setOfficers([...officers, newOfficer]);
            return newOfficer;
        } catch (err) {
            console.error('Add officer failed:', err);
        }
    };

    const changePassword = async (userId, newPassword) => {
        try {
            await axios.post(`${BASE_URL}/auth/change-password`, { userId, newPassword });
            const updatedUser = { ...user, mustChangePassword: false };
            setUser(updatedUser);
            await AsyncStorage.setItem('codetree_user', JSON.stringify(updatedUser));
            return true;
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            console.error('Change password failed:', errorMsg);
            Alert.alert('Change Password Error', errorMsg);
            return false;
        }
    };

    const updateOfficer = async (id, officerData) => {
        try {
            const res = await axios.put(`${BASE_URL}/officers/${id}`, officerData);
            const updated = normalize(res.data);
            setOfficers(prev => prev.map(o => (o._id == id || o.id == id) ? updated : o));
            return true;
        } catch (err) {
            console.error('Update officer failed:', err);
            return false;
        }
    };

    const deleteOfficer = async (id) => {
        try {
            await axios.delete(`${BASE_URL}/officers/${id}`);
            setOfficers(prev => prev.filter(o => o._id !== id.toString() && o.id !== id));
            return true;
        } catch (err) {
            console.error('Delete officer failed:', err);
            return false;
        }
    };

    const forgotPassword = async (email) => {
        try {
            await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
            return true;
        } catch (err) {
            console.error('Forgot password failed:', err);
            return false;
        }
    };

    return (
        <AppContext.Provider value={{
            user, login, logout, changePassword, forgotPassword,
            tasks, addTask, addDailyUpdate, submitTask, reopenTask, closeTask, updateTask, fetchTasks,
            officers, addOfficer, updateOfficer, deleteOfficer,
            appointments, updateAppointmentStatus, fetchAppointments,
            loading, updateInfo
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
