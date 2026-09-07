import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
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
import AppText from "../components/AppText";

const C = {
  bg: "#F3F7F1",
  white: "#FFFFFF",
  green: "#63B83F",
  greenDark: "#4E9F30",
  greenDeep: "#367C27",
  greenSoft: "#EAF7DF",
  text: "#17231B",
  secondary: "#65736A",
  muted: "#98A49B",
  border: "#E2EAE1",
  danger: "#DE5B5B",
  dangerSoft: "#FFF0F0",
  amber: "#D79A24",
  amberSoft: "#FFF7E8",
  blue: "#3B82B6",
  blueSoft: "#EDF7FC",
};

const CATEGORIES = ["Purchase", "Expenses", "Salary"];
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const money = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

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
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
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

  const monthData = useMemo(() => data.filter((x) => String(x.date || "").slice(0, 7) === selectedMonth), [data, selectedMonth]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthData.filter((x) => {
      const text = [x.description, x.category, x.paymentMode, x.notes].map((v) => String(v || "").toLowerCase()).join(" ");
      return (!q || text.includes(q)) && (categoryFilter === "All" || x.category === categoryFilter) && (paymentFilter === "All" || String(x.paymentMode || "").toLowerCase() === paymentFilter.toLowerCase());
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [monthData, search, categoryFilter, paymentFilter]);

  const totals = useMemo(() => {
    const total = monthData.reduce((a, x) => a + Number(x.amount || 0), 0);
    const purchase = monthData.filter((x) => x.category === "Purchase").reduce((a, x) => a + Number(x.amount || 0), 0);
    const salary = monthData.filter((x) => x.category === "Salary").reduce((a, x) => a + Number(x.amount || 0), 0);
    const other = total - purchase - salary;
    const cash = monthData.filter((x) => String(x.paymentMode || "").toLowerCase() === "cash").reduce((a, x) => a + Number(x.amount || 0), 0);
    const online = monthData.filter((x) => ["upi", "bank transfer"].includes(String(x.paymentMode || "").toLowerCase())).reduce((a, x) => a + Number(x.amount || 0), 0);
    const days = new Set(monthData.map((x) => x.date).filter(Boolean)).size;
    return { total, purchase, salary, other, cash, online, days, average: days ? total / days : 0 };
  }, [monthData]);

  const resetForm = () => setForm({ date: keyFromDate(new Date()), description: "", qty: "", rate: "", amount: "", category: "Expenses", paymentMode: "Cash", notes: "" });
  const openNew = () => { resetForm(); setEditItem(null); setFormError(""); setTab("entry"); setShowModal(false); };
  const openEdit = (item) => { setEditItem(item); setForm({ date: item.date || keyFromDate(new Date()), description: item.description || "", qty: item.qty != null ? String(item.qty) : "", rate: item.rate != null ? String(item.rate) : "", amount: String(item.amount || ""), category: item.category || "Expenses", paymentMode: item.paymentMode || "Cash", notes: item.notes || "" }); setFormError(""); setTab("entry"); };

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

  if (loading) return <SafeAreaView style={styles.safe} edges={mobile ? ["top"] : []}><View style={styles.loading}><ActivityDots /><AppText style={styles.loadingText}>Loading finance records…</AppText></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={mobile ? ["top"] : []}>
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

        <View style={[styles.monthCard, mobile && styles.monthCardMobile]}>
          <TouchableOpacity style={styles.monthNav} onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}><Ionicons name="chevron-back" size={20} color={C.secondary} /></TouchableOpacity>
          <View style={styles.monthCenter}><AppText style={styles.monthTitle}>{monthLabel(selectedMonth)}</AppText><AppText style={styles.monthSub}>{monthData.length} recorded {monthData.length === 1 ? "entry" : "entries"}</AppText></View>
          <TouchableOpacity style={styles.monthNav} onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}><Ionicons name="chevron-forward" size={20} color={C.secondary} /></TouchableOpacity>
        </View>

        <View style={styles.metrics}>
          <Metric icon="wallet-outline" label="TOTAL EXPENSES" value={totals.total} sub={`${monthData.length} entries`} />
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
            <CalendarDatePicker visible={showDate} value={parseDate(form.date)} onClose={() => setShowDate(false)} onChange={(d) => setForm((x) => ({ ...x, date: keyFromDate(d) }))} />

            <AppText style={styles.label}>Description *</AppText>
            <TextInput style={styles.input} value={form.description} onChangeText={(v) => setForm((x) => ({ ...x, description: v }))} placeholder="What was the expense for?" placeholderTextColor="#A0AAA4" />

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
              <View style={{ flex: 1 }}><AppText style={styles.sectionTitle}>Expense History</AppText><AppText style={styles.sectionSub}>{filtered.length} entries in {monthLabel(selectedMonth)}</AppText></View>
              <TouchableOpacity style={styles.smallAdd} onPress={openNew}><Ionicons name="add" size={17} color={C.white} /><AppText style={styles.smallAddText}>New Entry</AppText></TouchableOpacity>
            </View>
            <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={C.muted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search expenses..." placeholderTextColor="#A0AAA4" /></View>
            <View style={styles.filterRow}><Filter label="All" active={categoryFilter === "All"} onPress={() => setCategoryFilter("All")} />{CATEGORIES.map((x) => <Filter key={x} label={x} active={categoryFilter === x} onPress={() => setCategoryFilter(x)} />)}</View>
            {filtered.length ? filtered.map((item) => <ExpenseCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteTarget} />) : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={28} color={C.greenDeep} /></View><AppText style={styles.emptyTitle}>No expenses for this month</AppText><AppText style={styles.emptySub}>{data.length ? "Try another month or clear your search/filter." : "Your existing finance records will appear here."}</AppText><TouchableOpacity style={styles.emptyBtn} onPress={openNew}><AppText style={styles.emptyBtnText}>Add New Entry</AppText></TouchableOpacity></View>}
          </View>
        ) : null}

        {tab === "overview" ? (
          <View style={styles.overviewCard}>
            <AppText style={styles.sectionTitle}>Expense Overview</AppText><AppText style={styles.sectionSub}>Breakdown for {monthLabel(selectedMonth)}.</AppText>
            {[{ label: "Purchases", value: totals.purchase, icon: "cart-outline", tone: C.blue }, { label: "Other Expenses", value: totals.other, icon: "receipt-outline", tone: C.amber }, { label: "Salary", value: totals.salary, icon: "people-outline", tone: C.greenDeep }, { label: "Cash Paid", value: totals.cash, icon: "cash-outline", tone: C.greenDeep }, { label: "Online / Bank", value: totals.online, icon: "phone-portrait-outline", tone: C.blue }].map((r) => <View key={r.label} style={styles.overviewRow}><View style={[styles.overviewIcon, { backgroundColor: `${r.tone}18` }]}><Ionicons name={r.icon} size={19} color={r.tone} /></View><View style={{ flex: 1 }}><AppText style={styles.overviewLabel}>{r.label}</AppText><View style={styles.barTrack}><View style={[styles.barFill, { width: `${totals.total ? Math.min(100, (r.value / totals.total) * 100) : 0}%`, backgroundColor: r.tone }]} /></View></View><AppText style={styles.overviewValue}>{money(r.value)}</AppText></View>)}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.pickerOverlay}><View style={styles.confirmCard}><View style={styles.confirmIcon}><Ionicons name="trash-outline" size={24} color={C.danger} /></View><AppText style={styles.confirmTitle}>Delete Expense?</AppText><AppText style={styles.confirmText}>{deleteTarget ? `Remove “${deleteTarget.description || "this entry"}” (${money(deleteTarget.amount)}).` : ""}</AppText><View style={styles.confirmActions}><TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)}><AppText style={styles.cancelText}>Cancel</AppText></TouchableOpacity><TouchableOpacity style={styles.confirmDelete} onPress={remove}><AppText style={styles.confirmDeleteText}>Delete</AppText></TouchableOpacity></View></View></View>
      </Modal>
    </SafeAreaView>
  );
}

