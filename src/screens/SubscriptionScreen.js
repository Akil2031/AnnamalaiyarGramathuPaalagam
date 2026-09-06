import React, { useEffect, useMemo, useState } from "react";
import { Linking, AppState, useWindowDimensions, Platform } from "react-native";

import { Ionicons } from "@expo/vector-icons";

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
  ScrollView,
} from "react-native";


/* ---------- CUSTOMER SCREEN VISUAL SYSTEM ---------- */
const UI = {
  background: "#F3F7F1",
  white: "#FFFFFF",
  green: "#63B83F",
  greenDark: "#4E9F30",
  greenDeep: "#367C27",
  greenSoft: "#EAF7DF",
  greenSoft2: "#F3F9EE",
  text: "#17231B",
  secondary: "#65736A",
  muted: "#98A49B",
  border: "#E2EAE1",
  danger: "#DE5B5B",
  dangerSoft: "#FFF0F0",
  warning: "#D79A24",
  warningSoft: "#FFF7E8",
  blue: "#3B82B6",
  blueSoft: "#EDF7FC",
  purple: "#6D5BD0",
  purpleSoft: "#F1EFFF",
  teal: "#159A68",
  tealSoft: "#EAF8F1",
};

import { db } from "../firebase/firebase";
import colors from "../theme/colors";
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

const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* ---------- MESSAGE HELPERS ---------- */

const buildSubscriptionMessage = (sub) => {
  const total = (
    (sub.quantityPerDay || 0) *
    (sub.pricePerLitre || 0) *
    (sub.plannedDays || 0)
  ).toFixed(2);

  return `Dear ${sub.customerName},

Your milk subscription for ${monthLabel(sub.month)} is created.

Qty/day: ${sub.quantityPerDay} L
Price per litre: ₹${sub.pricePerLitre}
Days: ${sub.plannedDays}

Total Amount: ₹${total}

Pay via UPI: 9710527964@yescred

Thank you 
Annamalaiyar Gramathu Paalagam 🙏`;
};

const openWhatsApp = (mobile, message) => {
  if (!mobile) return;
  Linking.openURL(
    `https://wa.me/91${String(mobile).replace(/\D/g, "")}?text=${encodeURIComponent(
      message
    )}`
  );
};

const openSMS = (mobile, message) => {
  if (!mobile) return;
  Linking.openURL(
    `sms:${String(mobile).replace(/\D/g, "")}?body=${encodeURIComponent(message)}`
  );
};

const makeCall = (mobile) => {
  if (!mobile) return;
  Linking.openURL(`tel:${String(mobile).replace(/\D/g, "")}`);
};

/* ---------- DELIVERY STATS ---------- */

