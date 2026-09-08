import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DashboardScreen from "../screens/DashboardScreen";
import CustomersScreen from "../screens/CustomersScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import CalendarScreen from "../screens/CalendarScreen";
import DeliveryScreen from "../screens/DeliveryScreen";
import DailySalesScreen from "../screens/DailySalesScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import OtherBrandProductsScreen from "../screens/OtherBrandProductsScreen";

const BRAND_TITLE = "Annamalaiyar Gramathu Paalagam";
const BRAND_TAGLINE = "True Effort Leads to Success";

const MENU_ITEMS = [
  { key: "Dashboard", label: "Dashboard", icon: "grid-outline", activeIcon: "grid" },
  { key: "Customers", label: "Customers", icon: "people-outline", activeIcon: "people" },
  { key: "Subscription", label: "Subscriptions", icon: "repeat-outline", activeIcon: "repeat" },
  { key: "Calendar", label: "Calendar", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "Delivery", label: "Delivery", icon: "bicycle-outline", activeIcon: "bicycle" },
  { key: "DailyBusiness", label: "Daily Business", icon: "today-outline", activeIcon: "today" },
  { key: "Expenses", label: "Expenses", icon: "receipt-outline", activeIcon: "receipt" },
  { key: "OtherBrands", label: "Other Brand Products", icon: "storefront-outline", activeIcon: "storefront" },
];

const MOBILE_PRIMARY = ["Dashboard", "Customers", "Subscription", "Calendar"];
const MOBILE_MORE = ["Delivery", "DailyBusiness", "Expenses", "OtherBrands"];

export default function AppShell() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= 900;
  const [activeScreen, setActiveScreen] = useState("Dashboard");
  const [moreOpen, setMoreOpen] = useState(false);

  const navigate = (key) => {
    setActiveScreen(key);
    setMoreOpen(false);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case "Customers": return <CustomersScreen />;
      case "Subscription": return <SubscriptionScreen />;
      case "Calendar": return <CalendarScreen />;
      case "Delivery": return <DeliveryScreen />;
      case "DailyBusiness": return <DailySalesScreen />;
      case "Expenses": return <ExpensesScreen />;
      case "OtherBrands": return <OtherBrandProductsScreen />;
      case "Dashboard":
      default: return<DashboardScreen
  onNavigate={(screen) => setActiveScreen(screen)}
/>;
    }
  };

  return (
    <View style={styles.root}>
      {isDesktop && (
        <Sidebar
          activeScreen={activeScreen}
          setActiveScreen={navigate}
          user={auth.currentUser}
        />
      )}

      <View style={styles.main}>
        {!isDesktop && <MobileHeader />}

        <View style={styles.content}>{renderScreen()}</View>

        {!isDesktop && (
          <MobileNavigation
            activeScreen={activeScreen}
            setActiveScreen={navigate}
            moreOpen={moreOpen}
            setMoreOpen={setMoreOpen}
          />
        )}
      </View>
    </View>
  );
}

function Brand({ compact = false }) {
  return (
    <View style={[styles.brandArea, compact && styles.brandAreaCompact]}>
      <View style={styles.logoBox}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.brandTextBlock}>
        <Text style={styles.brandTitle} numberOfLines={1} ellipsizeMode="clip">
          {BRAND_TITLE}
        </Text>
        <Text style={styles.brandSubtitle} numberOfLines={1} ellipsizeMode="clip">
          {BRAND_TAGLINE}
        </Text>
      </View>
    </View>
  );
}

function MobileHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.mobileHeaderSafe, { paddingTop: insets.top }]}>
      <View style={styles.mobileHeader}>
        <Brand compact />
      </View>
    </View>
  );
}

