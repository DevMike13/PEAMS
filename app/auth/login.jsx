import { 
  View, TextInput, Text, StyleSheet, TouchableOpacity, 
  Image, Dimensions, Alert, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestoreDB } from '../../firebase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { images } from '../../constants';
import { useAuthStore } from '../../store/useAuthStore';
import axios from "axios";
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return alert('Please fill in both fields.');

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userRef = doc(firestoreDB, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'User record not found in Firestore.');
        return;
      }

      const userData = userSnap.data();
      setUser(firebaseUser, userData.role, userData.isAccepted, userData.isVerified);

      if (!userData.isVerified) {
        await axios.post("https://sendotp-4rv2m5gheq-as.a.run.app", { email: firebaseUser.email });
        return;
      }

      if (!userData.isAccepted) {
        Alert.alert('Pending Approval', 'Your account is awaiting admin approval.');
        router.replace('/auth/pending');
        return;
      }

      if (userData.role === 'admin') router.replace('/(admin)/startAdmin');
      else router.replace('/(user)/startUser');

    } catch (e) {
      console.log('Login error:', e);
      if (e.code === 'auth/network-request-failed') {
        alert('Network error. Please check your internet connection.');
      } else if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(e.code)) {
        alert('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            {/* <Image source={images.logo} style={styles.imageLogo} resizeMode="contain" /> */}
            <LottieView
             source={images.rooster}
              autoPlay
              loop
              style={{ width: 80, height: 80 }}
            />
            <Text style={styles.headerTitle}>PEAMS</Text>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.inputsContainer}>
            <Text style={styles.title}>Login</Text>

            {/* Email Input */}
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

            {/* Password Input */}
            <View style={styles.inputMainContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputContainer, isFocusedPassword && styles.inputContainerFocused]}>
                <TextInput
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  onFocus={() => setIsFocusedPassword(true)}
                  onBlur={() => setIsFocusedPassword(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={!showPassword ? 'eye-off-outline' : "eye-outline"}
                    size={26}
                    color="#3B82F6"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity onPress={() => router.push('/auth/forgotPassword')}>
              <Text style={styles.forgetText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Register */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.registerButtonText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaeaea',
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    // padding: 24,
    paddingBottom: 80,
  },
  innerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    elevation: 5,
    width: '85%',
    height: '80%',
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
  inputMainContainer: {
    width: '100%',
    marginVertical: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    width: '100%',
    height: 64,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#a1a2a8',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
  },
  forgetText: {
    fontFamily: 'Inter-Regular',
    color: '#255ba0',
    textAlign: 'center',
    marginTop: 16,
  },
  loginButton: { 
    width: '100%', 
    backgroundColor: '#4b90df',
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 10, 
    borderRadius: 10, 
    marginHorizontal: 'auto', 
    marginTop: 16, 
  }, 
  buttonText: { 
    fontFamily: 'Inter-Bold', 
    fontSize: 20, 
    color: 'white' 
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  registerText: {
    fontFamily: 'Inter-Regular',
  },
  registerButtonText: {
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
  },
});

export default Login;