const getDeliveryStats = async (customerId, month, subscriptionEndDate) => {
  const monthStart = `${month}-01`;
  const currentMonth = todayStr.slice(0, 7);

  if (month > currentMonth) {
    return { missed: 0, possibleDays: 0 };
  }

  let monthEnd =
    month === currentMonth ? todayStr : `${month}-31`;

  if (subscriptionEndDate) {
    monthEnd =
      monthEnd > subscriptionEndDate ? subscriptionEndDate : monthEnd;
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

  const possibleDays =
    Math.floor((endDate - startDate) / 86400000) + 1;

  return { missed, possibleDays };
};

/* ---------- SMALL UI COMPONENTS ---------- */

function SummaryMetric({ icon, label, value, tone = "default", compact }) {
  const fg =
    tone === "success" ? UI.greenDark :
    tone === "warning" ? UI.warning :
    tone === "danger" ? UI.danger : UI.greenDark;

  const bg =
    tone === "danger" ? UI.dangerSoft :
    tone === "warning" ? UI.warningSoft : UI.greenSoft;

  return (
    <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={19} color={fg} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color: fg }]} numberOfLines={1}>
          {money(value)}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }) {
  const normalized = status || "pending";
  const label = normalized === "paid" ? "PAID" : normalized === "partial" ? "PARTIAL" : "UNPAID";
  const fg = normalized === "paid" ? UI.greenDark : normalized === "partial" ? UI.warning : UI.danger;
  const bg = normalized === "paid" ? UI.greenSoft : normalized === "partial" ? UI.warningSoft : UI.dangerSoft;

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: fg }]} />
      <Text style={[styles.statusText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ActionButton({ label, icon, onPress, variant = "neutral" }) {
  const palette = {
    call: [UI.blueSoft, UI.blue],
    sms: [UI.purpleSoft, UI.purple],
    whatsapp: [UI.tealSoft, UI.teal],
    delete: [UI.dangerSoft, UI.danger],
  };
  const [bg, fg] = palette[variant] || ["#F5F7F5", UI.secondary];

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.actionButton, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={15} color={fg} />
      <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailItem({ label, value, emphasis = false, tone = "default" }) {
  const fg = tone === "danger" ? UI.danger : tone === "success" ? UI.greenDark : UI.text;
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, emphasis && styles.detailValueEmphasis, { color: fg }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function FieldLabel({ children }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

/* Top-level on purpose: prevents React Native Web from remounting the search input while typing. */
function SubscriptionToolbar({ search, setSearch, paymentFilter, setPaymentFilter, isMobile }) {
  return (
    <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={UI.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={isMobile ? "Search customers..." : "Search customers by name"}
          placeholderTextColor="#A0AAA4"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearSearch}>
            <Ionicons name="close-circle" size={18} color="#AAB3AD" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterGroup}>
        <FilterChip label="All" active={paymentFilter === "all"} onPress={() => setPaymentFilter("all")} />
        <FilterChip label="Unpaid" active={paymentFilter === "pending"} onPress={() => setPaymentFilter("pending")} />
        <FilterChip label="Partial" active={paymentFilter === "partial"} onPress={() => setPaymentFilter("partial")} />
        <FilterChip label="Paid" active={paymentFilter === "paid"} onPress={() => setPaymentFilter("paid")} />
      </View>
    </View>
  );
}

/* ---------- SCREEN ---------- */

export default function SubscriptionScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const isDesktop = width >= 900;
  const isTablet = width >= 700 && width < 1050;

  const [selectedMonth, setSelectedMonth] = useState(
    formatMonth(new Date())
  );

  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
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
      query(collection(db, "customers"), where("status", "==", "active")),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCustomers(list);
      }
    );
  }, []);

  /* ---------- AUTO RECALC ---------- */

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deliveries"), async () => {
      for (const sub of subscriptions) {
        const currentMonth = todayStr.slice(0, 7);

        if (sub.month > currentMonth) {
          await updateDoc(doc(db, "subscriptions", sub.id), {
            deliveredDays: 0,
            skippedDays: 0,
            actualAmount: 0,
            balanceAmount: 0,
            carryForwardAmount: sub.paidAmount || 0,
            paymentStatus:
              sub.paidAmount > 0 ? "paid" : "pending",
          });
          continue;
        }

        const { missed, possibleDays } = await getDeliveryStats(
          sub.customerId,
          sub.month,
          sub.endDate
        );

        const delivered = Math.max(
          Math.min(possibleDays, sub.plannedDays) - missed,
          0
        );

        const perDay =
          Number(sub.quantityPerDay || 0) *
          Number(sub.pricePerLitre || 0);

        const plannedAmount =
          Number(sub.plannedDays || 0) * perDay;

        const actualAmount = delivered * perDay;
        const paid = Number(sub.paidAmount || 0);

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
    });

    return unsub;
  }, [subscriptions]);

  /* ---------- SMS RETURN ---------- */

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active" && waitingForSmsReturn) {
          setWaitingForSmsReturn(false);

          Alert.alert(
            "Send WhatsApp also?",
            "Send subscription details via WhatsApp",
            [
              {
                text: "Send WhatsApp",
                onPress: () =>
                  openWhatsApp(lastMobile, lastMsg),
              },
              { text: "Skip", style: "cancel" },
            ]
          );
        }
      }
    );

    return () => subscription.remove();
  }, [waitingForSmsReturn, lastMsg, lastMobile]);

  /* ---------- FILTER + SORT ---------- */

  const filteredSubscriptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return subscriptions
      .filter((s) =>
        String(s.customerName || "")
          .toLowerCase()
          .includes(normalizedSearch)
      )
      .filter((s) =>
        paymentFilter === "all"
          ? true
          : s.paymentStatus === paymentFilter
      )
      .sort((a, b) =>
        String(a.customerName || "").localeCompare(
          String(b.customerName || "")
        )
      );
  }, [subscriptions, search, paymentFilter]);

  const subscriptionCount = filteredSubscriptions.length;

  const monthlySummary = useMemo(() => {
    return filteredSubscriptions.reduce(
      (acc, s) => {
        acc.expected += Number(s.plannedAmount || 0);
        acc.consumed += Number(s.actualAmount || 0);
        acc.paid += Number(s.paidAmount || 0);
        acc.balance += Number(s.balanceAmount || 0);
        acc.carry += Number(s.carryForwardAmount || 0);
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

  const selectedCustomerOptions = useMemo(() => {
    const normalized = customerSearch.trim().toLowerCase();

    return customers
      .filter(
        (c) =>
          !subscriptions.some(
            (s) => s.customerId === c.id
          ) || selectedCustomer?.id === c.id
      )
      .filter((c) => {
        if (!normalized) return true;

        return (
          String(c.name || "")
            .toLowerCase()
            .includes(normalized) ||
          String(c.mobile || "").includes(normalized)
        );
      });
  }, [
    customers,
    subscriptions,
    customerSearch,
    selectedCustomer,
  ]);

  /* ---------- MONTH NAVIGATION ---------- */

  const moveMonth = (delta) => {
    const d = new Date(`${selectedMonth}-01`);
    d.setMonth(d.getMonth() + delta);
    setSelectedMonth(formatMonth(d));
  };

  /* ---------- ADD / EDIT ---------- */

  const resetForm = () => {
    setEditingSub(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setQuantityPerDay("");
    setPricePerLitre("");
    setPlannedDays("");
    setPaidAmount("");
    setPaymentMode(null);
    setEndDate(null);
    setShowEndPicker(false);
  };

  const openAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (sub) => {
    setEditingSub(sub);
    setSelectedCustomer({
      id: sub.customerId,
      name: sub.customerName,
      mobile: sub.mobile,
    });
    setCustomerSearch("");
    setQuantityPerDay(String(sub.quantityPerDay ?? ""));
    setPricePerLitre(String(sub.pricePerLitre ?? ""));
    setPlannedDays(String(sub.plannedDays ?? ""));
    setPaidAmount(
      sub.paidAmount ? String(sub.paidAmount) : ""
    );
    setPaymentMode(sub.paymentMode || null);
    setEndDate(
      sub.endDate ? new Date(sub.endDate) : null
    );
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowEndPicker(false);
  };

  const deleteSubscription = (subscription) => {
    if (Platform.OS === "web") {
      setDeleteTarget(subscription);
      return;
    }

    Alert.alert(
      "Delete Subscription?",
      `Delete ${subscription?.customerName || "this subscription"}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDeleteSubscription(subscription),
        },
      ]
    );
  };

  const confirmDeleteSubscription = async (subscription) => {
    if (!subscription?.id || deleteBusy) return;

    try {
      setDeleteBusy(true);
      await deleteDoc(doc(db, "subscriptions", subscription.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      Alert.alert("Delete failed", "The subscription could not be deleted. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
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

    if (Number(quantityPerDay) <= 0) {
      Alert.alert("Quantity per day must be greater than 0");
      return;
    }

    if (Number(pricePerLitre) <= 0) {
      Alert.alert("Price per litre must be greater than 0");
      return;
    }

    if (Number(plannedDays) <= 0) {
      Alert.alert("Planned days must be greater than 0");
      return;
    }

    const numericPaidAmount = Number(paidAmount || 0);

    if (numericPaidAmount > 0 && !paymentMode) {
      Alert.alert("Please select the payment mode");
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
      endDate: endDate
        ? toDateInput(endDate)
        : null,
      paidAmount: numericPaidAmount,
      paymentMode:
        numericPaidAmount > 0 ? paymentMode : null,
      paymentDate:
        numericPaidAmount > 0 ? Date.now() : null,
    };

    if (editingSub) {
      await updateDoc(
        doc(db, "subscriptions", editingSub.id),
        payload
      );
    } else {
      await addDoc(
        collection(db, "subscriptions"),
        {
          ...payload,
          createdAt: Date.now(),
        }
      );

      if (payload.mobile) {
        const msg = buildSubscriptionMessage(payload);

        setLastMsg(msg);
        setLastMobile(payload.mobile);
        setWaitingForSmsReturn(true);

        openSMS(payload.mobile, msg);

        setTimeout(() => {
          Alert.alert(
            "Send WhatsApp also?",
            "Send subscription details via WhatsApp",
            [
              {
                text: "Send WhatsApp",
                onPress: () =>
                  openWhatsApp(
                    payload.mobile,
                    msg
                  ),
              },
              {
                text: "Skip",
                style: "cancel",
              },
            ]
          );
        }, 2500);
      }
    }

    closeModal();
  };

  /* ---------- RENDER SUBSCRIPTION ---------- */

  const renderSubscription = ({ item }) => {
    const perDay = Number(item.quantityPerDay || 0) * Number(item.pricePerLitre || 0);
    const progress = Number(item.plannedDays || 0) > 0
      ? Math.min(Number(item.deliveredDays || 0) / Number(item.plannedDays || 1), 1)
      : 0;

    const initials = String(item.customerName || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();

    return (
      <View style={[styles.subscriptionCard, isMobile && styles.subscriptionCardMobile]}>
        <View style={styles.cardTop}>
          <View style={styles.customerIdentity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "?"}</Text>
            </View>

            <View style={styles.identityText}>
              <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
              {!!item.mobile && (
                <View style={styles.mobileLine}>
                  <Ionicons name="call" size={12} color={UI.greenDark} />
                  <Text style={styles.customerMobile}>{item.mobile}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardTopRight}>
            <StatusBadge status={item.paymentStatus} />
            <TouchableOpacity activeOpacity={0.8} onPress={() => openEdit(item)} style={styles.iconEditButton}>
              <Ionicons name="create-outline" size={16} color={UI.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.planStrip}>
          <View style={styles.planMain}>
            <Text style={styles.planValue}>{item.quantityPerDay} L</Text>
            <Text style={styles.planLabel}>DAILY QUANTITY</Text>
          </View>
          <View style={styles.planDivider} />
          <View style={styles.planMain}>
            <Text style={styles.planValue}>{money(perDay)}</Text>
            <Text style={styles.planLabel}>PER DAY</Text>
          </View>
          <View style={styles.planDivider} />
          <View style={styles.planMain}>
            <Text style={styles.planValue}>{item.plannedDays}</Text>
            <Text style={styles.planLabel}>PLANNED DAYS</Text>
          </View>
        </View>

        <View style={styles.progressArea}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleRow}>
              <Ionicons name="bicycle-outline" size={14} color={UI.greenDark} />
              <Text style={styles.progressTitle}>Delivery progress</Text>
            </View>
            <Text style={styles.progressValue}>{item.deliveredDays || 0}/{item.plannedDays || 0} days</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.detailGrid}>
          <DetailItem label="EXPECTED" value={money(item.plannedAmount)} emphasis />
          <DetailItem label="CONSUMED" value={money(item.actualAmount)} />
          <DetailItem label="PAID" value={money(item.paidAmount)} tone="success" />
          <DetailItem label="BALANCE" value={money(item.balanceAmount)} emphasis tone="danger" />
        </View>

        <View style={styles.secondaryInfo}>
          <View style={styles.infoPill}>
            <Ionicons name="remove-circle-outline" size={12} color={UI.secondary} />
            <Text style={styles.infoPillText}>{item.skippedDays || 0} missed</Text>
          </View>

          {Number(item.carryForwardAmount || 0) > 0 && (
            <View style={[styles.infoPill, styles.carryPill]}>
              <Ionicons name="arrow-forward-circle-outline" size={12} color={UI.warning} />
              <Text style={[styles.infoPillText, styles.carryPillText]}>{money(item.carryForwardAmount)} carry</Text>
            </View>
          )}

          {item.endDate && (
            <View style={styles.infoPill}>
              <Ionicons name="calendar-outline" size={12} color={UI.secondary} />
              <Text style={styles.infoPillText}>Ends {new Date(item.endDate).toLocaleDateString("en-IN")}</Text>
            </View>
          )}

          {item.paymentStatus !== "pending" && item.paymentMode && (
            <View style={styles.infoPill}>
              <Ionicons name={item.paymentMode === "cash" ? "cash-outline" : "card-outline"} size={12} color={UI.secondary} />
              <Text style={styles.infoPillText}>
                {item.paymentMode.toUpperCase()}
                {item.paymentDate ? ` · ${new Date(item.paymentDate).toLocaleDateString("en-IN")}` : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          {!!item.mobile && <ActionButton label="Call" icon="call" variant="call" onPress={() => makeCall(item.mobile)} />}
          {!!item.mobile && <ActionButton label="SMS" icon="chatbubble-outline" variant="sms" onPress={() => openSMS(item.mobile, buildSubscriptionMessage(item))} />}
          {!!item.mobile && <ActionButton label="WhatsApp" icon="logo-whatsapp" variant="whatsapp" onPress={() => openWhatsApp(item.mobile, buildSubscriptionMessage(item))} />}
          <ActionButton label="Delete" icon="trash-outline" variant="delete" onPress={() => deleteSubscription(item)} />
        </View>
      </View>
    );
  };

  const headerContent = (
    <View style={styles.contentWidth}>
      <View style={styles.contentWidthInner}>
        <View style={[styles.pageHeader, isMobile && styles.pageHeaderMobile]}>
          <View style={styles.headerDecoration} />
          <View style={styles.headerInner}>
            <View style={styles.pageIcon}>
              <Ionicons name="repeat-outline" size={23} color={UI.greenDark} />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.pageTitle}>Subscriptions</Text>
              <Text style={styles.pageSubtitle}>Manage monthly plans, deliveries and payments</Text>
              {!isMobile && (
                <View style={styles.headerMeta}>
                  <View style={styles.headerDot} />
                  <Text style={styles.headerMetaText}>{subscriptionCount} subscriptions</Text>
                  <Text style={styles.headerBullet}>•</Text>
                  <Text style={styles.headerMetaText}>{monthLabel(selectedMonth)}</Text>
                </View>
              )}
            </View>

            {!isMobile && (
              <TouchableOpacity activeOpacity={0.85} onPress={openAdd} style={styles.addButton}>
                <Ionicons name="add" size={19} color="#FFFFFF" />
                <Text style={styles.addButtonText}>New Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.monthCard}>
          <View>
            <Text style={styles.monthEyebrow}>BILLING MONTH</Text>
            <Text style={styles.monthHeading}>{monthLabel(selectedMonth)}</Text>
          </View>

          <View style={styles.monthControls}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => moveMonth(-1)} style={styles.monthButton}>
              <Ionicons name="chevron-back" size={17} color={UI.greenDark} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedMonth(formatMonth(new Date()))} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => moveMonth(1)} style={styles.monthButton}>
              <Ionicons name="chevron-forward" size={17} color={UI.greenDark} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.metricsGrid, isMobile && styles.metricsGridMobile]}>
          <SummaryMetric icon="receipt-outline" label="EXPECTED" value={monthlySummary.expected} compact={isMobile} />
          <SummaryMetric icon="water-outline" label="CONSUMED" value={monthlySummary.consumed} compact={isMobile} />
          <SummaryMetric icon="wallet-outline" label="COLLECTED" value={monthlySummary.paid} tone="success" compact={isMobile} />
          <SummaryMetric icon="alert-circle-outline" label="BALANCE" value={monthlySummary.balance} tone="danger" compact={isMobile} />
          <SummaryMetric icon="arrow-forward-circle-outline" label="CARRY FORWARD" value={monthlySummary.carry} tone="warning" compact={isMobile} />
        </View>

        <SubscriptionToolbar
          search={search}
          setSearch={setSearch}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          isMobile={isMobile}
        />

        <View style={styles.resultHeader}>
          <View>
            <Text style={styles.resultTitle}>Monthly subscriptions</Text>
            <Text style={styles.resultSubtitle}>
              {subscriptionCount} {subscriptionCount === 1 ? "customer" : "customers"} shown
            </Text>
          </View>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>
              {paymentFilter === "all" ? "ALL" : paymentFilter === "pending" ? "UNPAID" : paymentFilter.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={UI.greenDeep} barStyle="light-content" />

      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubscription}
        numColumns={isDesktop ? 2 : 1}
        columnWrapperStyle={isDesktop ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, isMobile && styles.listContentMobile]}
        ListHeaderComponent={headerContent}
        ListEmptyComponent={
          <View style={[styles.emptyStateWrap, !isMobile && styles.contentWidthDesktop]}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="repeat-outline" size={29} color={UI.greenDark} />
              </View>
              <Text style={styles.emptyTitle}>No subscriptions found</Text>
              <Text style={styles.emptyText}>
                {search || paymentFilter !== "all"
                  ? "Try changing the search or payment filter."
                  : `No subscription is available for ${monthLabel(selectedMonth)}.`}
              </Text>
              {!search && paymentFilter === "all" && (
                <TouchableOpacity activeOpacity={0.85} onPress={openAdd} style={styles.emptyButton}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Add Subscription</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />

      {/* ---------- WEB DELETE CONFIRMATION ---------- */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteBusy && setDeleteTarget(null)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalCard, isMobile && styles.deleteModalCardMobile]}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="trash-outline" size={25} color={UI.danger} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete subscription?</Text>
            <Text style={styles.deleteModalText}>
              {deleteTarget?.customerName
                ? `This will permanently remove ${deleteTarget.customerName}'s subscription for ${monthLabel(selectedMonth)}.`
                : "This action cannot be undone."}
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity disabled={deleteBusy} onPress={() => setDeleteTarget(null)} style={styles.deleteCancelButton}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={deleteBusy} onPress={() => confirmDeleteSubscription(deleteTarget)} style={[styles.deleteConfirmButton, deleteBusy && styles.deleteButtonDisabled]}>
                <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                <Text style={styles.deleteConfirmText}>{deleteBusy ? "Deleting..." : "Delete Subscription"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- ADD / EDIT MODAL ---------- */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              isMobile
                ? styles.modalCardMobile
                : styles.modalCardDesktop,
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  {editingSub ? "UPDATE PLAN" : "NEW PLAN"}
                </Text>
                <Text style={styles.modalTitle}>
                  {editingSub
                    ? "Edit Subscription"
                    : "Create Subscription"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={closeModal}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              {/* CUSTOMER */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  Customer
                </Text>
                <Text style={styles.sectionHint}>
                  Choose an active customer for this month
                </Text>

                {!editingSub && (
                  <>
                    <View style={styles.modalSearchBox}>
                      <Text style={styles.modalSearchIcon}>
                        ⌕
                      </Text>
                      <TextInput
                        style={styles.modalSearchInput}
                        placeholder="Search customer by name or mobile"
                        placeholderTextColor="#94A3B8"
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.customerList}>
                      {selectedCustomerOptions.length ===
                      0 ? (
                        <Text
                          style={styles.noCustomerText}
                        >
                          No available customers found.
                        </Text>
                      ) : (
                        selectedCustomerOptions
                          .slice(0, 8)
                          .map((customer) => {
                            const active =
                              selectedCustomer?.id ===
                              customer.id;

                            return (
                              <TouchableOpacity
                                key={customer.id}
                                activeOpacity={0.8}
                                onPress={() =>
                                  setSelectedCustomer(
                                    customer
                                  )
                                }
                                style={[
                                  styles.customerOption,
                                  active &&
                                    styles.customerOptionActive,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.customerOptionAvatar,
                                    active &&
                                      styles.customerOptionAvatarActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.customerOptionAvatarText,
                                      active &&
                                        styles.customerOptionAvatarTextActive,
                                    ]}
                                  >
                                    {String(
                                      customer.name || "?"
                                    )
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase()}
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.customerOptionText
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.customerOptionName,
                                      active &&
                                        styles.customerOptionNameActive,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {customer.name}
                                  </Text>
                                  {!!customer.mobile && (
                                    <Text
                                      style={
                                        styles.customerOptionMobile
                                      }
                                    >
                                      {customer.mobile}
                                    </Text>
                                  )}
                                </View>

                                <View
                                  style={[
                                    styles.radio,
                                    active &&
                                      styles.radioActive,
                                  ]}
                                >
                                  {active && (
                                    <View
                                      style={
                                        styles.radioInner
                                      }
                                    />
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })
                      )}
                    </View>
                  </>
                )}

                {editingSub && selectedCustomer && (
                  <View style={styles.selectedCustomerCard}>
                    <View style={styles.customerOptionAvatar}>
                      <Text
                        style={
                          styles.customerOptionAvatarText
                        }
                      >
                        {String(
                          selectedCustomer.name || "?"
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={styles.customerOptionText}
                    >
                      <Text
                        style={styles.customerOptionName}
                      >
                        {selectedCustomer.name}
                      </Text>
                      {!!selectedCustomer.mobile && (
                        <Text
                          style={
                            styles.customerOptionMobile
                          }
                        >
                          {selectedCustomer.mobile}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* PLAN */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  Subscription plan
                </Text>
                <Text style={styles.sectionHint}>
                  Set the daily quantity, price and planned days
                </Text>

                <View
                  style={[
                    styles.fieldRow,
                    isMobile && styles.fieldRowMobile,
                  ]}
                >
                  <View style={styles.fieldHalf}>
                    <FieldLabel>
                      Quantity per day (L)
                    </FieldLabel>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 1"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={quantityPerDay}
                      onChangeText={setQuantityPerDay}
                    />
                  </View>

                  <View style={styles.fieldHalf}>
                    <FieldLabel>
                      Price per litre (₹)
                    </FieldLabel>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 60"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={pricePerLitre}
                      onChangeText={setPricePerLitre}
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.fieldRow,
                    isMobile && styles.fieldRowMobile,
                  ]}
                >
                  <View style={styles.fieldHalf}>
                    <FieldLabel>
                      Planned days
                    </FieldLabel>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 30"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={plannedDays}
                      onChangeText={setPlannedDays}
                    />
                  </View>

                  <View style={styles.fieldHalf}>
                    <FieldLabel>
                      Subscription end date
                    </FieldLabel>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.formInputDate}
                      onPress={() =>
                        setShowEndPicker(true)
                      }
                    >
                      <Text
                        style={[
                          styles.dateInputText,
                          !endDate &&
                            styles.datePlaceholder,
                        ]}
                      >
                        {endDate
                          ? endDate.toLocaleDateString(
                              "en-IN"
                            )
                          : "Select end date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showEndPicker && (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={endDate || new Date()}
                      mode="date"
                      display="calendar"
                      minimumDate={new Date()}
                      onChange={(
                        event,
                        selectedDate
                      ) => {
                        setShowEndPicker(false);
                        if (selectedDate) {
                          setEndDate(selectedDate);
                        }
                      }}
                    />
                  </View>
                )}
              </View>

              {/* PAYMENT */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  Payment
                </Text>
                <Text style={styles.sectionHint}>
                  Record any amount collected for this subscription
                </Text>

                <FieldLabel>
                  Paid amount (₹)
                </FieldLabel>

                <TextInput
                  style={styles.formInput}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                />

                <FieldLabel>
                  Payment mode
                </FieldLabel>

                <View style={styles.paymentModeRow}>
                  {["cash", "online"].map((mode) => {
                    const active =
                      paymentMode === mode;

                    return (
                      <TouchableOpacity
                        key={mode}
                        activeOpacity={0.8}
                        onPress={() =>
                          setPaymentMode(mode)
                        }
                        style={[
                          styles.paymentModeButton,
                          active &&
                            styles.paymentModeButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentModeIcon,
                            active &&
                              styles.paymentModeTextActive,
                          ]}
                        >
                          {mode === "cash"
                            ? "₹"
                            : "↗"}
                        </Text>
                        <Text
                          style={[
                            styles.paymentModeText,
                            active &&
                              styles.paymentModeTextActive,
                          ]}
                        >
                          {mode === "cash"
                            ? "Cash"
                            : "Online"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* LIVE PREVIEW */}
              <View style={styles.previewCard}>
                <View>
                  <Text style={styles.previewEyebrow}>
                    ESTIMATED PLAN
                  </Text>
                  <Text style={styles.previewTitle}>
                    {quantityPerDay || "0"} L ×{" "}
                    {pricePerLitre || "0"} ×{" "}
                    {plannedDays || "0"} days
                  </Text>
                </View>

                <Text style={styles.previewAmount}>
                  {money(
                    Number(quantityPerDay || 0) *
                      Number(pricePerLitre || 0) *
                      Number(plannedDays || 0)
                  )}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={closeModal}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={saveSubscription}
                  style={styles.saveButton}
                >
                  <Text style={styles.saveButtonIcon}>
                    ✓
                  </Text>
                  <Text style={styles.saveButtonText}>
                    {editingSub
                      ? "Update Subscription"
                      : "Save Subscription"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MOBILE FLOATING ACTION BUTTON */}
      {isMobile && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={openAdd}
          style={styles.mobileFab}
        >
          <Text style={styles.mobileFabIcon}>＋</Text>
          <Text style={styles.mobileFabText}>New</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.background },

  listContent: {
    width: "100%",
    maxWidth: 1540,
    alignSelf: "center",
    paddingHorizontal: 38,
    paddingTop: 25,
    paddingBottom: 70,
  },
  listContentMobile: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 110,
  },

  contentWidth: { width: "100%" },
  contentWidthInner: { width: "100%" },
  contentWidthDesktop: { width: "100%", alignSelf: "center" },

  pageHeader: {
    minHeight: 116,
    borderRadius: 22,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    overflow: "hidden",
    marginBottom: 17,
    position: "relative",
  },
  pageHeaderMobile: { minHeight: 92, borderRadius: 18, marginBottom: 12 },
  headerDecoration: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -125,
    top: -185,
    backgroundColor: UI.greenSoft,
  },
  headerInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
    paddingVertical: 18,
  },
  pageIcon: {
    width: 51,
    height: 51,
    borderRadius: 17,
    backgroundColor: UI.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 25, fontWeight: "800", color: UI.text, letterSpacing: -0.7 },
  pageSubtitle: { marginTop: 3, fontSize: 12, color: UI.secondary },
  headerMeta: { flexDirection: "row", alignItems: "center", marginTop: 7 },
  headerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: UI.green, marginRight: 5 },
  headerMetaText: { fontSize: 10, fontWeight: "700", color: UI.secondary },
  headerBullet: { marginHorizontal: 7, color: "#B6BDB8" },
  addButton: {
    height: 44,
    paddingHorizontal: 17,
    borderRadius: 13,
    backgroundColor: UI.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: UI.greenDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },
  addButtonText: { marginLeft: 6, color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  monthCard: {
    minHeight: 76,
    borderRadius: 17,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 17,
    paddingVertical: 13,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthEyebrow: { fontSize: 8.5, fontWeight: "850", color: UI.muted, letterSpacing: 0.8 },
  monthHeading: { marginTop: 3, fontSize: 17, fontWeight: "850", color: UI.text },
  monthControls: { flexDirection: "row", alignItems: "center" },
  monthButton: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: "#F5F8F4",
    alignItems: "center", justifyContent: "center", marginHorizontal: 3,
  },
  todayButton: {
    height: 38, paddingHorizontal: 13, borderRadius: 11,
    backgroundColor: UI.greenSoft, borderWidth: 1, borderColor: UI.green,
    alignItems: "center", justifyContent: "center", marginHorizontal: 3,
  },
  todayButtonText: { color: UI.greenDeep, fontSize: 11, fontWeight: "850" },

  metricsGrid: { flexDirection: "row", marginBottom: 17 },
  metricsGridMobile: { flexDirection: "column", marginBottom: 12 },
  metricCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 17,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  metricCardCompact: { minHeight: 68, marginRight: 0, marginBottom: 7 },
  metricIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", marginRight: 9,
  },
  metricContent: { flex: 1, minWidth: 0 },
  metricLabel: { fontSize: 8.5, fontWeight: "800", color: UI.muted, letterSpacing: 0.55 },
  metricValue: { marginTop: 3, fontSize: 18, lineHeight: 22, fontWeight: "850" },

  toolbar: {
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 17,
    padding: 11,
    marginBottom: 18,
  },
  toolbarMobile: { padding: 9, marginBottom: 14 },
  searchBox: {
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FBFCFB",
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1, height: "100%", marginLeft: 8, fontSize: 12.5,
    color: UI.text, outlineStyle: "none",
  },
  clearSearch: { paddingLeft: 5 },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    flexWrap: "wrap",
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: UI.white,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  filterChipActive: { backgroundColor: UI.greenSoft, borderColor: UI.green },
  filterChipText: { fontSize: 10.5, fontWeight: "750", color: UI.secondary },
  filterChipTextActive: { color: UI.greenDeep, fontWeight: "850" },

  resultHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 11,
  },
  resultTitle: { fontSize: 17, fontWeight: "850", color: UI.text, letterSpacing: -0.3 },
  resultSubtitle: { marginTop: 2, fontSize: 10, color: UI.muted },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: UI.greenSoft },
  resultBadgeText: { fontSize: 8.5, fontWeight: "850", color: UI.greenDark, letterSpacing: 0.5 },

  columnWrapper: { marginHorizontal: -6, marginBottom: 12 },

  subscriptionCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: UI.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginHorizontal: 6,
    shadowColor: "#29442D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 9,
    elevation: 1,
  },
  subscriptionCardMobile: {
    width: "100%", marginHorizontal: 0, marginBottom: 11,
    padding: 14, borderRadius: 17,
  },

  cardTop: { flexDirection: "row", alignItems: "center" },
  customerIdentity: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  avatar: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: UI.greenSoft,
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  avatarText: { fontSize: 14, fontWeight: "850", color: UI.greenDark },
  identityText: { flex: 1, minWidth: 0 },
  customerName: { flexShrink: 1, fontSize: 15, fontWeight: "850", color: UI.text },
  mobileLine: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  customerMobile: { marginLeft: 5, fontSize: 9.5, color: UI.secondary, fontWeight: "600" },
  cardTopRight: { flexDirection: "row", alignItems: "center", marginLeft: 7 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 8, fontWeight: "850" },
  iconEditButton: {
    width: 33,
    height: 33,
    borderRadius: 10,
    backgroundColor: UI.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    shadowColor: UI.greenDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },

  planStrip: {
    marginTop: 13, minHeight: 56, borderRadius: 13,
    backgroundColor: UI.greenSoft2, flexDirection: "row",
    alignItems: "center", paddingVertical: 7,
  },
  planMain: { flex: 1, alignItems: "center", justifyContent: "center" },
  planValue: { fontSize: 13, fontWeight: "850", color: UI.text },
  planLabel: { marginTop: 2, fontSize: 7.5, fontWeight: "750", color: UI.muted, letterSpacing: 0.2 },
  planDivider: { width: 1, height: 29, backgroundColor: UI.border },

  progressArea: { marginTop: 13 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  progressTitleRow: { flexDirection: "row", alignItems: "center" },
  progressTitle: { marginLeft: 5, fontSize: 9.5, fontWeight: "750", color: UI.secondary },
  progressValue: { fontSize: 9.5, fontWeight: "850", color: UI.text },
  progressTrack: { height: 7, borderRadius: 8, backgroundColor: "#E8EEE7", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: UI.green },

  detailGrid: {
    flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: "#EDF1EC", marginTop: 13, paddingVertical: 11,
  },
  detailItem: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 7, fontWeight: "850", color: UI.muted, letterSpacing: 0.45 },
  detailValue: { marginTop: 3, fontSize: 11, fontWeight: "650" },
  detailValueEmphasis: { fontWeight: "850" },

  secondaryInfo: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center",
    marginTop: 9, minHeight: 23,
  },
  infoPill: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 7,
    paddingVertical: 4, borderRadius: 8, backgroundColor: "#F5F7F5", marginRight: 5, marginBottom: 4,
  },
  infoPillText: { marginLeft: 4, fontSize: 7.5, fontWeight: "700", color: UI.secondary },
  carryPill: { backgroundColor: UI.warningSoft },
  carryPillText: { color: UI.warning },

  actionRow: {
    flexDirection: "row", alignItems: "center", marginTop: 11,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: "#EDF1EC",
  },
  actionButton: {
    flex: 1, minWidth: 0, height: 34, borderRadius: 9,
    flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 6,
  },
  actionLabel: { marginLeft: 5, fontSize: 8.5, fontWeight: "800" },

  emptyStateWrap: { width: "100%", alignSelf: "center" },
  emptyState: {
    minHeight: 300, backgroundColor: UI.white, borderWidth: 1, borderColor: UI.border,
    borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 25,
  },
  emptyIcon: {
    width: 65, height: 65, borderRadius: 21, backgroundColor: UI.greenSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 13,
  },
  emptyTitle: { fontSize: 17, fontWeight: "850", color: UI.text },
  emptyText: { maxWidth: 430, marginTop: 6, fontSize: 11.5, lineHeight: 17, color: UI.secondary, textAlign: "center" },
  emptyButton: {
    height: 43, paddingHorizontal: 17, borderRadius: 12, backgroundColor: UI.green,
    flexDirection: "row", alignItems: "center", marginTop: 17,
  },
  emptyButtonText: { marginLeft: 6, color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  mobileFab: {
    position: "absolute", right: 18, bottom: 88, height: 52,
    paddingHorizontal: 16, borderRadius: 17, backgroundColor: UI.green,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    shadowColor: UI.greenDark, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24, shadowRadius: 10, elevation: 8,
  },
  mobileFabIcon: { color: "#FFFFFF", fontSize: 21, fontWeight: "400" },
  mobileFabText: { color: "#FFFFFF", fontSize: 11, fontWeight: "850", marginLeft: 4 },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 18, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },

  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 30, 22, 0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  deleteModalCard: {
    width: "92%", maxWidth: 430, backgroundColor: UI.white, borderRadius: 22, padding: 24, alignItems: "center",
    shadowColor: "#000000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  deleteModalCardMobile: { width: "100%", maxWidth: undefined },
  deleteModalIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: UI.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  deleteModalTitle: { fontSize: 18, fontWeight: "850", color: UI.text, textAlign: "center" },
  deleteModalText: { marginTop: 7, fontSize: 11.5, lineHeight: 18, color: UI.secondary, textAlign: "center" },
  deleteModalActions: { width: "100%", flexDirection: "row", marginTop: 20 },
  deleteCancelButton: { flex: 1, height: 45, borderRadius: 12, borderWidth: 1, borderColor: UI.border, alignItems: "center", justifyContent: "center", marginRight: 8 },
  deleteCancelText: { fontSize: 12, fontWeight: "800", color: UI.secondary },
  deleteConfirmButton: { flex: 1.35, height: 45, borderRadius: 12, backgroundColor: UI.danger, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  deleteConfirmText: { marginLeft: 6, fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  deleteButtonDisabled: { opacity: 0.65 },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    maxHeight: "94%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },

  modalCardDesktop: {
    width: "100%",
    maxWidth: 720,
  },

  modalCardMobile: {
    width: "100%",
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalEyebrow: {
    color: "#2E7D32",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  modalTitle: {
    color: "#17211B",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1F4F1",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: "#58645D",
    fontSize: 24,
    lineHeight: 25,
  },

  modalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },

  formSection: {
    marginBottom: 22,
  },

  sectionTitle: {
    color: "#17211B",
    fontSize: 14,
    fontWeight: "800",
  },

  sectionHint: {
    color: "#7A867E",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
    marginBottom: 10,
  },

  modalSearchBox: {
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DDE5DF",
    backgroundColor: "#FAFCFA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
  },

  modalSearchIcon: {
    color: "#77847B",
    fontSize: 20,
    marginRight: 6,
  },

  modalSearchInput: {
    flex: 1,
    height: 41,
    fontSize: 12,
    color: "#17211B",
  },

  customerList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5EDE6",
    borderRadius: 12,
    overflow: "hidden",
  },

  customerOption: {
    minHeight: 55,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
  },

  customerOptionActive: {
    backgroundColor: "#F1F9F2",
  },

  customerOptionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EEF3EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  customerOptionAvatarActive: {
    backgroundColor: "#D8F0DA",
  },

  customerOptionAvatarText: {
    color: "#66736A",
    fontSize: 13,
    fontWeight: "900",
  },

  customerOptionAvatarTextActive: {
    color: UI.greenDark,
  },

  customerOptionText: {
    flex: 1,
    minWidth: 0,
  },

  customerOptionName: {
    color: "#33423A",
    fontSize: 12,
    fontWeight: "700",
  },

  customerOptionNameActive: {
    color: UI.greenDark,
  },

  customerOptionMobile: {
    color: "#89938D",
    fontSize: 10,
    marginTop: 2,
  },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5CF",
    alignItems: "center",
    justifyContent: "center",
  },

  radioActive: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: UI.green,
  },

  noCustomerText: {
    padding: 15,
    textAlign: "center",
    color: "#7A867E",
    fontSize: 11,
  },

  selectedCustomerCard: {
    minHeight: 57,
    borderRadius: 12,
    paddingHorizontal: 11,
    backgroundColor: "#F1F9F2",
    borderWidth: 1,
    borderColor: "#CDE7CF",
    flexDirection: "row",
    alignItems: "center",
  },

  fieldRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  fieldRowMobile: {
    flexDirection: "column",
  },

  fieldHalf: {
    flex: 1,
  },

  fieldLabel: {
    color: "#536159",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 9,
  },

  formInput: {
    height: 45,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE5DE",
    backgroundColor: "#FBFCFB",
    paddingHorizontal: 12,
    color: "#17211B",
    fontSize: 13,
  },

  formInputDate: {
    height: 45,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE5DE",
    backgroundColor: "#FBFCFB",
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  dateInputText: {
    color: "#17211B",
    fontSize: 13,
  },

  datePlaceholder: {
    color: "#94A3B8",
  },

  datePickerWrap: {
    alignItems: "flex-start",
    marginTop: 7,
  },

  paymentModeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },

  paymentModeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE5DE",
    backgroundColor: "#FBFCFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentModeButtonActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#76B87B",
  },

  paymentModeIcon: {
    color: "#657169",
    fontSize: 14,
    fontWeight: "900",
    marginRight: 6,
  },

  paymentModeText: {
    color: "#536159",
    fontSize: 12,
    fontWeight: "800",
  },

  paymentModeTextActive: {
    color: UI.greenDark,
  },

  previewCard: {
    borderRadius: 15,
    padding: 14,
    backgroundColor: "#F0F7F1",
    borderWidth: 1,
    borderColor: "#D6E9D7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  previewEyebrow: {
    color: "#6C806F",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  previewTitle: {
    color: "#304337",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  previewAmount: {
    color: UI.greenDark,
    fontSize: 17,
    fontWeight: "900",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 12,
    backgroundColor: "#EEF2EF",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#536159",
    fontSize: 12,
    fontWeight: "800",
  },

  saveButton: {
    flex: 2,
    minHeight: 47,
    borderRadius: 12,
    backgroundColor: UI.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: UI.greenDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },

  saveButtonIcon: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    marginRight: 6,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  /* MOBILE FAB */

  mobileFab: {
    position: "absolute",
    right: 18,
    bottom: 86,
    minWidth: 72,
    height: 48,
    borderRadius: 15,
    paddingHorizontal: 13,
    backgroundColor: UI.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: UI.greenDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 6,
  },

  mobileFabIcon: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "500",
  },

  mobileFabText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
});
