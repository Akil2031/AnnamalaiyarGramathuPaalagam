import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { db } from "../firebase/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

/* Month label helper */
const parseMonth = month => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

const monthLabel = month =>
  parseMonth(month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

export default function CustomerHistory({ route }) {
  const { customerId, customerName } = route.params;

  const [subscriptions, setSubscriptions] = useState([]);

  /* Load customer subscriptions */
  useEffect(() => {
    const q = query(
      collection(db, "subscriptions"),
      where("customerId", "==", customerId),
      orderBy("month", "desc")
    );

    return onSnapshot(q, snap => {
      setSubscriptions(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    });
  }, [customerId]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    let paidAmount = 0;

    subscriptions.forEach(s => {
      totalAmount += s.totalAmount || 0;
      if (s.paymentStatus === "paid") {
        paidAmount += s.totalAmount || 0;
      }
    });

    return {
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
    };
  }, [subscriptions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{customerName}</Text>

      {/* Summary */}
      <View style={styles.card}>
        <SummaryRow label="Total Amount" value={`₹${summary.totalAmount}`} />
        <SummaryRow label="Paid" value={`₹${summary.paidAmount}`} green />
        <SummaryRow
          label="Pending"
          value={`₹${summary.pendingAmount}`}
          red
        />
      </View>

      {/* Month-wise list */}
      <FlatList
        data={subscriptions}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.month}>
                {monthLabel(item.month)}
              </Text>
              <Text
                style={[
                  styles.status,
                  item.paymentStatus === "paid"
                    ? styles.green
                    : styles.red,
                ]}
              >
                {item.paymentStatus.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.meta}>
              Delivered: {item.deliveredDays || 0} days
            </Text>

            <Text style={styles.meta}>
              Rate: {item.quantity} L × ₹{item.price}
            </Text>

            <Text style={styles.amount}>
              ₹{item.totalAmount}
            </Text>

            {item.paymentStatus === "paid" && (
              <Text style={styles.paidInfo}>
                {item.paymentMode?.toUpperCase()} ·{" "}
                {item.paymentDate
                  ? new Date(item.paymentDate).toDateString()
                  : ""}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

/* Reusable row */
const SummaryRow = ({ label, value, green, red }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.label}>{label}</Text>
    <Text
      style={[
        styles.value,
        green && styles.green,
        red && styles.red,
      ]}
    >
      {value}
    </Text>
  </View>
);

/* Styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },

  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  label: { color: "#64748B" },
  value: { fontWeight: "700" },

  green: { color: "#16A34A" },
  red: { color: "#DC2626" },

  row: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },

  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  month: { fontWeight: "700" },
  status: { fontWeight: "700" },

  meta: { color: "#64748B", marginTop: 4 },

  amount: {
    marginTop: 6,
    fontWeight: "700",
    fontSize: 16,
    color: "#15803D",
  },

  paidInfo: {
    marginTop: 4,
    fontSize: 12,
    color: "#475569",
  },
});
