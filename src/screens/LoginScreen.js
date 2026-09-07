import React, { useState } from "react";

import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../components/AppText";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";


// ============================================================
// COLOR PALETTE
// ============================================================

const COLORS = {
  green: "#66B539",
  greenDark: "#4E9E2F",
  greenDeep: "#2F7F25",

  navy: "#111820",
  text: "#1F2A30",
  secondary: "#42535B",
  muted: "#687982",

  white: "#FFFFFF",

  inputBorder: "#CBD6D2",
  inputIcon: "#4B5C64",
  placeholder: "#788A92",

  blue: "#159BE8",
  orange: "#F3A515",
  red: "#E65B63",

  securityBg: "#EAF8D8",
};


// ============================================================
// LOGIN SCREEN
// ============================================================

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);


  // ----------------------------------------------------------
  // RESPONSIVE BREAKPOINTS
  // ----------------------------------------------------------

  const isMobile = width < 700;

  const isTablet =
    width >= 700 && width < 1100;

  const isDesktop =
    width >= 1100;


  // ==========================================================
  // FIREBASE LOGIN
  // ==========================================================

  const login = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert(
        "Missing details",
        "Please enter email and password."
      );
      return;
    }

    try {
      setLoading(true);

      console.log(
        "Attempting login:",
        cleanEmail
      );

      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      console.log(
        "Login successful"
      );

      /*
       * DO NOT NAVIGATE HERE.
       *
       * App.js already uses onAuthStateChanged()
       * and will open AppShell automatically.
       */

    } catch (error) {
      console.log(
        "LOGIN ERROR:",
        error
      );

      let message =
        "Unable to login. Please try again.";

      switch (error.code) {

        case "auth/invalid-email":
          message =
            "Please enter a valid email address.";
          break;

        case "auth/user-not-found":
          message =
            "No account exists with this email address.";
          break;

        case "auth/wrong-password":
          message =
            "Incorrect email or password.";
          break;

        case "auth/invalid-credential":
          message =
            "Incorrect email or password.";
          break;

        case "auth/user-disabled":
          message =
            "This account has been disabled.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many login attempts. Please try again later.";
          break;

        case "auth/network-request-failed":
          message =
            "Network error. Please check your internet connection.";
          break;

        case "auth/operation-not-allowed":
          message =
            "Email/password login is not enabled in Firebase Authentication.";
          break;

        default:
          message =
            error.message || message;
      }

      Alert.alert(
        "Login failed",
        message
      );

    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // DESKTOP / LARGE TABLET
  // ==========================================================

  if (!isMobile) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={isMobile ? ["top"] : []}
      >

        <ImageBackground
          source={require("../../assets/login-farm-background.png")}
          style={styles.background}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        >

          {/* =================================================
              VERY LIGHT READABILITY OVERLAY
              
              This is intentionally NOT a card.
              The photograph remains visible.
              ================================================= */}

          <View
            style={styles.softOverlay}
            pointerEvents="none"
          />


          {/* =================================================
              MAIN DESKTOP CONTAINER
              ================================================= */}

          <View
            style={[
              styles.desktopContainer,

              isTablet &&
                styles.tabletContainer,
            ]}
          >


            {/* =================================================
                LEFT SIDE
                ================================================= */}

            <View
              style={[
                styles.leftPanel,

                isTablet &&
                  styles.leftPanelTablet,
              ]}
            >

              <Brand
                compact={isTablet}
              />


              <View
                style={[
                  styles.heroBlock,

                  isTablet &&
                    styles.heroBlockTablet,
                ]}
              >

                <AppText
                  style={[
                    styles.heroTitle,

                    isTablet &&
                      styles.heroTitleTablet,
                  ]}
                >
                  Manage Your{"\n"}
                  Milk Business
                </AppText>


                <AppText
                  style={[
                    styles.heroGreen,

                    isTablet &&
                      styles.heroGreenTablet,
                  ]}
                >
                  with Ease
                </AppText>


                <AppText
                  style={[
                    styles.heroSubtitle,

                    isTablet &&
                      styles.heroSubtitleTablet,
                  ]}
                >
                  Simple • Smart • Reliable
                </AppText>

              </View>


              {/* FEATURES */}

              <View
                style={[
                  styles.features,

                  isTablet &&
                    styles.featuresTablet,
                ]}
              >

                <Feature
                  icon="people"
                  color={COLORS.greenDark}
                  background="#E7F6D9"
                  title="Manage Customers"
                  description="Keep your customer details organized"
                />


                <Feature
                  icon="calendar"
                  color={COLORS.blue}
                  background="#DDF1FF"
                  title="Track Subscriptions"
                  description="Plan and manage monthly subscriptions"
                />


                <Feature
                  icon="car"
                  color={COLORS.orange}
                  background="#FFF0C9"
                  title="Monitor Deliveries"
                  description="Never miss a delivery"
                />


                <Feature
                  icon="bar-chart"
                  color={COLORS.red}
                  background="#FFE1E3"
                  title="Grow Your Business"
                  description="Get insights and stay organized"
                />

              </View>

            </View>


            {/* =================================================
                RIGHT SIDE
                ================================================= */}

            <View
              style={[
                styles.rightPanel,

                isTablet &&
                  styles.rightPanelTablet,
              ]}
            >

              <SecurityBadge />

              <LoginCard
                email={email}
                setEmail={setEmail}

                password={password}
                setPassword={setPassword}

                showPassword={showPassword}
                setShowPassword={
                  setShowPassword
                }

                rememberMe={rememberMe}
                setRememberMe={
                  setRememberMe
                }

                loading={loading}

                login={login}

                tablet={isTablet}
              />

            </View>

          </View>

        </ImageBackground>

      </SafeAreaView>
    );
  }


  // ==========================================================
  // MOBILE
  // ==========================================================

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >

      <ImageBackground
        source={require("../../assets/login-farm-background.png")}
        style={styles.mobileBackground}
        imageStyle={
          styles.mobileBackgroundImage
        }
        resizeMode="cover"
      >

        {/* ---------------------------------------------------
            MOBILE IMAGE READABILITY
            --------------------------------------------------- */}

        <View
          style={styles.mobileOverlay}
          pointerEvents="none"
        />


        <KeyboardAvoidingView
          style={styles.mobileKeyboard}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.mobileScroll
            }
          >

            {/* =================================================
                MOBILE BRAND
                ================================================= */}

            <Brand
              mobile
            />


            {/* =================================================
                MOBILE HERO
                ================================================= */}

            <View
              style={styles.mobileHero}
            >

              <AppText
                style={styles.mobileHeroTitle}
              >
                Manage Your{"\n"}
                Milk Business
              </AppText>


              <AppText
                style={styles.mobileHeroGreen}
              >
                with Ease
              </AppText>


              <AppText
                style={styles.mobileHeroSubtitle}
              >
                Simple • Smart • Reliable
              </AppText>

            </View>


            {/* =================================================
                MOBILE LOGIN
                ================================================= */}

            <LoginCard
              email={email}
              setEmail={setEmail}

              password={password}
              setPassword={setPassword}

              showPassword={showPassword}
              setShowPassword={
                setShowPassword
              }

              rememberMe={rememberMe}
              setRememberMe={
                setRememberMe
              }

              loading={loading}

              login={login}

              mobile
            />


            {/* =================================================
                MOBILE SECURITY
                ================================================= */}

            <View
              style={styles.mobileSecurity}
            >

              <Ionicons
                name="shield-checkmark"
                size={19}
                color={COLORS.greenDeep}
              />

              <AppText
                style={styles.mobileSecurityText}
              >
                Secure • Powered by Firebase
              </AppText>

            </View>

          </ScrollView>

        </KeyboardAvoidingView>

      </ImageBackground>

    </SafeAreaView>
  );
}


