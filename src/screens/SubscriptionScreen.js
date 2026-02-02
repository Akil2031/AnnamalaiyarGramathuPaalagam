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

/* ---------- DELIVERY STATS ---------- */

const getDeliveryStats = async (customerId, month) => {
  const q = query(
    collection(db, "deliveries"),
    where("customerId", "==", customerId),
    where("date", ">=", `${month}-01`),
    where("date", "<=", `${month}-31`)
  );

  const snap = await getDocs(q);

  let delivered = 0;
  let missed = 0;

  snap.forEach((d) => {
    if (d.data().status === "delivered") delivered++;
    if (d.data().status === "missed") missed++;
  });

  return { delivered, missed };
};

/* ---------- SCREEN ---------- */

export default function SubscriptionScreen() {
  const [selectedMonth, setSelectedMonth] = useState(
    formatMonth(new Date())
  );
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const [quantityPerDay, setQuantityPerDay] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [plannedDays, setPlannedDays] = useState("");

  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMode, setPaymentMode] = useState(null);

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
          deliveredDays: 0,
          skippedDays: 0,
          actualAmount: 0,
          carryForwardAmount: 0,
          paymentStatus: "pending",
          ...d.data(),
        }))
      );
    });
  }, [selectedMonth]);

  /* ---------- LOAD CUSTOMERS ---------- */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "customers"), where("status", "==", "active")),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(list);
      }
    );
  }, []);

  /* ---------- AUTO RECALC FROM DELIVERY ---------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deliveries"), async () => {
      for (const sub of subscriptions) {
        const { delivered, missed } = await getDeliveryStats(
          sub.customerId,
          sub.month
        );

        const perDay =
          sub.quantityPerDay * sub.pricePerLitre;

        const total = sub.plannedDays * perDay;
        const actual = delivered * perDay;

        await updateDoc(doc(db, "subscriptions", sub.id), {
          deliveredDays: delivered,
          skippedDays: missed,
          actualAmount: actual,
          carryForwardAmount: Math.max(total - actual, 0),
        });
      }
    });

    return unsub;
  }, [subscriptions]);

  /* ---------- FILTER CUSTOMERS ---------- */

  const subscribedCustomerIds = useMemo(
    () =>
      subscriptions
        .filter((s) => s.id !== editingSub?.id)
        .map((s) => s.customerId),
    [subscriptions, editingSub]
  );

  const filteredCustomers = customers.filter(
    (c) =>
      !subscribedCustomerIds.includes(c.id) &&
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  /* ---------- MONTH PICKER ---------- */

  const onMonthChange = (event, date) => {
    if (Platform.OS === "android") {
      setShowMonthPicker(false);
      if (event.type === "dismissed") return;
    }
    if (!date) return;
    setSelectedMonth(formatMonth(date));
  };

  /* ---------- OPEN MODAL ---------- */

  const openAdd = () => {
    setEditingSub(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setQuantityPerDay("");
    setPricePerLitre("");
    setPlannedDays("");
    setPaymentStatus("pending");
    setPaymentMode(null);
    setModalVisible(true);
  };

  const openEdit = (sub) => {
    setEditingSub(sub);
    setSelectedCustomer({
      id: sub.customerId,
      name: sub.customerName,
    });
    setCustomerSearch(sub.customerName);
    setQuantityPerDay(String(sub.quantityPerDay));
    setPricePerLitre(String(sub.pricePerLitre));
    setPlannedDays(String(sub.plannedDays));
    setPaymentStatus(sub.paymentStatus || "pending");
    setPaymentMode(sub.paymentMode || null);
    setModalVisible(true);
  };

  /* ---------- SAVE ---------- */

  const saveSubscription = async () => {
    if (!selectedCustomer || !quantityPerDay || !pricePerLitre || !plannedDays) {
      Alert.alert("Fill all fields");
      return;
    }

    const { delivered, missed } = await getDeliveryStats(
      selectedCustomer.id,
      selectedMonth
    );

    const perDay = quantityPerDay * pricePerLitre;
    const total = plannedDays * perDay;
    const actual = delivered * perDay;

    const payload = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      month: selectedMonth,

      quantityPerDay: Number(quantityPerDay),
      pricePerLitre: Number(pricePerLitre),
      plannedDays: Number(plannedDays),

      deliveredDays: delivered,
      skippedDays: missed,

      totalPlannedAmount: total,
      actualAmount: actual,
      carryForwardAmount: Math.max(total - actual, 0),

      paymentStatus,
      paymentMode: paymentStatus === "paid" ? paymentMode : null,
      paymentDate: paymentStatus === "paid" ? Date.now() : null,
    };

    if (editingSub) {
      await updateDoc(doc(db, "subscriptions", editingSub.id), payload);
    } else {
      await addDoc(collection(db, "subscriptions"), {
        ...payload,
        createdAt: Date.now(),
      });
    }

    setModalVisible(false);
  };

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscriptions</Text>
      </View>

      <TouchableOpacity
        style={styles.monthBar}
        onPress={() => setShowMonthPicker(true)}
      >
        <Text style={styles.monthText}>{monthLabel(selectedMonth)}</Text>
        <Text style={styles.monthAction}>Change</Text>
      </TouchableOpacity>

      {showMonthPicker && (
        <DateTimePicker
          value={parseMonth(selectedMonth)}
          mode="date"
          display="calendar"
          onChange={onMonthChange}
        />
      )}

      <FlatList
        data={subscriptions}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.customerName}</Text>
              <Text
                style={[
                  styles.badge,
                  item.paymentStatus === "paid" ? styles.paid : styles.unpaid,
                ]}
              >
                {item.paymentStatus.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.meta}>
              Expected: {item.plannedDays} | Delivered: {item.deliveredDays}
            </Text>

            <Text style={styles.amount}>₹ {item.actualAmount.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={{ color: "#fff", fontSize: 26 }}>＋</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingSub ? "Edit" : "Add"} Subscription
            </Text>

            {!editingSub && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search customer"
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                />

                <FlatList
                  data={filteredCustomers}
                  keyExtractor={(i) => i.id}
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.customerRow}
                      onPress={() => {
                        setSelectedCustomer(item);
                        setCustomerSearch(item.name);
                      }}
                    >
                      <Text>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Quantity per day"
              keyboardType="numeric"
              value={quantityPerDay}
              onChangeText={setQuantityPerDay}
            />

            <TextInput
              style={styles.input}
              placeholder="Price per litre"
              keyboardType="numeric"
              value={pricePerLitre}
              onChangeText={setPricePerLitre}
            />

            <TextInput
              style={styles.input}
              placeholder="Planned days"
              keyboardType="numeric"
              value={plannedDays}
              onChangeText={setPlannedDays}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={saveSubscription}>
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },
  header: { backgroundColor: "#2E7D32", padding: 16 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },

  monthBar: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  monthText: { fontSize: 16, fontWeight: "600" },
  monthAction: { color: "#2563EB", fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: { fontSize: 16, fontWeight: "700" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
    fontSize: 12,
  },

  paid: { backgroundColor: "#DCFCE7", color: "#15803D" },
  unpaid: { backgroundColor: "#FEE2E2", color: "#DC2626" },

  meta: { color: "#64748B", marginTop: 4 },
  amount: { marginTop: 6, fontWeight: "700", color: "#15803D" },

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
  },

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
  },

  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  customerRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 16,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 6,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#2E7D32",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