function ActivityDots() { return <View style={styles.spinner}><View style={styles.spinnerDot} /><View style={[styles.spinnerDot, { opacity: 0.65 }]} /><View style={[styles.spinnerDot, { opacity: 0.35 }]} /></View>; }
function Filter({ label, active, onPress }) { return <TouchableOpacity style={[styles.filter, active && styles.filterActive]} onPress={onPress}><AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText></TouchableOpacity>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.greenDeep },
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { width: "100%", maxWidth: 1540, alignSelf: "center", paddingHorizontal: 38, paddingTop: 25, paddingBottom: 70 },
  contentMobile: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 105 },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  spinner: { flexDirection: "row", gap: 6, marginBottom: 10 },
  spinnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  loadingText: { fontSize: 14, color: C.secondary },
  pageHeader: { minHeight: 130, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 20, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageHeaderMobile: { alignItems: "stretch", flexDirection: "column" },
  eyebrow: { fontSize: 11, letterSpacing: 1.1, color: C.greenDeep, fontWeight: "800" },
  title: { fontSize: 32, lineHeight: 39, color: C.text, fontWeight: "900", marginTop: 4 },
  titleMobile: { fontSize: 29 },
  subtitle: { fontSize: 14, lineHeight: 20, color: C.secondary, marginTop: 4 },
  primaryBtn: { minHeight: 46, paddingHorizontal: 18, borderRadius: 11, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", marginLeft: 20 },
  fullBtn: { width: "100%", marginLeft: 0, marginTop: 15 },
  primaryText: { fontSize: 14, fontWeight: "800", color: C.white, marginLeft: 6 },
  errorBanner: { backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: "#F5CACA", borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  errorText: { flex: 1, color: C.danger, fontSize: 12, fontWeight: "600" },
  monthCard: { minHeight: 64, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  monthCardMobile: { minHeight: 68 },
  monthNav: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F1F6EF", alignItems: "center", justifyContent: "center" },
  monthCenter: { flex: 1, alignItems: "center" },
  monthTitle: { fontSize: 19, fontWeight: "900", color: C.text },
  monthSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 13, marginBottom: 16 },
  metric: { flex: 1, minWidth: 190, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 17 },
  metricIcon: { width: 39, height: 39, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  metricLabel: { fontSize: 10, letterSpacing: 0.7, fontWeight: "800", color: C.muted, marginTop: 12 },
  metricValue: { fontSize: 25, fontWeight: "900", color: C.text, marginTop: 4 },
  metricSub: { fontSize: 11, color: C.secondary, marginTop: 3 },
  tabs: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 4, flexDirection: "row", marginBottom: 16 },
  tab: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: C.greenSoft },
  tabText: { fontSize: 13, fontWeight: "600", color: C.secondary },
  tabTextActive: { color: C.greenDeep, fontWeight: "900" },
  formCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 22 },
  historyCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 20 },
  overviewCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 22 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: C.text },
  sectionSub: { fontSize: 12, color: C.secondary, marginTop: 3, marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "800", color: C.text, marginTop: 14, marginBottom: 7 },
  dateField: { minHeight: 48, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  dateFieldText: { flex: 1, fontSize: 14, color: C.text, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 13, color: C.text, fontSize: 14, backgroundColor: C.white },
  twoCol: { flexDirection: "row", gap: 14 },
  oneCol: { flexDirection: "column", gap: 0 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 38, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: "#FBFCFB", alignItems: "center", justifyContent: "center" },
  optionActive: { backgroundColor: C.greenSoft, borderColor: C.green },
  optionText: { fontSize: 12, fontWeight: "700", color: C.secondary },
  optionTextActive: { color: C.greenDeep, fontWeight: "900" },
  amountField: { height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingLeft: 14 },
  currency: { fontSize: 18, fontWeight: "900", color: C.greenDeep, marginRight: 7 },
  amountInput: { flex: 1, height: "100%", color: C.text, fontSize: 16, fontWeight: "700" },
  helper: { fontSize: 11, color: C.muted, marginTop: 5 },
  notesInput: { minHeight: 78, paddingTop: 12, textAlignVertical: "top" },
  formError: { marginTop: 15, padding: 11, borderRadius: 10, backgroundColor: C.dangerSoft, flexDirection: "row", gap: 8, alignItems: "center" },
  formErrorText: { flex: 1, color: C.danger, fontSize: 12, fontWeight: "600" },
  formActions: { marginTop: 20, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  formActionsMobile: { flexDirection: "column" },
  saveBtn: { minHeight: 46, paddingHorizontal: 18, borderRadius: 10, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  mobileSaveBtn: { width: "100%" },
  saveText: { color: C.white, fontSize: 13, fontWeight: "900" },
  secondaryBtn: { minHeight: 46, paddingHorizontal: 17, borderRadius: 10, backgroundColor: "#F1F5F2", alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: C.secondary, fontSize: 13, fontWeight: "800" },
  historyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  historyHeaderMobile: { flexDirection: "column", alignItems: "stretch" },
  smallAdd: { minHeight: 40, paddingHorizontal: 13, borderRadius: 9, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginLeft: 12 },
  smallAddText: { color: C.white, fontSize: 12, fontWeight: "800" },
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
