import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "../screens/DashboardScreen";
import CustomersScreen from "../screens/CustomersScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import CalendarScreen from "../screens/CalendarScreen";
import DeliveryScreen from "../screens/DeliveryScreen";
import DailySalesScreen from "../screens/DailySalesScreen";
import ExpensesScreen from "../screens/ExpensesScreen";

const MENU_ITEMS = [
  {
    key: "Dashboard",
    label: "Dashboard",
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    key: "Customers",
    label: "Customers",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    key: "Subscription",
    label: "Subscriptions",
    icon: "repeat-outline",
    activeIcon: "repeat",
  },
  {
    key: "Calendar",
    label: "Calendar",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    key: "Delivery",
    label: "Delivery",
    icon: "bicycle-outline",
    activeIcon: "bicycle",
  },
  {
    key: "DailyBusiness",
    label: "Daily Business",
    icon: "today-outline",
    activeIcon: "today",
  },
  {
    key: "Expenses",
    label: "Expenses",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
];

const MOBILE_ITEMS = [
  "Dashboard",
  "Customers",
  "Subscription",
  "Delivery",
  "DailyBusiness",
  "Expenses",
];

export default function AppShell() {
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= 900;

  const [activeScreen, setActiveScreen] = useState("Dashboard");

  const renderScreen = () => {
    switch (activeScreen) {
      case "Customers":
        return <CustomersScreen />;

      case "Subscription":
        return <SubscriptionScreen />;

      case "Calendar":
        return <CalendarScreen />;

      case "Delivery":
        return <DeliveryScreen />;

      case "DailyBusiness":
        return <DailySalesScreen />;

      case "Expenses":
        return <ExpensesScreen />;

      case "Dashboard":
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <View style={styles.root}>
      {isDesktop && (
        <Sidebar
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
        />
      )}

      <View style={styles.main}>
        <TopHeader
          activeScreen={activeScreen}
          isDesktop={isDesktop}
        />

        <View style={styles.content}>{renderScreen()}</View>

        {!isDesktop && (
          <MobileNavigation
            activeScreen={activeScreen}
            setActiveScreen={setActiveScreen}
          />
        )}
      </View>
    </View>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ activeScreen, setActiveScreen }) {
  return (
    <View style={styles.sidebar}>
      {/* BRAND */}
      <View style={styles.brandArea}>
        <View style={styles.logoCircle}>
          <Ionicons name="water" size={27} color="#FFFFFF" />
        </View>

        <View>
          <Text style={styles.brandTitle}>AGP Milk</Text>
          <Text style={styles.brandSubtitle}>
            Milk Subscription
          </Text>
        </View>
      </View>

      {/* MENU */}
      <View style={styles.menu}>
        <Text style={styles.menuHeading}>MAIN MENU</Text>

        {MENU_ITEMS.map((item) => {
          const active = activeScreen === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                active && styles.menuItemActive,
              ]}
              onPress={() => setActiveScreen(item.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={21}
                color={active ? "#2E7D32" : "#64748B"}
              />

              <Text
                style={[
                  styles.menuText,
                  active && styles.menuTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* BOTTOM */}
      <View style={styles.sidebarBottom}>
        <View style={styles.businessBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color="#2E7D32"
          />

          <Text style={styles.businessBadgeText}>
            Secure Business App
          </Text>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   TOP HEADER
========================================================= */

function TopHeader({ activeScreen, isDesktop }) {
  const item = MENU_ITEMS.find(
    (x) => x.key === activeScreen
  );

  return (
    <View style={styles.topHeader}>
      <View>
        <Text style={styles.pageTitle}>
          {item?.label || "Dashboard"}
        </Text>

        <Text style={styles.pageSubtitle}>
          {activeScreen === "Dashboard"
            ? "Your milk business at a glance"
            : `Manage your ${item?.label?.toLowerCase() || "business"}`}
        </Text>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#334155"
          />
        </TouchableOpacity>

        <View style={styles.profile}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>A</Text>
          </View>

          {isDesktop && (
            <View>
              <Text style={styles.profileName}>Admin</Text>
              <Text style={styles.profileRole}>
                Administrator
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function MobileNavigation({
  activeScreen,
  setActiveScreen,
}) {
  return (
    <View style={styles.mobileNav}>
      {MOBILE_ITEMS.map((key) => {
        const item = MENU_ITEMS.find(
          (x) => x.key === key
        );

        const active = activeScreen === key;

        return (
          <TouchableOpacity
            key={key}
            style={styles.mobileNavItem}
            onPress={() => setActiveScreen(key)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.mobileIconWrap,
                active && styles.mobileIconWrapActive,
              ]}
            >
              <Ionicons
                name={
                  active
                    ? item.activeIcon
                    : item.icon
                }
                size={21}
                color={
                  active
                    ? "#2E7D32"
                    : "#94A3B8"
                }
              />
            </View>

            <Text
              style={[
                styles.mobileNavText,
                active &&
                  styles.mobileNavTextActive,
              ]}
            >
              {key === "Subscription"
                ? "Plans"
                : key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F6F8F6",
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  /* ---------- SIDEBAR ---------- */

  sidebar: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },

  brandArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 38,
  },

  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  brandTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#17211B",
  },

  brandSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

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

  menuItemActive: {
    backgroundColor: "#E8F5E9",
  },

  menuText: {
    marginLeft: 13,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  menuTextActive: {
    color: "#2E7D32",
    fontWeight: "700",
  },

  sidebarBottom: {
    marginTop: "auto",
  },

  businessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8F3",
    padding: 11,
    borderRadius: 12,
  },

  businessBadgeText: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "#4B6350",
  },

  /* ---------- HEADER ---------- */

  topHeader: {
    height: 82,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#17211B",
  },

  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  profileAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2E7D32",
  },

  profileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17211B",
  },

  profileRole: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },

  /* ---------- MOBILE ---------- */

  mobileNav: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 2,
  },

  mobileNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileIconWrap: {
    width: 34,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  mobileIconWrapActive: {
    backgroundColor: "#E8F5E9",
  },

  mobileNavText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 3,
  },

  mobileNavTextActive: {
    color: "#2E7D32",
    fontWeight: "800",
  },
});