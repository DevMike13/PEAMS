import { Tabs } from 'expo-router';
import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch, 
  doc 
} from 'firebase/firestore';
import { firestoreDB } from '../../firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Text, View, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { images } from '../../constants';
import LottieView from 'lottie-react-native';

export default function AdminTabsLayout() {
  const [notifications, setNotifications] = useState([]);
  const [userStatus, setUserStatus] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user } = useAuthStore();

  useEffect(() => {
    const q = query(
      collection(firestoreDB, 'notifications'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(notifList);
    });

    return () => unsubscribe();
  }, []);

  /* ===============================
     LISTEN TO USER READ STATUS
  =============================== */
  useEffect(() => {
    if (!user) return;

    const statusRef = collection(
      firestoreDB,
      'users',
      user.uid,
      'notificationStatus'
    );

    const unsubscribe = onSnapshot(statusRef, (snapshot) => {
      const statusMap = {};
      snapshot.docs.forEach(doc => {
        statusMap[doc.id] = doc.data();
      });

      setUserStatus(statusMap);
    });

    return () => unsubscribe();
  }, [user]);

  /* ===============================
     COMPUTE UNREAD COUNT
  =============================== */
  useEffect(() => {
    const unread = notifications.filter(
      n => !userStatus[n.id]?.isViewed
    ).length;

    setUnreadCount(unread);
  }, [notifications, userStatus]);

  /* ===============================
     MARK AS VIEWED (PER USER)
  =============================== */
  const markNotificationsAsViewed = async () => {
    if (!user) return;

    const batch = writeBatch(firestoreDB);

    notifications.forEach(n => {
      if (!userStatus[n.id]?.isViewed) {
        const statusRef = doc(
          firestoreDB,
          'users',
          user.uid,
          'notificationStatus',
          n.id
        );

        batch.set(statusRef, { isViewed: true });
      }
    });

    await batch.commit();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';

    const dateObj = timestamp.toDate();

    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).replace(' ', '');

    return `${formattedDate} - ${formattedTime}`;
  };

  // const NotificationDropdown = () => {
  //   if (!showDropdown) return null;
  //   return (
  //     <View style={styles.dropdown}>
  //       <Text style={styles.dropdownHeaderText}>Notifications</Text>
  //       <View style={{ maxHeight: 240 }}> 
  //         {notifications.length > 0 ? (
  //           <FlatList
  //             data={notifications}
  //             keyExtractor={(item) => item.id}
  //             renderItem={({ item }) => (
  //               <View style={styles.dropdownItem}>
  //                 <Text
  //                   style={[
  //                     styles.dropdownText,
  //                     !item.isViewed && styles.unreadText,
  //                   ]}
  //                 >
  //                   {item.content}
  //                 </Text>
  //                 <Text style={styles.dateText}>{formatDate(item.date)}</Text>
  //               </View>
  //             )}
  //           />
  //         ) : (
  //           <Text style={styles.dropdownText}>No notifications</Text>
  //         )}
  //       </View>
  //     </View>
  //   );
  // };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: '#fff',
            borderTopWidth: 0,
            elevation: 5,
            height: 70,
            marginHorizontal: 10,
            marginBottom:50,
            borderRadius: 60,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
          },
          tabBarShowLabel: false,
          headerStyle: {
            backgroundColor: '#4b90df',
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 20, // helps center vertically
          },
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerContainer}>
              {/* <Image
                source={images.logo}
                style={styles.imageLogo}
                resizeMode="contain"
              /> */}
              <LottieView
                source={images.rooster}
                autoPlay
                loop
                style={{ width: 60, height: 60 }}
              />
              <Text style={styles.appNameText}>PEAMS</Text>
            </View>
          ),
          headerTitleAlign: 'center',
          headerLeft: () => null,
          headerRight: () => (
            <View>
              <TouchableOpacity
                onPress={async () => {
                  const opening = !showDropdown;
                  setShowDropdown(opening);

                  if (opening) {
                    await markNotificationsAsViewed();
                  }
                }}
                style={styles.notificationButton}
              >
                <View style={styles.notificationContainer}>
                  <Ionicons name="notifications-outline" size={26} color="#ffffff" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationCountContainer}>
                      <Text style={styles.notificationCountText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {/* <NotificationDropdown /> */}
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="(tabs)/index"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={26}
                color={focused ? '#007AFF' : '#999'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/controls"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'hand-left' : 'hand-left-outline'}
                size={26}
                color={focused ? '#007AFF' : '#999'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/input"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'file-tray-full' : 'file-tray-full-outline'}
                size={26}
                color={focused ? '#007AFF' : '#999'}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(tabs)/data"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'analytics' : 'analytics-outline'}
                size={30}
                color={focused ? '#007AFF' : '#999'}
              />
            ),
          }}
        />
        
        <Tabs.Screen
          name="(tabs)/menu"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'menu' : 'menu-outline'}
                size={26}
                color={focused ? '#007AFF' : '#999'}
              />
            ),
          }}
        />
      </Tabs>
      {/* ===============================
         NOTIFICATION DROPDOWN
      =============================== */}
      {showDropdown && (
        <View style={styles.dropdownOverlay}>
          <Text style={styles.dropdownHeaderText}>Notifications</Text>

          {notifications.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator>
              {notifications.map(item => {
                const isRead = userStatus[item.id]?.isViewed;

                return (
                  <View key={item.id} style={styles.dropdownItem}>
                    <Text
                      style={[
                        styles.dropdownText,
                        !isRead && styles.unreadText,
                      ]}
                    >
                      {String(item.content)}
                    </Text>
                    <Text style={styles.dateText}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.dropdownText}>
              No notifications
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  imageLogo: {
    width: 36,
    height: 36,
  },
  appNameText: {
    fontFamily: 'Inter-Black',
    fontSize: 18,
    marginLeft: 0,
    color: 'white',
  },
  notificationButton: {
    marginRight: 16,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationCountContainer: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 5,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: 35,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: 300,
    height: 300,         // FIXED height for scroll
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 9999,
    overflow: 'hidden',  // capture scroll gestures
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 80, // just below header
    right: 15,
    width: 300,
    height: 300,         // fixed height for scrolling
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 9999,
  },
  dropdownHeaderText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111',
    marginBottom: 6,
  },
  dropdownItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Inter-Medium',
  },
  unreadText: {
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    fontFamily: 'Inter-Italic',
  },
});
