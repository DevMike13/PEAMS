import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Dimensions } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../../constants";
import { auth } from "../../firebase";
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get("window");

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Please enter your email address first.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password Reset Sent",
        `A password reset email has been sent to ${email}. Please check your inbox.`
      );
      router.replace("/auth/login");
    } catch (error) {
      console.log("Forgot password error:", error);
      if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
      } else if (error.code === "auth/user-not-found") {
        Alert.alert("No Account Found", "No user found with this email address.");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
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
            style={{ width: 80, height: 80 }}
          />
          <Text style={styles.headerTitle}>Forgot Password</Text>
        </View>
        <View style={styles.inputsContainer}>
          <Text style={styles.subtitle}>
            Enter your email below and we’ll send you a password reset link.
          </Text>

          <View style={styles.inputMainContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, isFocusedEmail && styles.inputContainerFocused]}>
              <TextInput
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                onFocus={() => setIsFocusedEmail(true)}
                onBlur={() => setIsFocusedEmail(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/auth/login")}>
            <Text style={styles.resendText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eaeaea",
    position: "relative",
  },
  innerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
    width: '85%',
    height: '60%',
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
    fontSize: 24,
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
    fontFamily: 'Inter-Regular'
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
  errorText: {
    fontFamily: 'Inter-Regular',
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
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