// ============================================================
// BRAND
// ============================================================

function Brand({
  mobile = false,
  compact = false,
}) {

  if (mobile) {
    return (
      <View
        style={styles.mobileBrand}
      >

        <View
          style={styles.mobileLogoBox}
        >

          <Image
            source={require("../../assets/logo.png")}
            style={styles.mobileLogo}
            resizeMode="contain"
          />

        </View>


        <View
          style={styles.mobileBrandText}
        >

          <View
            style={styles.mobileBrandNameRow}
          >

            <AppText
              style={styles.mobileBrandMilk}
            >
              Milk
            </AppText>

            <AppText
              style={
                styles.mobileBrandGreen
              }
            >
              {" "}Subscription
            </AppText>

          </View>


          <AppText
            style={styles.mobileTagline}
          >
            Fresh Milk | Happy Families | Healthier Tomorrow
          </AppText>

        </View>

      </View>
    );
  }


  return (
    <View
      style={[
        styles.brandRow,

        compact &&
          styles.brandRowTablet,
      ]}
    >

      <View
        style={[
          styles.logoBox,

          compact &&
            styles.logoBoxTablet,
        ]}
      >

        <Image
          source={require("../../assets/logo.png")}
          style={[
            styles.logo,

            compact &&
              styles.logoTablet,
          ]}
          resizeMode="contain"
        />

      </View>


      <View
        style={styles.brandText}
      >

        <View
          style={styles.brandNameRow}
        >

          <AppText
            style={[
              styles.brandMilk,

              compact &&
                styles.brandMilkTablet,
            ]}
          >
            Milk
          </AppText>

          <AppText
            style={[
              styles.brandGreen,

              compact &&
                styles.brandGreenTablet,
            ]}
          >
            {" "}Subscription
          </AppText>

        </View>


        <AppText
          style={[
            styles.tagline,

            compact &&
              styles.taglineTablet,
          ]}
        >
          Fresh Milk | Happy Families | Healthier Tomorrow
        </AppText>

      </View>

    </View>
  );
}


