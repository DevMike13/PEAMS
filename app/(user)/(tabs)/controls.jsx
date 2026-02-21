import { StyleSheet, Text, View, Image, ScrollView, FlatList, TouchableOpacity, Dimensions, Switch, Modal, TextInput, Animated } from 'react-native'
import { useEffect, useState, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { realtimeDB } from '../../../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ToastManager, { Toast } from 'toastify-react-native';

import { images } from '../../../constants';

const { width } = Dimensions.get('window');
const tabList = ['Temp. Control', 'Light Control'];


const ControlScreen = () => {
  const [activeTab, setActiveTab] = useState(tabList[0]);
  const [minTemp, setMinTemp] = useState(null);
  const [maxTemp, setMaxTemp] = useState(null);
  const [currentTemp, setCurrentTemp] = useState(null);
  
  const [heaterStatus, setHeaterStatus] = useState(null);
  const [fanStatus, setFanStatus] = useState(null);
  const [controlMode, setControlMode] = useState(null);

  const [lightStatus, setLightStatus] = useState(null);
  const [lightMode, setLightMode] = useState(null);

  useEffect(() => {
    const minTempRef = ref(realtimeDB, 'Temperature/Min');
    const maxTempRef = ref(realtimeDB, 'Temperature/Max');
    const currentTempRef = ref(realtimeDB, 'Temperature/SensorValue');

    const heaterStatusRef = ref(realtimeDB, 'ManualControls/Heater');
    const fanStatusRef = ref(realtimeDB, 'ManualControls/Fan');
    const controlModeRef = ref(realtimeDB, 'ManualControls/Mode');

    const lightStatusRef = ref(realtimeDB, 'ManualControls/Light/LightStatus');
    const lightModeRef = ref(realtimeDB, 'ManualControls/Light/Mode');

    const unsubMinTemp = onValue(minTempRef, snapshot => {
      if (snapshot.exists()) setMinTemp(snapshot.val());
    });
    const unsubMaxTemp = onValue(maxTempRef, snapshot => {
      if (snapshot.exists()) setMaxTemp(snapshot.val());
    });
    const unsubCurrentTemp = onValue(currentTempRef, snapshot => {
      if (snapshot.exists()) setCurrentTemp(snapshot.val());
    });

    const unsubHeaterStatus = onValue(heaterStatusRef, snapshot => {
      if (snapshot.exists()) setHeaterStatus(snapshot.val());
    });
    const unsubFanStatus = onValue(fanStatusRef, snapshot => {
      if (snapshot.exists()) setFanStatus(snapshot.val());
    });
    const unsubControlMode = onValue(controlModeRef, snapshot => {
      if (snapshot.exists()) setControlMode(snapshot.val());
    });

    const unsubLightStatus = onValue(lightStatusRef, snapshot => {
      if (snapshot.exists()) setLightStatus(snapshot.val());
    });
    const unsubLightMode = onValue(lightModeRef, snapshot => {
      if (snapshot.exists()) setLightMode(snapshot.val());
    });

    return () => {
      unsubMinTemp();
      unsubMaxTemp();
      unsubCurrentTemp();

      unsubHeaterStatus();
      unsubFanStatus();
      unsubControlMode();

      unsubLightStatus();
      unsubLightMode();
    };
  }, []);

  const toggleHeater = () => {
    if (controlMode !== 'OFF') {
      
      Toast.show({
          type: 'error',
          text1: 'Warning!',
          text2: 'Please switch Control Mode to Manual first.',
          visibilityTime: 4000,
      });
      
      return;
    }
    const newStatus = heaterStatus === 'ON' ? 'OFF' : 'ON';
    set(ref(realtimeDB, 'ManualControls/Heater'), newStatus);
  };

  const toggleFan = () => {
    if (controlMode !== 'OFF') {
      Toast.show({
        type: 'error',
        text1: 'Warning!',
        text2: 'Please switch Control Mode to Manual first.',
        visibilityTime: 4000,
      });
      return;
    }
    const newStatus = fanStatus === 'ON' ? 'OFF' : 'ON';
    set(ref(realtimeDB, 'ManualControls/Fan'), newStatus);
  };

  const toggleControlMode = () => {
    const newStatus = controlMode === 'ON' ? 'OFF' : 'ON';
    set(ref(realtimeDB, 'ManualControls/Mode'), newStatus);
  };


  const toggleLight = () => {
    if (lightMode !== 'OFF') {
      Toast.show({
        type: 'error',
        text1: 'Warning!',
        text2: 'Please switch Control Mode to Manual first.',
        visibilityTime: 4000,
      });
      return;
    }
    const newStatus = lightStatus === 'ON' ? 'OFF' : 'ON';
    set(ref(realtimeDB, 'ManualControls/Light/LightStatus'), newStatus);
  };

  const toggleLightMode = () => {
    const newStatus = lightMode === 'ON' ? 'OFF' : 'ON';
    set(ref(realtimeDB, 'ManualControls/Light/Mode'), newStatus);
  };

  const renderContent = () => {
      if (activeTab === 'Temp. Control') {
        return (
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Temperature Control</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.tempInfoContainer}>
                <Text style={styles.tempValueText}>Current Temperatue: {parseFloat(currentTemp).toFixed(2)} °C</Text>
                <View style={styles.divider}></View>
                <Text style={styles.tempValueTextRange}>Recommended Range: <Text style={{ color: 'green'}}>{parseFloat(minTemp).toFixed(0)}°C - {parseFloat(maxTemp).toFixed(0)}°C</Text></Text>
              </View>
              <View style={styles.modeDivider}></View>
              {/* 🔥 Manual Mode Toggle */}
              <View style={styles.modeContainer}>
                <Text style={styles.modeLabel}>Control Mode:</Text>
                <Text style={[
                  styles.modeValue,
                  controlMode === "ON"
                    ? { backgroundColor: 'blue', color: 'white' }
                    : { backgroundColor: '#e5e7eb', color: '#333' }
                ]}>
                  {controlMode==="ON" ? "Auto" : "Manual"}
                </Text>
                <Switch
                  value={controlMode === 'ON'}
                  onValueChange={toggleControlMode}
                  trackColor={{ false: '#ccc', true: '#4b90df' }}
                  thumbColor={controlMode === 'ON' ? '#255ba0' : '#f4f3f4'}
                  style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
                />
              </View>
              <View style={styles.modeDivider}></View>

              <View style={styles.toggleContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                    <Ionicons name="bonfire" size={34} color="#FF6A00" />
                    <Text style={styles.toggleTitle}>Heater: </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                    <Text style={[
                      styles.modeValue,
                      heaterStatus === "ON"
                        ? { backgroundColor: 'green', color: 'white' }
                        : { backgroundColor: 'red', color: 'white' }
                    ]}>
                      {heaterStatus}
                    </Text>
                    <Switch
                      value={heaterStatus === 'ON'}
                      onValueChange={toggleHeater}
                      trackColor={{ false: '#ccc', true: 'green' }}
                      thumbColor={heaterStatus === 'ON' ? '#255ba0' : '#f4f3f4'}
                      style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
                    />
                  </View>
              </View>
              <View style={styles.toggleContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                    <Ionicons name="aperture" size={34} color="white" />
                    <Text style={styles.toggleTitle}>Fan: </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                    <Text style={[
                      styles.modeValue,
                      fanStatus === "ON"
                        ? { backgroundColor: 'green', color: 'white' }
                        : { backgroundColor: 'red', color: 'white' }
                    ]}>
                      {fanStatus}
                    </Text>
                    <Switch
                      value={fanStatus === 'ON'}
                      onValueChange={toggleFan}
                      trackColor={{ false: '#ccc', true: 'green' }}
                      thumbColor={fanStatus === 'ON' ? '#255ba0' : '#f4f3f4'}
                      style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
                    />
                  </View>
              </View>
            </View>
          </View>
        );
      }
      
      if (activeTab === 'Light Control') {
        return (
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Light Control</Text>
            </View>
            <View style={styles.content}>
              {/* 🔥 Manual Mode Toggle */}
              <View style={styles.modeContainer}>
                <Text style={styles.modeLabel}>Light Mode:</Text>
                <Text style={[
                  styles.modeValue,
                  lightMode === "ON"
                    ? { backgroundColor: 'blue', color: 'white' }
                    : { backgroundColor: '#e5e7eb', color: '#333' }
                ]}>
                  {lightMode==="ON" ? "Auto" : "Manual"}
                </Text>
                <Switch
                  value={lightMode === 'ON'}
                  onValueChange={toggleLightMode}
                  trackColor={{ false: '#ccc', true: '#4b90df' }}
                  thumbColor={lightMode === 'ON' ? '#255ba0' : '#f4f3f4'}
                  style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
                />
              </View>
              <View style={styles.modeDivider}></View>

              <View style={styles.toggleContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                    <Ionicons name="bulb" size={34} color="#fff" />
                    <Text style={styles.toggleTitle}>Light: </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                    <Text style={[
                      styles.modeValue,
                      lightStatus === "ON"
                        ? { backgroundColor: 'green', color: 'white' }
                        : { backgroundColor: 'red', color: 'white' }
                    ]}>
                      {lightStatus}
                    </Text>
                    <Switch
                      value={lightStatus === 'ON'}
                      onValueChange={toggleLight}
                      trackColor={{ false: '#ccc', true: 'green' }}
                      thumbColor={lightStatus === 'ON' ? '#255ba0' : '#f4f3f4'}
                      style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
                    />
                  </View>
              </View>
            </View>
          </View>
        );
      }
  
      return null;
  };
  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabList.map((item) => (
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
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
      <ToastManager
        theme='light'
        showProgressBar={true}
        showCloseIcon={true}
        animationStyle='fade'
      />
    </View>
  )
}

export default ControlScreen

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    flexGrow: 1
  },

  // TAB
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
    marginHorizontal: 20
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

  // RENDER CONTENT
  innerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
    width: '100%',
    height: 'auto',
    borderRadius: 30,
    paddingBottom: 20
  },
  header:{
    backgroundColor: '#4b90df',
    height: 70,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 0
  },
  headerTitle:{
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: 'white'
  },

  // Render Content
  content:{
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  tempInfoContainer:{
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 20
  },
  tempValueText:{
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    textAlign: 'center'
  },
  divider:{
    width: '90%',
    height: 1,
    backgroundColor: '#000',
    marginHorizontal: 'auto',
    marginVertical: 8
  },
  tempValueTextRange:{
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    textAlign: 'center'
  },

  // MODE
  modeDivider:{
    width: '100%',
    height: 1,
    backgroundColor: '#000',
    marginHorizontal: 'auto',
    marginVertical: 8
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 15,
    paddingHorizontal: 10
  },
  modeValue:{
    fontFamily: 'Inter-Medium-Italic',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10
  },
  modeLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
  },

  // CONTROL
  toggleContainer:{
    width: '100%',
    backgroundColor: '#4b90df',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 20
  },
  toggleTitle:{
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    color: 'white'
  }
})
