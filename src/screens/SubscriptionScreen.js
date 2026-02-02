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
  getDocs,
} from "firebase/firestore";

/* ---------- HELPERS ---------- */

const formatMonth = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (m) =>
  new Date(`${m}-01`).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

const todayStr = new Date().toISOString().slice(0, 10);

/* ---------- DELIVERY STATS (NO FUTURE DAYS) ---------- */

const getDeliveryStats = async (customerId, month) => {
  const start = `${month}-01`;
  const end =
    month === todayStr.slice(0, 7) ? todayStr : `${month}-31`;

  const missedSnap = await getDocs(
    query(
      collection(db, "deliveries"),
      where("customerId", "==", customerId),
      where("status", "==", "missed"),
      where("date", ">=", start),
      where("date", "<=", end)
    )
  );

  const missed = missedSnap.size;

  const startDate = new Date(start);
  const endDate = new Date(end);
  const possibleDays =
    Math.floor((endDate - startDate) / 86400000) + 1;

  return { missed, possibleDays };
};

/* ---------- SCREEN ---------- */

export default function SubscriptionScreen() {
  const [selectedMonth, setSelectedMonth] = useState(
    formatMonth(new Date())
  );

  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  /* ADD / EDIT */
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [quantityPerDay, setQuantityPerDay] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [plannedDays, setPlannedDays] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState(null);

  /* ---------- LOAD SUBSCRIPTIONS ---------- */
  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "subscriptions"),
        where("month", "==", selectedMonth)
      ),
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
    return onSnapshot(
      query(
        collection(db, "customers"),
        where("status", "==", "active")
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(list);
      }
    );
  }, []);

  /* ---------- AUTO RECALC (DELIVERY BASED) ---------- */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "deliveries"),
      async () => {
        for (const sub of subscriptions) {
          const { missed, possibleDays } =
            await getDeliveryStats(sub.customerId, sub.month);

          const delivered = Math.max(
            Math.min(possibleDays, sub.plannedDays) - missed,
            0
          );

          const perDay =
            sub.quantityPerDay * sub.pricePerLitre;

          const plannedAmount =
            sub.plannedDays * perDay;

          const actualAmount =
            delivered * perDay;

          const paid = sub.paidAmount || 0;

          await updateDoc(doc(db, "subscriptions", sub.id), {
            deliveredDays: delivered,
            skippedDays: missed,
            plannedAmount,
            actualAmount,
            balanceAmount: Math.max(actualAmount - paid, 0),
            carryForwardAmount: Math.max(paid - actualAmount, 0),
            paymentStatus:
              paid === 0
                ? "pending"
                : paid < actualAmount
                ? "partial"
                : "paid",
          });
        }
      }
    );

    return unsub;
  }, [subscriptions]);

  /* ---------- FILTER + SORT ---------- */

  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((s) =>
        s.customerName
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .filter((s) =>
        paymentFilter === "all"
          ? true
          : s.paymentStatus === paymentFilter
      )
      .sort((a, b) =>
        a.customerName.localeCompare(b.customerName)
      );
  }, [subscriptions, search, paymentFilter]);

  /* ---------- MONTHLY SUMMARY ---------- */

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
      {
        expected: 0,
        consumed: 0,
        paid: 0,
        balance: 0,
        carry: 0,
      }
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
    setPaidAmount(String(sub.paidAmount || ""));
    setPaymentMode(sub.paymentMode || null);
    setModalVisible(true);
  };

  const saveSubscription = async () => {
    if (
      !selectedCustomer ||
      !quantityPerDay ||
      !pricePerLitre ||
      !plannedDays
    ) {
      Alert.alert("Fill all required fields");
      return;
    }

    const payload = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      month: selectedMonth,
      quantityPerDay: Number(quantityPerDay),
      pricePerLitre: Number(pricePerLitre),
      plannedDays: Number(plannedDays),
      paidAmount: Number(paidAmount || 0),
      paymentMode:
        paidAmount > 0 ? paymentMode : null,
      paymentDate:
        paidAmount > 0 ? Date.now() : null,
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
  };

  /* ---------- UI (UNCHANGED DESIGN) ---------- */

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscriptions</Text>
      </View>

      {/* MONTH */}
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

        <Text style={styles.monthText}>
          {monthLabel(selectedMonth)}
        </Text>

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

      {/* SEARCH */}
      <TextInput
        style={styles.search}
        placeholder="🔍 Search customer"
        value={search}
        onChangeText={setSearch}
      />

      {/* FILTER */}
      <View style={styles.filterRow}>
        {[
          { k: "all", l: "ALL" },
          { k: "pending", l: "UNPAID" },
          { k: "partial", l: "PARTIAL" },
          { k: "paid", l: "PAID" },
        ].map((f) => (
          <TouchableOpacity
            key={f.k}
            style={[
              styles.filterBtn,
              paymentFilter === f.k &&
                styles.filterBtnActive,
            ]}
            onPress={() => setPaymentFilter(f.k)}
          >
            <Text
              style={[
                styles.filterText,
                paymentFilter === f.k &&
                  styles.filterTextActive,
              ]}
            >
              {f.l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LIST */}
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => openEdit(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>
                {item.customerName}
              </Text>
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
            </View>

            <Text style={styles.meta}>
              Delivered: {item.deliveredDays}/{item.plannedDays}
            </Text>

            <Text style={styles.meta}>
              Expected ₹ {item.plannedAmount.toFixed(2)}
            </Text>

            <Text style={styles.meta}>
              Consumed ₹ {item.actualAmount.toFixed(2)}
            </Text>

            <Text style={styles.meta}>
              Paid ₹ {item.paidAmount.toFixed(2)}
            </Text>

            {item.paymentStatus !== "pending" && (
              <Text style={styles.meta}>
                Mode: {item.paymentMode?.toUpperCase()} |{" "}
                {new Date(item.paymentDate).toLocaleDateString(
                  "en-IN"
                )}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* SUMMARY */}
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
            <Text style={styles.summaryValue}>
              ₹ {v.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* FAB */}
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

            {!editingSub &&
              customers
                .filter(
                  (c) =>
                    !subscriptions.some(
                      (s) => s.customerId === c.id
                    )
                )
                .map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedCustomer(c)}
                  >
                    <Text>{c.name}</Text>
                  </TouchableOpacity>
                ))}

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

            <TextInput
              style={styles.input}
              placeholder="Paid amount"
              keyboardType="numeric"
              value={paidAmount}
              onChangeText={setPaidAmount}
            />

            <View style={styles.paymentRow}>
              {["cash", "online"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.payBtn,
                    paymentMode === m &&
                      styles.payBtnActive,
                  ]}
                  onPress={() => setPaymentMode(m)}
                >
                  <Text>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={saveSubscription}
            >
              <Text style={{ color: "#fff" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- STYLES (SAME UI) ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },

  header: { backgroundColor: "#2E7D32", padding: 16 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

  monthBar: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  monthText: { fontSize: 16, fontWeight: "700" },
  monthNav: { fontSize: 18, color: "#2563EB" },

  search: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },

  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
  },

  filterBtn: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },

  filterBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },

  filterText: { fontWeight: "700" },
  filterTextActive: { color: "#15803D" },

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
  partial: { backgroundColor: "#FEF3C7", color: "#92400E" },
  unpaid: { backgroundColor: "#FEE2E2", color: "#DC2626" },

  meta: { marginTop: 4 },

  summaryCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryLabel: { fontWeight: "700" },
  summaryValue: { fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 30,
    bottom: 135,
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

  modalTitle: { fontWeight: "700", marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  paymentRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  payBtn: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },

  payBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },

  saveBtn: {
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
});
