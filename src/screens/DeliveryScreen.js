import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";

import ScreenWrapper from "../components/ScreenWrapper";

import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
} from "firebase/firestore";

/* ---------- HELPERS ---------- */

const formatDate = (d) => d.toISOString().slice(0, 10);
const todayStr = formatDate(new Date());

const addDays = (dateStr, delta) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
};

const monthFromDate = (dateStr) => dateStr.slice(0, 7);

/* ---------- SCREEN ---------- */

export default function DailyDeliveryScreen() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [search, setSearch] = useState("");

  const monthKey = monthFromDate(selectedDate);

  /* LOAD SUBSCRIPTIONS */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "subscriptions"), where("month", "==", monthKey)),
      (snap) => {
        setSubscriptions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );
  }, [monthKey]);

  /* LOAD DELIVERIES FOR DAY */
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "deliveries"), where("date", "==", selectedDate)),
      (snap) => {
        setDeliveries(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );
  }, [selectedDate]);

  /* TOGGLE DELIVERY */
  const toggleDelivery = async (customerId) => {
    const docId = `${customerId}_${selectedDate}`;
    const existing = deliveries.find(
      (d) => d.customerId === customerId
    );

    await setDoc(doc(db, "deliveries", docId), {
      customerId,
      date: selectedDate,
      status: existing?.status === "missed" ? "delivered" : "missed",
      createdAt: Date.now(),
    });
  };

  /* SEARCH */
  const filteredSubscriptions = useMemo(() => {
    if (!search.trim()) return subscriptions;
    return subscriptions.filter((s) =>
      s.customerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subscriptions]);

  /* RENDER */

  const renderItem = ({ item }) => {
    const delivery = deliveries.find(
      (d) => d.customerId === item.customerId
    );

    const delivered = delivery?.status !== "missed";

    return (
      <View
        style={[
          styles.card,
          delivered ? styles.deliveredCard : styles.missedCard,
        ]}
      >
        <View>
          <Text style={styles.name}>{item.customerName}</Text>
          <Text style={styles.meta}>{item.quantityPerDay} L</Text>
        </View>

        <Switch
          value={delivered}
          onValueChange={() => toggleDelivery(item.customerId)}
        />
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, -1))}>
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{selectedDate}</Text>

        <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))}>
          <Text style={styles.nav}>▶</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search customer"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(i) => i.customerId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </ScreenWrapper>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2E7D32",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  nav: { color: "#fff", fontSize: 18 },

  search: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 12,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
  },

  deliveredCard: { borderLeftColor: "#2E7D32" },
  missedCard: { borderLeftColor: "#DC2626" },

  name: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#64748B" },
});
