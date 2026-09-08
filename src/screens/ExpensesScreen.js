import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/AppText";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const C = {
  green: "#63B83F",
  greenDark: "#4E9F30",
  greenDeep: "#367C27",
  greenSoft: "#EAF7DF",
  greenSoft2: "#F3F9EE",
  bg: "#F3F7F1",
  white: "#FFFFFF",
  border: "#E2EAE1",
  text: "#17231B",
  secondary: "#65736A",
  muted: "#8A968F",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  purple: "#7C3AED",
  purpleSoft: "#F4EEFF",
  orange: "#EA580C",
  orangeSoft: "#FFF2EA",
  yellow: "#D97706",
  yellowSoft: "#FFF7E6",
  danger: "#DC2626",
  dangerSoft: "#FEF0F0",
};

const CATEGORIES = ["Purchase", "Expenses", "Salary"];
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const keyFromDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const direct = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(direct.getTime())) return direct;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeDate = (value) => {
  const d = parseDate(value);
  return d ? keyFromDate(d) : "";
};

const displayDate = (value) => {
  const d = parseDate(value);
  return d
    ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "-";
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key) => {
  const d = new Date(`${key}-01T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const shiftMonth = (key, delta) => {
  const d = new Date(`${key}-01T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return monthKey(d);
};

const shiftDate = (value, delta) => {
  const d = parseDate(value) || new Date();
  d.setDate(d.getDate() + delta);
  return keyFromDate(d);
};

const isTodayKey = (value) => value === keyFromDate(new Date());

function CalendarDatePicker({ visible, value, onClose, onChange }) {
  const initial = parseDate(value) || new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  useEffect(() => {
    if (visible) {
      const d = parseDate(value) || new Date();
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [visible, value]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = parseDate(value);
  const selectedDay = selected && selected.getFullYear() === year && selected.getMonth() === month ? selected.getDate() : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity style={styles.pickerNav} onPress={() => setCursor(new Date(year, month - 1, 1))}>
              <Ionicons name="chevron-back" size={20} color={C.secondary} />
            </TouchableOpacity>
            <View style={styles.pickerTitleWrap}>
              <AppText style={styles.pickerTitle}>{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</AppText>
              <TouchableOpacity onPress={() => { const now = new Date(); setCursor(new Date(now.getFullYear(), now.getMonth(), 1)); }}>
                <AppText style={styles.pickerToday}>Today</AppText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.pickerNav} onPress={() => setCursor(new Date(year, month + 1, 1))}>
              <Ionicons name="chevron-forward" size={20} color={C.secondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => <AppText key={x} style={styles.weekDay}>{x}</AppText>)}</View>
          <View style={styles.dayGrid}>
            {cells.map((day, i) => {
              const isSelected = day === selectedDay;
              return (
                <TouchableOpacity key={`${year}-${month}-${i}`} disabled={!day} onPress={() => { if (day) { onChange(new Date(year, month, day)); onClose(); } }} style={[styles.dayCell, isSelected && styles.dayCellSelected]}>
                  {day ? <AppText style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</AppText> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.pickerCancel} onPress={onClose}><AppText style={styles.pickerCancelText}>Cancel</AppText></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ icon, label, value, sub, tone = "green" }) {
  const map = { green: [C.greenDeep, C.greenSoft], amber: [C.amber, C.amberSoft], blue: [C.blue, C.blueSoft] };
  const [color, soft] = map[tone] || map.green;
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: soft }]}><Ionicons name={icon} size={20} color={color} /></View>
      <AppText style={styles.metricLabel}>{label}</AppText>
      <AppText style={styles.metricValue}>{money(value)}</AppText>
      {!!sub && <AppText style={styles.metricSub}>{sub}</AppText>}
    </View>
  );
}

function ExpenseCard({ item, onEdit, onDelete }) {
  const amount = Number(item.amount || 0);
  const category = item.category || "Expenses";
  const categoryColor = category === "Purchase" ? C.blue : category === "Salary" ? C.greenDeep : C.amber;
  const qty = Number(item.qty || 0);
  const rate = Number(item.rate || 0);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTop}>
        <View style={styles.entryDateRow}>
          <View style={styles.dateIcon}><Ionicons name="calendar-outline" size={17} color={C.greenDeep} /></View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.entryDate}>{displayDate(item.date)}</AppText>
            <AppText style={styles.entryDateKey}>{item.description || "Finance Entry"}</AppText>
          </View>
        </View>
        <View style={styles.entryAmountWrap}>
          <AppText style={styles.entryTotal}>{money(amount)}</AppText>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}18` }]}><AppText style={[styles.categoryBadgeText, { color: categoryColor }]}>{category}</AppText></View>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailItem}><AppText style={styles.detailLabel}>Quantity</AppText><AppText style={styles.detailValue}>{qty || "—"}</AppText></View>
        <View style={styles.detailItem}><AppText style={styles.detailLabel}>Rate</AppText><AppText style={styles.detailValue}>{rate ? money(rate) : "—"}</AppText></View>
        <View style={styles.detailItem}><AppText style={styles.detailLabel}>Payment</AppText><AppText style={styles.detailValue}>{item.paymentMode || "Not specified"}</AppText></View>
      </View>

      <View style={styles.entryActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}><Ionicons name="create-outline" size={17} color={C.secondary} /><AppText style={styles.actionText}>Edit</AppText></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteAction]} onPress={() => onDelete(item)}><Ionicons name="trash-outline" size={17} color={C.danger} /><AppText style={styles.deleteText}>Delete</AppText></TouchableOpacity>
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(keyFromDate(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [viewMode, setViewMode] = useState("day");
  const [tab, setTab] = useState("entry");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [showDate, setShowDate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [expandedReports, setExpandedReports] = useState({});
  const [form, setForm] = useState({ date: keyFromDate(new Date()), description: "", qty: "", rate: "", amount: "", category: "Expenses", paymentMode: "Cash", notes: "" });

  useEffect(() => {
    console.log("[Expenses] DAILY STYLE SCREEN MOUNTED");
    console.log("[Expenses] Reading Firestore collection: finance");
    const q = query(collection(db, "finance"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const raw = d.data() || {};
        const amount = raw.amount !== undefined ? Number(raw.amount || 0) : Number(raw.qty || 0) * Number(raw.rate || 0);
        return { id: d.id, ...raw, date: normalizeDate(raw.date), amount, description: raw.description || raw.name || raw.category || "Finance Entry", category: raw.category || "Expenses", paymentMode: raw.paymentMode || raw.paymentMethod || raw.mode || "Not specified" };
      });
      console.log("[Expenses] finance document count:", snap.size);
      setData(rows);
      setLoading(false);
      setError("");
    }, (err) => {
      console.error("[Expenses] FIRESTORE ERROR:", err);
      setError(err?.message || "Unable to load finance records.");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const monthData = useMemo(
    () => data.filter((x) => String(x.date || "").slice(0, 7) === selectedMonth),
    [data, selectedMonth]
  );

  const dayData = useMemo(
    () => monthData.filter((x) => x.date === selectedDate),
    [monthData, selectedDate]
  );

  const viewData = viewMode === "day" ? dayData : monthData;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return viewData
      .filter((x) => {
        const text = [x.description, x.category, x.paymentMode, x.notes]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");

        return (
          (!q || text.includes(q)) &&
          (categoryFilter === "All" || x.category === categoryFilter) &&
          (paymentFilter === "All" ||
            String(x.paymentMode || "").toLowerCase() ===
              paymentFilter.toLowerCase())
        );
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [viewData, search, categoryFilter, paymentFilter]);

  const totals = useMemo(() => {
    const total = viewData.reduce((a, x) => a + Number(x.amount || 0), 0);
    const purchase = viewData
      .filter((x) => x.category === "Purchase")
      .reduce((a, x) => a + Number(x.amount || 0), 0);
    const salary = viewData
      .filter((x) => x.category === "Salary")
      .reduce((a, x) => a + Number(x.amount || 0), 0);
    const other = total - purchase - salary;
    const cash = viewData
      .filter((x) => String(x.paymentMode || "").toLowerCase() === "cash")
      .reduce((a, x) => a + Number(x.amount || 0), 0);
    const online = viewData
      .filter((x) =>
        ["upi", "bank transfer"].includes(
          String(x.paymentMode || "").toLowerCase()
        )
      )
      .reduce((a, x) => a + Number(x.amount || 0), 0);

    const days = new Set(viewData.map((x) => x.date).filter(Boolean)).size;

    return {
      total,
      purchase,
      salary,
      other,
      cash,
      online,
      days,
      average: days ? total / days : 0,
    };
  }, [viewData]);

  const monthTotals = useMemo(() => {
    const total = monthData.reduce((a, x) => a + Number(x.amount || 0), 0);
    const days = new Set(monthData.map((x) => x.date).filter(Boolean)).size;
    return { total, days, average: days ? total / days : 0 };
  }, [monthData]);

  const daySummaries = useMemo(() => {
    const map = new Map();

    monthData.forEach((item) => {
      if (!item.date) return;

      const current = map.get(item.date) || {
        date: item.date,
        total: 0,
        count: 0,
      };

      current.total += Number(item.amount || 0);
      current.count += 1;
      map.set(item.date, current);
    });

    return Array.from(map.values()).sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );
  }, [monthData]);

  const descriptionSuggestions = useMemo(() => {
    const typed = form.description.trim().toLowerCase();
    const unique = new Map();

    data.forEach((item) => {
      const value = String(item.description || "").trim();
      if (!value || value.toLowerCase() === "finance entry") return;
      const key = value.toLowerCase();
      if (!unique.has(key)) unique.set(key, value);
    });

    return Array.from(unique.values())
      .filter((value) => !typed || value.toLowerCase().includes(typed))
      .sort((a, b) => {
        if (!typed) return a.localeCompare(b);
        const aStarts = a.toLowerCase().startsWith(typed);
        const bStarts = b.toLowerCase().startsWith(typed);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.localeCompare(b);
      })
      .slice(0, 8);
  }, [data, form.description]);

  const categorySummary = useMemo(() => {
    const map = new Map();
    monthData.forEach((item) => {
      const label = String(item.category || "Expenses").trim() || "Expenses";
      const current = map.get(label) || { label, amount: 0, count: 0 };
      current.amount += Number(item.amount || 0);
      current.count += 1;
      map.set(label, current);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [monthData]);

  const descriptionSummary = useMemo(() => {
    const map = new Map();
    monthData.forEach((item) => {
      const label = String(item.description || "Finance Entry").trim() || "Finance Entry";
      const key = label.toLowerCase();
      const current = map.get(key) || { label, amount: 0, count: 0, dates: new Set() };
      current.amount += Number(item.amount || 0);
      current.count += 1;
      if (item.date) current.dates.add(item.date);
      map.set(key, current);
    });
    return Array.from(map.values())
      .map((x) => ({ ...x, days: x.dates.size }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthData]);

  const paymentSummary = useMemo(() => {
    const map = new Map();
    monthData.forEach((item) => {
      const label = String(item.paymentMode || "Not specified").trim() || "Not specified";
      const key = label.toLowerCase();
      const current = map.get(key) || { label, amount: 0, count: 0 };
      current.amount += Number(item.amount || 0);
      current.count += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [monthData]);

  const overviewQuery = overviewSearch.trim().toLowerCase();

  const filteredCategorySummary = useMemo(() => {
    if (!overviewQuery) return categorySummary;
    return categorySummary.filter((r) => r.label.toLowerCase().includes(overviewQuery));
  }, [categorySummary, overviewQuery]);

  const filteredDescriptionSummary = useMemo(() => {
    if (!overviewQuery) return descriptionSummary;
    return descriptionSummary.filter((r) => r.label.toLowerCase().includes(overviewQuery));
  }, [descriptionSummary, overviewQuery]);

  const filteredDaySummaries = useMemo(() => {
    if (!overviewQuery) return daySummaries;
    return daySummaries.filter((r) => displayDate(r.date).toLowerCase().includes(overviewQuery));
  }, [daySummaries, overviewQuery]);

  const filteredPaymentSummary = useMemo(() => {
    if (!overviewQuery) return paymentSummary;
    return paymentSummary.filter((r) => r.label.toLowerCase().includes(overviewQuery));
  }, [paymentSummary, overviewQuery]);

  const toggleReport = (key) => {
    setExpandedReports((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expenseStats = useMemo(() => {
    const amounts = monthData.map((x) => Number(x.amount || 0)).filter((x) => x > 0);
    const highest = amounts.length ? Math.max(...amounts) : 0;
    const lowest = amounts.length ? Math.min(...amounts) : 0;
    return {
      entries: monthData.length,
      averageEntry: monthData.length ? monthTotals.total / monthData.length : 0,
      highest,
      lowest,
    };
  }, [monthData, monthTotals.total]);

  const changeSelectedDate = (dateKey) => {
    const normalized = normalizeDate(dateKey) || keyFromDate(new Date());
    setSelectedDate(normalized);
    setSelectedMonth(normalized.slice(0, 7));
  };

  const goPreviousDay = () => changeSelectedDate(shiftDate(selectedDate, -1));
  const goNextDay = () => changeSelectedDate(shiftDate(selectedDate, 1));
  const goToday = () => changeSelectedDate(keyFromDate(new Date()));

  const resetForm = () => setForm({ date: keyFromDate(new Date()), description: "", qty: "", rate: "", amount: "", category: "Expenses", paymentMode: "Cash", notes: "" });
  const openNew = () => {
    setForm({
      date: selectedDate || keyFromDate(new Date()),
      description: "",
      qty: "",
      rate: "",
      amount: "",
      category: "Expenses",
      paymentMode: "Cash",
      notes: "",
    });
    setEditItem(null);
    setFormError("");
    setTab("entry");
    setShowDate(false);
  };
  const openEdit = (item) => {
    const itemDate = item.date || keyFromDate(new Date());

    setEditItem(item);
    setForm({
      date: itemDate,
      description: item.description || "",
      qty: item.qty != null ? String(item.qty) : "",
      rate: item.rate != null ? String(item.rate) : "",
      amount: String(item.amount || ""),
      category: item.category || "Expenses",
      paymentMode: item.paymentMode || "Cash",
      notes: item.notes || "",
    });

    changeSelectedDate(itemDate);
    setFormError("");
    setTab("entry");
  };

  const save = async () => {
    const description = form.description.trim();
    const qty = Number(form.qty || 0);
    const rate = Number(form.rate || 0);
    const typedAmount = Number(String(form.amount || "").replace(/,/g, ""));
    const amount = typedAmount > 0 ? typedAmount : qty * rate;
    if (!form.date) return setFormError("Please select a date.");
    if (!description) return setFormError("Please enter a description.");
    if (!(amount > 0)) return setFormError("Please enter a valid amount, or enter quantity and rate.");
    setSaving(true); setFormError("");
    const payload = { date: form.date, description, qty: qty || 0, rate: rate || 0, amount, category: form.category || "Expenses", paymentMode: form.paymentMode || "Cash", notes: form.notes.trim(), updatedAt: serverTimestamp() };
    try {
      if (editItem) await updateDoc(doc(db, "finance", editItem.id), payload);
      else await addDoc(collection(db, "finance"), { ...payload, createdAt: serverTimestamp() });
      setEditItem(null); resetForm(); setTab("history");
      Alert.alert("Saved", editItem ? "Expense updated successfully." : "Expense entry saved successfully.");
    } catch (e) { console.error("[Expenses] SAVE ERROR:", e); setFormError(e?.message || "Unable to save the entry."); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try { await deleteDoc(doc(db, "finance", deleteTarget.id)); setDeleteTarget(null); }
    catch (e) { console.error("[Expenses] DELETE ERROR:", e); setError(e?.message || "Unable to delete entry."); }
  };

  if (loading) return <SafeAreaView style={styles.safe} edges={[]}><View style={styles.loading}><ActivityDots /><AppText style={styles.loadingText}>Loading finance records…</AppText></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, mobile && styles.contentMobile]} keyboardShouldPersistTaps="handled">
        <View style={[styles.pageHeader, mobile && styles.pageHeaderMobile]}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.eyebrow}>BUSINESS · EXPENSES</AppText>
            <AppText style={[styles.title, mobile && styles.titleMobile]}>Expenses</AppText>
            <AppText style={styles.subtitle}>Record and track the day's business expenses.</AppText>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, mobile && styles.fullBtn]} onPress={openNew}>
            <Ionicons name="add" size={20} color={C.white} /><AppText style={styles.primaryText}>New Entry</AppText>
          </TouchableOpacity>
        </View>

        {error ? <View style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={19} color={C.danger} /><AppText style={styles.errorText}>{error}</AppText></View> : null}

        <View style={[styles.dayNavigator, mobile && styles.dayNavigatorMobile]}>
          <TouchableOpacity style={styles.dayNavButton} onPress={goPreviousDay}>
            <Ionicons name="chevron-back" size={21} color={C.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectedDayCard}
            onPress={() => setShowDate(true)}
            activeOpacity={0.85}
          >
            <View style={styles.selectedDayIcon}>
              <Ionicons name="calendar-outline" size={21} color={C.greenDeep} />
            </View>
            <View style={styles.selectedDayTextWrap}>
              <View style={styles.selectedDayTitleRow}>
                <AppText style={styles.selectedDayTitle}>{displayDate(selectedDate)}</AppText>
                {isTodayKey(selectedDate) ? (
                  <View style={styles.todayBadge}>
                    <AppText style={styles.todayBadgeText}>TODAY</AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={styles.selectedDaySub}>
                {dayData.length} {dayData.length === 1 ? "expense" : "expenses"} · {monthLabel(selectedMonth)}
              </AppText>
            </View>
            <Ionicons name="chevron-down" size={18} color={C.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dayNavButton} onPress={goNextDay}>
            <Ionicons name="chevron-forward" size={21} color={C.secondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.dateQuickRow, mobile && styles.dateQuickRowMobile]}>
          <TouchableOpacity style={styles.quickDateBtn} onPress={goToday}>
            <Ionicons name="today-outline" size={16} color={C.greenDeep} />
            <AppText style={styles.quickDateText}>Today</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickDateBtn} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={16} color={C.greenDeep} />
            <AppText style={styles.quickDateText}>Choose Date</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickDateBtn}
            onPress={() => {
              const next = shiftMonth(selectedMonth, -1);
              setSelectedMonth(next);
              setSelectedDate(`${next}-01`);
            }}
          >
            <Ionicons name="chevron-back" size={16} color={C.secondary} />
            <AppText style={styles.quickDateText}>Previous Month</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickDateBtn}
            onPress={() => {
              const next = shiftMonth(selectedMonth, 1);
              setSelectedMonth(next);
              setSelectedDate(`${next}-01`);
            }}
          >
            <AppText style={styles.quickDateText}>Next Month</AppText>
            <Ionicons name="chevron-forward" size={16} color={C.secondary} />
          </TouchableOpacity>
        </View>

        {tab !== "entry" ? (
          <CalendarDatePicker
            visible={showDate}
            value={parseDate(selectedDate)}
            onClose={() => setShowDate(false)}
            onChange={(d) => changeSelectedDate(keyFromDate(d))}
          />
        ) : null}

        <View style={styles.metrics}>
          <Metric icon="wallet-outline" label={viewMode === "day" ? "DAY TOTAL" : "MONTH TOTAL"} value={totals.total} sub={`${viewMode === "day" ? dayData.length : monthData.length} entries`} />
          <Metric icon="cart-outline" label="PURCHASES" value={totals.purchase} sub={`${totals.total ? Math.round((totals.purchase / totals.total) * 100) : 0}% of expenses`} tone="blue" />
          <Metric icon="cash-outline" label="CASH EXPENSES" value={totals.cash} sub={`${totals.total ? Math.round((totals.cash / totals.total) * 100) : 0}% of expenses`} tone="green" />
          <Metric icon="trending-up-outline" label="AVERAGE / DAY" value={totals.average} sub="Recorded days" tone="amber" />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === "entry" && styles.tabActive]} onPress={() => setTab("entry")}><AppText style={[styles.tabText, tab === "entry" && styles.tabTextActive]}>{editItem ? "Edit Entry" : "New Entry"}</AppText></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === "history" && styles.tabActive]} onPress={() => setTab("history")}><AppText style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Expense History</AppText></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === "overview" && styles.tabActive]} onPress={() => setTab("overview")}><AppText style={[styles.tabText, tab === "overview" && styles.tabTextActive]}>Overview</AppText></TouchableOpacity>
        </View>

        {tab === "entry" ? (
          <View style={styles.formCard}>
            <AppText style={styles.sectionTitle}>{editItem ? "Edit Expense Entry" : "Record Expense"}</AppText>
            <AppText style={styles.sectionSub}>Enter the business expense details below.</AppText>

            <AppText style={styles.label}>Expense Date</AppText>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowDate(true)}>
              <Ionicons name="calendar-outline" size={19} color={C.greenDeep} /><AppText style={styles.dateFieldText}>{displayDate(form.date)}</AppText><Ionicons name="chevron-down" size={17} color={C.muted} />
            </TouchableOpacity>
            <CalendarDatePicker
              visible={showDate}
              value={parseDate(form.date)}
              onClose={() => setShowDate(false)}
              onChange={(d) => {
                const nextDate = keyFromDate(d);
                setForm((x) => ({ ...x, date: nextDate }));
                changeSelectedDate(nextDate);
              }}
            />

            <AppText style={styles.label}>Description *</AppText>
            <View style={styles.descriptionWrap}>
              <TextInput
                style={styles.input}
                value={form.description}
                onFocus={() => setDescriptionFocused(true)}
                onChangeText={(v) => {
                  setForm((x) => ({ ...x, description: v }));
                  setDescriptionFocused(true);
                }}
                placeholder="What was the expense for?"
                placeholderTextColor="#A0AAA4"
              />
              {descriptionFocused && descriptionSuggestions.length ? (
                <View style={styles.descriptionSuggestions}>
                  <View style={styles.descriptionSuggestionHeader}>
                    <Ionicons name="time-outline" size={15} color={C.greenDeep} />
                    <AppText style={styles.descriptionSuggestionHeaderText}>Previous descriptions</AppText>
                  </View>
                  {descriptionSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.toLowerCase()}
                      style={styles.descriptionSuggestionRow}
                      onPress={() => {
                        setForm((x) => ({ ...x, description: suggestion }));
                        setDescriptionFocused(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.descriptionSuggestionIcon}>
                        <Ionicons name="document-text-outline" size={15} color={C.greenDeep} />
                      </View>
                      <AppText style={styles.descriptionSuggestionText} numberOfLines={1}>{suggestion}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <AppText style={styles.label}>Category</AppText>
            <View style={styles.optionRow}>{CATEGORIES.map((x) => <TouchableOpacity key={x} style={[styles.option, form.category === x && styles.optionActive]} onPress={() => setForm((f) => ({ ...f, category: x }))}><AppText style={[styles.optionText, form.category === x && styles.optionTextActive]}>{x}</AppText></TouchableOpacity>)}</View>

            <View style={[styles.twoCol, mobile && styles.oneCol]}>
              <View style={{ flex: 1 }}><AppText style={styles.label}>Quantity</AppText><TextInput style={styles.input} value={form.qty} onChangeText={(v) => setForm((x) => ({ ...x, qty: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#A0AAA4" /></View>
              <View style={{ flex: 1 }}><AppText style={styles.label}>Rate (₹)</AppText><TextInput style={styles.input} value={form.rate} onChangeText={(v) => setForm((x) => ({ ...x, rate: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#A0AAA4" /></View>
            </View>

            <AppText style={styles.label}>Amount *</AppText>
            <View style={styles.amountField}><AppText style={styles.currency}>₹</AppText><TextInput style={styles.amountInput} value={form.amount} onChangeText={(v) => setForm((x) => ({ ...x, amount: v }))} keyboardType="decimal-pad" placeholder="Enter total expense" placeholderTextColor="#A0AAA4" /></View>
            <AppText style={styles.helper}>If Amount is left blank, Quantity × Rate will be used.</AppText>

            <AppText style={styles.label}>Payment Mode</AppText>
            <View style={styles.optionRow}>{PAYMENT_MODES.map((x) => <TouchableOpacity key={x} style={[styles.option, form.paymentMode === x && styles.optionActive]} onPress={() => setForm((f) => ({ ...f, paymentMode: x }))}><AppText style={[styles.optionText, form.paymentMode === x && styles.optionTextActive]}>{x}</AppText></TouchableOpacity>)}</View>

            <AppText style={styles.label}>Notes</AppText>
            <TextInput style={[styles.input, styles.notesInput]} value={form.notes} onChangeText={(v) => setForm((x) => ({ ...x, notes: v }))} placeholder="Optional notes" placeholderTextColor="#A0AAA4" multiline />

            {formError ? <View style={styles.formError}><Ionicons name="alert-circle-outline" size={18} color={C.danger} /><AppText style={styles.formErrorText}>{formError}</AppText></View> : null}
            <View style={[styles.formActions, mobile && styles.formActionsMobile]}>
              {editItem ? <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setEditItem(null); resetForm(); }}><AppText style={styles.secondaryBtnText}>Cancel Edit</AppText></TouchableOpacity> : null}
              <TouchableOpacity disabled={saving} style={[styles.saveBtn, mobile && styles.mobileSaveBtn]} onPress={save}><Ionicons name="checkmark-circle-outline" size={19} color={C.white} /><AppText style={styles.saveText}>{saving ? "Saving…" : editItem ? "Update Expense" : "Save Expense"}</AppText></TouchableOpacity>
            </View>
          </View>
        ) : null}

        {tab === "history" ? (
          <View style={styles.historyCard}>
            <View style={[styles.historyHeader, mobile && styles.historyHeaderMobile]}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.sectionTitle}>Expense History</AppText>
                <AppText style={styles.sectionSub}>
                  {viewMode === "day"
                    ? `${filtered.length} entries on ${displayDate(selectedDate)}`
                    : `${filtered.length} entries in ${monthLabel(selectedMonth)}`}
                </AppText>
              </View>
              <TouchableOpacity style={styles.smallAdd} onPress={openNew}>
                <Ionicons name="add" size={17} color={C.white} />
                <AppText style={styles.smallAddText}>New Entry</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "day" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("day")}
              >
                <Ionicons name="calendar-outline" size={16} color={viewMode === "day" ? C.greenDeep : C.secondary} />
                <AppText style={[styles.viewToggleText, viewMode === "day" && styles.viewToggleTextActive]}>Day View</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "month" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("month")}
              >
                <Ionicons name="grid-outline" size={16} color={viewMode === "month" ? C.greenDeep : C.secondary} />
                <AppText style={[styles.viewToggleText, viewMode === "month" && styles.viewToggleTextActive]}>Month View</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={C.muted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={viewMode === "day" ? "Search this day..." : "Search this month..."}
                placeholderTextColor="#A0AAA4"
              />
            </View>

            <View style={styles.filterRow}>
              <Filter label="All" active={categoryFilter === "All"} onPress={() => setCategoryFilter("All")} />
              {CATEGORIES.map((x) => (
                <Filter key={x} label={x} active={categoryFilter === x} onPress={() => setCategoryFilter(x)} />
              ))}
            </View>

            {viewMode === "month" ? (
              daySummaries.length ? (
                <View style={styles.daySummaryList}>
                  <AppText style={styles.daySummaryHeading}>Daily Expense Summary</AppText>
                  {daySummaries.map((day) => {
                    const selected = day.date === selectedDate;

                    return (
                      <TouchableOpacity
                        key={day.date}
                        style={[styles.daySummaryRow, selected && styles.daySummaryRowSelected]}
                        onPress={() => {
                          changeSelectedDate(day.date);
                          setViewMode("day");
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.daySummaryIcon, selected && styles.daySummaryIconSelected]}>
                          <Ionicons name="calendar-outline" size={18} color={selected ? C.white : C.greenDeep} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <AppText style={styles.daySummaryDate}>{displayDate(day.date)}</AppText>
                          <AppText style={styles.daySummaryCount}>
                            {day.count} {day.count === 1 ? "entry" : "entries"}
                          </AppText>
                        </View>
                        <View style={styles.daySummaryAmountWrap}>
                          <AppText style={styles.daySummaryAmount}>{money(day.total)}</AppText>
                          <AppText style={styles.daySummaryLink}>View day →</AppText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="calendar-outline" size={28} color={C.greenDeep} />
                  </View>
                  <AppText style={styles.emptyTitle}>No expenses recorded this month</AppText>
                  <AppText style={styles.emptySub}>Choose another month or add a new expense entry.</AppText>
                  <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
                    <AppText style={styles.emptyBtnText}>Add New Entry</AppText>
                  </TouchableOpacity>
                </View>
              )
            ) : filtered.length ? (
              <>
                <View style={styles.dayResultBanner}>
                  <View style={styles.dayResultIcon}>
                    <Ionicons name="calendar-outline" size={18} color={C.greenDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.dayResultTitle}>{displayDate(selectedDate)}</AppText>
                    <AppText style={styles.dayResultSub}>
                      {filtered.length} matching {filtered.length === 1 ? "entry" : "entries"}
                    </AppText>
                  </View>
                  <AppText style={styles.dayResultAmount}>{money(totals.total)}</AppText>
                </View>

                {filtered.map((item) => (
                  <ExpenseCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteTarget} />
                ))}
              </>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="receipt-outline" size={28} color={C.greenDeep} />
                </View>
                <AppText style={styles.emptyTitle}>No expenses for this day</AppText>
                <AppText style={styles.emptySub}>
                  {dayData.length
                    ? "Try another search or category filter."
                    : `No finance entries were recorded on ${displayDate(selectedDate)}.`}
                </AppText>
                <View style={styles.emptyActionRow}>
                  <TouchableOpacity style={styles.emptyBtnSecondary} onPress={goPreviousDay}>
                    <Ionicons name="chevron-back" size={16} color={C.greenDeep} />
                    <AppText style={styles.emptyBtnSecondaryText}>Previous Day</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
                    <AppText style={styles.emptyBtnText}>Add New Entry</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {tab === "overview" ? (
          <View style={styles.overviewCard}>
            <AppText style={styles.sectionTitle}>Expense Overview</AppText>
            <AppText style={styles.sectionSub}>Complete bifurcation for {monthLabel(selectedMonth)} — category, description, date and payment mode.</AppText>

            <View style={[styles.overviewHero, mobile && styles.overviewHeroMobile]}>
              <View style={styles.overviewTotalWrap}>
                <View style={styles.overviewHeroIcon}><Ionicons name="wallet-outline" size={23} color={C.greenDeep} /></View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.overviewHeroLabel}>TOTAL EXPENSES</AppText>
                  <AppText style={styles.overviewHeroValue}>{money(monthTotals.total)}</AppText>
                </View>
                <View style={styles.overviewHeroMeta}>
                  <AppText style={styles.overviewHeroMetaValue}>{expenseStats.entries}</AppText>
                  <AppText style={styles.overviewHeroMetaLabel}>Entries</AppText>
                </View>
              </View>
              <View style={[styles.overviewSearchBox, mobile && styles.overviewSearchBoxMobile]}>
                <Ionicons name="search-outline" size={18} color={C.muted} />
                <TextInput
                  value={overviewSearch}
                  onChangeText={setOverviewSearch}
                  placeholder="Search category, description, date or payment mode"
                  placeholderTextColor={C.muted}
                  style={styles.overviewSearchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!overviewSearch && (
                  <TouchableOpacity onPress={() => setOverviewSearch("")} style={styles.overviewSearchClear}>
                    <Ionicons name="close-circle" size={18} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.statGrid, mobile && styles.statGridMobile]}>
              <View style={styles.statBox}><AppText style={styles.statLabel}>AVERAGE / ENTRY</AppText><AppText style={styles.statValue}>{money(expenseStats.averageEntry)}</AppText></View>
              <View style={styles.statBox}><AppText style={styles.statLabel}>HIGHEST EXPENSE</AppText><AppText style={styles.statValue}>{money(expenseStats.highest)}</AppText></View>
              <View style={styles.statBox}><AppText style={styles.statLabel}>LOWEST EXPENSE</AppText><AppText style={styles.statValue}>{money(expenseStats.lowest)}</AppText></View>
              <View style={styles.statBox}><AppText style={styles.statLabel}>RECORDED DAYS</AppText><AppText style={styles.statValue}>{monthTotals.days}</AppText></View>
            </View>

            <ReportSection reportKey="category" title="Category / Type-wise" subtitle="Where the money was spent" icon="layers-outline" color={C.blue} expanded={!!expandedReports.category} onToggle={toggleReport}>
              {filteredCategorySummary.length ? filteredCategorySummary.map((r) => (
                <View key={r.label} style={styles.reportRow}>
                  <View style={styles.reportMain}>
                    <View style={[styles.reportIcon, { backgroundColor: `${C.blue}18` }]}><Ionicons name="pricetag-outline" size={16} color={C.blue} /></View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.reportLabel}>{r.label}</AppText>
                      <AppText style={styles.reportMeta}>{r.count} {r.count === 1 ? "entry" : "entries"} · {monthTotals.total ? ((r.amount / monthTotals.total) * 100).toFixed(1) : "0.0"}%</AppText>
                      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${monthTotals.total ? Math.min(100, (r.amount / monthTotals.total) * 100) : 0}%`, backgroundColor: C.blue }]} /></View>
                    </View>
                  </View>
                  <AppText style={styles.reportAmount}>{money(r.amount)}</AppText>
                </View>
              )) : <EmptyReport text={overviewQuery ? "No matching category found." : "No category data for this month."} />}
            </ReportSection>

            <ReportSection reportKey="description" title="Description-wise" subtitle="Most important: what the expense was actually for" icon="document-text-outline" color={C.greenDeep} expanded={!!expandedReports.description} onToggle={toggleReport}>
              {filteredDescriptionSummary.length ? filteredDescriptionSummary.map((r) => (
                <TouchableOpacity
                  key={r.label.toLowerCase()}
                  style={styles.descriptionReportRow}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSearch(r.label);
                    setCategoryFilter("All");
                    setPaymentFilter("All");
                    setViewMode("month");
                    setTab("history");
                  }}
                >
                  <View style={[styles.reportIcon, { backgroundColor: `${C.greenDeep}18` }]}><Ionicons name="document-text-outline" size={16} color={C.greenDeep} /></View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.reportLabel}>{r.label}</AppText>
                    <AppText style={styles.reportMeta}>{r.count} {r.count === 1 ? "entry" : "entries"} · {r.days} {r.days === 1 ? "day" : "days"}</AppText>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${monthTotals.total ? Math.min(100, (r.amount / monthTotals.total) * 100) : 0}%`, backgroundColor: C.greenDeep }]} /></View>
                  </View>
                  <View style={styles.reportAmountWrap}>
                    <AppText style={styles.reportAmount}>{money(r.amount)}</AppText>
                    <AppText style={styles.viewDetailText}>View entries →</AppText>
                  </View>
                </TouchableOpacity>
              )) : <EmptyReport text={overviewQuery ? "No matching description found." : "No descriptions recorded for this month."} />}
            </ReportSection>

            <ReportSection reportKey="date" title="Date-wise" subtitle="Daily expense total for the selected month" icon="calendar-outline" color={C.amber} expanded={!!expandedReports.date} onToggle={toggleReport}>
              {filteredDaySummaries.length ? filteredDaySummaries.map((r) => (
                <TouchableOpacity
                  key={r.date}
                  style={styles.dateReportRow}
                  activeOpacity={0.75}
                  onPress={() => {
                    changeSelectedDate(r.date);
                    setViewMode("day");
                    setTab("history");
                    setSearch("");
                    setCategoryFilter("All");
                    setPaymentFilter("All");
                  }}
                >
                  <View style={[styles.reportIcon, { backgroundColor: `${C.amber}18` }]}><Ionicons name="calendar-outline" size={16} color={C.amber} /></View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.reportLabel}>{displayDate(r.date)}</AppText>
                    <AppText style={styles.reportMeta}>{r.count} {r.count === 1 ? "entry" : "entries"}</AppText>
                  </View>
                  <AppText style={styles.reportAmount}>{money(r.total)}</AppText>
                  <AppText style={styles.viewDetailText}>View day →</AppText>
                </TouchableOpacity>
              )) : <EmptyReport text={overviewQuery ? "No matching date found." : "No daily expenses recorded for this month."} />}
            </ReportSection>

            <ReportSection reportKey="payment" title="Payment Mode-wise" subtitle="How the expenses were paid" icon="card-outline" color={C.purple} expanded={!!expandedReports.payment} onToggle={toggleReport}>
              {filteredPaymentSummary.length ? filteredPaymentSummary.map((r) => (
                <View key={r.label} style={styles.reportRow}>
                  <View style={styles.reportMain}>
                    <View style={[styles.reportIcon, { backgroundColor: `${C.purple}18` }]}><Ionicons name="card-outline" size={16} color={C.purple} /></View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.reportLabel}>{r.label}</AppText>
                      <AppText style={styles.reportMeta}>{r.count} {r.count === 1 ? "entry" : "entries"} · {monthTotals.total ? ((r.amount / monthTotals.total) * 100).toFixed(1) : "0.0"}%</AppText>
                      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${monthTotals.total ? Math.min(100, (r.amount / monthTotals.total) * 100) : 0}%`, backgroundColor: C.purple }]} /></View>
                    </View>
                  </View>
                  <AppText style={styles.reportAmount}>{money(r.amount)}</AppText>
                </View>
              )) : <EmptyReport text={overviewQuery ? "No matching payment mode found." : "No payment mode data for this month."} />}
            </ReportSection>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.pickerOverlay}><View style={styles.confirmCard}><View style={styles.confirmIcon}><Ionicons name="trash-outline" size={24} color={C.danger} /></View><AppText style={styles.confirmTitle}>Delete Expense?</AppText><AppText style={styles.confirmText}>{deleteTarget ? `Remove “${deleteTarget.description || "this entry"}” (${money(deleteTarget.amount)}).` : ""}</AppText><View style={styles.confirmActions}><TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}><AppText style={styles.cancelText}>Cancel</AppText></TouchableOpacity><TouchableOpacity style={styles.confirmDelete} onPress={remove}><AppText style={styles.confirmDeleteText}>Delete</AppText></TouchableOpacity></View></View></View>
      </Modal>
    </SafeAreaView>
  );
}

