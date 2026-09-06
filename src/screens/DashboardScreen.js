import { View, Text, StyleSheet } from "react-native";
import  COLORS  from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";


export default function DashboardScreen({
  deliveries = [],
  payments = [],
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const totalDelivered = Array.isArray(deliveries)
    ? deliveries
        .filter((d) => d?.delivered)
        .reduce(
          (sum, d) =>
            sum + Number(d.quantity || 0) * Number(d.price || 0),
          0
        )
    : 0;

  const paidCustomers = Array.isArray(payments)
    ? payments
        .filter(
          (p) => p?.month === currentMonth && p?.paid
        )
        .map((p) => p.customerName)
    : [];

  const pending = Array.isArray(deliveries)
    ? deliveries
        .filter(
          (d) =>
            d?.delivered && !paidCustomers.includes(d?.name)
        )
        .reduce(
          (sum, d) =>
            sum + Number(d.quantity || 0) * Number(d.price || 0),
          0
        )
    : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Milk Business Dashboard</Text>

     <View style={[styles.card, styles.receivedCard]}>
  <View style={styles.row}>
    <Ionicons name="cube-outline" size={28} color="#069923" />
    <Text style={styles.label}>Today’s Delivery Amount</Text>
  </View>

  <Text style={styles.todayAmount}>₹ {totalDelivered}</Text>
</View>


     <View style={[styles.card, styles.pendingCard]}>
  <View style={styles.row}>
    <Ionicons name="alert-circle-outline" size={28} color="#D32F2F" />
    <Text style={styles.label}>Pending Amount</Text>
  </View>

  <Text style={styles.pendingAmount}>₹ {pending}</Text>
</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1E3A8A",
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 10,
    marginBottom: 16,
    elevation: 3,
  },
  receivedCard: {
    borderLeftWidth: 6,
    borderLeftColor: "green",
  },
  pendingCard: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.danger,
  },
  label: {
    color: COLORS.muted,
    marginBottom: 6,
  },
  value: {
    fontSize: 26,
    fontWeight: "bold",
    color: "green",
  },
  pending: {
    color: COLORS.danger,
  },
  row: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
},
todayAmount: {
  fontSize: 28,
  fontWeight: "bold",
  color: "#1E3A8A",
},
pendingAmount: {
  fontSize: 28,
  fontWeight: "bold",
  color: "#D32F2F",
},

});
