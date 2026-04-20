import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showBadge: true,
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get notification permissions!');
            return;
        }

        try {
            // Remote token registration (getExpoPushTokenAsync) is not supported in Expo Go for SDK 53+.
            // This is only for remote push notifications. Local ones work fine.
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig.extra.eas.projectId,
            })).data;
        } catch (e) {
            console.log('Skipping remote token (not supported in Expo Go)');
        }
    } else {
        console.log('Must use physical device for some notification features');
    }

    return token;
}

export async function sendLocalNotification(title, body) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { data: 'goes here' },
        },
        trigger: null, // Send immediately
    });
}

// Set how alerts should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});
