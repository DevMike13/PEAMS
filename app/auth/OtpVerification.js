import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import axios from "axios";
import { firestoreDB } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const OtpScreen = () => {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [otp, setOtp] = useState("");
   const [isFocusedOtp, setIsFocusedOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  console.log(user?.email);
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "https://verifyotp-4rv2m5gheq-as.a.run.app",
        { email: user?.email, otp }
      );

      if (response.data.success) {
        await updateDoc(doc(firestoreDB, "users", user.uid), { isVerified: true });

        const { setUser } = useAuthStore.getState();
        setUser(user, user.role, user.isAccepted, true);

      } else {
        Alert.alert("Invalid OTP", response.data.message || "Incorrect code. Please try again.");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await axios.post("https://sendotp-4rv2m5gheq-as.a.run.app", { email: user?.email });
      Alert.alert("OTP Sent", "A new OTP has been sent to your email.");
    } catch (error) {
      console.error("Resend OTP error:", error);
      Alert.alert("Error", "Failed to resend OTP. Please try again later.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.header}>
          {/* <Image source={images.logo} style={styles.imageLogo} resizeMode="contain" /> */}
          <LottieView
            source={images.rooster}
            autoPlay
            loop
            style={{ width: 50, height: 50 }}
          />
          <Text style={styles.headerTitle}>Email Verification</Text>
        </View>
        <View style={styles.inputsContainer}>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP sent to {"\n"}
            <Text style={styles.email}>{user?.email || "..."}</Text>
          </Text>

          <View style={styles.inputMainContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, isFocusedOtp && styles.inputContainerFocused]}>
              <TextInput
                placeholder="Enter OTP"
                keyboardType="numeric"
                value={otp}
                onChangeText={setOtp}
                style={styles.input}
                onFocus={() => setIsFocusedOtp(true)}
                onBlur={() => setIsFocusedOtp(false)}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResendOtp}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                await logout();
                router.replace('/auth/login');
            }} 
          >
              <Text style={styles.buttonText}>
                Back
              </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eaeaea',
    position: 'relative'
  },
  
  innerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
    width: '85%',
    height: '65%',
    marginHorizontal: 'auto',
    marginVertical: 'auto',
    borderRadius: 30,
  },
  inputsContainer:{
    paddingHorizontal: 20
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
    fontSize: 20,
    color: 'white'
  },
  imageLogo: {
    width: 50,
    height: 50,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
    color: '#255ba0',
    marginTop: 12
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Poppins-Regular",
    color: "#555",
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 5,
    color: '#255ba0',
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    marginTop: 20,
    fontFamily: "Inter-Regular",
    color: "#555",
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 5,
    color: '#255ba0',
  },
  inputMainContainer:{
    width: '100%',
    height: 'auto',
    marginVertical: 6
  },
  input : {
    flex : 1,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  inputContainer: {
    width: '100%',
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#a1a2a8',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
  },
  button: {
    width: "100%",
    backgroundColor: '#4b90df',
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    color: "white",
  },
  resendText: {
    marginHorizontal: 'auto',
    marginTop: 20,
    fontSize: 16,
    color: '#255ba0',
    fontFamily: "Inter-Medium",
  },
});
