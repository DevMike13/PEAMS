import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { usePushNotification } from '../utils/useNotification';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const { user, role, loading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const hasRegisteredToken = useRef(false);

  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),

    "Inter-Black": require("../assets/fonts/Inter-UI-Black.otf"),
    "Inter-Black-Italic": require("../assets/fonts/Inter-UI-BlackItalic.otf"),
    "Inter-Bold": require("../assets/fonts/Inter-UI-Bold.otf"),
    "Inter-Bold-Italic": require("../assets/fonts/Inter-UI-BoldItalic.otf"),
    "Inter-Italic": require("../assets/fonts/Inter-UI-Italic.otf"),
    "Inter-Medium": require("../assets/fonts/Inter-UI-Medium.otf"),
    "Inter-Medium-Italic": require("../assets/fonts/Inter-UI-MediumItalic.otf"),
    "Inter-Regular": require("../assets/fonts/Inter-UI-Regular.otf"),
  });

  // ✅ Grab push notification utils
  const { registerAndStorePushToken, expoPushToken } = usePushNotification();

  // Notification listener (only once)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { temperature } = response.notification.request.content.data;
        if (temperature) {
          console.log(`🌡️ Received push notification with temperature: ${temperature}`);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ✅ Handle auth & token registration
  useEffect(() => {
    if (!hasMounted || loading) return;

    const inPublicRoute = segments[0] === null || segments[0] === 'auth';
    const inAdminRoute = segments[0] === '(admin)';
    const inUserRoute = segments[0] === '(user)';
    const inPendingRoute = segments[0] === 'pending';
    const inOtpRoute = segments[0] === 'auth' && segments[1] === 'otp';
    // const inAdminStart = segments[1] === 'startAdmin';
    // const inUserStart = segments[1] === 'startUser';

    const { isAccepted, isVerified, justLoggedIn, role } = useAuthStore.getState();

    if (!user && !inPublicRoute) {
      router.replace('/auth/login');
      return;
    }

    if (user && !isVerified) {
      if (justLoggedIn) {
        Alert.alert('Email Verification', 'Please verify your email first.');
        useAuthStore.setState({ justLoggedIn: false });
      }
      if (!inOtpRoute) router.replace('/auth/OtpVerification');
      return;
    }

    if (user && isVerified && !isAccepted) {
      if (justLoggedIn) {
        Alert.alert('Pending Approval', 'Your account is awaiting admin approval.');
        useAuthStore.setState({ justLoggedIn: false });
      }
      if (!inPendingRoute) router.replace('/auth/pending');
      return;
    }

    if (user && role) {
      if (inPublicRoute || inPendingRoute || inOtpRoute) {
        router.replace(role === 'admin' ? '/(admin)' : '/(user)');
      } else {
        if (role === 'admin' && !inAdminRoute) router.replace('/(admin)');
        if (role === 'staff' && !inUserRoute) router.replace('/(user)');
      }
    }

    // if (user && role) {
    //   if (justLoggedIn) {
    //     useAuthStore.setState({ justLoggedIn: false });
    //     router.replace(role === 'admin' ? '/startAdmin' : '/startUser');
    //     return;
    //   }
    
    //   const inStartAdmin = segments[0] === 'startAdmin';
    //   const inStartUser = segments[0] === 'startUser';
    
    //   if (role === 'admin') {
    //     if (!inAdminRoute && !inStartAdmin) router.replace('/(admin)/(tabs)');
    //   } else if (role === 'staff') {
    //     if (!inUserRoute && !inStartUser) router.replace('/(user)/(tabs)');
    //   }
    // }
    
    
    // if (user) {
    //   registerAndStorePushToken();
    // }
  }, [segments, user, role, loading, hasMounted]);

  useEffect(() => {
    // if (user) {
      registerAndStorePushToken(); 
    // }
  }, []);

  if (!fontsLoaded && !error) {
    return null;
  }

  if (loading || !hasMounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
