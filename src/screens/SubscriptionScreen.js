import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Platform,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  doc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

/* ---------- MONTH HELPERS ---------- */

const formatMonth = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const parseMonth = (m) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1);
};

const monthLabel = (m) =>
  parseMonth(m).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

/* ---------- DELIVERY CALC ---------- */

const getDeliveredDays = async (customerId, month, plannedDays) => {
  const start = `${month}-01`;
  const end = `${month}-31`;

  const q = query(
    collection(db, "deliveries"),
    where("customerId", "==", customerId),
    where("date", ">=", start),
    where("date", "<=", end),
    where("status", "==", "missed")
  );

  const snap = await getDocs(q);
  return Math.max(plannedDays - snap.size, 0);
};

/* ---------- SCREEN ---------- */

export default function SubscriptionScreen() {
  const [selectedMonth, setSelectedMonth] = useState(
    formatMonth(new Date())
  );
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const [quantityPerDay, setQuantityPerDay] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [plannedDays, setPlannedDays] = useState("");

  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMode, setPaymentMode] = useState(null);

  /* ---------- LOAD CUSTOMERS ---------- */
  useEffect(() => {
    return onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
  }, []);

  /* ---------- LOAD SUBSCRIPTIONS ---------- */
  useEffect(() => {
    const q = query(
      collection(db, "subscriptions"),
      where("month", "==", selectedMonth)
    );

    return onSnapshot(q, (snap) => {
      setSubscriptions(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          paymentStatus: d.data().paymentStatus || "unpaid",
          paymentMode: d.data().paymentMode || null,
        }))
      );
    });
  }, [selectedMonth]);

  /* ---------- AUTO RECALC ---------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deliveries"), async () => {
      for (const sub of subscriptions) {
        const deliveredDays = await getDeliveredDays(
          sub.customerId,
          sub.month,
          sub.plannedDays
        );

        const perDay =
          sub.quantityPerDay * sub.pricePerLitre;
        const total = sub.plannedDays * perDay;
        const actual = deliveredDays * perDay;

        await updateDoc(doc(db, "subscriptions", sub.id), {
          deliveredDays,
          skippedDays: Math.max(
            sub.plannedDays - deliveredDays,
            0
          ),
          actualAmount: actual,
          carryForwardAmount: Math.max(total - actual, 0),
        });
      }
    });

    return unsub;
  }, [subscriptions]);

  /* ---------- MONTH PICKER HANDLER ---------- */

  const onMonthChange = (event, date) => {
    if (Platform.OS === "android") {
      setShowMonthPicker(false);
    }

    if (!date) return;

    setSelectedMonth(formatMonth(date));
  };

  /* ---------- FILTER CUSTOMERS ---------- */

  const subscribedCustomerIds = useMemo(
    () => subscriptions.map((s) => s.customerId),
    [subscriptions]
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.status === "active" &&
      !subscribedCustomerIds.includes(c.id) &&
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  /* ---------- SAVE ---------- */

  const saveSubscription = async () => {
    try {
      if (!selectedCustomer) {
        Alert.alert("Select customer");
        return;
      }

      const deliveredDays = await getDeliveredDays(
        selectedCustomer.id,
        selectedMonth,
        Number(plannedDays)
      );

      const perDay =
        Number(quantityPerDay) * Number(pricePerLitre);

      const total = Number(plannedDays) * perDay;
      const actual = deliveredDays * perDay;

      const payload = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        month: selectedMonth,
        quantityPerDay: Number(quantityPerDay),
        pricePerLitre: Number(pricePerLitre),
        plannedDays: Number(plannedDays),
        deliveredDays,
        skippedDays: Math.max(
          Number(plannedDays) - deliveredDays,
          0
        ),
        totalPlannedAmount: total,
        actualAmount: actual,
        carryForwardAmount: Math.max(total - actual, 0),
        paymentStatus,
        paymentMode:
          paymentStatus === "paid" ? paymentMode : null,
        paymentDate:
          paymentStatus === "paid" ? Date.now() : null,
      };

      if (editingSub) {
        await updateDoc(
          doc(db, "subscriptions", editingSub.id),
          payload
        );
      } else {
        await addDoc(collection(db, "subscriptions"), {
          ...payload,
          createdAt: Date.now(),
        });
      }

      setModalVisible(false);
    } catch (e) {
      Alert.alert("Save failed", e.message);
    }
  };

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscriptions</Text>
      </View>

      {/* MONTH BAR (BELOW HEADER) */}
      <TouchableOpacity
        style={styles.monthBar}
        onPress={() => setShowMonthPicker(true)}
      >
        <Text style={styles.monthText}>
          {monthLabel(selectedMonth)}
        </Text>
        <Text style={styles.monthAction}>Change</Text>
      </TouchableOpacity>

      {/* MONTH PICKER */}
      {showMonthPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={parseMonth(selectedMonth)}
          mode="date"
          display="calendar"
          onChange={onMonthChange}
        />
      )}

      {showMonthPicker && Platform.OS === "ios" && (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={parseMonth(selectedMonth)}
            mode="date"
            display="spinner"
            onChange={onMonthChange}
          />
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={subscriptions}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.customerName}</Text>
            <Text>
              {item.quantityPerDay} L × ₹{item.pricePerLitre}
            </Text>
            <Text>
              Delivered {item.deliveredDays}/{item.plannedDays}
            </Text>
            <Text style={styles.amount}>
              ₹{item.actualAmount.toFixed(2)}
            </Text>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: "#fff", fontSize: 26 }}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },

  header: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  monthBar: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
  },

  monthText: { fontSize: 16, fontWeight: "600" },
  monthAction: { color: "#2563EB", fontWeight: "600" },

  iosPicker: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
  },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 3,
  },

  name: { fontSize: 16, fontWeight: "700" },
  amount: { marginTop: 6, color: "#15803D", fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2E7D32",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});
