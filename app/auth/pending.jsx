import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { images } from '../../constants';


const { width } = Dimensions.get('window');

export default function PendingScreen() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.header}>
          <Image source={images.logo} style={styles.imageLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>PEAMS</Text>
        </View>
        <View style={styles.inputsContainer}>
          <Text style={styles.title}>Account Pending Approval</Text>
          <Text style={styles.message}>
            Thank you for registering. Your account is awaiting admin approval.
            You’ll be notified once it’s accepted.
          </Text>

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    height: '60%',
    marginHorizontal: 'auto',
    marginVertical: 'auto',
    borderRadius: 30,
  },
  inputsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header:{
    backgroundColor: '#4b90df',
    height: 70,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 5
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
  message: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 30,
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
});
