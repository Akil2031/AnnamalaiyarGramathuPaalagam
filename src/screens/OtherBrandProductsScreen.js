import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import AppText from "../components/AppText";
import BrandInventoryScreen from "./BrandInventoryScreen";
import BrandSalesScreen from "./BrandSalesScreen";

export default function OtherBrandProductsScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [tab, setTab] = useState("Inventory");

  return (
    <View style={styles.container}>
      <View style={[styles.tabs, mobile && styles.tabsMobile]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setTab("Inventory")}
          style={[styles.tab, mobile && styles.tabMobile, tab === "Inventory" && styles.tabActive]}
        >
          <AppText style={[styles.tabText, tab === "Inventory" && styles.tabTextActive]}>
            Inventory
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setTab("Sales")}
          style={[styles.tab, mobile && styles.tabMobile, tab === "Sales" && styles.tabActive]}
        >
          <AppText style={[styles.tabText, tab === "Sales" && styles.tabTextActive]}>
            Sales & Margin
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {tab === "Inventory" ? <BrandInventoryScreen /> : <BrandSalesScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F7F1" },
  tabs: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2EAE1",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 18,
    gap: 8,
  },
  tab: {
    height: 46,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#63B83F" },
  tabsMobile: { height: 48, paddingHorizontal: 8, gap: 0 },
  tabMobile: { height: 44, paddingHorizontal: 14, borderBottomWidth: 2 },
  tabText: { fontSize: 13, fontWeight: "600", color: "#65736A" },
  tabTextActive: { color: "#367C27", fontWeight: "800" },
  body: { flex: 1 },
});
