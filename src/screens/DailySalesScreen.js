import React, { useEffect, useMemo, useRef, useState } from "react";
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
  blue: "#3B82B6",
  blueSoft: "#EDF7FC",
  amber: "#D79A24",
  amberSoft: "#FFF7E8",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const displayDate = (value) => {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};


function CalendarDatePicker({ visible, value, onClose, onChange }) {
  const initial = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  useEffect(() => {
    if (visible) {
      const d = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
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

  const selectedDay = value instanceof Date &&
    value.getFullYear() === year && value.getMonth() === month
    ? value.getDate()
    : null;

  const choose = (day) => {
    if (!day) return;
    const picked = new Date(year, month, day);
    onChange(picked);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={datePickerStyles.overlay}>
        <View style={datePickerStyles.card}>
          <View style={datePickerStyles.header}>
            <TouchableOpacity style={datePickerStyles.nav} onPress={() => setCursor(new Date(year, month - 1, 1))}>
              <Ionicons name="chevron-back" size={20} color={C.secondary} />
            </TouchableOpacity>
            <View style={datePickerStyles.titleWrap}>
              <AppText style={datePickerStyles.title}>{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</AppText>
              <TouchableOpacity onPress={() => { const now = new Date(); setCursor(new Date(now.getFullYear(), now.getMonth(), 1)); }}>
                <AppText style={datePickerStyles.today}>Today</AppText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={datePickerStyles.nav} onPress={() => setCursor(new Date(year, month + 1, 1))}>
              <Ionicons name="chevron-forward" size={20} color={C.secondary} />
            </TouchableOpacity>
          </View>

          <View style={datePickerStyles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <AppText key={day} style={datePickerStyles.weekDay}>{day}</AppText>
            ))}
          </View>

          <View style={datePickerStyles.grid}>
            {cells.map((day, index) => {
              const selected = day === selectedDay;
              return (
                <TouchableOpacity
                  key={`${year}-${month}-${index}`}
                  disabled={!day}
                  onPress={() => choose(day)}
                  style={[datePickerStyles.day, selected ? datePickerStyles.selectedDay : null]}
                >
                  {day ? <AppText style={[datePickerStyles.dayText, selected ? datePickerStyles.selectedText : null]}>{day}</AppText> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={datePickerStyles.cancel} onPress={onClose}>
            <AppText style={datePickerStyles.cancelText}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ icon, label, value, sub, tone = "green" }) {
  const toneMap = {
    green: [C.greenDeep, C.greenSoft],
    amber: [C.amber, C.amberSoft],
    blue: [C.blue, C.blueSoft],
  };

  const [iconColor, iconBackground] = toneMap[tone] || toneMap.green;

  return (
    <View style={styles.metric}>
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: iconBackground },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <AppText style={styles.metricLabel}>{label}</AppText>
      <AppText style={styles.metricValue}>{money(value)}</AppText>

      {sub ? <AppText style={styles.metricSub}>{sub}</AppText> : null}
    </View>
  );
}

function EntryCard({ item, onEdit, onDelete }) {
  const total = Number(item.total || 0);
  const cash = Number(item.cash || 0);
  const online = Number(item.online || 0);
  const cashPercent = total
    ? Math.round((cash / total) * 100)
    : 0;
  const onlinePercent = Math.max(0, 100 - cashPercent);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTop}>
        <View style={styles.entryDateRow}>
          <View style={styles.dateIcon}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={C.greenDeep}
            />
          </View>

          <View>
            <AppText style={styles.entryDate}>
              {displayDate(item.date)}
            </AppText>
            <AppText style={styles.entryDateKey}>{item.date}</AppText>
          </View>
        </View>

        <AppText style={styles.entryTotal}>{money(total)}</AppText>
      </View>

      <View style={styles.splitRow}>
        <View style={styles.splitItem}>
          <View
            style={[
              styles.dot,
              { backgroundColor: C.green },
            ]}
          />
          <AppText style={styles.splitLabel}>Cash</AppText>
          <AppText style={styles.splitValue}>{money(cash)}</AppText>
          <AppText style={styles.percent}>{cashPercent}%</AppText>
        </View>

        <View style={styles.splitItem}>
          <View
            style={[
              styles.dot,
              { backgroundColor: C.amber },
            ]}
          />
          <AppText style={styles.splitLabel}>Online / UPI</AppText>
          <AppText style={styles.splitValue}>{money(online)}</AppText>
          <AppText style={styles.percent}>{onlinePercent}%</AppText>
        </View>
      </View>

      <View style={styles.progress}>
        <View
          style={[
            styles.progressCash,
            { width: `${cashPercent}%` },
          ]}
        />
        <View
          style={[
            styles.progressOnline,
            { width: `${onlinePercent}%` },
          ]}
        />
      </View>

      <View style={styles.entryActions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => onEdit(item)}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={C.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.iconBtn,
            { borderColor: "#F1C5C5" },
          ]}
          onPress={() => onDelete(item)}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={C.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EditForm({ item, onCancel, onSave }) {
  const [editDate, setEditDate] = useState(
    new Date(`${item.date}T00:00:00`)
  );
  const [total, setTotal] = useState(String(item.total || ""));
  const [cash, setCash] = useState(String(item.cash || ""));
  const [online, setOnline] = useState(String(item.online || ""));
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState("");

  const save = () => {
    const totalValue = Number(total) || 0;
    const cashValue = Number(cash) || 0;
    const onlineValue = Number(online) || 0;

    if (totalValue <= 0) {
      setError("Please enter Total Sales.");
      return;
    }

    if (cashValue + onlineValue !== totalValue) {
      setError("Cash + Online / UPI must equal Total Sales.");
      return;
    }

    onSave({
      date: dateKey(editDate),
      total: totalValue,
      cash: cashValue,
      online: onlineValue,
    });
  };

  return (
    <View>
      <AppText style={styles.label}>Sales Date</AppText>

      <TouchableOpacity
        style={styles.inputBtn}
        onPress={() => setShowDate(true)}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={C.greenDeep}
        />
        <AppText style={styles.inputBtnText}>
          {editDate.toLocaleDateString("en-IN")}
        </AppText>
        <Ionicons
          name="chevron-down"
          size={16}
          color={C.muted}
        />
      </TouchableOpacity>

      <CalendarDatePicker
        visible={showDate}
        value={editDate}
        onClose={() => setShowDate(false)}
        onChange={(selected) => setEditDate(selected)}
      />

      <AppText style={styles.label}>Total Sales (₹)</AppText>
      <TextInput
        style={styles.input}
        value={total}
        onChangeText={(value) => {
          setTotal(value);
          setError("");
        }}
        keyboardType="decimal-pad"
        placeholder="Enter total sales"
        placeholderTextColor="#A0AAA4"
      />

      <AppText style={styles.label}>Cash (₹)</AppText>
      <TextInput
        style={styles.input}
        value={cash}
        onChangeText={(value) => {
          setCash(value);
          setError("");
        }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#A0AAA4"
      />

      <AppText style={styles.label}>Online / UPI (₹)</AppText>
      <TextInput
        style={styles.input}
        value={online}
        onChangeText={(value) => {
          setOnline(value);
          setError("");
        }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#A0AAA4"
      />

      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      <View style={styles.modalRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
        >
          <AppText style={styles.cancelText}>Cancel</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveModalBtn}
          onPress={save}
        >
          <AppText style={styles.saveModalText}>
            Save Changes
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DailySalesScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const formRef = useRef(null);

  const today = new Date();

  const [data, setData] = useState([]);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const [date, setDate] = useState(today);
  const [showDate, setShowDate] = useState(false);

  const [tab, setTab] = useState("entry");
  const [total, setTotal] = useState("");
  const [cash, setCash] = useState("");
  const [online, setOnline] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [edit, setEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const salesQuery = query(
      collection(db, "dailySales"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      salesQuery,
      (snapshot) => {
        setData(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      () => {
        setError("Unable to load sales entries.");
      }
    );
  }, []);

  const filtered = useMemo(() => {
    return data
      .filter((item) => {
        const itemDate = new Date(`${item.date}T00:00:00`);
        return (
          itemDate.getMonth() === month &&
          itemDate.getFullYear() === year
        );
      })
      .sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
      );
  }, [data, month, year]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (result, item) => ({
          total: result.total + Number(item.total || 0),
          cash: result.cash + Number(item.cash || 0),
          online: result.online + Number(item.online || 0),
        }),
        { total: 0, cash: 0, online: 0 }
      ),
    [filtered]
  );

  const average = filtered.length
    ? totals.total / filtered.length
    : 0;

  const amountDifference =
    Number(total || 0) -
    Number(cash || 0) -
    Number(online || 0);

  const openNewEntry = () => {
    setTab("entry");
    setError("");
    setDate(new Date());
    setTotal("");
    setCash("");
    setOnline("");

    setTimeout(() => {
      if (formRef.current && formRef.current.scrollTo) {
        formRef.current.scrollTo({
          y: 0,
          animated: true,
        });
      }
    }, 50);
  };

  const save = async () => {
    const totalValue = Number(total) || 0;
    const cashValue = Number(cash) || 0;
    const onlineValue = Number(online) || 0;

    if (totalValue <= 0) {
      setError("Please enter Total Sales.");
      return;
    }

    if (cashValue + onlineValue !== totalValue) {
      setError(
        `Cash + Online (${money(
          cashValue + onlineValue
        )}) must equal Total (${money(totalValue)}).`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await addDoc(collection(db, "dailySales"), {
        date: dateKey(date),
        total: totalValue,
        cash: cashValue,
        online: onlineValue,
        createdAt: serverTimestamp(),
      });

      setTotal("");
      setCash("");
      setOnline("");

      setMonth(date.getMonth());
      setYear(date.getFullYear());
      setTab("history");

      Alert.alert(
        "Sales Saved",
        "Daily sales entry has been saved successfully."
      );
    } catch (e) {
      setError("Failed to save sales entry.");
      Alert.alert(
        "Error",
        "Failed to save sales entry."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (values) => {
    try {
      await updateDoc(
        doc(db, "dailySales", edit.id),
        values
      );
      setEdit(null);
      Alert.alert(
        "Sales Updated",
        "Sales entry has been updated successfully."
      );
    } catch (e) {
      Alert.alert(
        "Error",
        "Unable to update sales entry."
      );
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDoc(
        doc(db, "dailySales", deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (e) {
      Alert.alert(
        "Error",
        "Unable to delete sales entry."
      );
    }
  };

  const shiftMonth = (delta) => {
    const next = new Date(
      year,
      month + delta,
      1
    );
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={mobile ? ["top"] : []}
    >
      <ScrollView
        ref={formRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          mobile ? styles.contentMobile : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText style={styles.eyebrow}>
              BUSINESS · COLLECTIONS
            </AppText>
            <AppText style={styles.title}>
              Daily Sales
            </AppText>
            <AppText style={styles.subtitle}>
              Record the day's total sales and payment collection.
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openNewEntry}
          >
            <Ionicons
              name="add"
              size={19}
              color={C.white}
            />
            <AppText style={styles.primaryText}>
              New Entry
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.monthBar}>
          <TouchableOpacity
            onPress={() => shiftMonth(-1)}
            style={styles.monthBtn}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={C.secondary}
            />
          </TouchableOpacity>

          <View style={styles.monthCenter}>
            <AppText style={styles.monthLabel}>
              {MONTHS[month]} {year}
            </AppText>
            <AppText style={styles.monthSub}>
              {filtered.length} recorded day
              {filtered.length === 1 ? "" : "s"}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={() => shiftMonth(1)}
            style={styles.monthBtn}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={C.secondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metrics}>
          <Metric
            icon="cash-outline"
            label="Total Sales"
            value={totals.total}
            sub={`${filtered.length} entries`}
          />
          <Metric
            icon="wallet-outline"
            label="Cash"
            value={totals.cash}
            sub={
              totals.total
                ? `${Math.round(
                    (totals.cash / totals.total) * 100
                  )}% of sales`
                : "0% of sales"
            }
          />
          <Metric
            icon="phone-portrait-outline"
            label="Online / UPI"
            value={totals.online}
            sub={
              totals.total
                ? `${Math.round(
                    (totals.online / totals.total) * 100
                  )}% of sales`
                : "0% of sales"
            }
            tone="amber"
          />
          <Metric
            icon="trending-up-outline"
            label="Average / Day"
            value={average}
            sub="Recorded days"
            tone="blue"
          />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setTab("entry")}
            style={[
              styles.tab,
              tab === "entry" ? styles.tabActive : null,
            ]}
          >
            <AppText
              style={[
                styles.tabText,
                tab === "entry"
                  ? styles.tabTextActive
                  : null,
              ]}
            >
              New Entry
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("history")}
            style={[
              styles.tab,
              tab === "history" ? styles.tabActive : null,
            ]}
          >
            <AppText
              style={[
                styles.tabText,
                tab === "history"
                  ? styles.tabTextActive
                  : null,
              ]}
            >
              Sales History
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("overview")}
            style={[
              styles.tab,
              tab === "overview"
                ? styles.tabActive
                : null,
            ]}
          >
            <AppText
              style={[
                styles.tabText,
                tab === "overview"
                  ? styles.tabTextActive
                  : null,
              ]}
            >
              Overview
            </AppText>
          </TouchableOpacity>
        </View>

        {tab === "entry" ? (
          <View style={styles.card}>
            <AppText style={styles.cardTitle}>
              Record Sales Collection
            </AppText>
            <AppText style={styles.cardHint}>
              Cash + Online / UPI must match Total Sales.
            </AppText>

            <AppText style={styles.label}>
              Sales Date
            </AppText>

            <TouchableOpacity
              style={styles.inputBtn}
              onPress={() => setShowDate(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={C.greenDeep}
              />
              <AppText style={styles.inputBtnText}>
                {date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
              <Ionicons
                name="chevron-down"
                size={16}
                color={C.muted}
              />
            </TouchableOpacity>

            <CalendarDatePicker
              visible={showDate}
              value={date}
              onClose={() => setShowDate(false)}
              onChange={(selected) => setDate(selected)}
            />

            <AppText style={styles.label}>
              Total Sales (₹)
            </AppText>
            <TextInput
              style={styles.input}
              value={total}
              onChangeText={(value) => {
                setTotal(value);
                setError("");
              }}
              keyboardType="decimal-pad"
              placeholder="Enter total sales"
              placeholderTextColor="#A0AAA4"
            />

            <View
              style={
                mobile
                  ? styles.column
                  : styles.row
              }
            >
              <View style={styles.fieldColumn}>
                <AppText style={styles.label}>
                  Cash (₹)
                </AppText>
                <TextInput
                  style={styles.input}
                  value={cash}
                  onChangeText={(value) => {
                    setCash(value);
                    setError("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#A0AAA4"
                />
              </View>

              <View
                style={[
                  styles.fieldColumn,
                  mobile
                    ? null
                    : styles.fieldColumnGap,
                ]}
              >
                <AppText style={styles.label}>
                  Online / UPI (₹)
                </AppText>
                <TextInput
                  style={styles.input}
                  value={online}
                  onChangeText={(value) => {
                    setOnline(value);
                    setError("");
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#A0AAA4"
                />
              </View>
            </View>

            {total ? (
              <View
                style={
                  amountDifference === 0
                    ? styles.valid
                    : styles.invalid
                }
              >
                <Ionicons
                  name={
                    amountDifference === 0
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={18}
                  color={
                    amountDifference === 0
                      ? C.greenDeep
                      : C.danger
                  }
                />

                <AppText style={styles.balanceText}>
                  {amountDifference === 0
                    ? "Cash + Online matches Total"
                    : `Difference: ${money(
                        Math.abs(amountDifference)
                      )}`}
                </AppText>
              </View>
            ) : null}

            {error ? (
              <AppText style={styles.error}>
                {error}
              </AppText>
            ) : null}

            <TouchableOpacity
              disabled={saving}
              style={[
                styles.saveBtn,
                saving ? styles.saveBtnDisabled : null,
              ]}
              onPress={save}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={C.white}
              />
              <AppText style={styles.saveText}>
                {saving
                  ? "Saving..."
                  : "Save Sales Entry"}
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}

        {tab === "history" ? (
          <View>
            <View style={styles.sectionHead}>
              <View>
                <AppText style={styles.sectionTitle}>
                  Sales History
                </AppText>
                <AppText style={styles.sectionSub}>
                  All entries for {MONTHS[month]} {year}
                </AppText>
              </View>

              <AppText style={styles.count}>
                {filtered.length}
              </AppText>
            </View>

            {filtered.map((item) => (
              <EntryCard
                key={item.id}
                item={item}
                onEdit={setEdit}
                onDelete={setDeleteTarget}
              />
            ))}

            {!filtered.length ? (
              <View style={styles.empty}>
                <Ionicons
                  name="receipt-outline"
                  size={38}
                  color={C.muted}
                />
                <AppText style={styles.emptyTitle}>
                  No sales recorded
                </AppText>
                <AppText style={styles.emptyText}>
                  Add the first sales entry for this month.
                </AppText>

                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={openNewEntry}
                >
                  <Ionicons
                    name="add"
                    size={17}
                    color={C.white}
                  />
                  <AppText style={styles.emptyAddText}>
                    Add New Entry
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === "overview" ? (
          <View style={styles.card}>
            <AppText style={styles.cardTitle}>
              Month Overview
            </AppText>

            {[
              {
                label: "Total Sales",
                value: totals.total,
              },
              {
                label: "Cash Collection",
                value: totals.cash,
              },
              {
                label: "Online / UPI",
                value: totals.online,
              },
              {
                label: "Average per recorded day",
                value: average,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={styles.summaryRow}
              >
                <AppText style={styles.summaryLabel}>
                  {item.label}
                </AppText>
                <AppText style={styles.summaryValue}>
                  {money(item.value)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={!!edit}
        transparent
        animationType="slide"
        onRequestClose={() => setEdit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <AppText style={styles.modalTitle}>
              Edit Sales Entry
            </AppText>

            {edit ? (
              <EditForm
                item={edit}
                onCancel={() => setEdit(null)}
                onSave={saveEdit}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDeleteTarget(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirm}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name="trash-outline"
                size={25}
                color={C.danger}
              />
            </View>

            <AppText style={styles.modalTitle}>
              Delete sales entry?
            </AppText>

            <AppText style={styles.confirmText}>
              {deleteTarget
                ? `${displayDate(
                    deleteTarget.date
                  )} · ${money(
                    deleteTarget.total
                  )} will be permanently removed.`
                : ""}
            </AppText>

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  setDeleteTarget(null)
                }
              >
                <AppText style={styles.cancelText}>
                  Cancel
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={remove}
              >
                <AppText style={styles.deleteText}>
                  Delete
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const datePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { alignItems: "center" },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  today: { fontSize: 11, fontWeight: "800", color: C.greenDeep, marginTop: 3 },
  weekRow: { flexDirection: "row", marginBottom: 7 },
  weekDay: { width: "14.2857%", textAlign: "center", fontSize: 11, fontWeight: "800", color: C.muted },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: { width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  selectedDay: { backgroundColor: C.green },
  dayText: { fontSize: 14, fontWeight: "700", color: C.text },
  selectedText: { color: C.white, fontWeight: "800" },
  cancel: { height: 44, borderRadius: 11, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginTop: 14 },
  cancelText: { fontWeight: "800", color: C.secondary },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.greenDeep,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    width: "100%",
    maxWidth: 1540,
    alignSelf: "center",
    paddingHorizontal: 38,
    paddingTop: 25,
    paddingBottom: 70,
  },
  contentMobile: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 105,
  },
  header: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: C.greenDark,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 5,
  },
  primaryBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 16,
  },
  primaryText: {
    color: C.white,
    fontWeight: "800",
  },
  monthBar: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthCenter: {
    alignItems: "center",
  },
  monthBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
  },
  monthSub: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    marginTop: 2,
  },
  metrics: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  metric: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    flex: 1,
    minWidth: 190,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: C.secondary,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 21,
    fontWeight: "800",
    color: C.text,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  tabs: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    flexDirection: "row",
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: C.greenSoft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.secondary,
  },
  tabTextActive: {
    color: C.greenDeep,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
  },
  cardHint: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 5,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: C.text,
    marginBottom: 7,
    marginTop: 13,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    fontSize: 15,
    color: C.text,
    backgroundColor: "#FCFDFC",
  },
  inputBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FCFDFC",
  },
  inputBtnText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flexDirection: "column",
  },
  fieldColumn: {
    flex: 1,
  },
  fieldColumnGap: {
    marginLeft: 12,
  },
  valid: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.greenSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invalid: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
  },
  error: {
    fontSize: 12,
    color: C.danger,
    fontWeight: "700",
    marginTop: 9,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 14,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: C.text,
  },
  sectionSub: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 3,
  },
  count: {
    backgroundColor: C.greenSoft,
    color: C.greenDeep,
    fontWeight: "800",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  entryCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
  },
  entryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  entryDate: {
    fontSize: 14,
    fontWeight: "800",
    color: C.text,
  },
  entryDateKey: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
  },
  entryTotal: {
    fontSize: 19,
    fontWeight: "800",
    color: C.greenDeep,
  },
  splitRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 15,
  },
  splitItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitLabel: {
    fontSize: 11,
    color: C.secondary,
  },
  splitValue: {
    fontSize: 12,
    fontWeight: "800",
    color: C.text,
  },
  percent: {
    fontSize: 10,
    color: C.muted,
  },
  progress: {
    height: 6,
    backgroundColor: "#EEF1EF",
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
    marginTop: 12,
  },
  progressCash: {
    height: 6,
    backgroundColor: C.green,
  },
  progressOnline: {
    height: 6,
    backgroundColor: C.amber,
  },
  entryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 7,
    marginTop: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 45,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 4,
  },
  emptyAddBtn: {
    marginTop: 16,
    backgroundColor: C.green,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyAddText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 12,
  },
  summaryRow: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 13,
    color: C.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    color: C.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modal: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 22,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontWeight: "800",
    color: C.secondary,
  },
  saveModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalText: {
    color: C.white,
    fontWeight: "800",
  },
  confirm: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 24,
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 13,
    color: C.secondary,
    lineHeight: 20,
  },
  deleteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: C.white,
    fontWeight: "800",
  },
});

