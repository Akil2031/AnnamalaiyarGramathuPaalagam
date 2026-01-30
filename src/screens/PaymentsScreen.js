import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
} from "react-native";

import { db } from "../firebase/firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

export default function PaymentsScreen({
  deliveries = [],
  payments = [],
  setPayments = () => {},
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  /* 🔥 REAL-TIME PAYMENTS FROM FIREBASE */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setPayments(list);
      }
    );

    return () => unsub();
  }, []);

  /* BUILD MONTHLY BILL */
  const bills = {};
  deliveries.forEach((d) => {
    if (!d.delivered) return;

    if (!bills[d.name]) {
      bills[d.name] = { name: d.name, amount: 0 };
    }

    bills[d.name].amount +=
      d.quantity * d.price;
  });

  const data = Object.values(bills);

  const isPaid = (name) =>
    payments.some(
      (p) =>
        p.customerName === name &&
        p.month === currentMonth &&
        p.paid
    );

  /* 🔥 TOGGLE PAID STATUS IN FIREBASE */
  const togglePaid = async (name) => {
    const docId = `${name}_${currentMonth}`;

    await setDoc(
      doc(db, "payments", docId),
      {
        customerName: name,
        month: currentMonth,
        paid: !isPaid(name),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payments</Text>

      {data.length === 0 ? (
        <Text>No deliveries this month</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.name}>
                  {item.name}
                </Text>
                <Text>₹ {item.amount}</Text>
              </View>

              <View style={styles.row}>
                <Text>
                  {isPaid(item.name)
                    ? "PAID"
                    : "PENDING"}
                </Text>
                <Switch
                  value={isPaid(item.name)}
                  onValueChange={() =>
                    togglePaid(item.name)
                  }
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    padding: 14,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: { fontWeight: "bold" },
  row: { alignItems: "center" },
});