// ============================================================
// SECURITY BADGE
// ============================================================

function SecurityBadge() {

  return (
    <View
      style={styles.securityBadge}
    >

      <View
        style={styles.securityBadgeIcon}
      >

        <Ionicons
          name="shield-checkmark"
          size={19}
          color={COLORS.greenDeep}
        />

      </View>


      <AppText
        style={styles.securityBadgeText}
      >
        Secure • Powered by Firebase
      </AppText>

    </View>
  );
}


// ============================================================
// FEATURE
// ============================================================

function Feature({
  icon,
  color,
  background,
  title,
  description,
}) {

  return (
    <View
      style={styles.featureRow}
    >

      <View
        style={[
          styles.featureIcon,
          {
            backgroundColor:
              background,
          },
        ]}
      >

        <Ionicons
          name={icon}
          size={24}
          color={color}
        />

      </View>


      <View
        style={styles.featureContent}
      >

        <AppText
          style={styles.featureTitle}
        >
          {title}
        </AppText>


        <AppText
          style={styles.featureDescription}
        >
          {description}
        </AppText>

      </View>

    </View>
  );
}


// ============================================================
// LOGIN CARD
// ============================================================

function LoginCard({
  email,
  setEmail,

  password,
  setPassword,

  showPassword,
  setShowPassword,

  rememberMe,
  setRememberMe,

  loading,

  login,

  mobile = false,
  tablet = false,
}) {

  return (
    <View
      style={[
        styles.loginCard,

        mobile &&
          styles.loginCardMobile,

        tablet &&
          styles.loginCardTablet,
      ]}
    >

      {/* ======================================================
          TITLE
          ====================================================== */}

      <AppText
        style={[
          styles.loginTitle,

          mobile &&
            styles.loginTitleMobile,

          tablet &&
            styles.loginTitleTablet,
        ]}
      >
        Welcome Back
      </AppText>


      <AppText
        style={[
          styles.loginSubtitle,

          mobile &&
            styles.loginSubtitleMobile,
        ]}
      >
        Sign in to continue to your account
      </AppText>


      {/* ======================================================
          EMAIL
          ====================================================== */}

      <View
        style={styles.field}
      >

        <AppText
          style={styles.label}
        >
          Email Address
        </AppText>


        <View
          style={styles.inputBox}
        >

          <Ionicons
            name="mail-outline"
            size={21}
            color={COLORS.inputIcon}
            style={styles.inputIcon}
          />


          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={
              COLORS.placeholder
            }
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
            underlineColorAndroid="transparent"
          />

        </View>

      </View>


      {/* ======================================================
          PASSWORD
          ====================================================== */}

      <View
        style={styles.field}
      >

        <AppText
          style={styles.label}
        >
          Password
        </AppText>


        <View
          style={styles.inputBox}
        >

          <Ionicons
            name="lock-closed-outline"
            size={21}
            color={COLORS.inputIcon}
            style={styles.inputIcon}
          />


          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={
              COLORS.placeholder
            }
            secureTextEntry={
              !showPassword
            }
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={login}
            underlineColorAndroid="transparent"
          />


          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() =>
              setShowPassword(
                (value) => !value
              )
            }
            disabled={loading}
            activeOpacity={0.7}
          >

            <Ionicons
              name={
                showPassword
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={22}
              color={COLORS.inputIcon}
            />

          </TouchableOpacity>

        </View>

      </View>


      {/* ======================================================
          OPTIONS
          ====================================================== */}

      <View
        style={[
          styles.optionsRow,

          mobile &&
            styles.optionsRowMobile,
        ]}
      >

        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() =>
            setRememberMe(
              (value) => !value
            )
          }
          activeOpacity={0.7}
        >

          <View
            style={[
              styles.checkbox,

              rememberMe &&
                styles.checkboxSelected,
            ]}
          >

            {rememberMe && (
              <Ionicons
                name="checkmark"
                size={14}
                color={COLORS.white}
              />
            )}

          </View>


          <AppText
            style={styles.rememberText}
          >
            Remember me
          </AppText>

        </TouchableOpacity>


        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              "Forgot Password",
              "Password reset functionality can be added here."
            )
          }
        >

          <AppText
            style={styles.forgotPassword}
          >
            Forgot password?
          </AppText>

        </TouchableOpacity>

      </View>


      {/* ======================================================
          SIGN IN BUTTON
          ====================================================== */}

      <TouchableOpacity
        style={[
          styles.signInButton,

          loading &&
            styles.buttonDisabled,
        ]}
        onPress={login}
        disabled={loading}
        activeOpacity={0.85}
      >

        {loading ? (

          <View
            style={styles.buttonInner}
          >

            <ActivityIndicator
              size="small"
              color={COLORS.white}
            />

            <AppText
              style={[
                styles.signInText,
                {
                  marginLeft: 9,
                },
              ]}
            >
              Signing In...
            </AppText>

          </View>

        ) : (

          <View
            style={styles.buttonInner}
          >

            <AppText
              style={styles.signInText}
            >
              Sign In
            </AppText>


            <View
              style={styles.arrowCircle}
            >

              <Ionicons
                name="arrow-forward"
                size={19}
                color={COLORS.greenDark}
              />

            </View>

          </View>

        )}

      </TouchableOpacity>


      {/* ======================================================
          DIVIDER
          ====================================================== */}

      <View
        style={styles.dividerRow}
      >

        <View
          style={styles.divider}
        />

        <AppText
          style={styles.orText}
        >
          or
        </AppText>

        <View
          style={styles.divider}
        />

      </View>


      {/* ======================================================
          FIREBASE SECURITY
          ====================================================== */}

      <View
        style={styles.firebaseBox}
      >

        <View
          style={styles.firebaseIcon}
        >

          <Ionicons
            name="shield-checkmark-outline"
            size={27}
            color={COLORS.greenDeep}
          />

        </View>


        <View
          style={styles.firebaseContent}
        >

          <AppText
            style={styles.firebaseTitle}
          >
            Your data is safe and secure
          </AppText>


          <AppText
            style={styles.firebaseSubtitle}
          >
            with Firebase Authentication
          </AppText>

        </View>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // ROOT
  // ==========================================================

  safe: {
    flex: 1,
    // Green is visible only in the mobile status-bar/safe-area region.
    // The actual login content remains the existing farm image.
    backgroundColor: COLORS.greenDeep,
  },


  // ==========================================================
  // DESKTOP BACKGROUND
  // ==========================================================

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  backgroundImage: {
    width: "100%",
    height: "100%",
  },


  // ==========================================================
  // SOFT IMAGE OVERLAY
  //
  // IMPORTANT:
  // This is NOT a rectangular panel.
  // It only slightly improves text contrast.
  // ==========================================================

  softOverlay: {
    position: "absolute",

    left: 0,
    top: 0,
    bottom: 0,

    width: "64%",

    backgroundColor:
      "rgba(255,255,255,0.17)",
  },


  // ==========================================================
  // DESKTOP MAIN CONTAINER
  // ==========================================================

  desktopContainer: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingLeft: "4.5%",
    paddingRight: "3.2%",

    paddingTop: 18,
    paddingBottom: 18,
  },

  tabletContainer: {
    paddingLeft: "3%",
    paddingRight: "3%",
  },


  // ==========================================================
  // LEFT SIDE
  // ==========================================================

  leftPanel: {
    width: "57%",

    maxWidth: 730,

    paddingRight: 30,

    flexShrink: 1,
  },

  leftPanelTablet: {
    width: "55%",

    paddingRight: 18,
  },


  // ==========================================================
  // BRAND
  // ==========================================================

  brandRow: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 22,
  },

  brandRowTablet: {
    marginBottom: 15,
  },

  logoBox: {
    width: 76,
    height: 76,

    borderRadius: 23,

    backgroundColor:
      "rgba(255,255,255,0.96)",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 14,

    shadowColor: "#000",

    shadowOpacity: 0.12,

    shadowRadius: 9,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  logoBoxTablet: {
    width: 64,
    height: 64,

    borderRadius: 19,

    marginRight: 11,
  },

  logo: {
    width: 67,
    height: 67,
  },

  logoTablet: {
    width: 56,
    height: 56,
  },

  brandText: {
    flex: 1,

    minWidth: 0,
  },

  brandNameRow: {
    flexDirection: "row",

    alignItems: "center",

    flexWrap: "wrap",
  },

  brandMilk: {
    fontSize: 31,

    lineHeight: 37,

    fontWeight: "900",

    color: COLORS.navy,

    letterSpacing: -0.7,

    textShadowColor:
      "rgba(255,255,255,0.95)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },

  brandMilkTablet: {
    fontSize: 26,
    lineHeight: 31,
  },

  brandGreen: {
    fontSize: 31,

    lineHeight: 37,

    fontWeight: "900",

    color: COLORS.greenDeep,

    letterSpacing: -0.7,

    textShadowColor:
      "rgba(255,255,255,0.95)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },

  brandGreenTablet: {
    fontSize: 26,
    lineHeight: 31,
  },

  tagline: {
    marginTop: 3,

    fontSize: 12.5,

    lineHeight: 18,

    fontWeight: "700",

    color: COLORS.secondary,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },

  taglineTablet: {
    fontSize: 10.5,
    lineHeight: 15,
  },


  // ==========================================================
  // HERO
  // ==========================================================

  heroBlock: {
    marginBottom: 19,
  },

  heroBlockTablet: {
    marginBottom: 12,
  },

  heroTitle: {
    fontSize: 49,

    lineHeight: 53,

    fontWeight: "900",

    color: COLORS.navy,

    letterSpacing: -1.5,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 5,
  },

  heroTitleTablet: {
    fontSize: 38,
    lineHeight: 41,
  },

  heroGreen: {
    fontSize: 49,

    lineHeight: 54,

    fontWeight: "900",

    color: COLORS.greenDeep,

    letterSpacing: -1.5,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 5,
  },

  heroGreenTablet: {
    fontSize: 38,
    lineHeight: 42,
  },

  heroSubtitle: {
    marginTop: 5,

    fontSize: 20,

    lineHeight: 27,

    fontWeight: "800",

    color: COLORS.secondary,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 4,
  },

  heroSubtitleTablet: {
    fontSize: 16,
    lineHeight: 21,
  },


  // ==========================================================
  // FEATURES
  // ==========================================================

  features: {
    width: "100%",

    maxWidth: 525,
  },

  featuresTablet: {
    maxWidth: 430,
  },

  featureRow: {
    flexDirection: "row",

    alignItems: "center",

    minHeight: 54,

    marginBottom: 9,
  },

  featureIcon: {
    width: 53,

    height: 53,

    borderRadius: 27,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 13,

    borderWidth: 1.5,

    borderColor:
      "rgba(255,255,255,0.95)",

    shadowColor: "#000",

    shadowOpacity: 0.10,

    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 3,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 15.5,

    lineHeight: 20,

    fontWeight: "900",

    color: COLORS.navy,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },

  featureDescription: {
    marginTop: 1,

    fontSize: 12.2,

    lineHeight: 17,

    fontWeight: "700",

    color: COLORS.secondary,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },


  // ==========================================================
  // RIGHT SIDE
  // ==========================================================

  rightPanel: {
    width: "35%",

    maxWidth: 510,

    minWidth: 410,

    alignItems: "stretch",

    justifyContent: "center",

    flexShrink: 1,
  },

  rightPanelTablet: {
    width: "40%",

    minWidth: 350,

    maxWidth: 440,
  },


  // ==========================================================
  // SECURITY BADGE
  // ==========================================================

  securityBadge: {
    alignSelf: "flex-end",

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(255,255,255,0.97)",

    paddingHorizontal: 15,

    paddingVertical: 8,

    borderRadius: 22,

    marginBottom: 11,

    shadowColor: "#000",

    shadowOpacity: 0.11,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 5,
  },

  securityBadgeIcon: {
    alignItems: "center",
    justifyContent: "center",
  },

  securityBadgeText: {
    marginLeft: 7,

    fontSize: 11.5,

    lineHeight: 16,

    fontWeight: "800",

    color: COLORS.navy,
  },


  // ==========================================================
  // LOGIN CARD
  // ==========================================================

  loginCard: {
    width: "100%",

    backgroundColor:
      "rgba(255,255,255,0.985)",

    borderRadius: 27,

    paddingHorizontal: 34,

    paddingTop: 31,

    paddingBottom: 27,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.95)",

    shadowColor: "#000",

    shadowOpacity: 0.20,

    shadowRadius: 25,

    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 13,
  },

  loginCardTablet: {
    paddingHorizontal: 27,

    paddingTop: 26,

    paddingBottom: 23,

    borderRadius: 23,
  },

  loginCardMobile: {
    borderRadius: 23,

    paddingHorizontal: 20,

    paddingTop: 24,

    paddingBottom: 21,

    shadowOpacity: 0.16,
  },


  // ==========================================================
  // LOGIN TYPOGRAPHY
  // ==========================================================

  loginTitle: {
    fontSize: 38,

    lineHeight: 44,

    fontWeight: "900",

    color: COLORS.navy,

    letterSpacing: -1.1,

    marginBottom: 4,
  },

  loginTitleTablet: {
    fontSize: 32,

    lineHeight: 37,
  },

  loginTitleMobile: {
    fontSize: 30,

    lineHeight: 36,
  },

  loginSubtitle: {
    fontSize: 14.5,

    lineHeight: 21,

    fontWeight: "500",

    color: COLORS.muted,

    marginBottom: 25,
  },

  loginSubtitleMobile: {
    fontSize: 13.5,

    marginBottom: 22,
  },


  // ==========================================================
  // FORM
  // ==========================================================

  field: {
    marginBottom: 17,
  },

  label: {
    fontSize: 13.5,

    lineHeight: 18,

    fontWeight: "900",

    color: COLORS.navy,

    marginBottom: 7,
  },

  inputBox: {
    height: 57,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      COLORS.white,

    borderWidth: 1.2,

    borderColor:
      COLORS.inputBorder,

    borderRadius: 14,
  },

  inputIcon: {
    marginLeft: 15,

    marginRight: 8,
  },

  input: {
    flex: 1,

    height: "100%",

    paddingHorizontal: 3,

    paddingVertical: 0,

    fontSize: 15,

    fontWeight: "500",

    color: COLORS.navy,

    ...(Platform.OS === "web"
      ? {
          outlineStyle: "none",
        }
      : {}),
  },

  eyeButton: {
    width: 48,

    height: "100%",

    alignItems: "center",

    justifyContent: "center",
  },


  // ==========================================================
  // OPTIONS
  // ==========================================================

  optionsRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent:
      "space-between",

    marginTop: 0,

    marginBottom: 22,
  },

  optionsRowMobile: {
    marginBottom: 19,
  },

  rememberRow: {
    flexDirection: "row",

    alignItems: "center",
  },

  checkbox: {
    width: 22,

    height: 22,

    borderRadius: 5,

    borderWidth: 1.4,

    borderColor: "#89979E",

    backgroundColor:
      COLORS.white,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 8,
  },

  checkboxSelected: {
    backgroundColor:
      COLORS.green,

    borderColor:
      COLORS.green,
  },

  rememberText: {
    fontSize: 12.5,

    fontWeight: "600",

    color: COLORS.text,
  },

  forgotPassword: {
    fontSize: 12.5,

    fontWeight: "800",

    color: COLORS.greenDeep,

    textDecorationLine:
      "underline",
  },


  // ==========================================================
  // SIGN IN BUTTON
  // ==========================================================

  signInButton: {
    height: 57,

    borderRadius: 15,

    backgroundColor:
      COLORS.green,

    shadowColor:
      COLORS.greenDark,

    shadowOpacity: 0.28,

    shadowRadius: 9,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  buttonDisabled: {
    opacity: 0.70,
  },

  buttonInner: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",
  },

  signInText: {
    fontSize: 17,

    lineHeight: 22,

    fontWeight: "900",

    color: COLORS.white,
  },

  arrowCircle: {
    width: 33,

    height: 33,

    borderRadius: 17,

    backgroundColor:
      COLORS.white,

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 15,
  },


  // ==========================================================
  // DIVIDER
  // ==========================================================

  dividerRow: {
    flexDirection: "row",

    alignItems: "center",

    marginVertical: 19,
  },

  divider: {
    flex: 1,

    height: 1,

    backgroundColor:
      "#DEE5E1",
  },

  orText: {
    marginHorizontal: 13,

    fontSize: 12,

    fontWeight: "600",

    color: COLORS.muted,
  },


  // ==========================================================
  // FIREBASE BOX
  // ==========================================================

  firebaseBox: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      COLORS.securityBg,

    borderRadius: 16,

    paddingHorizontal: 15,

    paddingVertical: 13,
  },

  firebaseIcon: {
    width: 46,

    height: 46,

    borderRadius: 23,

    backgroundColor:
      COLORS.white,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 11,
  },

  firebaseContent: {
    flex: 1,
  },

  firebaseTitle: {
    fontSize: 12.5,

    lineHeight: 17,

    fontWeight: "900",

    color: COLORS.navy,
  },

  firebaseSubtitle: {
    marginTop: 1,

    fontSize: 11.5,

    lineHeight: 16,

    fontWeight: "500",

    color: COLORS.secondary,
  },


  // ==========================================================
  // MOBILE
  // ==========================================================

  mobileBackground: {
    flex: 1,

    width: "100%",

    height: "100%",
  },

  mobileBackgroundImage: {
    width: "100%",

    height: "100%",
  },

  mobileOverlay: {
    position: "absolute",

    left: 0,
    right: 0,
    top: 0,
    bottom: 0,

    backgroundColor:
      "rgba(255,255,255,0.30)",
  },

  mobileKeyboard: {
    flex: 1,
  },

  mobileScroll: {
    flexGrow: 1,

    paddingHorizontal: 16,

    paddingTop: 15,

    paddingBottom: 30,

    alignItems: "center",
  },


  // ==========================================================
  // MOBILE BRAND
  // ==========================================================

  mobileBrand: {
    width: "100%",

    maxWidth: 450,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      "rgba(255,255,255,0.91)",

    borderRadius: 18,

    paddingHorizontal: 10,

    paddingVertical: 9,

    marginBottom: 15,

    shadowColor: "#000",

    shadowOpacity: 0.10,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  mobileLogoBox: {
    width: 57,

    height: 57,

    borderRadius: 17,

    backgroundColor:
      COLORS.white,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 10,
  },

  mobileLogo: {
    width: 49,

    height: 49,
  },

  mobileBrandText: {
    flex: 1,

    minWidth: 0,
  },

  mobileBrandNameRow: {
    flexDirection: "row",

    alignItems: "center",

    flexWrap: "wrap",
  },

  mobileBrandMilk: {
    fontSize: 21,

    lineHeight: 26,

    fontWeight: "900",

    color: COLORS.navy,
  },

  mobileBrandGreen: {
    fontSize: 21,

    lineHeight: 26,

    fontWeight: "900",

    color: COLORS.greenDeep,
  },

  mobileTagline: {
    marginTop: 2,

    fontSize: 9.5,

    lineHeight: 14,

    fontWeight: "700",

    color: COLORS.secondary,
  },


  // ==========================================================
  // MOBILE HERO
  // ==========================================================

  mobileHero: {
    width: "100%",

    maxWidth: 450,

    alignItems: "center",

    paddingVertical: 5,

    marginBottom: 13,
  },

  mobileHeroTitle: {
    fontSize: 29,

    lineHeight: 33,

    fontWeight: "900",

    color: COLORS.navy,

    textAlign: "center",

    letterSpacing: -0.8,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 4,
  },

  mobileHeroGreen: {
    fontSize: 29,

    lineHeight: 34,

    fontWeight: "900",

    color: COLORS.greenDeep,

    textAlign: "center",

    letterSpacing: -0.8,

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 4,
  },

  mobileHeroSubtitle: {
    marginTop: 5,

    fontSize: 15,

    lineHeight: 21,

    fontWeight: "800",

    color: COLORS.secondary,

    textAlign: "center",

    textShadowColor:
      "rgba(255,255,255,0.98)",

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },


  // ==========================================================
  // MOBILE SECURITY
  // ==========================================================

  mobileSecurity: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 13,

    paddingHorizontal: 15,

    paddingVertical: 9,

    borderRadius: 18,

    backgroundColor:
      "rgba(255,255,255,0.88)",
  },

  mobileSecurityText: {
    marginLeft: 7,

    fontSize: 11,

    fontWeight: "800",

    color: COLORS.navy,
  },

});