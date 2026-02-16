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

  const renderCycleItem = ({ item }) => {
    const isRunning = item.status === "running";
    return (
      <View
        style={[
          styles.listRow,
          isRunning && {
            backgroundColor: "#d1e7ff",
            borderColor: "#007AFF",
            borderWidth: 1,
          },
        ]}
      >
        <Text style={styles.listText}>
          {moment(item.startDate.toDate ? item.startDate.toDate() : item.startDate).format("DD MMM YYYY")}
        </Text>
        <Text style={styles.listText}>{item.ageStage}</Text>
        <Text style={[styles.listText, { paddingVertical: 2, backgroundColor: "green", color: 'white', borderRadius: 10 }]}>{item.status}</Text>
        <Text style={styles.listText}>{item.chickenQty}</Text>
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      {currentCycle && (
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Current Cycle Info</Text>
          </View>
          <View style={styles.content}>
            <Text>Cycle No: {currentCycle.cycleNo}</Text>
            <Text>Start Date: {moment(currentCycle.startDate.toDate ? currentCycle.startDate.toDate() : currentCycle.startDate).format("DD MMM YYYY")}</Text>
            <Text>Current Day: {currentCycle.currentAge}</Text>
            <Text>Age Stage: {currentCycle.ageStage}</Text>
            <Text>Quantity: {currentCycle.chickenQty}</Text>
            <Text style={{ color: "green", fontWeight: "bold" }}>Status: {currentCycle.status}</Text>
          </View>
        </View>
      )}
      <View style={[styles.listRow, { borderBottomWidth: 1, borderBottomColor: "#ccc" }]}>
        <Text style={[styles.listText, { fontFamily: "Inter-Bold" }]}>Start Date</Text>
        <Text style={[styles.listText, { fontFamily: "Inter-Bold" }]}>Age</Text>
        <Text style={[styles.listText, { fontFamily: "Inter-Bold" }]}>Status</Text>
        <Text style={[styles.listText, { fontFamily: "Inter-Bold" }]}>Qty</Text>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      
        <TouchableOpacity
          style={styles.newEntryBtn}
          onPress={() => setVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.newEntryText}>Create New Cycle</Text>
        </TouchableOpacity>

        <FlatList
          data={cycles}
          keyExtractor={(item) => item.id}
          renderItem={renderCycleItem}
          ListHeaderComponent={renderListHeader}
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
    fontSize: 16,
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
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  listText: {
    flex: 1,
    fontSize: 12,
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
});
