import React, { useEffect, useMemo, useState } from "react";
import { Animated, Linking, AppState } from "react-native";

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
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  doc,
  getDocs,
} from "firebase/firestore";

/* ---------- HELPERS ---------- */

const formatMonth = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const toDateInput = (tsOrStr) => {
  if (!tsOrStr) return "";
  if (typeof tsOrStr === "string") return tsOrStr;
  return new Date(tsOrStr).toISOString().slice(0, 10);
};

const monthLabel = (m) =>
  new Date(`${m}-01`).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

const todayStr = new Date().toISOString().slice(0, 10);

/* ---------- MESSAGE HELPERS (FREE WHATSAPP + SMS) ---------- */

const buildSubscriptionMessage = (sub) => {
  const total = ((sub.quantityPerDay || 0) * (sub.pricePerLitre || 0) * (sub.plannedDays || 0)).toFixed(2);

  return `Dear ${sub.customerName},

Your milk subscription for ${monthLabel(
    sub.month
  )} is created.

Qty/day: ${sub.quantityPerDay} L
Price per: ₹${sub.pricePerLitre}
Days: ${sub.plannedDays}

Total Amount: ₹${total}

Pay via UPI: 9710527964@yescred

Thank you 
Annamalaiyar Gramathu Paalagam 🙏`;
};

