import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import AppText from "../components/AppText";

const C = {
  green: "#63B83F",
  greenDark: "#4E9F30",
  greenDeep: "#367C27",
  greenSoft: "#EAF7DF",
  bg: "#F3F7F1",
  card: "#FFFFFF",
  border: "#E2EAE1",
  text: "#17231B",
  secondary: "#65736A",
  danger: "#DC2626",
  warning: "#F59E0B",
};

const CATEGORIES = ["Milk", "Curd", "Buttermilk", "Ghee", "Paneer", "Other"];
const UNITS = ["Packet", "Bottle", "Pouch", "Piece", "Kg", "Litre"];
const INITIAL = {
  brand: "Milky Mist",
  name: "",
  category: "Other",
  variant: "",
  unit: "Packet",
  purchasePrice: "",
  sellingPrice: "",
  stockQty: "",
  lowStockLevel: "",
  imageUrl: "",
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (v) => `₹${num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BrandInventoryScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockEditing, setStockEditing] = useState(null);
  const [stockInput, setStockInput] = useState("");
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "products"),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        setProducts(rows);
        setLoading(false);
      },
      (error) => {
        console.error("Brand inventory load error", error);
        setLoading(false);
        Alert.alert("Unable to load inventory", error?.message || "Please try again.");
      }
    );
    return unsub;
  }, []);

  const brands = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.brand || "Other Brand"))).sort()], [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const brand = p.brand || "Other Brand";
      const text = [brand, p.name, p.variant, p.category, p.unit].filter(Boolean).join(" ").toLowerCase();
      return (!q || text.includes(q)) && (brandFilter === "All" || brand === brandFilter) && (categoryFilter === "All" || p.category === categoryFilter);
    });
  }, [products, search, brandFilter, categoryFilter]);

  const active = products.filter((p) => p.active !== false);
  const stockUnits = active.reduce((s, p) => s + num(p.stockQty), 0);
  const stockValue = active.reduce((s, p) => s + num(p.stockQty) * num(p.purchasePrice), 0);
  const lowStock = active.filter((p) => num(p.lowStockLevel) > 0 && num(p.stockQty) <= num(p.lowStockLevel)).length;
  const margin = active.reduce((s, p) => s + Math.max(0, num(p.sellingPrice) - num(p.purchasePrice)), 0);

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const openAdd = () => {
    setEditing(null);
    setForm(INITIAL);
    setModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      brand: p.brand || "Milky Mist",
      name: p.name || "",
      category: p.category || "Other",
      variant: p.variant || "",
      unit: p.unit || "Packet",
      purchasePrice: p.purchasePrice === undefined ? "" : String(p.purchasePrice),
      sellingPrice: p.sellingPrice === undefined ? "" : String(p.sellingPrice),
      stockQty: p.stockQty === undefined ? "" : String(p.stockQty),
      lowStockLevel: p.lowStockLevel === undefined ? "" : String(p.lowStockLevel),
      imageUrl: p.imageUrl || "",
    });
    setModal(true);
  };

  const save = async () => {
    if (saving) return;
    if (!form.name.trim()) return Alert.alert("Required", "Enter product name.");
    if (!form.variant.trim()) return Alert.alert("Required", "Enter size / variant.");
    if (num(form.sellingPrice) < 0 || num(form.purchasePrice) < 0 || num(form.stockQty) < 0) {
      return Alert.alert("Invalid value", "Price and stock cannot be negative.");
    }
    setSaving(true);
    try {
      const payload = {
        brand: form.brand.trim() || "Other Brand",
        name: form.name.trim(),
        category: form.category || "Other",
        variant: form.variant.trim(),
        unit: form.unit || "Packet",
        purchasePrice: num(form.purchasePrice),
        sellingPrice: num(form.sellingPrice),
        stockQty: num(form.stockQty),
        lowStockLevel: num(form.lowStockLevel),
        imageUrl: form.imageUrl.trim(),
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, "products", editing.id), payload);
      } else {
        await addDoc(collection(db, "products"), { ...payload, active: true, createdAt: serverTimestamp() });
      }
      setModal(false);
      setEditing(null);
      setForm(INITIAL);
    } catch (e) {
      Alert.alert("Save failed", e?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    try {
      await updateDoc(doc(db, "products", p.id), { active: p.active === false, updatedAt: serverTimestamp() });
    } catch (e) {
      Alert.alert("Update failed", e?.message || "Unable to update product.");
    }
  };

  const openStock = (p) => {
    setStockEditing(p);
    setStockInput(String(num(p.stockQty)));
    setStockModal(true);
  };

  const saveStock = async () => {
    if (!stockEditing) return;
    const value = num(stockInput);
    if (value < 0) return Alert.alert("Invalid stock", "Stock cannot be negative.");
    try {
      await updateDoc(doc(db, "products", stockEditing.id), { stockQty: value, updatedAt: serverTimestamp() });
      setStockModal(false);
      setStockEditing(null);
    } catch (e) {
      Alert.alert("Stock update failed", e?.message || "Unable to update stock.");
    }
  };

  const renderCard = ({ item }) => {
    const isActive = item.active !== false;
    const stock = num(item.stockQty);
    const low = isActive && num(item.lowStockLevel) > 0 && stock <= num(item.lowStockLevel);
    const unitMargin = num(item.sellingPrice) - num(item.purchasePrice);
    return (
      <View style={[styles.card, !isActive && styles.inactive]}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}><AppText style={styles.avatarText}>{String(item.name || "P").charAt(0).toUpperCase()}</AppText></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={styles.brand}>{item.brand || "Other Brand"}</AppText>
            <AppText style={styles.name} numberOfLines={1}>{item.name}</AppText>
            <AppText style={styles.variant}>{item.variant} · {item.category || "Other"}</AppText>
          </View>
          <View style={[styles.status, isActive ? styles.statusActive : styles.statusInactive]}>
            <AppText style={[styles.statusText, !isActive && { color: C.secondary }]}>{isActive ? "ACTIVE" : "INACTIVE"}</AppText>
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.detailGrid}>
          <Metric label="PURCHASE" value={money(item.purchasePrice)} />
          <Metric label="SELLING" value={money(item.sellingPrice)} strong />
          <Metric label="STOCK" value={`${stock} ${item.unit || ""}`} warning={low} />
          <Metric label="MARGIN / UNIT" value={money(unitMargin)} strong={unitMargin > 0} />
        </View>
        {low && <View style={styles.lowBanner}><AppText style={styles.lowText}>⚠ Low stock · reorder level {num(item.lowStockLevel)}</AppText></View>}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.outlineButton} onPress={() => openEdit(item)}><AppText style={styles.outlineText}>Edit</AppText></TouchableOpacity>
          <TouchableOpacity style={styles.stockButton} onPress={() => openStock(item)}><AppText style={styles.stockText}>Adjust Stock</AppText></TouchableOpacity>
          <TouchableOpacity style={styles.statusButton} onPress={() => toggleStatus(item)}><AppText style={styles.statusButtonText}>{isActive ? "Deactivate" : "Activate"}</AppText></TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={[styles.content, mobile && styles.contentMobile]}>
          <View style={[styles.header, mobile && styles.headerMobile]}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.eyebrow}>OTHER BRAND PRODUCTS</AppText>
              <AppText style={styles.title}>Inventory & Stock</AppText>
              <AppText style={styles.subtitle}>Milky Mist and other retail products</AppText>
            </View>
            <TouchableOpacity style={[styles.addButton, mobile && styles.addButtonMobile]} onPress={openAdd}><AppText style={styles.addText}>＋ Add Product</AppText></TouchableOpacity>
          </View>

          <View style={[styles.kpis, mobile && styles.kpisMobile]}>
            <KPI label="PRODUCTS" value={products.length} mobile={mobile} />
            <KPI label="STOCK UNITS" value={stockUnits} mobile={mobile} />
            <KPI label="STOCK VALUE" value={money(stockValue)} mobile={mobile} />
            <KPI label="LOW STOCK" value={lowStock} warning={lowStock > 0} mobile={mobile} />
          </View>

          <View style={styles.filterCard}>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search brand, product or size..." placeholderTextColor="#8A958E" style={styles.search} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {brands.map((b) => <Chip key={b} label={b} selected={brandFilter === b} onPress={() => setBrandFilter(b)} />)}
              {(["All", ...CATEGORIES]).map((c) => <Chip key={`cat-${c}`} label={c} selected={categoryFilter === c} onPress={() => setCategoryFilter(c)} />)}
            </ScrollView>
          </View>

          {loading ? <View style={styles.loading}><ActivityIndicator size="large" /><AppText style={styles.secondary}>Loading inventory...</AppText></View> : filtered.length === 0 ? <View style={styles.empty}><AppText style={styles.emptyTitle}>No products found</AppText><AppText style={styles.secondary}>Add your first Milky Mist product to start tracking stock and margin.</AppText></View> : (
            <FlatList data={filtered} renderItem={renderCard} keyExtractor={(i) => i.id} scrollEnabled={false} numColumns={mobile ? 1 : 2} columnWrapperStyle={!mobile ? styles.columns : undefined} contentContainerStyle={{ gap: 16 }} />
          )}
        </ScrollView>

        <ProductModal visible={modal} mobile={mobile} form={form} setField={setField} editing={editing} saving={saving} onClose={() => !saving && setModal(false)} onSave={save} />
        <Modal visible={stockModal} transparent animationType="fade" onRequestClose={() => setStockModal(false)}>
          <View style={styles.modalBackdrop}><View style={[styles.stockModal, mobile && { width: "92%"}]}>
            <AppText style={styles.modalTitle}>Adjust Stock</AppText>
            <AppText style={styles.modalSubtitle}>{stockEditing?.name} · {stockEditing?.variant}</AppText>
            <AppText style={styles.label}>CURRENT STOCK</AppText>
            <TextInput value={stockInput} onChangeText={setStockInput} keyboardType="decimal-pad" style={styles.input} />
            <View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setStockModal(false)}><AppText style={styles.cancelText}>Cancel</AppText></TouchableOpacity><TouchableOpacity style={styles.saveButton} onPress={saveStock}><AppText style={styles.saveText}>Update Stock</AppText></TouchableOpacity></View>
          </View></View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value, strong, warning }) { return <View style={styles.metric}><AppText style={styles.metricLabel}>{label}</AppText><AppText style={[styles.metricValue, strong && { color: C.greenDeep }, warning && { color: C.warning }]}>{value}</AppText></View>; }
function KPI({ label, value, warning, mobile }) { return <View style={[styles.kpi, mobile && styles.kpiMobile]}><AppText style={styles.kpiLabel}>{label}</AppText><AppText style={[styles.kpiValue, warning && { color: C.warning }]}>{value}</AppText></View>; }
function Chip({ label, selected, onPress }) { return <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}><AppText style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</AppText></TouchableOpacity>; }

function ProductModal({ visible, mobile, form, setField, editing, saving, onClose, onSave }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={[styles.formModal, mobile && { width: "96%", maxHeight: "94%"}]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppText style={styles.modalTitle}>{editing ? "Edit Product" : "Add Product"}</AppText>
        <AppText style={styles.modalSubtitle}>Capture purchase cost, selling price and stock.</AppText>
        <Field label="BRAND" value={form.brand} onChangeText={(v) => setField("brand", v)} placeholder="Milky Mist" />
        <Field label="PRODUCT NAME" value={form.name} onChangeText={(v) => setField("name", v)} placeholder="Paneer" />
        <Field label="SIZE / VARIANT" value={form.variant} onChangeText={(v) => setField("variant", v)} placeholder="200g" />
        <AppText style={styles.label}>CATEGORY</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChips}>{CATEGORIES.map((x) => <Chip key={x} label={x} selected={form.category === x} onPress={() => setField("category", x)} />)}</ScrollView>
        <AppText style={styles.label}>UNIT</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formChips}>{UNITS.map((x) => <Chip key={x} label={x} selected={form.unit === x} onPress={() => setField("unit", x)} />)}</ScrollView>
        <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label="PURCHASE PRICE" value={form.purchasePrice} onChangeText={(v) => setField("purchasePrice", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" /></View><View style={{ flex: 1 }}><Field label="SELLING PRICE" value={form.sellingPrice} onChangeText={(v) => setField("sellingPrice", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" /></View></View>
        <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label="OPENING STOCK" value={form.stockQty} onChangeText={(v) => setField("stockQty", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" /></View><View style={{ flex: 1 }}><Field label="LOW STOCK LEVEL" value={form.lowStockLevel} onChangeText={(v) => setField("lowStockLevel", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" /></View></View>
        <Field label="IMAGE URL (OPTIONAL)" value={form.imageUrl} onChangeText={(v) => setField("imageUrl", v)} placeholder="https://..." />
      </ScrollView>
      <View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}><AppText style={styles.cancelText}>Cancel</AppText></TouchableOpacity><TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}><AppText style={styles.saveText}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Product"}</AppText></TouchableOpacity></View>
    </View></View>
  </Modal>;
}
function Field({ label, value, onChangeText, ...props }) { return <><AppText style={styles.label}>{label}</AppText><TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor="#9AA49D" {...props} /></>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.greenDeep }, page: { flex: 1, backgroundColor: C.bg },
  content: { width: "100%", maxWidth: 1540, alignSelf: "center", paddingHorizontal: 38, paddingTop: 25, paddingBottom: 70 },
  contentMobile: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 105 },
  header: { backgroundColor: C.card, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 }, headerMobile: { borderRadius: 16, padding: 16, gap: 10, alignItems: "stretch", flexDirection: "column", marginBottom: 12 },
  eyebrow: { color: C.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 }, title: { color: C.text, fontSize: 31, fontWeight: "900", lineHeight: 38, marginTop: 4 }, subtitle: { color: C.secondary, fontSize: 13, lineHeight: 20, marginTop: 4 },
  addButton: { backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 }, addButtonMobile: { width: "100%", paddingVertical: 11, alignItems: "center", justifyContent: "center" }, addText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  kpis: { flexDirection: "row", gap: 12, marginBottom: 16 }, kpisMobile: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, kpi: { flex: 1, minWidth: 0, backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border }, kpiMobile: { flexBasis: "48%", maxWidth: "49%", padding: 12, borderRadius: 13 }, kpiLabel: { color: C.secondary, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 }, kpiValue: { color: C.text, fontSize: 24, fontWeight: "900", marginTop: 7 },
  filterCard: { backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16 }, search: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14,  fontSize: 15, color: C.text }, chips: { gap: 8, paddingTop: 12, paddingRight: 12 }, chip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "#fff" }, chipSelected: { backgroundColor: C.greenSoft, borderColor: C.green }, chipText: { color: C.secondary, fontSize: 12, fontWeight: "600" }, chipTextSelected: { color: C.greenDeep, fontWeight: "800" },
  columns: { gap: 16 }, card: { flex: 1, minWidth: 0, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 }, inactive: { opacity: 0.62 }, cardTop: { flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: C.greenDeep, fontSize: 18, fontWeight: "700" }, brand: { color: C.greenDark, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }, name: { color: C.text, fontSize: 17, fontWeight: "700", marginTop: 2 }, variant: { color: C.secondary, fontSize: 12, marginTop: 2 }, status: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, statusActive: { backgroundColor: C.greenSoft }, statusInactive: { backgroundColor: "#EEF1EF" }, statusText: { color: C.greenDeep, fontSize: 9, fontWeight: "800" }, divider: { height: 1, backgroundColor: C.border, marginVertical: 15 }, detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { flex: 1, minWidth: 105 }, metricLabel: { color: C.secondary, fontSize: 9, fontWeight: "700" }, metricValue: { color: C.text, fontSize: 15, fontWeight: "800", marginTop: 5 }, lowBanner: { backgroundColor: "#FFF7E6", borderRadius: 10, padding: 9, marginTop: 13 }, lowText: { color: "#9A6500", fontSize: 11, fontWeight: "600" }, actions: { flexDirection: "row", gap: 8, marginTop: 16 }, outlineButton: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 10, alignItems: "center" }, outlineText: { color: C.text, fontSize: 11, fontWeight: "700" }, stockButton: { flex: 1.3, backgroundColor: C.greenSoft, borderRadius: 10, paddingVertical: 10, alignItems: "center" }, stockText: { color: C.greenDeep, fontSize: 11, fontWeight: "700" }, statusButton: { flex: 1.1, backgroundColor: "#F7F8F7", borderRadius: 10, paddingVertical: 10, alignItems: "center" }, statusButtonText: { color: C.secondary, fontSize: 11, fontWeight: "700" },
  loading: { alignItems: "center", padding: 50, gap: 10 }, secondary: { color: C.secondary, fontSize: 13, lineHeight: 20 }, empty: { backgroundColor: C.card, borderRadius: 18, padding: 35, alignItems: "center", borderWidth: 1, borderColor: C.border }, emptyTitle: { color: C.text, fontSize: 19, fontWeight: "900", marginBottom: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(12,24,16,0.45)", alignItems: "center", justifyContent: "center", padding: 16 }, formModal: { width: 620, maxHeight: "90%", backgroundColor: "#fff", borderRadius: 22, padding: 22 }, stockModal: { width: 480, backgroundColor: "#fff", borderRadius: 22, padding: 22 }, modalTitle: { color: C.text, fontSize: 21, fontWeight: "900" }, modalSubtitle: { color: C.secondary, fontSize: 13, marginTop: 4, marginBottom: 18 }, label: { color: C.text, fontSize: 11, fontWeight: "800", letterSpacing: 0.2, marginTop: 12, marginBottom: 6 }, input: { height: 45, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, color: C.text,  fontSize: 14 }, formChips: { gap: 7, paddingBottom: 2 }, twoFields: { flexDirection: "row", gap: 12 }, modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 }, cancelButton: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 17, paddingVertical: 11 }, cancelText: { color: C.secondary, fontSize: 12, fontWeight: "800" }, saveButton: { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 }, saveText: { color: "#fff", fontSize: 12, fontWeight: "900" },
});
