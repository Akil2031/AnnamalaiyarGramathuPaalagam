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

const isActiveOnDate = (sub, dateStr) => {
  if (!sub.endDate) return true;
  return dateStr <= sub.endDate;
};


const isFutureDate = (dateStr) => dateStr > todayStr;
const monthFromDate = (dateStr) => dateStr.slice(0, 7);

/* ---------- SCREEN ---------- */

export default function DailyDeliveryScreen() {
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [subscriptions, setSubscriptions] = useState([]);
  const [missedDeliveries, setMissedDeliveries] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | delivered | missed

  const monthKey = monthFromDate(selectedDate);

  /* ---------- LOAD SUBSCRIPTIONS (MONTH) ---------- */
  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "subscriptions"),
        where("month", "==", monthKey)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .sort((a, b) =>
            a.customerName.localeCompare(b.customerName)
          );

        setSubscriptions(list);
      }
    );
  }, [monthKey]);

  /* ---------- LOAD MISSED DELIVERIES (DAY) ---------- */
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

  /* ---------- TOGGLE MISSED ---------- */

  const toggleDelivery = async (customerId) => {
    const docId = `${customerId}_${selectedDate}`;

    const isMissed = missedDeliveries.some(
      (d) => d.customerId === customerId
    );

    if (isMissed) {
      await deleteDoc(doc(db, "deliveries", docId));
    } else {
      await setDoc(doc(db, "deliveries", docId), {
        customerId,
        date: selectedDate,
        status: "missed",
        createdAt: Date.now(),
      });
    }
  };

  /* ---------- FILTER + SEARCH ---------- */
const filteredSubscriptions = useMemo(() => {
  return subscriptions
    // ✅ SHOW ONLY ACTIVE SUBSCRIPTIONS
    .filter((s) =>
      isActiveOnDate(s, selectedDate)
    )
    // 🔍 SEARCH
    .filter((s) =>
      s.customerName
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    // 🎛 STATUS FILTER
    .filter((s) => {
      if (statusFilter === "all") return true;

      const isMissed = missedDeliveries.some(
        (d) => d.customerId === s.customerId
      );

      return statusFilter === "missed"
        ? isMissed
        : !isMissed;
    });
}, [
  subscriptions,
  selectedDate,
  search,
  statusFilter,
  missedDeliveries,
]);


  /* ---------- TOTAL LITRES (DAY) ---------- */

  const dailyTotals = useMemo(() => {
    let expected = 0;
    let delivered = 0;

    filteredSubscriptions.forEach((s) => {
      expected += s.quantityPerDay;

      const isMissed = missedDeliveries.some(
        (d) => d.customerId === s.customerId
      );

      if (!isMissed) {
        delivered += s.quantityPerDay;
      }
    });

    return { expected, delivered };
  }, [filteredSubscriptions, missedDeliveries]);

  /* ---------- MONTH SUMMARY ---------- */

  const monthSummary = useMemo(() => {
    let planned = 0;
    let delivered = 0;
    let missed = 0;

    subscriptions.forEach((s) => {
      planned += s.quantityPerDay * s.plannedDays;
      delivered += s.quantityPerDay * (s.deliveredDays || 0);
      missed +=
        s.quantityPerDay *
        (s.plannedDays - (s.deliveredDays || 0));
    });

    return { planned, delivered, missed };
  }, [subscriptions]);

  /* ---------- RENDER ITEM ---------- */

  const renderItem = ({ item }) => {
    const isMissed = missedDeliveries.some(
      (d) => d.customerId === item.customerId
    );

    const isActive = isActiveOnDate(item, selectedDate);
    const delivered = isActive && !isMissed;


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
  disabled={!isActive}
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
        <Text style={styles.headerTitle}>
          Daily Delivery
        </Text>
      </View>

      {/* DATE BAR */}
      <View style={styles.dateBar}>
        <TouchableOpacity
          onPress={() =>
            setSelectedDate(addDays(selectedDate, -1))
          }
        >
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.dateText}>
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

      {/* DAILY TOTALS */}
      <View style={styles.totalBar}>
        <Text style={styles.totalText}>
          Expected: {dailyTotals.expected.toFixed(2)} L
        </Text>
        <Text style={styles.totalText}>
          Delivered: {dailyTotals.delivered.toFixed(2)} L
        </Text>
      </View>

      {/* SEARCH */}
      <TextInput
        style={styles.search}
        placeholder="🔍 Search customer"
        value={search}
        onChangeText={setSearch}
      />

      {/* STATUS FILTER */}
      <View style={styles.filterRow}>
        {[
          { key: "all", label: "ALL" },
          { key: "delivered", label: "DELIVERED" },
          { key: "missed", label: "MISSED" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterBtn,
              statusFilter === f.key &&
                styles.filterBtnActive,
            ]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === f.key &&
                  styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LIST */}
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* MONTH SUMMARY */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          Month Summary
        </Text>

        <View style={styles.summaryRow}>
          <Text>Planned</Text>
          <Text>{monthSummary.planned.toFixed(2)} L</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>Delivered</Text>
          <Text>{monthSummary.delivered} L</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>Missed</Text>
          <Text>{monthSummary.missed} L</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>Delivery %</Text>
          <Text>
            {monthSummary.planned
              ? Math.round(
                  (monthSummary.delivered /
                    monthSummary.planned) *
                    100
                )
              : 0}
            %
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },

  header: {
    backgroundColor: "#2E7D32",
    padding: 16,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  dateBar: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },

  dateText: { fontSize: 16, fontWeight: "700" },

  nav: { fontSize: 18, color: "#2563EB" },
  navDisabled: { opacity: 0.4 },

  totalBar: {
    backgroundColor: "#E8F5E9",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalText: {
    fontWeight: "700",
    color: "#2E7D32",
  },

  search: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
  },

  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  filterBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },

  filterText: { fontWeight: "700", color: "#334155" },
  filterTextActive: { color: "#15803D" },

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

  summaryCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
});
