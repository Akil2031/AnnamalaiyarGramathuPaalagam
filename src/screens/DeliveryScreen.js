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

import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

/* ---------- HELPERS ---------- */

const formatDate = (d) => d.toISOString().slice(0, 10);

const prettyDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const today = new Date();
const todayStr = formatDate(today);

const addDays = (dateStr, delta) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
};

const isFutureDate = (dateStr) => dateStr > todayStr;
const monthFromDate = (dateStr) => dateStr.slice(0, 7);

/* ---------- SCREEN ---------- */

export default function DailyDeliveryScreen() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [subscriptions, setSubscriptions] = useState([]);
  const [missedDeliveries, setMissedDeliveries] = useState([]);
  const [search, setSearch] = useState("");

  const monthKey = monthFromDate(selectedDate);

  /* ---------- LOAD SUBSCRIPTIONS FOR MONTH ---------- */
  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "subscriptions"),
        where("month", "==", monthKey)
      ),
      (snap) => {
        setSubscriptions(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      }
    );
  }, [monthKey]);

  /* ---------- LOAD MISSED DELIVERIES FOR DAY ---------- */
  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "deliveries"),
        where("date", "==", selectedDate),
        where("status", "==", "missed")
      ),
      (snap) => {
        setMissedDeliveries(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      }
    );
  }, [selectedDate]);

  /* ---------- TOGGLE MISSED (ONLY) ---------- */

  const toggleDelivery = async (customerId) => {
    const docId = `${customerId}_${selectedDate}`;

    const isMissed = missedDeliveries.some(
      (d) => d.customerId === customerId
    );

    if (isMissed) {
      // remove missed → delivered
      await deleteDoc(doc(db, "deliveries", docId));
    } else {
      // mark missed
      await setDoc(doc(db, "deliveries", docId), {
        customerId,
        date: selectedDate,
        status: "missed",
        createdAt: Date.now(),
      });
    }
  };

  /* ---------- SEARCH ---------- */

  const filteredSubscriptions = useMemo(() => {
    if (!search.trim()) return subscriptions;

    return subscriptions.filter((s) =>
      s.customerName
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, subscriptions]);

  /* ---------- RENDER ---------- */

  const renderItem = ({ item }) => {
    const isMissed = missedDeliveries.some(
      (d) => d.customerId === item.customerId
    );

    const delivered = !isMissed;

    return (
      <View
        style={[
          styles.card,
          delivered
            ? styles.deliveredCard
            : styles.missedCard,
        ]}
      >
        <View>
          <Text style={styles.name}>
            {item.customerName}
          </Text>
          <Text style={styles.meta}>
            {item.quantityPerDay} L
          </Text>
        </View>

        <View style={styles.switchWrap}>
          <Text
            style={[
              styles.statusText,
              delivered
                ? styles.deliveredText
                : styles.missedText,
            ]}
          >
            {delivered ? "Delivered" : "Missed"}
          </Text>

          <Switch
            value={delivered}
            onValueChange={() =>
              toggleDelivery(item.customerId)
            }
          />
        </View>
      </View>
    );
  };

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            setSelectedDate(addDays(selectedDate, -1))
          }
        >
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {prettyDate(selectedDate)}
        </Text>

        <TouchableOpacity
          disabled={isFutureDate(
            addDays(selectedDate, 1)
          )}
          onPress={() =>
            setSelectedDate(addDays(selectedDate, 1))
          }
        >
          <Text
            style={[
              styles.nav,
              isFutureDate(addDays(selectedDate, 1)) &&
                styles.navDisabled,
            ]}
          >
            ▶
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <TextInput
        style={styles.search}
        placeholder="🔍 Search customer"
        value={search}
        onChangeText={setSearch}
      />

      {/* LIST */}
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },

  header: {
    backgroundColor: "#2E7D32",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  nav: { color: "#fff", fontSize: 18 },
  navDisabled: { opacity: 0.4 },

  search: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  meta: { color: "#64748B", marginTop: 2 },

  switchWrap: { alignItems: "flex-end" },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  deliveredText: { color: "#2E7D32" },
  missedText: { color: "#DC2626" },
});
