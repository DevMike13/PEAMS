import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  SafeAreaView,
  Modal,
  FlatList,
  ScrollView
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { firestoreDB, realtimeDB } from "../../../firebase";
import { getDatabase, ref, set } from "firebase/database";
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, updateDoc, onSnapshot } from "firebase/firestore";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from "moment";
import ToastManager, { Toast } from 'toastify-react-native';

export default function DailyReport() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingForce, setPendingForce] = useState(false);
  
  const [chickenQty, setChickenQty] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState("");

  const [currentCycle, setCurrentCycle] = useState(null);

  const [mortalityVisible, setMortalityVisible] = useState(false);
  const [mortalityCount, setMortalityCount] = useState("");
  const [mortalityDate, setMortalityDate] = useState(new Date());
  const [showMortalityDatePicker, setShowMortalityDatePicker] = useState(false);
  const [mortalityRecords, setMortalityRecords] = useState([]);
  
  const getAgeStage = (age) => {
    if (age >= 1 && age <= 10) return "1-10";
    if (age >= 11 && age <= 20) return "11-20";
    if (age >= 21 && age <= 30) return "21-30";
    return "completed";
  };

  const createCycle = async (force = false) => {
    try {
      if (!chickenQty || Number(chickenQty) <= 0) {
        Toast.error("Enter valid chicken quantity");
        return;
      }

      const runningQuery = query(
        collection(firestoreDB, "cycles"),
        where("status", "==", "running")
      );

      const runningSnapshot = await getDocs(runningQuery);

      if (!runningSnapshot.empty && !force) {
        setConfirmVisible(true);
        return;
      }

      if (!runningSnapshot.empty && force) {
        const runningDoc = runningSnapshot.docs[0];

        await updateDoc(runningDoc.ref, {
          status: "completed",
          completedAt: Timestamp.now(),
        });
      }

      const allCyclesQuery = query(
        collection(firestoreDB, "cycles"),
        orderBy("cycleNo", "desc")
      );

      const allCyclesSnapshot = await getDocs(allCyclesQuery);

      let nextCycleNo = 1;

      if (!allCyclesSnapshot.empty) {
        nextCycleNo =
          allCyclesSnapshot.docs[0].data().cycleNo + 1;
      }

      const startTimestamp = Timestamp.fromDate(startDate);

      await addDoc(collection(firestoreDB, "cycles"), {
        cycleNo: nextCycleNo,
        chickenQty: Number(chickenQty),
        startDate: startTimestamp,
        endDate: Timestamp.fromDate(
          moment(startDate).add(30, "days").toDate()
        ),
        currentAge: 1,
        ageStage: getAgeStage(1),
        status: "running",
        createdAt: Timestamp.now(),
        notes,
      });

      // Update RTDB
      await set(ref(realtimeDB, "Cycle"), {
        cycleNo: nextCycleNo,
        chickenQty: Number(chickenQty),
        startDate: startTimestamp.toDate().toISOString(),
        endDate: moment(startDate).add(30, "days").toDate().toISOString(),
        currentAge: 1,
        ageStage: getAgeStage(1),
      });

      setVisible(false);
      setConfirmVisible(false);
      setChickenQty("");
      setNotes("");

      Toast.success(`Cycle ${nextCycleNo} created`);

    } catch (error) {
      console.log(error);
      Toast.error("Error creating cycle");
    }
  };

  const addMortalityRecord = async () => {
    try {
      if (!mortalityCount || Number(mortalityCount) <= 0) {
        Toast.error("Enter a valid mortality number");
        return;
      }
      if (!currentCycle) {
        Toast.error("No running cycle found");
        return;
      }

      await addDoc(collection(firestoreDB, "cycleMortality"), {
        cycleId: currentCycle.id,
        count: Number(mortalityCount),
        ageStage: currentCycle.ageStage,
        date: Timestamp.fromDate(mortalityDate),
        createdAt: Timestamp.now(),
      });

      // Reset inputs
      setMortalityCount("");
      setMortalityDate(new Date());
      setMortalityVisible(false);

      Toast.success("Mortality recorded");
    } catch (error) {
      console.log(error);
      Toast.error("Error adding mortality");
    }
  };

  useEffect(() => {
    setLoading(true);

    const q = query(collection(firestoreDB, "cycles"), orderBy("cycleNo", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allCycles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      allCycles.sort((a, b) => {
        if (a.status === "running") return -1;
        if (b.status === "running") return 1;
        return b.cycleNo - a.cycleNo;
      });

      setCycles(allCycles);
      setLoading(false);
    }, (error) => {
      console.log(error);
      Toast.error("Error fetching cycles");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const runningQuery = query(
      collection(firestoreDB, "cycles"),
      where("status", "==", "running")
    );

    const unsubscribe = onSnapshot(runningQuery, (snapshot) => {
      if (!snapshot.empty) {
        // There should be only one running cycle
        setCurrentCycle({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        });
      } else {
        setCurrentCycle(null);
      }
    }, (error) => {
      console.log(error);
      Toast.error("Error fetching running cycle");
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentCycle) {
      setMortalityRecords([]);
      return;
    }

    const q = query(
      collection(firestoreDB, "cycleMortality"),
      where("cycleId", "==", currentCycle.id),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMortalityRecords(records);
    });

    return () => unsubscribe();
  }, [currentCycle]);

  const renderCycleItem = ({ item }) => {
    const isRunning = item.status === "running";
    return (
      <View
        style={[
          styles.listRow,
          isRunning && {
            backgroundColor: "#d1e7ff",
            borderColor: "#007AFF",
          },
        ]}
      >
        <Text style={styles.listText}>{item.cycleNo}</Text>
        <Text style={styles.listText}>
          {moment(item.startDate.toDate ? item.startDate.toDate() : item.startDate).format("DD MMM YYYY")}
        </Text>
        <Text style={styles.listText}>{item.ageStage}</Text>
        <Text style={[styles.listText, { paddingVertical: 2, backgroundColor: item.status === "completed" ? "gray" : "green", color: 'white', borderRadius: 10 }]}>{item.status}</Text>
        <Text style={styles.listText}>{item.chickenQty}</Text>
      </View>
    );
  };

  const renderListHeader = () => {
    if (!currentCycle) return null;

    // Filter mortality for the current cycle
    const currentCycleMortality = mortalityRecords.filter(
      (m) => m.cycleId === currentCycle.id
    );

    // Compute totals per ageStage
    const mortalitySummary = currentCycleMortality.reduce((acc, record) => {
      const stage = record.ageStage;
      if (!acc[stage]) acc[stage] = 0;
      acc[stage] += record.count;
      return acc;
    }, {});

    return (
      <>
        {/* Current Cycle Card */}
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Current Cycle Info</Text>
          </View>
          <View style={styles.content}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: 'center', gap: 5 }}>
                <Text style={{ fontFamily: 'Inter-Medium-Italic' }}>Cycle No: </Text>
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, backgroundColor: 'green', paddingHorizontal: 10, borderRadius: 5, color: 'white' }}>{currentCycle.cycleNo}</Text>
              </View>
              <Text style={{ fontFamily: 'Inter-Medium-Italic' }}>
                Start Date: <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16}}>{moment(currentCycle.startDate.toDate ? currentCycle.startDate.toDate() : currentCycle.startDate).format("DD MMM YYYY")}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}>
              <Text style={{ fontFamily: 'Inter-Medium-Italic', marginTop: 10 }}>
                Current Day: 
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18 }}> {currentCycle.currentAge} </Text>
                <Ionicons name="partly-sunny-outline" size={18} color="orange" />
              </Text>

              <Text style={{ fontFamily: 'Inter-Medium-Italic', marginTop: 6 }}>
                Age Stage: 
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18 }}> {currentCycle.ageStage}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}>
              <Text style={{ fontFamily: 'Inter-Medium-Italic', marginTop: 6 }}>
                Quantity: 
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18 }}> {currentCycle.chickenQty}</Text>
              </Text>
              
              <Text style={{ fontFamily: 'Inter-Medium-Italic', marginTop: 6 }}>
                Status: 
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: 'green' }}>
                  {" " + currentCycle.status.charAt(0).toUpperCase() + currentCycle.status.slice(1)}
                </Text>
              </Text>
            </View>

            <View style={styles.divider}></View>
            {/* Mortality Summary */}
            <View>
              <Text style={{ fontFamily: 'Inter-Bold', textAlign: 'center', marginBottom: 5 }}>Total Mortality by Age Stage</Text>
              <View style={{ flexDirection: "row", backgroundColor: "#f0f0f0", borderWidth: 1, borderTopStartRadius: 10, borderTopRightRadius: 10, borderStyle: 'dashed', paddingVertical: 6 }}>
                <Text style={{ flex: 1, fontFamily: 'Inter-Bold-Italic', textAlign: "center", fontSize: 12 }}>Age Stage</Text>
                <Text style={{ flex: 1, fontFamily: 'Inter-Bold-Italic', textAlign: "center", fontSize: 12 }}>Total Mortality</Text>
              </View>
              {Object.keys(mortalitySummary).length > 0 ? (
                Object.entries(mortalitySummary).map(([stage, total]) => (
                  <View key={stage} style={{ flexDirection: "row", borderWidth: 1, borderBottomStartRadius: 10, borderBottomRightRadius: 10, borderStyle: 'dashed', paddingVertical: 3 }}>
                    <Text style={{ flex: 1, textAlign: "center", fontFamily: 'Inter-Regular' }}>{stage}</Text>
                    <Text style={{ flex: 1, textAlign: "center", fontFamily: 'Inter-Regular' }}>{total} birds</Text>
                  </View>
                ))
              ) : (
                <View style={{ width: '100%', paddingVertical: 10, marginTop: 5, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed' }}>
                  <Text style={{ textAlign: 'center', fontFamily: 'Inter-Italic' }}>No Mortality in Current Cycle</Text>
                </View>
              )}
            </View>

          </View>
        </View>
        
        {/* Table Column Headers */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <Text style={{ fontFamily: 'Inter-Bold-Italic', marginRight: 10 }}>Cycle List</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#000' }} />
        </View>
        
        <View style={[styles.listRowHeader, { backgroundColor: "#f0f0f0", borderWidth: 1, borderTopStartRadius: 10, borderTopRightRadius: 10, borderStyle: 'dashed' }]}>
          <Text style={[styles.listText, { fontFamily: 'Inter-Bold-Italic' }]}>Cycle No.</Text>
          <Text style={[styles.listText, { fontFamily: 'Inter-Bold-Italic' }]}>Start Date</Text>
          <Text style={[styles.listText, { fontFamily: 'Inter-Bold-Italic' }]}>Age</Text>
          <Text style={[styles.listText, { fontFamily: 'Inter-Bold-Italic' }]}>Status</Text>
          <Text style={[styles.listText, { fontFamily: 'Inter-Bold-Italic' }]}>Qty</Text>
        </View>
      </>
    );
  };


  return (
    <View style={{ flex: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}>
          <TouchableOpacity
            style={[styles.newEntryBtn, { flex: 1}]}
            onPress={() => setVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.newEntryText}>Create New Cycle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.newEntryBtn, { flex: 1, backgroundColor: "#ff6347"}]}
            onPress={() => setMortalityVisible(true)}
          >
            <Ionicons name="heart-dislike-outline" size={24} color="#fff" />
            <Text style={styles.newEntryText}>Add Mortality</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cycles}
          keyExtractor={(item) => item.id}
          renderItem={renderCycleItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={() => (
            <View style={{ padding: 20, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 10 }}>
              <Text style={{ fontSize: 14, color: '#666', fontFamily: 'Inter-Italic' }}>No cycles available</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 150 }}
        />

        {/* Modal */}
        <Modal visible={visible} animationType="slide" transparent>
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.title}>Create New Cycle</Text>
              {/* Chicken Quantity */}
              <Text style={styles.label}>Chicken Quantity</Text>
              <TextInput
                placeholderTextColor="#9CA3AF"
                style={styles.dateBox}
                keyboardType="numeric"
                placeholder="Enter number of chickens"
                value={chickenQty}
                onChangeText={setChickenQty}
              />
              {/* Start Date */}
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateBox}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {moment(startDate).format("MMMM DD, YYYY")}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setStartDate(selectedDate);
                    }}
                  />
                )}

                {/* Notes */}
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  placeholderTextColor="#9CA3AF"
                  style={styles.notesBox}
                  multiline
                  placeholder="Enter any notes..."
                  value={notes}
                  onChangeText={setNotes}
                />
            
              {/* Buttons */}
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setVisible(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={() => createCycle(false)}>
                  <Text style={styles.btnTextWhite}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* CONFIRMATION MODAL */}
        <Modal visible={confirmVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.title}>Running Cycle Detected</Text>

              <Text style={{ marginTop: 10, fontFamily: "Inter-Regular" }}>
                This will end the current running cycle.
                {"\n\n"}Do you want to proceed?
              </Text>

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setConfirmVisible(false);
                    setPendingForce(false);
                  }}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: "red" }]}
                  onPress={() => createCycle(true)}
                >
                  <Text style={styles.btnTextWhite}>Proceed</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* MORTALITY MODAL */}
        <Modal visible={mortalityVisible} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modalBox}>
              <Text style={styles.title}>Add Mortality</Text>

              <Text style={styles.label}>Mortality Count</Text>
              <TextInput
                placeholderTextColor="#9CA3AF"
                style={styles.dateBox}
                keyboardType="numeric"
                placeholder="Enter number of birds"
                value={mortalityCount}
                onChangeText={setMortalityCount}
              />

              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateBox}
                onPress={() => setShowMortalityDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {moment(mortalityDate).format("MMMM DD, YYYY")}
                </Text>
              </TouchableOpacity>

              {showMortalityDatePicker && (
                <DateTimePicker
                  value={mortalityDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowMortalityDatePicker(false);
                    if (selectedDate) setMortalityDate(selectedDate);
                  }}
                />
              )}

              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setMortalityVisible(false)}
                >
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={addMortalityRecord}>
                  <Text style={styles.btnTextWhite}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ToastManager
          theme='light'
          showProgressBar={true}
          showCloseIcon={true}
          animationStyle='fade'
        />
      
    </View>
  );
}

