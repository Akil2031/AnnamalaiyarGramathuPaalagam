import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Image,
} from "react-native";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Missing details", "Please enter email and password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.js auth listener will handle navigation
    } catch (e) {
      Alert.alert("Login failed", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Welcome back 👋</Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordBox}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.showText}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={login}>
          <Text style={styles.btnText}>LOGIN</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Secure login powered by Firebase 🔐
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2E7D32",
  },

  header: {
    flex: 0.35,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 140,
    height: 140,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: "#E8F5E9",
  },

  card: {
    flex: 0.65,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#2E7D32",
  },

  input: {
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },

  passwordBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },

  showText: {
    color: "#2E7D32",
    fontWeight: "600",
  },

  btn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 1,
  },

  footerText: {
    textAlign: "center",
    marginTop: 18,
    fontSize: 12,
    color: "#888",
  },
});