function Sidebar({ activeScreen, setActiveScreen, user }) {
  const displayName = user?.displayName?.trim() || "Admin";
  const email = user?.email || "Signed in";
  const initial = displayName.charAt(0).toUpperCase() || "A";

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm("Are you sure you want to logout?")
        : true;
      if (!confirmed) return;
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout error:", error);
        window.alert("Unable to logout. Please try again.");
      }
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Logout Failed", "Unable to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.sidebar}>
      <Brand />

      <View style={styles.menu}>
        <Text style={styles.menuHeading}>MAIN MENU</Text>
        {MENU_ITEMS.map((item) => {
          const active = activeScreen === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, active && styles.menuItemActive]}
              onPress={() => setActiveScreen(item.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={21}
                color={active ? "#2E7D32" : "#64748B"}
              />
              <Text style={[styles.menuText, active && styles.menuTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarBottom}>
        <View style={styles.businessBadge}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#2E7D32" />
          <Text style={styles.businessBadgeText}>Secure Business App</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out-outline" size={19} color="#C84A4A" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MobileNavigation({ activeScreen, setActiveScreen, moreOpen, setMoreOpen }) {
  const insets = useSafeAreaInsets();
  const moreActive = MOBILE_MORE.includes(activeScreen);

  return (
    <>
      <View style={[styles.mobileNavSafe, { paddingBottom: insets.bottom }]}>
        <View style={styles.mobileNav}>
          {MOBILE_PRIMARY.map((key) => {
            const item = MENU_ITEMS.find((x) => x.key === key);
            const active = activeScreen === key;
            const label = key === "Subscription" ? "Plans" : key === "Dashboard" ? "Home" : key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.mobileNavItem}
                onPress={() => setActiveScreen(key)}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileIconWrap, active && styles.mobileIconWrapActive]}>
                  <Ionicons
                    name={active ? item.activeIcon : item.icon}
                    size={20}
                    color={active ? "#2E7D32" : "#94A3B8"}
                  />
                </View>
                <Text style={[styles.mobileNavText, active && styles.mobileNavTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.mobileNavItem}
            onPress={() => setMoreOpen((v) => !v)}
            activeOpacity={0.75}
          >
            <View style={[styles.mobileIconWrap, moreActive && styles.mobileIconWrapActive]}>
              <Ionicons
                name={moreActive ? "ellipsis-horizontal" : "menu-outline"}
                size={21}
                color={moreActive ? "#2E7D32" : "#94A3B8"}
              />
            </View>
            <Text style={[styles.mobileNavText, moreActive && styles.mobileNavTextActive]}>More</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <TouchableOpacity style={styles.moreBackdrop} activeOpacity={1} onPress={() => setMoreOpen(false)}>
          <View style={styles.moreSheet}>
            <Text style={styles.moreTitle}>More</Text>
            <Text style={styles.moreSubtitle}>Business management</Text>
            {MOBILE_MORE.map((key) => {
              const item = MENU_ITEMS.find((x) => x.key === key);
              const active = activeScreen === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.moreItem, active && styles.moreItemActive]}
                  onPress={() => setActiveScreen(key)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={active ? item.activeIcon : item.icon}
                    size={21}
                    color={active ? "#2E7D32" : "#64748B"}
                  />
                  <Text style={[styles.moreItemText, active && styles.moreItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.moreClose} onPress={() => setMoreOpen(false)}>
              <Text style={styles.moreCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#F6F8F6" },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  content: { flex: 1, minWidth: 0, minHeight: 0 },

  sidebar: {
    width: 310,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  brandArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    marginBottom: 34,
    width: "100%",
  },
  brandAreaCompact: { marginBottom: 0, paddingHorizontal: 0 },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EAF7DF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    overflow: "hidden",
    flexShrink: 0,
  },
  logoImage: { width: 45, height: 45 },
  brandTextBlock: { flex: 1, minWidth: 0, overflow: "hidden" },
  brandTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#17211B",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  brandSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: "#64748B",
    marginTop: 2,
    flexShrink: 0,
  },
  menu: { flex: 1 },
  menuHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginLeft: 12,
    marginBottom: 10,
  },
  menuItem: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    borderRadius: 12,
    marginBottom: 5,
  },
  menuItemActive: { backgroundColor: "#E8F5E9" },
  menuText: { marginLeft: 13, fontSize: 14, fontWeight: "600", color: "#64748B" },
  menuTextActive: { color: "#2E7D32", fontWeight: "700" },
  sidebarBottom: { marginTop: "auto" },
  businessBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F1F8F3", padding: 11, borderRadius: 12,
  },
  businessBadgeText: { marginLeft: 8, fontSize: 11, fontWeight: "600", color: "#4B6350" },
  profileCard: {
    marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: "#F6F9F6",
    borderWidth: 1, borderColor: "#E4ECE3", flexDirection: "row", alignItems: "center",
  },
  profileAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 14, fontWeight: "800", color: "#2E7D32" },
  profileInfo: { flex: 1, minWidth: 0, marginLeft: 9, marginRight: 5 },
  profileName: { fontSize: 12.5, fontWeight: "800", color: "#17211B" },
  profileEmail: { fontSize: 9.5, color: "#7A8880", marginTop: 2 },
  logoutButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#FFF2F2", alignItems: "center", justifyContent: "center" },

  mobileHeaderSafe: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  mobileHeader: { height: 68, paddingHorizontal: 14, justifyContent: "center" },

  mobileNavSafe: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  mobileNav: { height: 68, flexDirection: "row", alignItems: "stretch", justifyContent: "space-around", paddingHorizontal: 2 },
  mobileNavItem: { flex: 1, alignItems: "center", justifyContent: "center", minWidth: 0 },
  mobileIconWrap: { width: 34, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mobileIconWrapActive: { backgroundColor: "#E8F5E9" },
  mobileNavText: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 3 },
  mobileNavTextActive: { color: "#2E7D32", fontWeight: "800" },

  moreBackdrop: { flex: 1, backgroundColor: "rgba(12,24,16,0.35)", justifyContent: "flex-end" },
  moreSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 },
  moreTitle: { fontSize: 19, lineHeight: 24, fontWeight: "800", color: "#17211B" },
  moreSubtitle: { fontSize: 12, color: "#65736A", marginTop: 2, marginBottom: 12 },
  moreItem: { height: 48, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, marginBottom: 6 },
  moreItemActive: { backgroundColor: "#E8F5E9" },
  moreItemText: { marginLeft: 13, fontSize: 14, fontWeight: "600", color: "#64748B" },
  moreItemTextActive: { color: "#2E7D32", fontWeight: "700" },
  moreClose: { height: 44, borderRadius: 11, backgroundColor: "#F3F7F1", alignItems: "center", justifyContent: "center", marginTop: 5 },
  moreCloseText: { fontSize: 13, fontWeight: "700", color: "#367C27" },
});
