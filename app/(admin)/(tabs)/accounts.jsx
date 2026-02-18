import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { firestoreDB, auth } from "../../../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { deleteUser } from 'firebase/auth';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const ACCOUNTS_LIMIT = 10;

export default function AccountListScreen() {
  const [accounts, setAccounts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async (loadMore = false) => {
    try {
      const baseQuery = query(
        collection(firestoreDB, "users"),
        orderBy("email"),
        limit(ACCOUNTS_LIMIT)
      );

      let q = baseQuery;
      if (loadMore && lastVisible) {
        q = query(baseQuery, startAfter(lastVisible));
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const snapshot = await getDocs(q);
      const newAccounts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (loadMore) {
        setAccounts((prev) => [...prev, ...newAccounts]);
      } else {
        setAccounts(newAccounts);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts(false);
  };

  // const handleDelete = async (account) => {
  //   if (account.email === "ifluttercapstone@gmail.com") return;
  //   console.log(account.email.toLowerCase());
  //   console.log(account.email);
  //   Alert.alert(
  //     "Delete Account",
  //     `Are you sure you want to delete ${account.email}?`,
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Delete",
  //         style: "destructive",
  //         onPress: async () => {
  //           try {
  //             await deleteDoc(doc(firestoreDB, "users", account.id));
  
  //             await deleteDoc(doc(firestoreDB, "emailOtps", account.email.toLowerCase()));
  
  //             const currentUser = auth.currentUser;
  //             if (currentUser && currentUser.uid === account.id) {
  //               await deleteUser(currentUser);
  //               console.log("✅ Deleted from Firebase Auth (current user)");
  //             } else {
  //               console.log("⚠️ Skipped Auth deletion — not current user");
  //             }
  
  //             setAccounts((prev) => prev.filter((item) => item.id !== account.id));
  
  //             Alert.alert("Success", `${account.email} has been deleted.`);
  //           } catch (err) {
  //             console.error("❌ Error deleting account:", err);
  //             Alert.alert("Error", "Failed to delete the account. Please try again.");
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };
  

  const handleDelete = async (account) => {
    if (account.email === "peams123@gmail.com") return;
    console.log(account);
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete ${account.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Step 2: Call your Cloud Function endpoint
              const response = await fetch("https://deleteuseraccount-4rv2m5gheq-as.a.run.app", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: account.id }),
              });
  
              const result = await response.json();
  
              if (!result.success) {
                throw new Error(result.message || "Failed to delete Auth user");
              }
              
              await deleteDoc(doc(firestoreDB, "users", account.id));
              await deleteDoc(doc(firestoreDB, "emailOtps", account.email.toLowerCase()));

              // Step 3: Update UI
              setAccounts((prev) => prev.filter((item) => item.id !== account.id));
              Alert.alert("Success", `${account.email} has been deleted.`);
            } catch (err) {
              console.error("❌ Error deleting account:", err);
              Alert.alert("Error", err.message || "Failed to delete the account.");
            }
          },
        },
      ]
    );
  };
  
  

  const handleApprove = (account) => {
    Alert.alert(
      "Approve Account",
      `Are you sure you want to approve ${account.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await updateDoc(doc(firestoreDB, "users", account.id), {
                isAccepted: true,
              });
              setAccounts((prev) =>
                prev.map((item) =>
                  item.id === account.id ? { ...item, isAccepted: true } : item
                )
              );
              Alert.alert("Success", `${account.email} has been approved.`);
            } catch (err) {
              console.error("Error approving account:", err);
              Alert.alert("Error", "Failed to approve the account. Please try again.");
            }
          },
        },
      ]
    );
  };
  

  useEffect(() => {
    fetchAccounts();
  }, []);

  const renderAccount = (account) => (
    <View key={account.id} style={styles.card}>
      <View>
        <Text style={styles.email}>{account.email}</Text>
        <Text style={styles.roleTag}>{account.role}</Text>
        {!account.isAccepted && (
          <Text style={styles.pendingTag}>Pending Approval</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        {!account.isAccepted && (
          <TouchableOpacity
            onPress={() => handleApprove(account)}
            style={styles.iconButton}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#27ae60"
            />
          </TouchableOpacity>
        )}
        {account.email !== "peams123@gmail.com" && (
          <TouchableOpacity
            onPress={() => handleDelete(account)}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={22} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const admins = accounts.filter((a) => a.role === "admin");
  const user = accounts.filter((a) => a.role === "user");

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onMomentumScrollEnd={fetchAccounts.bind(null, true)}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeader}>Admin</Text>
          {admins.length === 0 ? (
            <Text style={styles.emptyText}>No admin accounts</Text>
          ) : (
            admins.map(renderAccount)
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Users</Text>
          {user.length === 0 ? (
            <Text style={styles.emptyText}>No user accounts</Text>
          ) : (
            user.map(renderAccount)
          )}

          {loadingMore && (
            <ActivityIndicator size="small" color="#007AFF" style={{ margin: 16 }} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#222",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  email: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333",
  },
  roleTag: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#888",
    marginTop: 2,
  },
  pendingTag: {
    color: "#f39c12",
    fontSize: 12,
    marginTop: 3,
    fontFamily: "Poppins-SemiBold",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: 16,
  },
  emptyText: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 8,
  },
});
