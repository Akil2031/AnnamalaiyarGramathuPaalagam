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
} from "react-native";

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

const addMonths = (m, delta) => {
  const d = parseMonth(m);
  d.setMonth(d.getMonth() + delta);
  return formatMonth(d);
};

const monthLabel = (m) =>
  parseMonth(m).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

/* ---------- DELIVERY CALC (MISSED-ONLY MODEL) ---------- */

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
  const missedDays = snap.size;

  return Math.max(plannedDays - missedDays, 0);
};

/* ---------- SCREEN ---------- */

export default function SubscriptionScreen() {
  const [selectedMonth, setSelectedMonth] = useState(
    formatMonth(new Date())
  );

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

  /* ---------- AUTO RECALC ON DELIVERY CHANGE ---------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deliveries"), async () => {
      for (const sub of subscriptions) {
        const deliveredDays = await getDeliveredDays(
          sub.customerId,
          sub.month,
          sub.plannedDays
        );

        const dayAmount =
          sub.quantityPerDay * sub.pricePerLitre;

        const totalPlannedAmount =
          sub.plannedDays * dayAmount;

        const actualAmount =
          deliveredDays * dayAmount;

        const carryForwardAmount =
          totalPlannedAmount - actualAmount;

        await updateDoc(doc(db, "subscriptions", sub.id), {
          deliveredDays,
          skippedDays: Math.max(
            sub.plannedDays - deliveredDays,
            0
          ),
          actualAmount,
          carryForwardAmount:
            carryForwardAmount > 0 ? carryForwardAmount : 0,
        });
      }
    });

    return unsub;
  }, [subscriptions]);

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

  /* ---------- MODAL HELPERS ---------- */

  const openCreate = () => {
    setEditingSub(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setQuantityPerDay("");
    setPricePerLitre("");
    setPlannedDays("");
    setPaymentStatus("unpaid");
    setPaymentMode(null);
    setModalVisible(true);
  };

  const openEdit = (sub) => {
    setEditingSub(sub);
    setSelectedCustomer({
      id: sub.customerId,
      name: sub.customerName,
    });
    setQuantityPerDay(String(sub.quantityPerDay));
    setPricePerLitre(String(sub.pricePerLitre));
    setPlannedDays(String(sub.plannedDays));
    setPaymentStatus(sub.paymentStatus || "unpaid");
    setPaymentMode(sub.paymentMode || null);
    setModalVisible(true);
  };

  /* ---------- SAVE ---------- */

  const saveSubscription = async () => {
    try {
      if (!selectedCustomer) {
        Alert.alert("Select customer");
        return;
      }

      if (
        Number(quantityPerDay) <= 0 ||
        Number(pricePerLitre) <= 0 ||
        Number(plannedDays) <= 0
      ) {
        Alert.alert("Invalid values");
        return;
      }

      if (paymentStatus === "paid" && !paymentMode) {
        Alert.alert("Select payment mode");
        return;
      }

      const deliveredDays = await getDeliveredDays(
        selectedCustomer.id,
        selectedMonth,
        Number(plannedDays)
      );

      const dayAmount =
        Number(quantityPerDay) * Number(pricePerLitre);

      const totalPlannedAmount =
        Number(plannedDays) * dayAmount;

      const actualAmount =
        deliveredDays * dayAmount;

      const carryForwardAmount =
        totalPlannedAmount - actualAmount;

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

        totalPlannedAmount,
        actualAmount,
        carryForwardAmount:
          carryForwardAmount > 0 ? carryForwardAmount : 0,

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

  /* ---------- RENDER ---------- */

  const renderItem = ({ item }) => {
    const status = item.paymentStatus || "unpaid";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.customerName}</Text>
          <Text
            style={[
              styles.badge,
              status === "paid" ? styles.paid : styles.unpaid,
            ]}
          >
            {status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.meta}>
          {item.quantityPerDay} L × ₹{item.pricePerLitre}
        </Text>

        <Text>Planned: {item.plannedDays}</Text>
        <Text>Delivered: {item.deliveredDays}</Text>

        <Text style={styles.amount}>
          Actual ₹{item.actualAmount.toFixed(2)}
        </Text>

        {item.carryForwardAmount > 0 && (
          <Text style={styles.carry}>
            Carry Forward ₹{item.carryForwardAmount.toFixed(2)}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(item)}>
            <Text style={styles.edit}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Delete?", "", [
                { text: "Cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () =>
                    deleteDoc(
                      doc(db, "subscriptions", item.id)
                    ),
                },
              ])
            }
          >
            <Text style={styles.delete}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => setSelectedMonth((m) => addMonths(m, -1))}
        >
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {monthLabel(selectedMonth)}
        </Text>

        <TouchableOpacity
          onPress={() => setSelectedMonth((m) => addMonths(m, 1))}
        >
          <Text style={styles.nav}>▶</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={subscriptions}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={{ color: "#fff", fontSize: 26 }}>＋</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingSub ? "Edit" : "New"} Subscription
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
                  style={{ maxHeight: 140 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.customerRow,
                        selectedCustomer?.id === item.id &&
                          styles.selectedCustomer,
                      ]}
                      onPress={() => setSelectedCustomer(item)}
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

            {/* PAYMENT STATUS */}
            <View style={styles.paymentToggle}>
              {["paid", "unpaid"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.payBtn,
                    paymentStatus === s &&
                      (s === "paid"
                        ? styles.payBtnPaid
                        : styles.payBtnUnpaid),
                  ]}
                  onPress={() => {
                    setPaymentStatus(s);
                    if (s === "unpaid") setPaymentMode(null);
                  }}
                >
                  <Text style={styles.payText}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PAYMENT MODE */}
            {paymentStatus === "paid" && (
              <View style={styles.paymentToggle}>
                {["cash", "online"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.payBtn,
                      paymentMode === m && styles.payBtnPaid,
                    ]}
                    onPress={() => setPaymentMode(m)}
                  >
                    <Text style={styles.payText}>
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={saveSubscription}
              >
                <Text style={{ color: "#fff" }}>
                  {editingSub ? "Update" : "Save"}
                </Text>
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

  topHeader: {
  backgroundColor: "#2E7D32",

  paddingHorizontal: 16,
  paddingBottom: 16,   // ❗ NO paddingTop

  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  borderBottomLeftRadius: 24,
  borderBottomRightRadius: 24,
},


  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  nav: { color: "#fff", fontSize: 18 },

  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: { fontSize: 16, fontWeight: "700" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  paid: { backgroundColor: "#DCFCE7", color: "#15803D" },
  unpaid: { backgroundColor: "#FEE2E2", color: "#DC2626" },

  meta: { color: "#64748B", marginTop: 4 },
  amount: { marginTop: 6, fontWeight: "700", color: "#15803D" },
  carry: { color: "#DC2626", marginTop: 4 },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  edit: { color: "#2563EB", marginRight: 16 },
  delete: { color: "#DC2626" },

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

  modalTitle: { fontWeight: "700", marginBottom: 10 },

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

  selectedCustomer: { backgroundColor: "#DBEAFE" },

  paymentToggle: {
    flexDirection: "row",
    marginTop: 12,
  },

  payBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
    borderColor: "#CBD5E1",
  },

  payBtnPaid: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },

  payBtnUnpaid: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },

  payText: {
    fontWeight: "700",
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 16,
  },

  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },

  cancelBtn: { backgroundColor: "#E5E7EB" },
  saveBtn: { backgroundColor: "#2E7D32" },
});
