import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Modal,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { images } from '../../../constants';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestoreDB } from '../../../firebase';
import { useRouter } from 'expo-router';

export default function MenuScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const user = useAuthStore((state) => state.user);

  const [firestoreUser, setFirestoreUser] = useState(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(firestoreDB, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setFirestoreUser(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  // --- Handle Logout ---
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/'); 
        },
      },
    ]);
  };

  const handleContact = () => {
    Linking.openURL('mailto:peams123@gmail.com?subject=Support Request');
  };

  const handleSettings = () => {
    // router.push('/settings'); 
  };

  const handleCheckUpdates = () => {
    Alert.alert(
      'Check for Updates',
      'You’re already using the latest version',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const openModal = () => {
    setModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const slideUp = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <Image source={images.userIcon} style={styles.avatar} resizeMode="cover" />
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuButton} onPress={openModal}>
          <Text style={styles.menuText}>Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={handleContact}>
          <Text style={styles.menuText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={handleSettings}>
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={handleCheckUpdates}>
          <Text style={styles.menuText}>Check for Updates</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.menuButton, styles.logoutButton]}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Account Info Modal */}
        <Modal transparent visible={isModalVisible} animationType="none">
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ translateY: slideUp }] },
              ]}
            >
              <Text style={styles.modalTitle}>Account Information</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>

                <Text style={styles.infoLabel}>Role:</Text>
                <Text style={styles.infoValue}>{firestoreUser?.role || 'N/A'}</Text>

                <Text style={styles.infoLabel}>Created At:</Text>
                <Text style={styles.infoValue}>
                {firestoreUser?.createdAt
                  ? (() => {
                      const ts = firestoreUser.createdAt;
                      const date =
                        ts.toDate?.() ||
                        (ts.seconds ? new Date(ts.seconds * 1000) : null) || 
                        (typeof ts === 'string' ? new Date(ts) : null); 

                      if (!date || isNaN(date)) return 'N/A';

                      const formatted = date.toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });

                      return formatted.replace(/([A-Za-z]+)(\s)/, '$1. ');
                    })()
                  : 'N/A'}
                </Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    marginTop: 40,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  menuContainer: {
    width: '100%',
    alignItems: 'center',
  },
  menuButton: {
    width: '80%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#767577',
    alignItems: 'center',
    marginVertical: 8,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins-SemiBold',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginTop: 16,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#555',
    marginTop: 10,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#767577',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
});
