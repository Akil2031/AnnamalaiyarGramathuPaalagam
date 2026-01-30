import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from "react-native";

import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

/* ---------- HELPERS ---------- */

const today = new Date();
const { width } = Dimensions.get("window");
const CELL_SIZE = (width - 32 - 6 * 6) / 7; // perfect 7 columns

const formatMonth = (y, m) =>
  `${y}-${String(m).padStart(2, "0")}`;

const getDaysInMonth = (y, m) =>
  new Date(y, m, 0).getDate();

const getDateKey = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const isFuture = (dateStr) =>
  dateStr > today.toISOString().slice(0, 10);

const monthLabel = (y, m) =>
  new Date(y, m - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

/* ---------- SCREEN ---------- */

export default function CalendarScreen() {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [deliveries, setDeliveries] = useState([]);

  const [customerModal, setCustomerModal] = useState(false);
  const [search, setSearch] = useState("");

  const monthKey = formatMonth(year, month);

  /* 🔹 LOAD CUSTOMERS */
  useEffect(() => {
    return onSnapshot(collection(db, "customers"), snap => {
      setCustomers(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    });
  }, []);

  /* 🔹 LOAD DELIVERIES */
  useEffect(() => {
    if (!selectedCustomer) return;

    const q = query(
      collection(db, "deliveries"),
      where("customerId", "==", selectedCustomer.id),
      where("date", ">=", `${monthKey}-01`),
      where("date", "<=", `${monthKey}-31`)
    );

    return onSnapshot(q, snap => {
      setDeliveries(snap.docs.map(d => d.data()));
    });
  }, [selectedCustomer, monthKey]);

  /* 📅 BUILD CALENDAR */
  const daysInMonth = getDaysInMonth(year, month);

  // ONLY the important changed part shown

const calendarData = Array.from({ length: daysInMonth }, (_, i) => {
  const day = i + 1;
  const date = getDateKey(year, month, day);

  const missed = deliveries.some((d) => d.date === date);

  return {
    day,
    date,
    delivered: !missed,
    missed,
    disabled: isFuture(date),
  };
});


  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      {/* 🌈 HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => {
            if (month === 1) {
              setYear(y => y - 1);
              setMonth(12);
            } else setMonth(m => m - 1);
          }}
        >
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {monthLabel(year, month)}
        </Text>

        <TouchableOpacity
          disabled={
            year > today.getFullYear() ||
            (year === today.getFullYear() &&
              month >= today.getMonth() + 1)
          }
          onPress={() => {
            if (month === 12) {
              setYear(y => y + 1);
              setMonth(1);
            } else setMonth(m => m + 1);
          }}
        >
          <Text style={styles.nav}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 👤 CUSTOMER DROPDOWN */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setCustomerModal(true)}
      >
        <Text style={styles.dropdownText}>
          {selectedCustomer ? selectedCustomer.name : "Select customer"}
        </Text>
      </TouchableOpacity>

      {/* 📅 CALENDAR */}
      {selectedCustomer && (
        <>
          <View style={styles.legend}>
            <Text>🟢 Delivered</Text>
            <Text style={{ marginLeft: 16 }}>🔴 Skipped</Text>
          </View>

          <FlatList
            data={calendarData}
            numColumns={7}
            keyExtractor={item => item.date}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <View
                style={[
                styles.dayBox,
                item.missed ? styles.skipped : styles.delivered,
                item.disabled && styles.disabled,
                ]}
  >
  <Text style={styles.dayText}>{item.day}</Text>
</View>

            )}
          />
        </>
      )}

      {/* 👤 CUSTOMER MODAL */}
      <Modal visible={customerModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Customer</Text>

            <TextInput
              style={styles.search}
              placeholder="Search customer"
              value={search}
              onChangeText={setSearch}
            />

            <FlatList
              data={filteredCustomers}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerRow}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModal(false);
                    setSearch("");
                  }}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              onPress={() => setCustomerModal(false)}
            >
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },

  topHeader: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  nav: { color: "#fff", fontSize: 18 },

  dropdown: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
  },

  dropdownText: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "600",
  },

  legend: {
    flexDirection: "row",
    marginLeft: 16,
    marginBottom: 8,
  },

  dayBox: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 3,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  delivered: { backgroundColor: "#66BB6A" },
  skipped: { backgroundColor: "#EF5350" },
  disabled: { opacity: 0.35 },

  dayText: { fontWeight: "700" },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  search: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },

  customerRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  close: {
    textAlign: "center",
    marginTop: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
});
