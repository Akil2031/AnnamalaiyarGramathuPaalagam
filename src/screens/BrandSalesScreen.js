import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import AppText from "../components/AppText";

const C = {
  green: "#63B83F", greenDark: "#4E9F30", greenDeep: "#367C27", greenSoft: "#EAF7DF",
  bg: "#F3F7F1", card: "#FFFFFF", border: "#E2EAE1", text: "#17231B", secondary: "#65736A",
  warning: "#F59E0B", danger: "#DC2626", blue: "#2563EB", blueSoft: "#EEF4FF",
};
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Credit"];
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => `₹${num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pad = (v) => String(v).padStart(2, "0");
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (key) => { const [y,m,d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
const prettyDate = (key) => parseKey(key).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const safeDateKey = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v?.toDate) return dateKey(v.toDate());
  if (v?.seconds) return dateKey(new Date(v.seconds * 1000));
  try { return dateKey(new Date(v)); } catch { return ""; }
};
const productName = (p) => p.productName || p.name || p.title || "Unnamed Product";
const variant = (p) => p.variant || p.size || p.variantSize || "";
const unit = (p) => p.unit || "";
const selling = (p) => num(p.sellingPrice ?? p.salePrice ?? p.price ?? p.rate);
const purchase = (p) => num(p.purchasePrice ?? p.costPrice ?? p.cost);
const stock = (p) => num(p.stockQty ?? p.currentStock ?? p.stock ?? p.quantity ?? p.openingStock);
const stockField = (p) => p.stockQty !== undefined ? "stockQty" : p.currentStock !== undefined ? "currentStock" : p.stock !== undefined ? "stock" : p.quantity !== undefined ? "quantity" : "openingStock";

export default function BrandSalesScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const today = dateKey();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [saleDate, setSaleDate] = useState(today);
  const [customerModal, setCustomerModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(today.slice(0, 7));
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = onSnapshot(collection(db, "products"), (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active !== false);
      rows.sort((a,b) => productName(a).localeCompare(productName(b)));
      setProducts(rows); setLoading(false);
    }, e => { console.error(e); setLoading(false); });
    return u;
  }, []);
  useEffect(() => {
    const u = onSnapshot(collection(db, "storeCustomers"), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active !== false);
      rows.sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));
      setCustomers(rows);
    });
    return u;
  }, []);
  useEffect(() => {
    const u = onSnapshot(collection(db, "storeSales"), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a,b) => safeDateKey(b.saleDateKey || b.date || b.saleDate || b.createdAt).localeCompare(safeDateKey(a.saleDateKey || a.date || a.saleDate || a.createdAt)));
      setSales(rows);
    });
    return u;
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter(c => !q || [c.name,c.mobile,c.address].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [customers, customerSearch]);
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter(p => !q || [p.brand || "Other Brand", productName(p), variant(p), unit(p), p.category].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [products, productSearch]);

  const subtotal = useMemo(() => cart.reduce((s,i) => s + num(i.quantity) * num(i.rate), 0), [cart]);
  const discountAmount = Math.min(subtotal, Math.max(0, num(discount)));
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const costTotal = useMemo(() => cart.reduce((s,i) => s + num(i.quantity) * num(i.purchasePrice), 0), [cart]);
  const marginTotal = Math.max(0, grandTotal - costTotal);

  const history = useMemo(() => sales.filter(s => safeDateKey(s.saleDateKey || s.date || s.saleDate || s.createdAt).startsWith(historyMonth)), [sales, historyMonth]);
  const todaySales = sales.filter(s => safeDateKey(s.saleDateKey || s.date || s.saleDate || s.createdAt) === today);
  const todayRevenue = todaySales.reduce((s,x) => s + num(x.grandTotal ?? x.total ?? x.amount), 0);
  const todayMargin = todaySales.reduce((s,x) => s + num(x.marginTotal ?? x.margin ?? 0), 0);
  const todayQty = todaySales.reduce((s,x) => s + num(x.totalQuantity ?? (x.items || []).reduce((a,i) => a + num(i.quantity ?? i.qty), 0)), 0);

  const addProduct = (p) => {
    const available = stock(p);
    if (available <= 0) return Alert.alert("Out of Stock", `${productName(p)} has no available stock.`);
    const existing = cart.find(i => i.productId === p.id);
    if (existing) {
      if (num(existing.quantity) >= available) return Alert.alert("Stock Limit", `Only ${available} available.`);
      setCart(prev => prev.map(i => i.productId === p.id ? { ...i, quantity: num(i.quantity) + 1 } : i));
    } else {
      setCart(prev => [...prev, { productId:p.id, name:productName(p), variant:variant(p), unit:unit(p), brand:p.brand || "Other Brand", quantity:1, rate:selling(p), purchasePrice:purchase(p), availableStock:available }]);
    }
    setProductModal(false); setProductSearch("");
  };
  const changeQty = (item, delta) => {
    const next = num(item.quantity) + delta;
    if (next <= 0) return setCart(prev => prev.filter(i => i.productId !== item.productId));
    if (next > item.availableStock) return Alert.alert("Stock Limit", `Only ${item.availableStock} available.`);
    setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: next } : i));
  };
  const remove = (id) => setCart(prev => prev.filter(i => i.productId !== id));
  const updateRate = (id, value) => setCart(prev => prev.map(i => i.productId === id ? { ...i, rate:value.replace(/[^0-9.]/g, "") } : i));

  const saveSale = async () => {
    if (saving) return;
    if (!selectedCustomer) return Alert.alert("Customer Required", "Please select a customer.");
    if (!cart.length) return Alert.alert("Product Required", "Please add at least one product.");
    if (!paymentMode) return Alert.alert("Payment Mode Required", "Select Cash, UPI, Card or Credit.");
    setSaving(true);
    try {
      const saleRef = doc(collection(db, "storeSales"));
      await runTransaction(db, async tx => {
        const productRows = [];
        for (const item of cart) {
          const ref = doc(db, "products", item.productId);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error(`${item.name} no longer exists.`);
          productRows.push({ ref, item, product: snap.data() });
        }
        const finalItems = [];
        let finalCost = 0;
        for (const row of productRows) {
          const live = stock(row.product);
          const qty = num(row.item.quantity);
          if (live < qty) throw new Error(`${row.item.name}: only ${live} stock available.`);
          tx.update(row.ref, { [stockField(row.product)]: live - qty, updatedAt: serverTimestamp() });
          const rate = num(row.item.rate);
          const purchasePrice = purchase(row.product);
          const amount = qty * rate;
          const cost = qty * purchasePrice;
          finalCost += cost;
          finalItems.push({ productId:row.item.productId, name:row.item.name, variant:row.item.variant || "", unit:row.item.unit || "", brand:row.item.brand || "Other Brand", category:row.item.category || "", quantity:qty, qty, rate, purchasePrice, amount, cost, margin:amount-cost });
        }
        const margin = grandTotal - finalCost;
        tx.set(saleRef, {
          invoiceNumber:`INV-${saleDate.replace(/-/g, "")}-${Date.now().toString().slice(-6)}`,
          customerId:selectedCustomer.id, customerName:selectedCustomer.name || "", customerMobile:selectedCustomer.mobile || "", customerType:selectedCustomer.customerType || "",
          items:finalItems, productCount:finalItems.length, totalQuantity:finalItems.reduce((s,i)=>s+i.quantity,0), subtotal, discount:discountAmount, grandTotal,
          total:grandTotal, paymentMode, collectedAmount:paymentMode === "Credit" ? 0 : grandTotal, creditAmount:paymentMode === "Credit" ? grandTotal : 0,
          costTotal:finalCost, marginTotal:margin, marginPercent:grandTotal ? (margin / grandTotal) * 100 : 0,
          saleDateKey:saleDate, saleMonthKey:saleDate.slice(0,7), saleYear:Number(saleDate.slice(0,4)), saleMonth:Number(saleDate.slice(5,7)), saleDay:Number(saleDate.slice(8,10)),
          notes:notes.trim(), saleDate:serverTimestamp(), createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
        });
      });
      Alert.alert("Sale Saved", `Total ${money(grandTotal)} · Margin ${money(marginTotal)}`);
      setSelectedCustomer(null); setCart([]); setDiscount(""); setPaymentMode(""); setNotes(""); setSaleDate(today);
    } catch (e) { console.error(e); Alert.alert("Unable to Save Sale", e?.message || "Please try again."); }
    finally { setSaving(false); }
  };

  const monthLabel = (key) => parseKey(`${key}-01`).toLocaleDateString("en-IN", { month:"long", year:"numeric" });
  const shiftMonth = (delta) => { const d = parseKey(`${historyMonth}-01`); d.setMonth(d.getMonth()+delta); setHistoryMonth(`${d.getFullYear()}-${pad(d.getMonth()+1)}`); };

  return <SafeAreaView style={styles.safe} edges={[]}>
    <View style={styles.page}><ScrollView contentContainerStyle={[styles.content, mobile && styles.contentMobile]}>
      <View style={[styles.header, mobile && styles.headerMobile]}><View style={{flex:1}}><AppText style={styles.eyebrow}>OTHER BRAND SALES</AppText><AppText style={styles.title}>Retail Sales & Margin</AppText><AppText style={styles.subtitle}>Sell products, reduce stock and know your gross margin</AppText></View><TouchableOpacity style={[styles.newButton, mobile && styles.newButtonMobile]} onPress={() => { setSelectedCustomer(null); setCart([]); setSaleDate(today); }}><AppText style={styles.newText}>＋ New Sale</AppText></TouchableOpacity></View>

      <View style={[styles.kpis, mobile && styles.kpisMobile]}><KPI label="TODAY SALES" value={money(todayRevenue)} /><KPI label="TODAY COST" value={money(todayRevenue - todayMargin)} /><KPI label="TODAY MARGIN" value={money(todayMargin)} /><KPI label="ITEMS SOLD" value={todayQty} /></View>

      <View style={[styles.saleLayout, mobile && styles.saleLayoutMobile]}>
        <View style={[styles.billCard, mobile && styles.billCardMobile]}>
          <View style={styles.sectionHeader}><View><AppText style={styles.sectionTitle}>New Sale</AppText><AppText style={styles.sectionSub}>Create a retail bill</AppText></View><TouchableOpacity style={styles.dateButton} onPress={() => setDateModal(true)}><AppText style={styles.dateSmall}>SALE DATE</AppText><AppText style={styles.dateValue}>{prettyDate(saleDate)}</AppText></TouchableOpacity></View>
          <AppText style={styles.label}>CUSTOMER</AppText>
          <TouchableOpacity style={styles.selector} onPress={() => setCustomerModal(true)}><View style={{flex:1}}>{selectedCustomer ? <><AppText style={styles.selectedName}>{selectedCustomer.name}</AppText><AppText style={styles.selectorSub}>{selectedCustomer.mobile || "Retail customer"}</AppText></> : <AppText style={styles.placeholder}>Select customer...</AppText>}</View><AppText style={styles.chevron}>›</AppText></TouchableOpacity>
          <View style={styles.addRow}><AppText style={styles.label}>PRODUCTS</AppText><TouchableOpacity style={styles.addProduct} onPress={() => setProductModal(true)}><AppText style={styles.addProductText}>＋ Add Product</AppText></TouchableOpacity></View>
          {cart.length === 0 ? <View style={styles.emptyCart}><AppText style={styles.emptyCartTitle}>No products added</AppText><AppText style={styles.secondary}>Select products from your inventory.</AppText></View> : cart.map((item,index) => <CartItem key={item.productId} item={item} index={index} onQty={changeQty} onRemove={remove} onRate={updateRate} />)}
          <AppText style={styles.label}>PAYMENT MODE</AppText><View style={styles.paymentRow}>{PAYMENT_MODES.map(m => <TouchableOpacity key={m} onPress={() => setPaymentMode(m)} style={[styles.paymentChip, paymentMode===m && styles.paymentSelected]}><AppText style={[styles.paymentText, paymentMode===m && styles.paymentTextSelected]}>{m}</AppText></TouchableOpacity>)}</View>
          <Field label="DISCOUNT" value={discount} onChangeText={v => setDiscount(v.replace(/[^0-9.]/g,""))} keyboardType="decimal-pad" placeholder="0" />
          <Field label="NOTES" value={notes} onChangeText={setNotes} placeholder="Optional note" />
        </View>
        <View style={[styles.summaryCard, mobile && styles.summaryCardMobile]}><AppText style={styles.sectionTitle}>Bill Summary</AppText><AppText style={styles.sectionSub}>Profit is calculated from purchase cost.</AppText><SummaryRow label="Subtotal" value={money(subtotal)} /><SummaryRow label="Discount" value={`− ${money(discountAmount)}`} /><SummaryRow label="Sales" value={money(grandTotal)} strong /><View style={styles.summaryDivider}/><SummaryRow label="Product Cost" value={money(costTotal)} /><View style={styles.marginBox}><AppText style={styles.marginLabel}>GROSS MARGIN</AppText><AppText style={styles.marginValue}>{money(marginTotal)}</AppText><AppText style={styles.marginPct}>{grandTotal ? `${((marginTotal/grandTotal)*100).toFixed(1)}% margin` : "0.0% margin"}</AppText></View><TouchableOpacity style={[styles.saveSale, saving && {opacity:.6}]} onPress={saveSale} disabled={saving}><AppText style={styles.saveSaleText}>{saving ? "Saving..." : "Save Sale"}</AppText></TouchableOpacity></View>
      </View>

      <View style={styles.historyCard}><View style={styles.historyHeader}><View><AppText style={styles.sectionTitle}>Sales History</AppText><AppText style={styles.sectionSub}>{history.length} transaction{history.length===1?"":"s"} · {monthLabel(historyMonth)}</AppText></View><View style={styles.monthNav}><TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)}><AppText>‹</AppText></TouchableOpacity><TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)} disabled={historyMonth >= today.slice(0,7)}><AppText style={{opacity:historyMonth >= today.slice(0,7)?0.35:1}}>›</AppText></TouchableOpacity></View></View>{history.length===0?<View style={styles.historyEmpty}><AppText style={styles.emptyCartTitle}>No sales for this month</AppText></View>:history.slice(0,50).map((s,i)=><HistoryItem key={s.id} sale={s} />)}</View>
    </ScrollView></View>

    <PickerModal visible={customerModal} mobile={mobile} title="Select Customer" search={customerSearch} setSearch={setCustomerSearch} onClose={() => {setCustomerModal(false);setCustomerSearch("");}}><FlatList data={filteredCustomers} keyExtractor={x=>x.id} renderItem={({item})=><TouchableOpacity style={styles.listItem} onPress={()=>{setSelectedCustomer(item);setCustomerModal(false);setCustomerSearch("");}}><View style={styles.listAvatar}><AppText style={styles.listAvatarText}>{String(item.name||"C").charAt(0).toUpperCase()}</AppText></View><View style={{flex:1}}><AppText style={styles.listName}>{item.name}</AppText><AppText style={styles.listSub}>{item.mobile || item.address || "Customer"}</AppText></View></TouchableOpacity>} ListEmptyComponent={<AppText style={styles.secondary}>No customers found.</AppText>} /></PickerModal>
    <PickerModal visible={productModal} mobile={mobile} title="Add Product" search={productSearch} setSearch={setProductSearch} onClose={() => {setProductModal(false);setProductSearch("");}}><FlatList data={filteredProducts} keyExtractor={x=>x.id} renderItem={({item})=>{const st=stock(item);return <TouchableOpacity style={styles.listItem} onPress={()=>addProduct(item)} disabled={st<=0}><View style={styles.productDot}><AppText>{String(productName(item)||"P").charAt(0)}</AppText></View><View style={{flex:1}}><AppText style={styles.listName}>{productName(item)}</AppText><AppText style={styles.listSub}>{item.brand || "Other Brand"} · {variant(item) || item.category || "Product"}</AppText></View><View style={{alignItems:"flex-end"}}><AppText style={styles.listPrice}>{money(selling(item))}</AppText><AppText style={[styles.listSub, st<=0&&{color:C.danger}]}>{st<=0?"Out of stock":`${st} ${unit(item)}`}</AppText></View></TouchableOpacity>}} ListEmptyComponent={<AppText style={styles.secondary}>No products found.</AppText>} /></PickerModal>
    <DateModal visible={dateModal} value={saleDate} max={today} onClose={()=>setDateModal(false)} onSelect={k=>{setSaleDate(k);setDateModal(false);}} mobile={mobile} />
  </SafeAreaView>;
}

function KPI({label,value}){return <View style={styles.kpi}><AppText style={styles.kpiLabel}>{label}</AppText><AppText style={styles.kpiValue}>{value}</AppText></View>}
function SummaryRow({label,value,strong}){return <View style={styles.summaryRow}><AppText style={styles.summaryLabel}>{label}</AppText><AppText style={[styles.summaryValue,strong&&{fontWeight:"800"}]}>{value}</AppText></View>}
function CartItem({item,index,onQty,onRemove,onRate}){const amount=num(item.quantity)*num(item.rate);return <View style={styles.cartItem}><View style={styles.itemTop}><View style={styles.itemNo}><AppText style={styles.itemNoText}>{index+1}</AppText></View><View style={{flex:1}}><AppText style={styles.itemName}>{item.name}</AppText><AppText style={styles.itemSub}>{item.brand} · {item.variant || item.unit}</AppText></View><TouchableOpacity onPress={()=>onRemove(item.productId)}><AppText style={styles.remove}>×</AppText></TouchableOpacity></View><View style={styles.itemBottom}><View><AppText style={styles.smallLabel}>QTY</AppText><View style={styles.qtyBox}><TouchableOpacity onPress={()=>onQty(item,-1)}><AppText style={styles.qtyBtn}>−</AppText></TouchableOpacity><AppText style={styles.qtyValue}>{item.quantity}</AppText><TouchableOpacity onPress={()=>onQty(item,1)}><AppText style={styles.qtyBtn}>＋</AppText></TouchableOpacity></View></View><View style={{width:105}}><AppText style={styles.smallLabel}>RATE</AppText><TextInput value={String(item.rate)} onChangeText={v=>onRate(item.productId,v)} keyboardType="decimal-pad" style={styles.rateInput}/></View><View style={{alignItems:"flex-end",flex:1}}><AppText style={styles.smallLabel}>AMOUNT</AppText><AppText style={styles.amount}>{money(amount)}</AppText></View></View></View>}
function Field({label,value,onChangeText,...props}){return <View><AppText style={styles.label}>{label}</AppText><TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor="#9AA49D" {...props}/></View>}
function HistoryItem({sale}){const key=safeDateKey(sale.saleDateKey||sale.date||sale.saleDate||sale.createdAt);const total=num(sale.grandTotal??sale.total??sale.amount);const margin=num(sale.marginTotal??sale.margin);return <View style={styles.historyItem}><View style={styles.historyIcon}><AppText>₹</AppText></View><View style={{flex:1}}><AppText style={styles.historyName}>{sale.customerName || sale.customer || "Walk-in Customer"}</AppText><AppText style={styles.historySub}>{prettyDate(key)} · {sale.paymentMode || (sale.paid ? "Paid" : "")}</AppText></View><View style={{alignItems:"flex-end"}}><AppText style={styles.historyTotal}>{money(total)}</AppText><AppText style={styles.historyMargin}>Margin {money(margin)}</AppText></View></View>}
function PickerModal({visible,mobile,title,search,setSearch,onClose,children}){return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.backdrop}><View style={[styles.pickerModal,mobile&&{width:"96%",maxHeight:"90%"}]}><View style={styles.modalHead}><View><AppText style={styles.modalTitle}>{title}</AppText><AppText style={styles.modalSub}>Search and select</AppText></View><TouchableOpacity onPress={onClose}><AppText style={styles.modalClose}>×</AppText></TouchableOpacity></View><TextInput value={search} onChangeText={setSearch} placeholder="Search..." placeholderTextColor="#9AA49D" style={styles.searchInput}/>{children}</View></View></Modal>}
function DateModal({visible,value,max,onClose,onSelect,mobile}){const [month,setMonth]=useState(value.slice(0,7));useEffect(()=>{if(visible)setMonth(value.slice(0,7));},[visible,value]);const d=parseKey(`${month}-01`);const first=d.getDay();const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let i=1;i<=days;i++)cells.push(i);return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={[styles.calendarModal,mobile&&{width:"94%"}]}><View style={styles.modalHead}><View><AppText style={styles.modalTitle}>Select Sale Date</AppText><AppText style={styles.modalSub}>{prettyDate(value)}</AppText></View><TouchableOpacity onPress={onClose}><AppText style={styles.modalClose}>×</AppText></TouchableOpacity></View><View style={styles.calNav}><TouchableOpacity onPress={()=>{const x=parseKey(`${month}-01`);x.setMonth(x.getMonth()-1);setMonth(`${x.getFullYear()}-${pad(x.getMonth()+1)}`)}}><AppText style={styles.calArrow}>‹</AppText></TouchableOpacity><AppText style={styles.calMonth}>{d.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</AppText><TouchableOpacity disabled={month>=max.slice(0,7)} onPress={()=>{const x=parseKey(`${month}-01`);x.setMonth(x.getMonth()+1);setMonth(`${x.getFullYear()}-${pad(x.getMonth()+1)}`)}}><AppText style={[styles.calArrow,month>=max.slice(0,7)&&{opacity:.3}]}>›</AppText></TouchableOpacity></View><View style={styles.weekRow}>{["S","M","T","W","T","F","S"].map((x,i)=><AppText key={i} style={styles.week}>{x}</AppText>)}</View><View style={styles.days}>{cells.map((day,i)=>{if(!day)return <View key={i} style={styles.dayCell}/>;const key=`${month}-${pad(day)}`;const disabled=key>max;return <TouchableOpacity key={i} disabled={disabled} onPress={()=>onSelect(key)} style={[styles.dayCell, key===value&&styles.daySelected]}><AppText style={[styles.dayText,key===value&&styles.daySelectedText,disabled&&{opacity:.25}]}>{day}</AppText></TouchableOpacity>})}</View><TouchableOpacity style={styles.todayButton} onPress={()=>onSelect(max)}><AppText style={styles.todayText}>Today</AppText></TouchableOpacity></View></View></Modal>}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.greenDeep},page:{flex:1,backgroundColor:C.bg},content:{width:"100%",maxWidth:1540,alignSelf:"center",paddingHorizontal:38,paddingTop:25,paddingBottom:70},contentMobile:{paddingHorizontal:14,paddingTop:12,paddingBottom:105},
 header:{backgroundColor:C.card,borderRadius:22,padding:24,borderWidth:1,borderColor:C.border,flexDirection:"row",alignItems:"center",gap:16,marginBottom:16},headerMobile:{backgroundColor:"transparent",borderWidth:0,borderRadius:0,paddingHorizontal:0,paddingTop:2,paddingBottom:8,gap:12,alignItems:"stretch",marginBottom:10},eyebrow:{color:C.greenDark,fontSize:10,fontWeight:"800",letterSpacing:1.1},title:{color:C.text,fontSize:31,fontWeight:"900",lineHeight:38,marginTop:4},subtitle:{color:C.secondary,fontSize:13,lineHeight:20,marginTop:4},newButton:{backgroundColor:C.green,paddingHorizontal:18,paddingVertical:12,borderRadius:12},newText:{color:"#fff",fontSize:13,fontWeight:"800"},newButtonMobile:{alignSelf:"flex-start",paddingHorizontal:14,paddingVertical:9,borderRadius:10,alignItems:"center",justifyContent:"center"},
 kpis:{flexDirection:"row",gap:12,marginBottom:16},kpisMobile:{flexWrap:"wrap"},kpi:{flex:1,minWidth:0,backgroundColor:C.card,borderRadius:16,padding:18,borderWidth:1,borderColor:C.border},kpiLabel:{color:C.secondary,fontSize:9,fontWeight:"800",letterSpacing:.7},kpiValue:{color:C.text,fontSize:23,fontWeight:"900",marginTop:7},
 saleLayout:{flexDirection:"row",gap:16,alignItems:"flex-start"},saleLayoutMobile:{flexDirection:"column",gap:0},billCard:{flex:1,backgroundColor:C.card,borderRadius:18,padding:20,borderWidth:1,borderColor:C.border},billCardMobile:{width:"100%",padding:0,backgroundColor:"transparent",borderWidth:0,borderRadius:0},summaryCard:{width:360,backgroundColor:C.card,borderRadius:18,padding:20,borderWidth:1,borderColor:C.border},summaryCardMobile:{width:"100%",padding:0,backgroundColor:"transparent",borderWidth:0,borderRadius:0},sectionHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},sectionTitle:{color:C.text,fontSize:18,fontWeight:"900"},sectionSub:{color:C.secondary,fontSize:12,marginTop:3},dateButton:{backgroundColor:C.greenSoft,borderRadius:12,paddingHorizontal:12,paddingVertical:9,alignItems:"flex-end"},dateSmall:{color:C.greenDeep,fontSize:9,fontWeight:"800"},dateValue:{color:C.text,fontSize:11,fontWeight:"600",marginTop:2},label:{color:C.text,fontSize:11,fontWeight:"800",letterSpacing:.2,marginTop:16,marginBottom:6},selector:{minHeight:52,borderWidth:1,borderColor:C.border,borderRadius:11,paddingHorizontal:13,flexDirection:"row",alignItems:"center"},selectedName:{color:C.text,fontSize:13,fontWeight:"600"},selectorSub:{color:C.secondary,fontSize:11,marginTop:2},placeholder:{color:"#9AA49D",fontSize:13},chevron:{fontSize:26,color:C.secondary},addRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},addProduct:{backgroundColor:C.greenSoft,paddingHorizontal:11,paddingVertical:7,borderRadius:9},addProductText:{color:C.greenDeep,fontSize:10,fontWeight:"800"},emptyCart:{borderWidth:1,borderStyle:"dashed",borderColor:C.border,borderRadius:12,padding:22,alignItems:"center"},emptyCartTitle:{color:C.text,fontSize:14,fontWeight:"700",marginBottom:3},secondary:{color:C.secondary,fontSize:12},cartItem:{borderWidth:1,borderColor:C.border,borderRadius:13,padding:13,marginBottom:9},itemTop:{flexDirection:"row",alignItems:"center",gap:10},itemNo:{width:28,height:28,borderRadius:9,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},itemNoText:{color:C.greenDeep,fontSize:11,fontWeight:"800"},itemName:{color:C.text,fontSize:13,fontWeight:"700"},itemSub:{color:C.secondary,fontSize:10,marginTop:2},remove:{fontSize:22,color:C.secondary,paddingHorizontal:4},itemBottom:{flexDirection:"row",alignItems:"flex-end",gap:14,marginTop:12},smallLabel:{color:C.secondary,fontSize:9,letterSpacing:.5,marginBottom:5},qtyBox:{height:36,borderWidth:1,borderColor:C.border,borderRadius:9,flexDirection:"row",alignItems:"center"},qtyBtn:{paddingHorizontal:10,color:C.greenDeep,fontSize:18},qtyValue:{minWidth:22,textAlign:"center",fontSize:12,fontWeight:"700",color:C.text},rateInput:{height:36,borderWidth:1,borderColor:C.border,borderRadius:9,paddingHorizontal:9,color:C.text,fontSize:13},amount:{color:C.text,fontSize:14,fontWeight:"800"},paymentRow:{flexDirection:"row",gap:8,flexWrap:"wrap"},paymentChip:{borderWidth:1,borderColor:C.border,borderRadius:999,paddingHorizontal:13,paddingVertical:8},paymentSelected:{backgroundColor:C.greenSoft,borderColor:C.green},paymentText:{color:C.secondary,fontSize:11,fontWeight:"600"},paymentTextSelected:{color:C.greenDeep},input:{height:44,borderWidth:1,borderColor:C.border,borderRadius:10,paddingHorizontal:12,color:C.text,fontSize:14},
 summaryRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:15},summaryLabel:{color:C.secondary,fontSize:12},summaryValue:{color:C.text,fontSize:13,fontWeight:"700"},summaryDivider:{height:1,backgroundColor:C.border,marginTop:17},marginBox:{backgroundColor:C.greenSoft,borderRadius:14,padding:15,marginTop:17},marginLabel:{color:C.greenDeep,fontSize:9,fontWeight:"800",letterSpacing:.7},marginValue:{color:C.greenDeep,fontSize:27,fontWeight:"900",marginTop:4},marginPct:{color:C.greenDark,fontSize:11,fontWeight:"600",marginTop:2},saveSale:{backgroundColor:C.green,borderRadius:11,paddingVertical:13,alignItems:"center",marginTop:16},saveSaleText:{color:"#fff",fontSize:13,fontWeight:"900"},
 historyCard:{backgroundColor:C.card,borderRadius:18,borderWidth:1,borderColor:C.border,padding:20,marginTop:16},historyHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},monthNav:{flexDirection:"row",gap:7},navBtn:{width:34,height:34,borderRadius:9,borderWidth:1,borderColor:C.border,alignItems:"center",justifyContent:"center"},historyItem:{flexDirection:"row",alignItems:"center",paddingVertical:13,borderTopWidth:1,borderTopColor:C.border,gap:11},historyIcon:{width:38,height:38,borderRadius:12,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},historyName:{color:C.text,fontSize:13,fontWeight:"700"},historySub:{color:C.secondary,fontSize:10,marginTop:3},historyTotal:{color:C.text,fontSize:13,fontWeight:"800"},historyMargin:{color:C.greenDeep,fontSize:10,fontWeight:"600",marginTop:3},historyEmpty:{padding:30,alignItems:"center"},
 backdrop:{flex:1,backgroundColor:"rgba(12,24,16,.45)",alignItems:"center",justifyContent:"center",padding:16},pickerModal:{width:620,maxHeight:"88%",backgroundColor:"#fff",borderRadius:22,padding:20},calendarModal:{width:420,backgroundColor:"#fff",borderRadius:22,padding:20},modalHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14},modalTitle:{color:C.text,fontSize:19,fontWeight:"900"},modalSub:{color:C.secondary,fontSize:11,marginTop:3},modalClose:{fontSize:28,color:C.secondary,paddingHorizontal:5},searchInput:{height:44,borderWidth:1,borderColor:C.border,borderRadius:10,paddingHorizontal:12,color:C.text,fontSize:14,marginBottom:10},listItem:{flexDirection:"row",alignItems:"center",gap:11,paddingVertical:11,borderTopWidth:1,borderTopColor:C.border},listAvatar:{width:40,height:40,borderRadius:12,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},listAvatarText:{color:C.greenDeep,fontWeight:"800"},productDot:{width:40,height:40,borderRadius:12,backgroundColor:C.blueSoft,alignItems:"center",justifyContent:"center"},listName:{color:C.text,fontSize:13,fontWeight:"700"},listSub:{color:C.secondary,fontSize:10,marginTop:3},listPrice:{color:C.greenDeep,fontSize:12,fontWeight:"800"},
 calNav:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:14},calArrow:{fontSize:28,color:C.greenDeep,paddingHorizontal:8},calMonth:{color:C.text,fontSize:15,fontWeight:"800"},weekRow:{flexDirection:"row"},week:{flex:1,textAlign:"center",color:C.secondary,fontSize:9,fontWeight:"800",paddingBottom:8},days:{flexDirection:"row",flexWrap:"wrap"},dayCell:{width:"14.2857%",aspectRatio:1,alignItems:"center",justifyContent:"center",borderRadius:10},dayText:{color:C.text,fontSize:12,fontWeight:"700"},daySelected:{backgroundColor:C.green},daySelectedText:{color:"#fff",fontWeight:"800"},todayButton:{backgroundColor:C.greenSoft,borderRadius:10,alignItems:"center",paddingVertical:10,marginTop:12},todayText:{color:C.greenDeep,fontSize:12,fontWeight:"800"},
});