const styles = StyleSheet.create({
  newEntryBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    width: "100%",
    marginBottom: 20,
  },
  newEntryText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter-Medium",
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    marginTop: 12,
  },
  dateBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: "#fff",
    color: '#000'
  },
  dateText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Inter-Regular",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: "#fff",
    fontFamily: "Inter-Regular",
  },
  notesBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 5,
    height: 90,
    backgroundColor: "#fff",
    fontFamily: "Inter-Regular",
    color: '#000'
  },
  notesInput: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    height: "100%",
    textAlignVertical: "top",
    fontFamily: "Inter-Regular",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
  btnTextWhite: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Inter-Bold",
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stage: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    textAlign: "center",
  },
  qty: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    marginTop: 4,
    textAlign: "center",
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderWidth: 1, 
    borderBottomStartRadius: 10, 
    borderBottomRightRadius: 10, 
    borderStyle: 'dashed'
  },
  listRowData:{
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  listRowHeader:{
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  listText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter-Regular",
    textAlign: "center",
    textTransform: 'capitalize',
    paddingTop: 3
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
    height: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 0
  },
  headerTitle:{
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: 'white'
  },

  // Render Content
  content:{
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  divider:{
    width: '100%',
    height: 1,
    backgroundColor: '#000',
    marginHorizontal: 'auto',
    marginVertical: 12
  },
});
