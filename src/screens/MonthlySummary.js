import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { db } from "../firebase/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function MonthlySummaryScreen({ route }) {
  const { month } = route.params;
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "subscriptions"),
      where("month", "==", month)
    );

    return onSnapshot(q, snap => {
      setSubs(snap.docs.map(d => d.data()));
    });
  }, [month]);

  const totalRevenue = subs.reduce(
    (s, i) => s + (i.actualAmount || 0),
    0
  );

  const totalPending = subs.reduce(
    (s, i) =>
      i.paymentStatus !== "paid"
        ? s + (i.actualAmount || 0)
        : s,
    0
  );

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 18 }}>
        Month: {month}
      </Text>

      <Text>Total Revenue: ₹{totalRevenue}</Text>
      <Text>Pending Collection: ₹{totalPending}</Text>

      <FlatList
        data={subs.filter(s => s.paymentStatus !== "paid")}
        keyExtractor={(i, idx) => idx.toString()}
        renderItem={({ item }) => (
          <Text>
            {item.customerName} – ₹{item.actualAmount}
          </Text>
        )}
      />
    </View>
  );
}
