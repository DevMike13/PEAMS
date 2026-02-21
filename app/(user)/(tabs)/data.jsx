import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { firestoreDB } from '../../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');
const tabList = ['Temp. Stats', 'Mortality Stats'];

const DataScreen = () => {
  const [activeTab, setActiveTab] = useState(tabList[0]);
  const [sensorData, setSensorData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedData, setSelectedData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const [selectedRange, setSelectedRange] = useState('1D'); // '1D', '2D', '3D', 'Custom'
  const [singleDate, setSingleDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [mortalityData, setMortalityData] = useState([]);
  const [filteredMortality, setFilteredMortality] = useState([]);

  // Fetch Firestore data
  useEffect(() => {
    const q = query(collection(firestoreDB, 'sensorData'), orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        // Simplified timestamp parsing
        const ts = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp);

        const temp =
          d.temperature < -50 || d.temperature > 100 ? null : parseFloat(d.temperature.toFixed(2));

        return {
          timestamp: ts,
          temperature: temp,
          label: `${ts.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
          })}-${ts.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true,
          })}`,
        };
      });

      setSensorData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter data based on selected range or custom single date
  useEffect(() => {
    if (!sensorData || sensorData.length === 0) {
      setFilteredData([]);
      return;
    }

    const now = new Date();
    let cutoff;

    if (selectedRange === '1D') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 1); // 1 day ago
      cutoff.setHours(0, 0, 0, 0); // start of day
    } else if (selectedRange === '2D') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 2);
      cutoff.setHours(0, 0, 0, 0);
    } else if (selectedRange === '3D') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 3);
      cutoff.setHours(0, 0, 0, 0);
    } else if (selectedRange === 'Custom') {
      const startOfDay = new Date(singleDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(singleDate);
      endOfDay.setHours(23, 59, 59, 999);

      setFilteredData(
        sensorData.filter((item) => item.timestamp >= startOfDay && item.timestamp <= endOfDay)
      );
      return;
    }

    setFilteredData(sensorData.filter((item) => item.timestamp >= cutoff));
  }, [sensorData, selectedRange, singleDate]);

  const toChartData = () => {
    if (!filteredData || filteredData.length === 0) return [];

    return filteredData
      .filter((item) => item.temperature !== null)
      .map((item) => ({
        value: item.temperature,
        label: item.label ?? '',
        dataPointText: `${item.temperature}°C`,
      }));
  };

  const handlePointPress = (item, title, type) => {
    setSelectedData({ ...item, title, type });
    setModalVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const renderChart = (title, data, color, type) => (
    <View style={styles.chartContainer} key={title}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={data}
        width={width * 0.9}
        height={220}
        color1={color}
        curved
        areaChart
        startFillColor={`${color}55`}
        thickness={4}
        hideDataPoints={false}
        pressPointEnabled
        focusEnabled
        dataPointsRadius={8}
        focusedDataPointRadius={6}
        focusedDataPointColor={color}
        showValuesAsDataPointsText
        textColor1="#000"
        textShiftY={30}
        textShiftX={-5}
        textFontSize={12}
        spacing={75}
        isAnimated
        onPress={(item) => handlePointPress(item, title, type)}
        xAxisLabelRotation={45}
        xAxisLabelTextStyle={{ color: '#000', fontSize: 8, fontWeight: 'bold', marginLeft: 10 }}
        yAxisTextStyle={{ color: '#000', fontSize: 10 }}
        noOfSections={5}
      />
    </View>
  );

  useEffect(() => {
    const q = query(collection(firestoreDB, 'cycles'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,               // ← THIS is cycleId
        cycleNo: doc.data().cycleNo,
        status: doc.data().status,
      }));

      setCycles(data);

      // Auto-select first cycle
      const runningCycle = data.find((c) => c.status === 'running');
      if (runningCycle) {
        setSelectedCycleId(runningCycle.id);
      } else if (data.length > 0) {
        setSelectedCycleId(data[0].id);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedCycleId) return;

    const q = query(
      collection(firestoreDB, 'cycleMortality'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => {
          const d = doc.data();
          return {
            cycleId: d.cycleId,
            count: d.count,
            ageStage: d.ageStage,
            date: d.date?.toDate ? d.date.toDate() : new Date(d.date),
          };
        })
        .filter((item) => item.cycleId === selectedCycleId);

      setMortalityData(data);
    });

    return () => unsubscribe();
  }, [selectedCycleId]);

  const toMortalityChartData = () => {
    if (!mortalityData || mortalityData.length === 0) return [];

    return mortalityData.map((item) => {
      const formattedDate = item.date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });

      return {
        value: item.count,
        label: `${formattedDate}-(${item.ageStage})`,
        dataPointText: `${item.count}`,
      };
    });
  };

  const getMortalityPieData = () => {
    if (!mortalityData || mortalityData.length === 0) return [];

    // Group counts by ageStage
    const grouped = mortalityData.reduce((acc, item) => {
      const stage = item.ageStage || 'Unknown';

      if (!acc[stage]) {
        acc[stage] = 0;
      }

      acc[stage] += Number(item.count || 0);

      return acc;
    }, {});

    // Convert to PieChart format
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

    return Object.keys(grouped).map((stage, index) => ({
      value: grouped[stage],
      text: stage,
      color: colors[index % colors.length],
    }));
  };

  const renderDot = (color) => (
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: color,
        marginRight: 6,
      }}
    />
  );

  const renderLegendComponent = (pieData) => {
    const rows = [];
    for (let i = 0; i < pieData.length; i += 2) {
      rows.push(
        <View
          key={i}
          style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}
        >
          {pieData.slice(i, i + 2).map((item, index) => (
            <View
              key={index}
              style={{ flexDirection: 'row', alignItems: 'center', width: 140, marginRight: 20 }}
            >
              {renderDot(item.color)}
              <Text style={{ color: '#000', fontFamily: 'Inter-Medium-Italic', fontSize: 12 }}>
                ({item.text}): <Text style={{ color: '#000', fontFamily: 'Inter-Bold-Italic', fontSize: 14 }}>{item.value} Total Mortality</Text>
              </Text>
            </View>
          ))}
        </View>
      );
    }
    return <>{rows}</>;
  };

  const renderMortalityPieChart = () => {
    const pieData = getMortalityPieData();

    if (pieData.length === 0) {
      return <Text style={styles.noData}>No mortality data found</Text>;
    }

    return (
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Text style={styles.title}>Mortality by Age Stage</Text>

        <PieChart
          data={pieData}
          donut
          showText={false} // remove labels from slices
          radius={120}
          innerRadius={70}
          focusOnPress
          showValuesAsLabels={false} // optional, remove numbers inside slices
          centerLabelComponent={() => {
            const total = pieData.reduce((sum, item) => sum + item.value, 0);
            return (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: 'bold', fontFamily: 'Inter-Bold' }}>
                  {total}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'Inter-Bold-Italic' }}>Total</Text>
              </View>
            );
          }}
        />

        {renderLegendComponent(pieData)}
      </View>
    );
  };

  const renderContent = () => {
    if (activeTab === 'Temp. Stats') {
      return (
        <>
          <Text style={styles.title}>Temperature History</Text>
          <View style={styles.rangeContainer}>
            {['1D', '2D', '3D', 'Custom'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.rangeButton,
                  selectedRange === r && styles.activeRangeButton,
                ]}
                onPress={() => setSelectedRange(r)}
              >
                <Text
                  style={[
                    styles.rangeText,
                    selectedRange === r && styles.activeRangeText,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedRange === 'Custom' && (
            <TouchableOpacity
              style={styles.dateButtonModern}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.dateTextModern}>
                {singleDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          )}

          {showPicker && (
            <DateTimePicker
              value={singleDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowPicker(false);
                if (date) setSingleDate(date);
              }}
            />
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#3b82f6"
              style={{ marginTop: 40 }}
            />
          ) : filteredData.length === 0 ? (
            <Text style={styles.noData}>No temperature data found</Text>
          ) : (
            renderChart('Temperature (°C)', toChartData(), '#3b82f6', 'temperature')
          )}
        </>
      );
    }

    if (activeTab === 'Mortality Stats') {
      return (
        <>
          <Text style={styles.title}>Mortality History</Text>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Select Cycle</Text>

            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedCycleId}
                onValueChange={(itemValue) => setSelectedCycleId(itemValue)}
                style={styles.picker}
                dropdownIconColor="#255ba0"
              >
                {cycles.map((cycle) => {
                  const statusLabel =
                    cycle.status === 'running'
                      ? '🟢 Running'
                      : '🔵 Completed';

                  return (
                    <Picker.Item
                      key={cycle.id}
                      label={`Cycle #${cycle.cycleNo}   ${statusLabel}`}
                      value={cycle.id}
                    />
                  );
                })}
              </Picker>
            </View>
          </View>

          {mortalityData.length === 0 ? (
            <Text style={styles.noData}>No mortality data found</Text>
          ) : (
            renderChart('Mortality Count', toMortalityChartData(), '#ef4444', 'mortality')
          )}

          {renderMortalityPieChart()}
        </>
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>

      {/* Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
            {selectedData && (
              <>
                <Text style={styles.modalTitle}>{selectedData.title}</Text>
                <Text style={styles.modalValue}>Value: {selectedData.value}
                  {selectedData.type === 'temperature' ? '°C' : ''}</Text>
                <Text style={styles.modalTime}>{selectedData.label}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(
                      () => setModalVisible(false)
                    );
                  }}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default DataScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { alignItems: 'center', paddingTop: 20, paddingBottom: 160 },
  title: { fontSize: 20, fontFamily: 'Poppins-SemiBold', marginBottom: 10, color: '#000' },
  rangeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' },
  rangeButton: {
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginHorizontal: 6,
    marginBottom: 6,
  },
  activeRangeButton: { backgroundColor: '#1654ff', borderColor: '#1654ff' },
  rangeText: { fontFamily: 'Poppins-SemiBold', color: '#000', fontSize: 14 },
  activeRangeText: { color: '#fff' },
  dateButtonModern: {
    backgroundColor: '#fff',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: '60%',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateTextModern: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#000', marginTop: 3 },
  chartContainer: { marginBottom: 40, alignItems: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '600', marginTop: 10, color: '#fff' },
  noData: { 
    width: '80%',
    fontSize: 16, 
    color: '#999', 
    fontFamily: 'Poppins-SemiBold',
    borderWidth: 1,
    borderColor: '#999',
    borderStyle: 'dashed',
    paddingTop: 30,
    paddingBottom: 25,
    paddingHorizontal: 10,
    borderRadius: 8,
    textAlign: 'center',
    marginVertical: 20,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 10 },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#111' },
  modalValue: { fontSize: 16, marginTop: 10, color: '#3b82f6', fontFamily: 'Poppins-Regular' },
  modalTime: { fontSize: 14, color: '#666', marginTop: 4, fontFamily: 'Poppins-SemiBold' },
  closeButton: { marginTop: 15, backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  closeText: { color: '#fff', fontFamily: 'Poppins-SemiBold' },

  // TAB
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

  // CYCLE FILTER
  dropdownContainer: {
    width: '90%',
    marginBottom: 20,
  },
  dropdownLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 6,
    color: '#000',
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: '#000'
  },
});
