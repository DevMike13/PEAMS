import { StyleSheet, Text, View, Image, Dimensions, ScrollView, TouchableOpacity, Switch } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import Svg, { Circle, Line, Text as SvgText, Defs, Stop, LinearGradient } from 'react-native-svg';
import { images } from '../../../constants';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, onValue, set } from 'firebase/database';
import { firestoreDB, realtimeDB } from '../../../firebase';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'expo-router';

const { height } = Dimensions.get('window');
const tabs = ['10 Days', 'Optimal'];

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [firestoreUser, setFirestoreUser] = useState(null);
  const user = useAuthStore((state) => state.user);

  const [temperature, setTemperature] = useState(0);
  const [minTemp, setMinTemp] = useState(0);
  const [maxTemp, setMaxTemp] = useState(100);
  const [tempStatus, setTempStatus] = useState('Optimal');

  const [isEnabledManual, setIsEnabledManual] = useState(false);
  const [isEnabledHeater, setIsEnabledHeater] = useState(false);
  const [isEnabledFan, setIsEnabledFan] = useState(false);

  useEffect(() => {
    const tempRef = ref(realtimeDB, '/Temperature/SensorValue');
    const minRef = ref(realtimeDB, '/Temperature/Min');
    const maxRef = ref(realtimeDB, '/Temperature/Max');

    const unsubTemp = onValue(tempRef, (snap) => {
      const val = snap.val();
      if (val !== null) {
        const temp = parseFloat(val);
        setTemperature(temp.toFixed(2));

        // Determine status
        if (temp < minTemp) setTempStatus('Low');
        else if (temp > maxTemp) setTempStatus('High');
        else setTempStatus('Optimal');
      }
    });

    const unsubMin = onValue(minRef, (snap) => {
      const val = snap.val();
      if (val !== null) setMinTemp(parseFloat(val));
    });

    const unsubMax = onValue(maxRef, (snap) => {
      const val = snap.val();
      if (val !== null) setMaxTemp(parseFloat(val));
    });

    return () => {
      unsubTemp();
      unsubMin();
      unsubMax();
    };
  }, [minTemp, maxTemp]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(firestoreDB, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setFirestoreUser(snap.data());
    });
    return () => unsub();
  }, [user?.uid]);

  const toggleManual = (value) => {
    set(ref(realtimeDB, '/ManualControls/Manual'), value ? 'ON' : 'OFF');
  };

  const toggleHeater = (value) => {
    set(ref(realtimeDB, '/ManualControls/Heater'), value ? 'ON' : 'OFF');
  };

  const toggleFan = (value) => {
    set(ref(realtimeDB, '/ManualControls/Fan'), value ? 'ON' : 'OFF');
  };

  useEffect(() => {
    const manualRef = ref(realtimeDB, '/ManualControls/Manual');
    const heaterRef = ref(realtimeDB, '/ManualControls/Heater');
    const fanRef = ref(realtimeDB, '/ManualControls/Fan');

    const unsubManual = onValue(manualRef, (snapshot) => {
      const value = snapshot.val();
      setIsEnabledManual(value === 'ON');
    });

    const unsubHeater = onValue(heaterRef, (snapshot) => {
      const value = snapshot.val();
      setIsEnabledHeater(value === 'ON');
    });
    const unsubFan = onValue(fanRef, (snapshot) => {
      const value = snapshot.val();
      setIsEnabledFan(value === 'ON');
    });
    
    // Cleanup listeners
    return () => {
      unsubManual();
      unsubHeater();
      unsubFan();
    };
  }, []);

  const getNeedlePosition = (temp) => {
    const radius = 70;
    const angle = Math.PI * (1 - temp / maxTemp); // left (-π) to right (0)
    const x2 = 100 + radius * Math.cos(angle - Math.PI);
    const y2 = 100 + radius * Math.sin(angle - Math.PI);
    return { x2, y2 };
  };

  const needlePos = getNeedlePosition(temperature);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { flexGrow: 1 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greetingText}>Hello, {firestoreUser?.fullname || 'N/A'}!</Text>
        <View style={styles.tabContainer}>
          {tabs.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setActiveTab(item)}
              style={[
                styles.tabButton,
                activeTab === item ? styles.activeTabButton : styles.inactiveTabButton,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === item ? styles.activeTabText : styles.inactiveTabText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.meterContainer}>
          <Svg width="260" height="260" viewBox="0 0 200 200">
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#FF3D00" />
                <Stop offset="33%" stopColor="#FF6A00" />
                <Stop offset="66%" stopColor="#FFA500" />
                <Stop offset="100%" stopColor="#FFD966" />
              </LinearGradient>
            </Defs>

            {/* Background arc */}
            <Circle
              cx="100"
              cy="100"
              r="80"
              stroke="#E5E7EB"
              strokeWidth="15"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * 2 * 0.75 * 80} ${Math.PI * 2 * 0.75 * 80}`} // 270° arc
              transform="rotate(-225 100 100)" // start from top-left
            />

            {/* Progress arc */}
            <Circle
              cx="100"
              cy="100"
              r="80"
              stroke="url(#grad)"
              strokeWidth="15"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${Math.PI * 2 * 0.75 * 80} ${Math.PI * 2 * 0.75 * 80}`}
              transform="rotate(-225 100 100)"
            />

            {/* Needle */}
            {/* <Line
              x1="100"
              y1="100"
              x2={needlePos.x2}
              y2={needlePos.y2}
              stroke="red"
              strokeWidth="3"
            /> */}

            {/* Center dot */}
            {/* <Circle cx="100" cy="100" r="5" fill="red" /> */}

            {/* Temperature text */}
            {/* <SvgText
              x="100"
              y="30"
              textAnchor="middle"
              fontSize="22"
              fontWeight="bold"
              fill="#255ba0"
            >
              {temperature}°C
            </SvgText> */}

            {/* Status text */}
            {/* <SvgText
              x="100"
              y="60"
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill={tempStatus === 'Low' ? '#3B82F6' : tempStatus === 'High' ? '#FF3D00' : '#10B981'}
            >
              {tempStatus}
            </SvgText> */}
          </Svg>

          <View style={styles.centerTextContainer}>
            <Text style={styles.tempValueText}>{temperature}°C</Text>
            <Text style={[
              styles.tempStatusText,
              {
                color:
                  temperature < minTemp ? '#3B82F6' : 
                  temperature > maxTemp ? '#FF3D00' :
                  '#10B981'
              }
            ]}>
              {tempStatus}
            </Text>
          </View>
        </View>

        <View style={styles.controlContainer}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Ionicons name="bonfire" size={26} color="#FF6A00" />
              <Text style={styles.cardTitle}>Heater</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                trackColor={{ isEnabledHeater: '#767577', true: '#19354d' }}
                thumbColor={isEnabledHeater ? 'white' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleHeater}
                value={isEnabledHeater}
                style={styles.switch}
              />
              <Text style={[
                  styles.switchText,
                  {
                    backgroundColor: isEnabledHeater ? '#FF6A00' : '#E5E7EB',
                    color: isEnabledHeater ? 'white' : '#6B7280',
                  },
                ]}
              >
                {isEnabledHeater ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.header}>
              <Ionicons name="aperture" size={26} color="#fff" />
              <Text style={styles.cardTitle}>Fan</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                trackColor={{ isEnabledFan: '#767577', true: '#19354d' }}
                thumbColor={isEnabledFan ? 'white' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleFan}
                value={isEnabledFan}
                style={styles.switch}
              />
              <Text style={[
                  styles.switchText,
                  {
                    backgroundColor: isEnabledFan ? '#FF6A00' : '#E5E7EB',
                    color: isEnabledFan ? 'white' : '#6B7280',
                  },
                ]}
              >
                {isEnabledFan ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    flexGrow: 1
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    height: 'auto',
    padding: 10,
    borderRadius: 20,
  },
  greetingText: {
    fontFamily: 'Inter-Bold',
    color: '#255ba0',
    fontSize: 24
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  activeTabButton: {
    backgroundColor: '#255ba0',
  },
  
  inactiveTabButton: {
    backgroundColor: '#ffffff',
  },
  
  tabText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  
  activeTabText: {
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
  },
  
  inactiveTabText: {
    color: '#6b7280',
  },

  // Meter
  meterContainer: {
    width: '100%',
    height: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
    borderRadius: 10,
    marginVertical: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerTextContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -10 }],
    alignItems: 'center',
  },
  tempValueText:{
    color: '#255ba0',
    fontFamily: 'Inter-Black',
    fontSize: 28
  },
  tempStatusText:{
    fontFamily: 'Inter-Bold',
    fontSize: 20
  },


  // Control
  controlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
  },
  header:{
    backgroundColor: '#255ba0',
    height: 50,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 5
  },
  cardTitle:{
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: 'white'
  },

  switchContainer:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  switch: {
    transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }]
  },
  switchText:{
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    width: 50,
    textAlign: 'center',
    borderRadius: 5,
    paddingVertical: 2,
    marginBottom: -2
  }
});
