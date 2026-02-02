import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";

import ScreenWrapper from "../components/ScreenWrapper";

import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

/* ---------- HELPERS ---------- */

const today = new Date();
const todayStr = today.toISOString().slice(0, 10);

const { width } = Dimensions.get("window");
const CELL_SIZE = (width - 32 - 6 * 6) / 7;

const formatMonth = (y, m) =>
  `${y}-${String(m).padStart(2, "0")}`;

const getDaysInMonth = (y, m) =>
  new Date(y, m, 0).getDate();

const getDateKey = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const isFuture = (dateStr) => dateStr > todayStr;

const monthLabel = (y, m) =>
  new Date(y, m - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

/* ---------- SCREEN ---------- */

export default function CalendarScreen() {
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [deliveries, setDeliveries] = useState([]);

  const [customerModal, setCustomerModal] = useState(false);
  const [search, setSearch] = useState("");

  const monthKey = formatMonth(year, month);

  /* ---------- LOAD SUBSCRIPTIONS (MONTH ONLY) ---------- */
  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "subscriptions"),
        where("month", "==", monthKey)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            customerId: d.data().customerId,
            customerName: d.data().customerName,
          }))
          .sort((a, b) =>
            a.customerName.localeCompare(b.customerName)
          );

        setSubscriptions(list);

        // reset selected customer if month changes
        setSelectedCustomer(null);
      }
    );
  }, [monthKey]);

  /* ---------- LOAD DELIVERIES FOR CUSTOMER ---------- */
  useEffect(() => {
    if (!selectedCustomer) return;

    return onSnapshot(
      query(
        collection(db, "deliveries"),
        where("customerId", "==", selectedCustomer.customerId),
        where("date", ">=", `${monthKey}-01`),
        where("date", "<=", `${monthKey}-31`)
      ),
      (snap) => {
        setDeliveries(
          snap.docs.map((d) => d.data())
        );
      }
    );
  }, [selectedCustomer, monthKey]);

  /* ---------- CALENDAR DATA ---------- */

  const daysInMonth = getDaysInMonth(year, month);

  const calendarData = Array.from(
    { length: daysInMonth },
    (_, i) => {
      const day = i + 1;
      const date = getDateKey(year, month, day);

      const missed = deliveries.some(
        (d) => d.date === date && d.status === "missed"
      );

      return {
        day,
        date,
        missed,
        delivered: !missed,
        disabled: isFuture(date),
      };
    }
  );

  /* ---------- CUSTOMER FILTER ---------- */

  const filteredCustomers = useMemo(() => {
    return subscriptions.filter((c) =>
      c.customerName
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [subscriptions, search]);

  /* ---------- UI ---------- */

  return (
    <ScreenWrapper>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Delivery Calendar
        </Text>
      </View>

      {/* MONTH BAR */}
      <View style={styles.monthBar}>
        <TouchableOpacity
          onPress={() => {
            if (month === 1) {
              setYear((y) => y - 1);
              setMonth(12);
            } else {
              setMonth((m) => m - 1);
            }
          }}
        >
          <Text style={styles.monthNav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.monthText}>
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
              setYear((y) => y + 1);
              setMonth(1);
            } else {
              setMonth((m) => m + 1);
            }
          }}
        >
          <Text
            style={[
              styles.monthNav,
              (year > today.getFullYear() ||
                (year === today.getFullYear() &&
                  month >= today.getMonth() + 1)) &&
                styles.navDisabled,
            ]}
          >
            ▶
          </Text>
        </TouchableOpacity>
      </View>

      {/* CUSTOMER SELECT */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setCustomerModal(true)}
      >
        <Text style={styles.dropdownText}>
          {selectedCustomer
            ? selectedCustomer.customerName
            : "Select customer"}
        </Text>
      </TouchableOpacity>

      {/* CALENDAR */}
      {selectedCustomer && (
        <>
          <View style={styles.legend}>
            <Text>🟢 Delivered</Text>
            <Text style={{ marginLeft: 16 }}>
              🔴 Missed
            </Text>
          </View>

          <FlatList
            data={calendarData}
            numColumns={7}
            keyExtractor={(i) => i.date}
            contentContainerStyle={{
              paddingHorizontal: 16,
            }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.dayBox,
                  item.missed
                    ? styles.skipped
                    : styles.delivered,
                  item.disabled && styles.disabled,
                ]}
              >
                <Text style={styles.dayText}>
                  {item.day}
                </Text>
              </View>
            )}
          />
        </>
      )}

      {/* CUSTOMER MODAL */}
      <Modal visible={customerModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Select Customer
            </Text>

            <TextInput
              style={styles.search}
              placeholder="Search customer"
              value={search}
              onChangeText={setSearch}
            />

            <FlatList
              data={filteredCustomers}
              keyExtractor={(i) => i.customerId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerRow}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModal(false);
                    setSearch("");
                  }}
                >
                  <Text>{item.customerName}</Text>
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
    </ScreenWrapper>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2E7D32",
    padding: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  monthBar: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },

  monthText: {
    fontSize: 16,
    fontWeight: "700",
  },

  monthNav: {
    fontSize: 18,
    color: "#2563EB",
  },

  navDisabled: { opacity: 0.4 },

  dropdown: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
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