const openWhatsApp = (mobile, message) => {
  if (!mobile) return;
  const url = `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;
  Linking.openURL(url);
};

const openSMS = (mobile, message) => {
  if (!mobile) return;
  const url = `sms:${mobile}?body=${encodeURIComponent(message)}`;
  Linking.openURL(url);
};

const makeCall = (mobile) => {
  if (!mobile) return;
  Linking.openURL(`tel:${mobile}`);
};

/* ---------- DELIVERY STATS ---------- */

const getDeliveryStats = async (customerId, month, subscriptionEndDate) => {
  const monthStart = `${month}-01`;
    const currentMonth = todayStr.slice(0, 7);

    /* ✅ FUTURE MONTH GUARD */
  if (month > currentMonth) {
    return { missed: 0, possibleDays: 0 };
  }

  let monthEnd = month === todayStr.slice(0, 7) ? todayStr : `${month}-31`;

  if (subscriptionEndDate) {
    monthEnd = monthEnd > subscriptionEndDate ? subscriptionEndDate : monthEnd;
  }

  if (monthEnd < monthStart) {
    return { missed: 0, possibleDays: 0 };
  }

  const missedSnap = await getDocs(
    query(
      collection(db, "deliveries"),
      where("customerId", "==", customerId),
      where("status", "==", "missed"),
      where("date", ">=", monthStart),
      where("date", "<=", monthEnd)
    )
  );

  const missed = missedSnap.size;

  const startDate = new Date(monthStart);
  const endDate = new Date(monthEnd);

  const possibleDays = Math.floor((endDate - startDate) / 86400000) + 1;

  return { missed, possibleDays };
};

/* ---------- SCREEN ---------- */

export default function SubscriptionScreen() {
  const [selectedMonth, setSelectedMonth] = useState(formatMonth(new Date()));

  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [quantityPerDay, setQuantityPerDay] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [plannedDays, setPlannedDays] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [waitingForSmsReturn, setWaitingForSmsReturn] = useState(false);
  const [lastMsg, setLastMsg] = useState("");
  const [lastMobile, setLastMobile] = useState("");

  /* ---------- LOAD SUBSCRIPTIONS ---------- */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "subscriptions"), where("month", "==", selectedMonth)),
      (snap) => {
        setSubscriptions(
          snap.docs.map((d) => ({
            id: d.id,
            plannedAmount: 0,
            actualAmount: 0,
            balanceAmount: 0,
            carryForwardAmount: 0,
            deliveredDays: 0,
            skippedDays: 0,
            paymentStatus: "pending",
            paidAmount: 0,
            paymentMode: null,
            paymentDate: null,
            ...d.data(),
          }))
        );
      }
    );
  }, [selectedMonth]);

  /* ---------- LOAD CUSTOMERS ---------- */
  useEffect(() => {
    return onSnapshot(query(collection(db, "customers"), where("status", "==", "active")), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(list);
    });
  }, []);

  /* ---------- AUTO RECALC ---------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deliveries"), async () => {
      for (const sub of subscriptions) {

  const currentMonth = todayStr.slice(0, 7);

  /* ✅ FUTURE MONTH HARD STOP */
  if (sub.month > currentMonth) {
    await updateDoc(doc(db, "subscriptions", sub.id), {
      deliveredDays: 0,
      skippedDays: 0,
      actualAmount: 0,
      balanceAmount: 0,
      carryForwardAmount: sub.paidAmount || 0,
      paymentStatus: sub.paidAmount > 0 ? "paid" : "pending",
    });
    continue;
  }

  const { missed, possibleDays } = await getDeliveryStats(sub.customerId, sub.month, sub.endDate);

  const delivered = Math.max(Math.min(possibleDays, sub.plannedDays) - missed, 0);

  const perDay = sub.quantityPerDay * sub.pricePerLitre;

  const plannedAmount = sub.plannedDays * perDay;
  const actualAmount = delivered * perDay;
  const paid = sub.paidAmount || 0;

  await updateDoc(doc(db, "subscriptions", sub.id), {
          deliveredDays: delivered,
          skippedDays: missed,
          plannedAmount,
          actualAmount,
          balanceAmount: Math.max(actualAmount - paid, 0),
          carryForwardAmount: Math.max(paid - actualAmount, 0),
          paymentStatus: paid === 0 ? "pending" : paid < actualAmount ? "partial" : "paid",
        });
      }
    });

    return unsub;
  }, [subscriptions]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && waitingForSmsReturn) {
        setWaitingForSmsReturn(false);

        Alert.alert("Send WhatsApp also?", "Send subscription details via WhatsApp", [
          { text: "Send WhatsApp", onPress: () => openWhatsApp(lastMobile, lastMsg) },
          { text: "Skip", style: "cancel" },
        ]);
      }
    });

    return () => sub.remove();
  }, [waitingForSmsReturn, lastMsg, lastMobile]);

  /* ---------- FILTER + SORT ---------- */

  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((s) => s.customerName.toLowerCase().includes(search.toLowerCase()))
      .filter((s) => (paymentFilter === "all" ? true : s.paymentStatus === paymentFilter))
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [subscriptions, search, paymentFilter]);

  const subscriptionCount = useMemo(() => filteredSubscriptions.length, [filteredSubscriptions]);

  const monthlySummary = useMemo(() => {
    return filteredSubscriptions.reduce(
      (acc, s) => {
        acc.expected += s.plannedAmount || 0;
        acc.consumed += s.actualAmount || 0;
        acc.paid += s.paidAmount || 0;
        acc.balance += s.balanceAmount || 0;
        acc.carry += s.carryForwardAmount || 0;
        return acc;
      },
      { expected: 0, consumed: 0, paid: 0, balance: 0, carry: 0 }
    );
  }, [filteredSubscriptions]);

  /* ---------- ADD / EDIT ---------- */

  const openAdd = () => {
    setEditingSub(null);
    setSelectedCustomer(null);
    setQuantityPerDay("");
    setPricePerLitre("");
    setPlannedDays("");
    setPaidAmount("");
    setPaymentMode(null);
    setEndDate(null);
    setModalVisible(true);
  };

  const openEdit = (sub) => {
    setEditingSub(sub);
    setSelectedCustomer({ id: sub.customerId, name: sub.customerName, mobile: sub.mobile });
    setQuantityPerDay(String(sub.quantityPerDay));
    setPricePerLitre(String(sub.pricePerLitre));
    setPlannedDays(String(sub.plannedDays));
    setPaidAmount(String(sub.paidAmount || ""));
    setPaymentMode(sub.paymentMode || null);
    setEndDate(sub.endDate ? new Date(sub.endDate) : null);
    setModalVisible(true);
  };
  
   const deleteSubscription = async (id) => {
  Alert.alert(
    "Delete Subscription?",
    "This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "subscriptions", id));
        },
      },
    ]
  );
};

  const saveSubscription = async () => {
    if (!selectedCustomer || !quantityPerDay || !pricePerLitre || !plannedDays) {
      Alert.alert("Fill all required fields");
      return;
    }

   

    const payload = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      mobile: selectedCustomer.mobile || "",
      month: selectedMonth,
      quantityPerDay: Number(quantityPerDay),
      pricePerLitre: Number(pricePerLitre),
      plannedDays: Number(plannedDays),
      endDate: endDate ? endDate.toISOString().slice(0, 10) : null,
      paidAmount: Number(paidAmount || 0),
      paymentMode: paidAmount > 0 ? paymentMode : null,
      paymentDate: paidAmount > 0 ? Date.now() : null,
    };

    if (editingSub) {
      await updateDoc(doc(db, "subscriptions", editingSub.id), payload);
    } else {
      await addDoc(collection(db, "subscriptions"), { ...payload, createdAt: Date.now() });

      if (payload.mobile) {
        const msg = buildSubscriptionMessage(payload);

        // STEP 1 → Open SMS composer
        openSMS(payload.mobile, msg);

        // STEP 2 → After small delay, ask for WhatsApp
        setTimeout(() => {
          Alert.alert("Send WhatsApp also?", "Send subscription details via WhatsApp", [
            { text: "Send WhatsApp", onPress: () => openWhatsApp(payload.mobile, msg) },
            { text: "Skip", style: "cancel" },
          ]);
        }, 2500);
      }
    }

    setModalVisible(false);
  };

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscriptions</Text>
      </View>

      <View style={styles.monthBar}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(`${selectedMonth}-01`);
            d.setMonth(d.getMonth() - 1);
            setSelectedMonth(formatMonth(d));
          }}
        >
          <Text style={styles.monthNav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.monthText}>{monthLabel(selectedMonth)}</Text>

        <TouchableOpacity
          onPress={() => {
            const d = new Date(`${selectedMonth}-01`);
            d.setMonth(d.getMonth() + 1);
            setSelectedMonth(formatMonth(d));
          }}
        >
          <Text style={styles.monthNav}>▶</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.search} placeholder="🔍 Search customer" value={search} onChangeText={setSearch} />

      <View style={styles.filterRow}>
        {[
          { k: "all", l: "ALL" },
          { k: "pending", l: "UNPAID" },
          { k: "partial", l: "PARTIAL" },
          { k: "paid", l: "PAID" },
        ].map((f) => (
          <TouchableOpacity
            key={f.k}
            style={[styles.filterBtn, paymentFilter === f.k && styles.filterBtnActive]}
            onPress={() => setPaymentFilter(f.k)}
          >
            <Text style={[styles.filterText, paymentFilter === f.k && styles.filterTextActive]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.countBar}>
        <Text style={styles.countText}>{paymentFilter.toUpperCase()} : {subscriptionCount}</Text>
      </View>

      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
  <Text style={styles.name}>{item.customerName}</Text>

  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Text
      style={[
        styles.badge,
        item.paymentStatus === "paid"
          ? styles.paid
          : item.paymentStatus === "partial"
          ? styles.partial
          : styles.unpaid,
      ]}
    >
      {item.paymentStatus.toUpperCase()}
    </Text>

    <TouchableOpacity
      style={styles.editBtn}
      onPress={() => openEdit(item)}
    >
      <Text style={styles.editText}>✏</Text>
    </TouchableOpacity>
  </View>
</View>
            <Text style={styles.meta}>Delivered: {item.deliveredDays}/{item.plannedDays}</Text>
            <Text style={styles.meta}>Expected ₹ {item.plannedAmount.toFixed(2)}</Text>
            <Text style={styles.meta}>Consumed ₹ {item.actualAmount.toFixed(2)}</Text>
            <Text style={styles.meta}>Paid ₹ {item.paidAmount.toFixed(2)}</Text>

            {item.mobile && (
            <Text style={styles.meta}>📞 {item.mobile}</Text>
              )}

            {item.endDate && (
              <Text style={styles.meta}>Ends on: {new Date(item.endDate).toLocaleDateString("en-IN")}</Text>
            )}

            {item.paymentStatus !== "pending" && (
              <Text style={styles.meta}>
                Mode: {item.paymentMode?.toUpperCase()} | {new Date(item.paymentDate).toLocaleDateString("en-IN")}
              </Text>
            )}

            {/* ACTION BUTTONS */}
           {item.mobile && (
  <View style={styles.actionRow}>

    <TouchableOpacity
      style={styles.callBtn}
      onPress={() => makeCall(item.mobile)}
    >
      <Text style={styles.callText}>📞 Call</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.smsBtn}
      onPress={() => openSMS(item.mobile, buildSubscriptionMessage(item))}
    >
      <Text style={styles.smsText}>✉ SMS</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.waBtn}
      onPress={() => openWhatsApp(item.mobile, buildSubscriptionMessage(item))}
    >
      <Text style={styles.waText}>🟢 WhatsApp</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={() => deleteSubscription(item.id)}
    >
      <Text style={styles.deleteText}>🗑 Delete</Text>
    </TouchableOpacity>

  </View>
)}
          </View>
        )}
      />

      <View style={styles.summaryCard}>
        {[
          ["Expected", monthlySummary.expected],
          ["Consumed", monthlySummary.consumed],
          ["Paid", monthlySummary.paid],
          ["Balance", monthlySummary.balance],
          ["Carry", monthlySummary.carry],
        ].map(([l, v]) => (
          <View style={styles.summaryRow} key={l}>
            <Text style={styles.summaryLabel}>{l}</Text>
            <Text style={styles.summaryValue}>₹ {v.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={{ color: "#fff", fontSize: 26 }}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingSub ? "Edit" : "Add"} Subscription</Text>

            {!editingSub && (
              <FlatList
                style={{ maxHeight: 200, marginBottom: 10 }}
                data={customers.filter((c) => !subscriptions.some((s) => s.customerId === c.id))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ paddingVertical: 6, borderBottomWidth: 0.5, borderColor: "#E5E7EB" }}
                    onPress={() => setSelectedCustomer(item)}
                  >
                    <Text
                      style={{
                        fontWeight: selectedCustomer?.id === item.id ? "700" : "400",
                        color: selectedCustomer?.id === item.id ? "#16A34A" : "#000",
                      }}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TextInput style={styles.input} placeholder="Quantity per day" keyboardType="numeric" value={quantityPerDay} onChangeText={setQuantityPerDay} />
            <TextInput style={styles.input} placeholder="Price per litre" keyboardType="numeric" value={pricePerLitre} onChangeText={setPricePerLitre} />
            <TextInput style={styles.input} placeholder="Planned days" keyboardType="numeric" value={plannedDays} onChangeText={setPlannedDays} />

            <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
              <Text style={{ color: endDate ? "#000" : "#9CA3AF" }}>
                {endDate ? endDate.toLocaleDateString("en-IN") : "Select End Date"}
              </Text>
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="calendar"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}

            <TextInput style={styles.input} placeholder="Paid amount" keyboardType="numeric" value={paidAmount} onChangeText={setPaidAmount} />

            <View style={styles.paymentRow}>
              {["cash", "online"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.payBtn, paymentMode === m && styles.payBtnActive]}
                  onPress={() => setPaymentMode(m)}
                >
                  <Text>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: "#CBD5E1" }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#111", fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={saveSubscription}>
              <Text style={{ color: "#fff" }}>Save</Text>
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
  header: { backgroundColor: "#2E7D32", padding: 16, alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  countBar: { marginHorizontal: 16, marginBottom: 8, alignItems: "flex-end" },
  countText: { fontWeight: "700", color: "#334155" },
  monthBar: { backgroundColor: "#fff", margin: 16, padding: 14, borderRadius: 14, flexDirection: "row", justifyContent: "space-between" },
  monthText: { fontSize: 16, fontWeight: "700" },
  monthNav: { fontSize: 18, color: "#2563EB" },
  search: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12 },
  filterRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 8 },
  filterBtn: { flex: 1, padding: 10, marginHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center" },
  filterBtnActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  filterText: { fontWeight: "700" },
  filterTextActive: { color: "#15803D" },
  card: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: "700", fontSize: 12 },
  paid: { backgroundColor: "#DCFCE7", color: "#15803D" },
  partial: { backgroundColor: "#FEF3C7", color: "#92400E" },
  unpaid: { backgroundColor: "#FEE2E2", color: "#DC2626" },
  meta: { marginTop: 4 },
  summaryCard: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontWeight: "700" },
  summaryValue: { fontWeight: "700" },
  fab: { position: "absolute", right: 30, bottom: 135, backgroundColor: "#2E7D32", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  modalTitle: { fontWeight: "700", marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  paymentRow: { flexDirection: "row", marginTop: 10 },
  payBtn: { flex: 1, padding: 12, marginHorizontal: 4, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  payBtnActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  saveBtn: { backgroundColor: "#2E7D32", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 14 },

  actionRow: { flexDirection: "row", marginTop: 10 },
  smsBtn: { flex: 1, padding: 10, marginRight: 6, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center" },
  waBtn: { flex: 1, padding: 10, marginLeft: 6, borderRadius: 10, backgroundColor: "#DCFCE7", alignItems: "center" },
  smsText: { fontWeight: "700", color: "#3730A3" },
  waText: { fontWeight: "700", color: "#15803D" },
  callBtn: {
  flex: 1,
  padding: 10,
  marginRight: 6,
  borderRadius: 10,
  backgroundColor: "#E0F2FE",
  alignItems: "center",
},

callText: {
  fontWeight: "700",
  color: "#0369A1",
},

deleteBtn: {
  flex: 1,
  padding: 10,
  marginLeft: 6,
  borderRadius: 10,
  backgroundColor: "#FEE2E2",
  alignItems: "center",
},

editBtn: {
  marginLeft: 8,
  padding: 6,
  borderRadius: 8,
  backgroundColor: "#E0F2FE",
},

editText: {
  fontWeight: "700",
  color: "#0369A1",
},

deleteText: {
  fontWeight: "700",
  color: "#DC2626",
},
});
