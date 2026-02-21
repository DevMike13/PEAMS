import { useState, useRef, useEffect } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { firestoreDB } from '../firebase';
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export const usePushNotification = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldShowBanner: true,
      shouldSetBadge: false,
    }),
  });

  const [expoPushToken, setExpoPushToken] = useState(undefined);
  const [notification, setNotification] = useState(undefined);

  const notificationListener = useRef();
  const responseListener = useRef();

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notification");
        return;
      }

      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      });
    } else {
      alert("Must be using a physical device for Push notifications");
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    setExpoPushToken(token);
    return token;
  }

  useEffect(() => {
    // registerForPushNotificationsAsync().then((token) => {
    //   setExpoPushToken(token);
    // });

    // ✅ New way: subscriptions return objects with .remove()
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
    };
  }, []);

  // Store token in Firestore
  const storeDeviceTokenInFirestore = async (token) => {
    try {
      const tokenString = token.data; // Expo token string
      await AsyncStorage.setItem("expoPushToken", tokenString);
  
      const deviceTokensRef = collection(firestoreDB, "deviceTokens");
      const q = query(deviceTokensRef, where("token", "==", tokenString)); // query on string, not nested field
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        await addDoc(deviceTokensRef, { token: tokenString }); // save only string
        console.log("✅ Device Token stored in Firestore:", tokenString);
      } else {
        console.log("ℹ️ Device Token already exists:", tokenString);
      }
    } catch (error) {
      console.error("❌ Error storing device token in Firestore:", error);
    }
  };
  

  const registerAndStorePushToken = async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      storeDeviceTokenInFirestore(token);
    }
  };

  return {
    expoPushToken,
    notification,
    registerAndStorePushToken,
  };
};