function ReportSection({ reportKey, title, subtitle, icon, color, expanded, onToggle, children }) {
  return (
    <View style={styles.reportSection}>
      <TouchableOpacity
        style={styles.reportSectionHeader}
        activeOpacity={0.75}
        onPress={() => onToggle(reportKey)}
      >
        <View style={[styles.reportSectionIcon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={18} color={color} /></View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.reportSectionTitle}>{title}</AppText>
          <AppText style={styles.reportSectionSub}>{subtitle}</AppText>
        </View>
        <View style={styles.reportExpandIcon}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={C.secondary} />
        </View>
      </TouchableOpacity>
      {expanded ? <View>{children}</View> : null}
    </View>
  );
}

function EmptyReport({ text }) {
  return <View style={styles.emptyReport}><Ionicons name="information-circle-outline" size={18} color={C.muted} /><AppText style={styles.emptyReportText}>{text}</AppText></View>;
}

function ActivityDots() { return <View style={styles.spinner}><View style={styles.spinnerDot} /><View style={[styles.spinnerDot, { opacity: 0.65 }]} /><View style={[styles.spinnerDot, { opacity: 0.35 }]} /></View>; }
function Filter({ label, active, onPress }) { return <TouchableOpacity style={[styles.filter, active && styles.filterActive]} onPress={onPress}><AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText></TouchableOpacity>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.greenDeep },
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { width: "100%", maxWidth: 1540, alignSelf: "center", paddingHorizontal: 28, paddingTop: 28, paddingBottom: 36 },
  contentMobile: { paddingHorizontal: 14, paddingTop: 17, paddingBottom: 25 },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  spinner: { flexDirection: "row", gap: 6, marginBottom: 10 },
  spinnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  loadingText: { fontSize: 14, color: C.secondary },
  pageHeader: { minHeight: 0, marginBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageHeaderMobile: { alignItems: "flex-start", flexDirection: "column", backgroundColor: "transparent", marginBottom: 17, padding: 0 },
  eyebrow: { fontSize: 8.5, letterSpacing: 0.9, color: C.muted, fontWeight: "900" },
  title: { fontSize: 29, lineHeight: 35, color: C.text, fontWeight: "800", letterSpacing: -0.5 },
  titleMobile: { fontSize: 20, lineHeight: 25, letterSpacing: -0.45 },
  subtitle: { fontSize: 14, lineHeight: 20, color: C.secondary, marginTop: 4 },
  primaryBtn: { minHeight: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 12 },
  fullBtn: { width: "100%", marginLeft: 0, marginTop: 15 },
  primaryText: { fontSize: 14, fontWeight: "800", color: C.white, marginLeft: 6 },
  errorBanner: { backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: "#F5CACA", borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  errorText: { flex: 1, color: C.danger, fontSize: 12, fontWeight: "600" },
  dayNavigator: { minHeight: 76, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  dayNavigatorMobile: { minHeight: 74, padding: 8, gap: 7 },
  dayNavButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F1F6EF", alignItems: "center", justifyContent: "center" },
  selectedDayCard: { flex: 1, minHeight: 54, borderRadius: 13, backgroundColor: C.greenSoft, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  selectedDayIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  selectedDayTextWrap: { flex: 1, minWidth: 0 },
  selectedDayTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  selectedDayTitle: { fontSize: 15, fontWeight: "900", color: C.text },
  selectedDaySub: { fontSize: 10, color: C.secondary, marginTop: 3 },
  todayBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: C.green },
  todayBadgeText: { color: C.white, fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  dateQuickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  dateQuickRowMobile: { gap: 7 },
  quickDateBtn: { minHeight: 35, paddingHorizontal: 11, borderRadius: 9, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  quickDateText: { fontSize: 11, color: C.secondary, fontWeight: "800" },
  monthCard: { minHeight: 64, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  monthCardMobile: { minHeight: 68 },
  monthNav: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F6EF", alignItems: "center", justifyContent: "center" },
  monthCenter: { flex: 1, alignItems: "center" },
  monthTitle: { fontSize: 19, fontWeight: "900", color: C.text },
  monthSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 18 },
  metric: { flex: 1, minWidth: 190, minHeight: 137, padding: 17, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16 },
  metricIcon: { width: 41, height: 41, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  metricLabel: { fontSize: 10, lineHeight: 15, fontWeight: "700", color: C.secondary, letterSpacing: 0.2 },
  metricValue: { fontSize: 25, lineHeight: 31, fontWeight: "800", color: C.text, marginTop: 2 },
  metricSub: { fontSize: 10, lineHeight: 15, color: C.secondary, marginTop: 2 },
  tabs: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 4, flexDirection: "row", marginBottom: 16 },
  tab: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: C.greenSoft },
  tabText: { fontSize: 13, fontWeight: "600", color: C.secondary },
  tabTextActive: { color: C.greenDeep, fontWeight: "900" },
  formCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 15, marginBottom: 17 },
  historyCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 15, marginBottom: 17 },
  overviewCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 15, marginBottom: 17 },
  sectionTitle: { fontSize: 18, lineHeight: 23, fontWeight: "800", color: C.text },
  sectionSub: { fontSize: 12, lineHeight: 17, color: C.secondary, marginTop: 4, marginBottom: 14 },
  label: { fontSize: 11, lineHeight: 16, fontWeight: "700", color: C.text, marginTop: 13, marginBottom: 6 },
  dateField: { minHeight: 48, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  dateFieldText: { flex: 1, fontSize: 14, color: C.text, fontWeight: "600" },
  input: { minHeight: 46, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 13, color: C.text, fontSize: 13, backgroundColor: C.white },
  twoCol: { flexDirection: "row", gap: 14 },
  oneCol: { flexDirection: "column", gap: 0 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 36, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  optionActive: { backgroundColor: C.greenSoft, borderColor: C.green },
  optionText: { fontSize: 11, lineHeight: 16, fontWeight: "700", color: C.secondary },
  optionTextActive: { color: C.greenDark, fontWeight: "800" },
  amountField: { height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingLeft: 14 },
  currency: { fontSize: 18, fontWeight: "900", color: C.greenDeep, marginRight: 7 },
  amountInput: { flex: 1, height: "100%", color: C.text, fontSize: 15, fontWeight: "700" },
  helper: { fontSize: 11, color: C.muted, marginTop: 5 },
  notesInput: { minHeight: 78, paddingTop: 12, textAlignVertical: "top" },
  formError: { marginTop: 15, padding: 11, borderRadius: 10, backgroundColor: C.dangerSoft, flexDirection: "row", gap: 8, alignItems: "center" },
  formErrorText: { flex: 1, color: C.danger, fontSize: 12, fontWeight: "600" },
  formActions: { marginTop: 20, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  formActionsMobile: { flexDirection: "column" },
  saveBtn: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  mobileSaveBtn: { width: "100%" },
  saveText: { color: C.white, fontSize: 13, fontWeight: "900" },
  secondaryBtn: { minHeight: 46, paddingHorizontal: 17, borderRadius: 10, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: C.secondary, fontSize: 13, fontWeight: "800" },
  historyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  historyHeaderMobile: { flexDirection: "column", alignItems: "stretch" },
  smallAdd: { minHeight: 40, paddingHorizontal: 13, borderRadius: 9, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginLeft: 12 },
  smallAddText: { color: C.white, fontSize: 12, fontWeight: "800" },
  viewToggle: { flexDirection: "row", backgroundColor: "#F5F8F4", borderRadius: 10, padding: 3, marginTop: 2, marginBottom: 14 },
  viewToggleBtn: { flex: 1, minHeight: 38, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  viewToggleBtnActive: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  viewToggleText: { fontSize: 12, color: C.secondary, fontWeight: "700" },
  viewToggleTextActive: { color: C.greenDeep, fontWeight: "900" },
  daySummaryList: { marginTop: 2 },
  daySummaryHeading: { fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 9 },
  daySummaryRow: { minHeight: 66, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, backgroundColor: C.white },
  daySummaryRowSelected: { backgroundColor: C.greenSoft, borderColor: C.green },
  daySummaryIcon: { width: 39, height: 39, borderRadius: 11, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  daySummaryIconSelected: { backgroundColor: C.green },
  daySummaryDate: { fontSize: 13, fontWeight: "900", color: C.text },
  daySummaryCount: { fontSize: 10, color: C.secondary, marginTop: 2 },
  daySummaryAmountWrap: { alignItems: "flex-end" },
  daySummaryAmount: { fontSize: 14, fontWeight: "900", color: C.text },
  daySummaryLink: { fontSize: 9, color: C.greenDeep, fontWeight: "800", marginTop: 2 },
  dayResultBanner: { minHeight: 58, backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#D6EBCB", borderRadius: 12, paddingHorizontal: 11, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 9 },
  dayResultIcon: { width: 35, height: 35, borderRadius: 10, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  dayResultTitle: { fontSize: 12, fontWeight: "900", color: C.text },
  dayResultSub: { fontSize: 10, color: C.secondary, marginTop: 2 },
  dayResultAmount: { fontSize: 15, fontWeight: "900", color: C.greenDeep },
  searchBox: { height: 46, borderWidth: 1, borderColor: C.border, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, height: "100%", marginLeft: 7, color: C.text, fontSize: 13 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  filter: { minHeight: 34, paddingHorizontal: 12, borderRadius: 9, backgroundColor: "#F7F9F7", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  filterActive: { backgroundColor: C.greenSoft, borderColor: C.green },
  filterText: { fontSize: 11, color: C.secondary, fontWeight: "700" },
  filterTextActive: { color: C.greenDeep, fontWeight: "900" },
  entryCard: { borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 15, marginBottom: 10, backgroundColor: C.white },
  entryTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  entryDateRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  dateIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  entryDate: { fontSize: 13, fontWeight: "800", color: C.text },
  entryDateKey: { fontSize: 11, color: C.secondary, marginTop: 2 },
  entryAmountWrap: { alignItems: "flex-end" },
  entryTotal: { fontSize: 17, fontWeight: "900", color: C.text },
  categoryBadge: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  categoryBadgeText: { fontSize: 10, fontWeight: "900" },
  detailRow: { flexDirection: "row", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F0F3F0" },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, color: C.muted, fontWeight: "700" },
  detailValue: { fontSize: 12, color: C.text, fontWeight: "800", marginTop: 3 },
  entryActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  actionBtn: { minHeight: 34, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#F5F7F5", flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 11, fontWeight: "800", color: C.secondary },
  deleteAction: { backgroundColor: C.dangerSoft },
  deleteText: { fontSize: 11, fontWeight: "800", color: C.danger },
  emptyActionRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 15 },
  emptyBtnSecondary: { minHeight: 40, paddingHorizontal: 13, borderRadius: 9, backgroundColor: C.greenSoft, borderWidth: 1, borderColor: "#D6EBCB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  emptyBtnSecondaryText: { color: C.greenDeep, fontSize: 11, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 50 },
  emptyIcon: { width: 58, height: 58, borderRadius: 17, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 13, fontSize: 17, fontWeight: "900", color: C.text },
  emptySub: { marginTop: 5, color: C.secondary, fontSize: 12, textAlign: "center", maxWidth: 420 },
  emptyBtn: { marginTop: 15, minHeight: 40, paddingHorizontal: 15, borderRadius: 9, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  emptyBtnText: { color: C.white, fontSize: 12, fontWeight: "900" },
  overviewRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F0F3F0" },
  overviewIcon: { width: 39, height: 39, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  overviewLabel: { fontSize: 12, color: C.text, fontWeight: "800", marginBottom: 7 },
  overviewValue: { width: 95, textAlign: "right", fontSize: 13, fontWeight: "900", color: C.text },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: "#EEF2EE", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  descriptionWrap: { position: "relative", zIndex: 20 },
  descriptionSuggestions: { position: "absolute", left: 0, right: 0, top: 52, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 11, paddingVertical: 5, zIndex: 50, elevation: 8, shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  descriptionSuggestionHeader: { minHeight: 30, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  descriptionSuggestionHeaderText: { fontSize: 10, color: C.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  descriptionSuggestionRow: { minHeight: 42, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1, borderTopColor: "#F1F4F1" },
  descriptionSuggestionIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  descriptionSuggestionText: { flex: 1, color: C.text, fontSize: 13, fontWeight: "700" },
  overviewHero: { minHeight: 88, backgroundColor: "#F7FAF7", borderRadius: 13, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13, gap: 14 },
  overviewHeroMobile: { flexDirection: "column", alignItems: "stretch" },
  overviewTotalWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  overviewSearchBox: { width: 360, height: 44, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 11, flexDirection: "row", alignItems: "center", paddingHorizontal: 11 },
  overviewSearchBoxMobile: { width: "100%" },
  overviewSearchInput: { flex: 1, height: "100%", marginLeft: 7, color: C.text, fontSize: 12 },
  overviewSearchClear: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  overviewHeroIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  overviewHeroLabel: { color: C.secondary, fontSize: 10, lineHeight: 15, fontWeight: "700", letterSpacing: 0.3 },
  overviewHeroValue: { color: C.text, fontSize: 27, lineHeight: 34, fontWeight: "800", marginTop: 3 },
  overviewHeroMeta: { minWidth: 64, alignItems: "center", backgroundColor: C.greenSoft, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
  overviewHeroMetaValue: { color: C.greenDark, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  overviewHeroMetaLabel: { color: C.secondary, fontSize: 9, lineHeight: 13 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  statGridMobile: { flexDirection: "column" },
  statBox: { flex: 1, minWidth: 170, backgroundColor: "#F8FAF8", borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13 },
  statLabel: { color: C.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  statValue: { color: C.text, fontSize: 17, fontWeight: "900", marginTop: 5 },
  reportSection: { marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: "hidden", backgroundColor: C.white },
  reportSectionHeader: { minHeight: 64, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FBFCFB" },
  reportSectionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  reportSectionTitle: { fontSize: 14, fontWeight: "900", color: C.text },
  reportSectionSub: { fontSize: 10, color: C.secondary, marginTop: 2 },
  reportExpandIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" },
  reportRow: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#F0F3F0" },
  reportMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  reportIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reportLabel: { fontSize: 12, color: C.text, fontWeight: "800" },
  reportMeta: { fontSize: 9, color: C.secondary, marginTop: 2, marginBottom: 6 },
  reportAmount: { fontSize: 13, fontWeight: "900", color: C.text, textAlign: "right" },
  reportAmountWrap: { alignItems: "flex-end", marginLeft: 8 },
  descriptionReportRow: { minHeight: 72, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: "#F0F3F0" },
  dateReportRow: { minHeight: 62, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: "#F0F3F0" },
  viewDetailText: { fontSize: 9, color: C.greenDeep, fontWeight: "900", marginTop: 3 },
  emptyReport: { minHeight: 60, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  emptyReportText: { fontSize: 11, color: C.muted },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.38)", alignItems: "center", justifyContent: "center", padding: 20 },
  pickerCard: { width: "100%", maxWidth: 390, backgroundColor: C.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  pickerNav: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  pickerTitleWrap: { flex: 1, alignItems: "center" },
  pickerTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  pickerToday: { fontSize: 11, fontWeight: "900", color: C.greenDeep, marginTop: 3 },
  weekRow: { flexDirection: "row", marginBottom: 5 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 10, fontWeight: "800", color: C.muted },
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  dayCellSelected: { backgroundColor: C.green },
  dayText: { fontSize: 14, fontWeight: "700", color: C.text },
  dayTextSelected: { color: C.white, fontWeight: "900" },
  pickerCancel: { minHeight: 44, marginTop: 13, borderRadius: 10, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" },
  pickerCancelText: { color: C.secondary, fontSize: 13, fontWeight: "800" },
  confirmCard: { width: "100%", maxWidth: 390, backgroundColor: C.white, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.border },
  confirmIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.dangerSoft, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  confirmTitle: { textAlign: "center", fontSize: 19, fontWeight: "900", color: C.text, marginTop: 12 },
  confirmText: { textAlign: "center", color: C.secondary, fontSize: 13, lineHeight: 19, marginTop: 7 },
  confirmActions: { flexDirection: "row", gap: 9, marginTop: 18 },
  cancelBtn: { flex: 1, minHeight: 44, borderRadius: 9, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" },
  cancelText: { color: C.secondary, fontWeight: "800" },
  confirmDelete: { flex: 1, minHeight: 44, borderRadius: 9, backgroundColor: C.danger, alignItems: "center", justifyContent: "center" },
  confirmDeleteText: { color: C.white, fontWeight: "900" },
});
