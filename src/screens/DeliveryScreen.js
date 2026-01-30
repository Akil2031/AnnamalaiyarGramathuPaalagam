import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
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

const formatPrettyDate = (d) =>
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
  const [deliveries, setDeliveries] = useState([]);
  const [search, setSearch] = useState("");

  const monthKey = monthFromDate(selectedDate);

  /* 🔹 LOAD SUBSCRIPTIONS */
  useEffect(() => {
    const q = query(
      collection(db, "subscriptions"),
      where("month", "==", monthKey)
    );

    return onSnapshot(q, (snap) => {
      setSubscriptions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
  }, [monthKey]);

  /* 🔹 LOAD MISSED DELIVERIES ONLY */
  useEffect(() => {
    const q = query(
      collection(db, "deliveries"),
      where("date", "==", selectedDate),
      where("status", "==", "missed")
    );

    return onSnapshot(q, (snap) => {
      setDeliveries(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
  }, [selectedDate]);

  /* 🔍 SEARCH */
  const filteredSubscriptions = useMemo(() => {
    if (!search.trim()) return subscriptions;

    return subscriptions.filter((s) =>
      s.customerName.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subscriptions]);

  /* 🔁 TOGGLE DELIVERY (MISSED ONLY) */
  const toggleDelivery = async (customerId) => {
    const docId = `${customerId}_${selectedDate}`;

    const missed = deliveries.some(
      (d) => d.customerId === customerId
    );

    if (missed) {
      // 🔄 Back to DELIVERED (remove missed record)
      await deleteDoc(doc(db, "deliveries", docId));
    } else {
      // ❌ MISSED delivery
      await setDoc(doc(db, "deliveries", docId), {
        customerId,
        date: selectedDate,
        status: "missed",
        createdAt: Date.now(),
      });
    }
  };

  /* ---------- RENDER ---------- */

  const renderItem = ({ item }) => {
    const missed = deliveries.some(
      (d) => d.customerId === item.customerId
    );

    const delivered = !missed;

    return (
      <View
        style={[
          styles.card,
          delivered ? styles.deliveredCard : styles.missedCard,
        ]}
      >
        <View>
          <Text style={styles.name}>{item.customerName}</Text>
          <Text style={styles.meta}>
            {item.quantityPerDay} L
          </Text>
        </View>

        <View style={styles.switchWrap}>
          <Text
            style={[
              styles.statusText,
              delivered ? styles.deliveredText : styles.missedText,
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      {/* 🌈 HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() =>
            setSelectedDate(addDays(selectedDate, -1))
          }
        >
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {formatPrettyDate(selectedDate)}
        </Text>

        <TouchableOpacity
          disabled={isFutureDate(addDays(selectedDate, 1))}
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

      <Text style={styles.hint}>
        Toggle OFF only if delivery was missed
      </Text>

      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(i) => i.customerId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F8E9",
  },

  /* HEADER */
  topHeader: {
    backgroundColor: "#2E7D32",
    paddingVertical: 16,
    paddingHorizontal: 16,
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

  nav: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  navDisabled: {
    opacity: 0.4,
  },

  /* SEARCH */
  search: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
  },

  hint: {
    color: "#64748B",
    marginHorizontal: 16,
    marginBottom: 10,
  },

  /* CARDS */
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
  },

  deliveredCard: {
    borderLeftColor: "#2E7D32",
  },

  missedCard: {
    borderLeftColor: "#DC2626",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
  },

  meta: {
    color: "#64748B",
    marginTop: 2,
  },

  switchWrap: {
    alignItems: "flex-end",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  deliveredText: {
    color: "#2E7D32",
  },

  missedText: {
    color: "#DC2626",
  },
});
