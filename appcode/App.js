import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { LayoutDashboard, ClipboardList, Users, CalendarDays } from 'lucide-react-native';
import { colors } from './src/theme/colors';
import { registerForPushNotificationsAsync } from './src/utils/notifications';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import MainDashboard from './src/screens/MainOfficer/Dashboard';
import OfficerDashboard from './src/screens/Officer/Dashboard';
import TaskList from './src/screens/Shared/TaskList';
import TaskDetail from './src/screens/Shared/TaskDetail';
import OfficerManagement from './src/screens/MainOfficer/OfficerManagement';
import AppointmentManagement from './src/screens/MainOfficer/AppointmentManagement';
import CreateTask from './src/screens/MainOfficer/CreateTask';
import DailyUpdate from './src/screens/Officer/DailyUpdate';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainOfficerTabs = () => (
  <Tab.Navigator screenOptions={{
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
    headerStyle: { backgroundColor: colors.primary, elevation: 0, shadowOpacity: 0 },
    headerTintColor: colors.surface,
    tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  }}>
    <Tab.Screen name="Dashboard" component={MainDashboard} options={{
      tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />
    }} />
    <Tab.Screen name="Tasks" component={TaskList} options={{
      tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />
    }} />
    <Tab.Screen name="Officers" component={OfficerManagement} options={{
      tabBarIcon: ({ color, size }) => <Users size={size} color={color} />
    }} />
    <Tab.Screen name="Appointments" component={AppointmentManagement} options={{
      tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />
    }} />
  </Tab.Navigator>
);

const OfficerTabs = () => (
  <Tab.Navigator screenOptions={{
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
    headerStyle: { backgroundColor: colors.primary, elevation: 0, shadowOpacity: 0 },
    headerTintColor: colors.surface,
    tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  }}>
    <Tab.Screen name="My Dashboard" component={OfficerDashboard} options={{
      tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />
    }} />
    <Tab.Screen name="Tasks" component={TaskList} options={{
      title: 'Tasks',
      tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />
    }} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading, updateInfo } = useAppContext();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Force update — block entire app
  if (updateInfo?.required) {
    return <ForceUpdateScreen updateUrl={updateInfo.url} message={updateInfo.message} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.mustChangePassword ? (
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      ) : user.role === 'MainOfficer' ? (
        <>
          <Stack.Screen name="MainTabs" component={MainOfficerTabs} />
          <Stack.Screen name="CreateTask" component={CreateTask} options={{ presentation: 'modal' }} />
          <Stack.Screen name="TaskDetail" component={TaskDetail} options={{ headerShown: true, title: 'Task Details', headerTintColor: colors.primary }} />
        </>
      ) : (
        <>
          <Stack.Screen name="OfficerTabs" component={OfficerTabs} />
          <Stack.Screen name="TaskDetail" component={TaskDetail} options={{ headerShown: true, title: 'Task Details', headerTintColor: colors.primary }} />
          <Stack.Screen name="DailyUpdate" component={DailyUpdate} options={{ presentation: 'modal' }} />
          <Stack.Screen name="CreateTask" component={CreateTask} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  React.useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <AppProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </AppProvider>
  );
}
