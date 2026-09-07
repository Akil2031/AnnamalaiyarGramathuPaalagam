import React, { useEffect, useMemo, useState } from "react";
import {
  View, FlatList, TouchableOpacity, TextInput, Modal,
  StyleSheet, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase/firebase";
import {
  collection, query, where, onSnapshot, doc, setDoc, deleteDoc,
} from "firebase/firestore";

import AppText from "../components/AppText";

const C = {
  background:"#F3F7F1", white:"#FFFFFF",
  green:"#63B83F", greenDark:"#4E9F30", greenDeep:"#367C27",
  greenSoft:"#EAF7DF", greenSoft2:"#F3F9EE",
  text:"#17231B", secondary:"#65736A", muted:"#98A49B",
  border:"#E2EAE1", danger:"#DE5B5B", dangerSoft:"#FFF0F0",
  warning:"#D79A24", warningSoft:"#FFF7E8", inactive:"#EEF1EF",
};

const dateKey = (d=new Date()) => {
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const today = dateKey();
const addDays = (s,n) => {
  const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate()+n); return dateKey(d);
};
const pretty = s => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN",
  {weekday:"long",day:"numeric",month:"long",year:"numeric"});
const short = s => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN",
  {day:"numeric",month:"short"});
const monthOf = s => s.slice(0,7);
const activeOn = (s,d) => !s.endDate || d <= s.endDate;
const initials = n => {
  const p=String(n||"?").trim().split(/\s+/);
  return p.length===1 ? p[0].slice(0,2).toUpperCase() : `${p[0][0]}${p[1][0]}`.toUpperCase();
};

function Header({date,isMobile,count}) {
  return <View style={[S.header,isMobile&&S.headerMobile]}>
    <View style={S.headerCircle}/>
    <View style={S.headerInner}>
      <View style={[S.pageIcon,isMobile&&S.pageIconMobile]}>
        <Ionicons name="water" size={isMobile?21:24} color={C.greenDark}/>
      </View>
      <View style={S.headerText}>
        <AppText style={[S.title,isMobile&&S.titleMobile]}>Daily Delivery</AppText>
        <AppText style={S.subtitle} numberOfLines={isMobile?2:1}>
          Manage today's milk deliveries and quickly record missed days
        </AppText>
        {!isMobile&&<View style={S.meta}>
          <View style={S.dot}/><AppText style={S.metaText}>{count} active deliveries</AppText>
          <AppText style={S.bullet}>•</AppText><AppText style={S.metaText}>{pretty(date)}</AppText>
        </View>}
      </View>
      {!isMobile&&<View style={S.dateBadge}>
        <AppText style={S.dateBadgeDay}>{new Date(`${date}T00:00:00`).getDate()}</AppText>
        <AppText style={S.dateBadgeMonth}>{new Date(`${date}T00:00:00`).toLocaleString("en-IN",{month:"short"})}</AppText>
      </View>}
    </View>
  </View>;
}

function DateCard({date,isMobile,onPrev,onNext,onToday,onPick,nextDisabled}) {
  return <View style={[S.dateCard,isMobile&&S.dateCardMobile]}>
    <TouchableOpacity activeOpacity={0.8} onPress={onPick} style={S.dateInfo}>
      <View style={[S.dateIcon,isMobile&&S.dateIconMobile]}>
        <Ionicons name="calendar-outline" size={20} color={C.greenDark}/>
      </View>
      <View style={S.dateText}>
        <AppText style={S.eyebrow}>DELIVERY DATE</AppText>
        <AppText style={[S.dateTitle,isMobile&&S.dateTitleMobile]} numberOfLines={1}>{pretty(date)}</AppText>
      </View>
    </TouchableOpacity>
    <View style={S.dateControls}>
      <TouchableOpacity style={S.navBtn} onPress={onPrev}>
        <Ionicons name="chevron-back" size={17} color={C.greenDark}/>
      </TouchableOpacity>
      <TouchableOpacity style={S.todayBtn} onPress={onToday}>
        <AppText style={S.todayText}>Today</AppText>
      </TouchableOpacity>
      <TouchableOpacity style={[S.navBtn,nextDisabled&&S.disabled]} disabled={nextDisabled} onPress={onNext}>
        <Ionicons name="chevron-forward" size={17} color={nextDisabled?C.muted:C.greenDark}/>
      </TouchableOpacity>
    </View>
  </View>;
}

function CalendarPicker({visible,date,onClose,onSelect}) {
  const [cursor,setCursor]=useState(() => new Date(`${date}T00:00:00`));
  useEffect(() => {
    if (visible) setCursor(new Date(`${date}T00:00:00`));
  }, [visible,date]);

  const year=cursor.getFullYear();
  const month=cursor.getMonth();
  const first=new Date(year,month,1);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const start=(first.getDay()+6)%7; // Monday first
  const cells=[];
  for(let i=0;i<start;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  while(cells.length%7) cells.push(null);
  const monthLabel=cursor.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const canGoNext=`${year}-${String(month+1).padStart(2,"0")}-01` < `${today.slice(0,7)}-01`;
  const goMonth=(n)=>setCursor(new Date(year,month+n,1));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.pickerOverlay}>
      <View style={S.pickerCard}>
        <View style={S.pickerHeader}>
          <View style={S.pickerHeaderText}>
            <AppText style={S.pickerEyebrow}>SELECT DELIVERY DATE</AppText>
            <AppText style={S.pickerTitle}>{pretty(date)}</AppText>
          </View>
          <TouchableOpacity onPress={onClose} style={S.pickerClose}>
            <Ionicons name="close" size={20} color={C.secondary}/>
          </TouchableOpacity>
        </View>
        <View style={S.pickerMonthRow}>
          <TouchableOpacity onPress={()=>goMonth(-1)} style={S.pickerNav}>
            <Ionicons name="chevron-back" size={18} color={C.greenDark}/>
          </TouchableOpacity>
          <AppText style={S.pickerMonth}>{monthLabel}</AppText>
          <TouchableOpacity disabled={!canGoNext} onPress={()=>goMonth(1)} style={[S.pickerNav,!canGoNext&&S.disabled]}>
            <Ionicons name="chevron-forward" size={18} color={canGoNext?C.greenDark:C.muted}/>
          </TouchableOpacity>
        </View>
        <View style={S.weekRow}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=><AppText key={x} style={S.weekText}>{x}</AppText>)}</View>
        <View style={S.calendarGrid}>
          {cells.map((value,index)=>{
            const disabled=!value || value>today;
            const selected=value===date;
            const isToday=value===today;
            return <TouchableOpacity key={`${value||"blank"}-${index}`} disabled={disabled} onPress={()=>{onSelect(value);onClose();}}
              style={[S.dayCell,selected&&S.dayCellSelected,isToday&&!selected&&S.dayCellToday,disabled&&S.dayCellDisabled]}>
              {value&&<AppText style={[S.dayText,selected&&S.dayTextSelected,disabled&&S.dayTextDisabled]}>{Number(value.slice(8,10))}</AppText>}
            </TouchableOpacity>;
          })}
        </View>
        <View style={S.pickerFooter}>
          <TouchableOpacity style={S.todayPickerBtn} onPress={()=>{onSelect(today);onClose();}}>
            <Ionicons name="today-outline" size={17} color={C.greenDark}/><AppText style={S.todayPickerText}>Go to Today</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={S.pickerCancel} onPress={onClose}><AppText style={S.pickerCancelText}>Cancel</AppText></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>;
}

function Stat({icon,label,value,tone,isMobile}) {
  const danger=tone==="danger", warn=tone==="warning";
  return <View style={[S.stat,isMobile&&S.statMobile]}>
    <View style={[S.statIcon,{backgroundColor:danger?C.dangerSoft:warn?C.warningSoft:C.greenSoft}]}>
      <Ionicons name={icon} size={isMobile?17:19}
        color={danger?C.danger:warn?C.warning:C.greenDark}/>
    </View>
    <View><AppText style={S.statLabel}>{label}</AppText><AppText style={[S.statValue,isMobile&&S.statValueMobile]}>{value}</AppText></View>
  </View>;
}

function Toggle({delivered,disabled,onPress}) {
  return <TouchableOpacity disabled={disabled} onPress={onPress}
    activeOpacity={disabled?1:.8}
    style={[S.toggle,delivered?S.toggleOn:S.toggleOff,disabled&&S.disabled]}>
    <AppText style={[S.toggleText,delivered?S.toggleTextOn:S.toggleTextOff]}>
      {delivered?"Delivered":"Missed"}
    </AppText>
    <View style={[S.thumb,delivered?S.thumbOn:S.thumbOff]}/>
  </TouchableOpacity>;
}

function DeliveryCard({item,missed,active,mobile,onToggle}) {
  const delivered=active&&!missed;
  return <View style={[S.card,mobile&&S.cardMobile,missed?S.cardMissed:S.cardDelivered]}>
    <View style={S.cardTop}>
      <View style={[S.avatar,missed?S.avatarMissed:S.avatarDelivered]}>
        <AppText style={[S.avatarText,{color:missed?C.danger:C.greenDark}]}>{initials(item.customerName)}</AppText>
      </View>
      <View style={S.identity}>
        <View style={S.nameRow}>
          <AppText style={S.customerName} numberOfLines={1}>{item.customerName}</AppText>
          <View style={[S.pill,missed?S.pillMissed:S.pillDelivered]}>
            <View style={[S.pillDot,{backgroundColor:missed?C.danger:C.green}]}/>
            <AppText style={[S.pillText,{color:missed?C.danger:C.greenDark}]}>{missed?"Missed":"Delivered"}</AppText>
          </View>
        </View>
        <AppText style={S.description}>Daily milk delivery</AppText>
      </View>
    </View>

    <View style={S.details}>
      <View style={S.detail}>
        <View style={S.detailIcon}><Ionicons name="water-outline" size={15} color={C.greenDark}/></View>
        <View><AppText style={S.detailLabel}>QUANTITY</AppText>
          <AppText style={S.detailValue}>{Number(item.quantityPerDay||0).toFixed(2)} L</AppText></View>
      </View>
      <View style={S.detail}>
        <View style={S.detailIcon}><Ionicons name="calendar-outline" size={15} color={C.greenDark}/></View>
        <View style={S.detailText}><AppText style={S.detailLabel}>SUBSCRIPTION</AppText>
          <AppText style={S.detailValue} numberOfLines={1}>{item.endDate?`Until ${short(item.endDate)}`:"No end date"}</AppText></View>
      </View>
    </View>

    <View style={S.actions}>
      <View style={S.hint}>
        <Ionicons name={delivered?"checkmark-circle-outline":"alert-circle-outline"} size={15}
          color={delivered?C.greenDark:C.danger}/>
        <AppText style={[S.hintText,{color:delivered?C.greenDark:C.danger}]}>
          {active?(delivered?"Delivery recorded":"Mark as delivered"):"Subscription inactive"}
        </AppText>
      </View>
      <Toggle delivered={delivered} disabled={!active} onPress={onToggle}/>
    </View>
  </View>;
}

export default function DailyDeliveryScreen() {
  const {width}=useWindowDimensions();
  const mobile=width<700, desktop=width>=1050;
  const [selectedDate,setSelectedDate]=useState(today);
  const [subscriptions,setSubscriptions]=useState([]);
  const [missedDeliveries,setMissedDeliveries]=useState([]);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [pickerVisible,setPickerVisible]=useState(false);
  const monthKey=monthOf(selectedDate);

  useEffect(()=>onSnapshot(
    query(collection(db,"subscriptions"),where("month","==",monthKey)),
    snap=>setSubscriptions(snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>String(a.customerName||"").localeCompare(String(b.customerName||"")))),
    e=>console.error("Subscriptions listener error:",e)
  ),[monthKey]);

  useEffect(()=>onSnapshot(
    query(collection(db,"deliveries"),where("date","==",selectedDate),where("status","==","missed")),
    snap=>setMissedDeliveries(snap.docs.map(d=>({id:d.id,...d.data()}))),
    e=>console.error("Missed deliveries listener error:",e)
  ),[selectedDate]);

  const toggleDelivery=async customerId=>{
    const docId=`${customerId}_${selectedDate}`;
    const missed=missedDeliveries.some(d=>d.customerId===customerId);
    try {
      if(missed) await deleteDoc(doc(db,"deliveries",docId));
      else await setDoc(doc(db,"deliveries",docId),{customerId,date:selectedDate,status:"missed",createdAt:Date.now()});
    } catch(e){console.error("Toggle delivery error:",e);}
  };

  const filtered=useMemo(()=>subscriptions
    .filter(s=>activeOn(s,selectedDate))
    .filter(s=>String(s.customerName||"").toLowerCase().includes(search.toLowerCase()))
    .filter(s=>{
      if(statusFilter==="all") return true;
      const missed=missedDeliveries.some(d=>d.customerId===s.customerId);
      return statusFilter==="missed"?missed:!missed;
    }),[subscriptions,selectedDate,search,statusFilter,missedDeliveries]);

  const totals=useMemo(()=>{
    let expected=0,delivered=0;
    filtered.forEach(s=>{
      const q=Number(s.quantityPerDay||0); expected+=q;
      if(!missedDeliveries.some(d=>d.customerId===s.customerId)) delivered+=q;
    });
    return {expected,delivered};
  },[filtered,missedDeliveries]);

  const monthSummary=useMemo(()=>{
    let planned=0,delivered=0,missed=0;
    subscriptions.forEach(s=>{
      const q=Number(s.quantityPerDay||0), p=Number(s.plannedDays||0), d=Number(s.deliveredDays||0);
      planned+=q*p; delivered+=q*d; missed+=q*Math.max(p-d,0);
    });
    return {planned,delivered,missed,percent:planned?Math.round(delivered/planned*100):0};
  },[subscriptions]);

  const missedCount=filtered.filter(s=>missedDeliveries.some(d=>d.customerId===s.customerId)).length;
  const deliveredCount=filtered.length-missedCount;
  const next=addDays(selectedDate,1), nextDisabled=next>today;

  const Toolbar=()=> <View style={[S.toolbar,mobile&&S.toolbarMobile]}>
    <View style={S.searchBox}>
      <Ionicons name="search-outline" size={18} color={C.muted}/>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search customers..."
        placeholderTextColor="#A0AAA4" autoCorrect={false} autoCapitalize="none" style={S.searchInput}/>
      {!!search&&<TouchableOpacity onPress={()=>setSearch("")}><Ionicons name="close-circle" size={18} color="#AAB3AD"/></TouchableOpacity>}
    </View>
    <View style={S.filters}>
      {[["all","All","list-outline"],["delivered","Delivered","checkmark-circle-outline"],["missed","Missed","alert-circle-outline"]].map(([key,label,icon])=>{
        const active=statusFilter===key;
        return <TouchableOpacity key={key} onPress={()=>setStatusFilter(key)}
          style={[S.filter,active&&S.filterActive]}>
          <Ionicons name={icon} size={15} color={active?C.greenDark:C.secondary}/>
          {(!mobile||key==="all")&&<AppText style={[S.filterText,active&&S.filterTextActive]}>{label}</AppText>}
        </TouchableOpacity>;
      })}
    </View>
  </View>;

  const empty=<View style={[S.empty,mobile&&S.emptyMobile]}>
    <View style={S.emptyIcon}><Ionicons name={search?"search-outline":"water-outline"} size={28} color={C.greenDark}/></View>
    <AppText style={S.emptyTitle}>{search?"No customers found":"No deliveries for this date"}</AppText>
    <AppText style={S.emptySub}>{search?"Try another customer name.":"There are no active subscriptions available for the selected date."}</AppText>
    {!!search&&<TouchableOpacity style={S.emptyButton} onPress={()=>setSearch("")}>
      <Ionicons name="close" size={17} color="#fff"/><AppText style={S.emptyButtonText}>Clear Search</AppText>
    </TouchableOpacity>}
  </View>;

  const header=<View>
    <Header date={selectedDate} isMobile={mobile} count={filtered.length}/>
    <DateCard date={selectedDate} isMobile={mobile}
      onPrev={()=>setSelectedDate(addDays(selectedDate,-1))}
      onNext={()=>setSelectedDate(next)} onToday={()=>setSelectedDate(today)} onPick={()=>setPickerVisible(true)} nextDisabled={nextDisabled}/>

    <View style={[S.overview,mobile&&S.overviewMobile]}>
      <View style={S.overviewTop}>
        <View style={S.overviewTitleWrap}>
          <View style={S.overviewIcon}><Ionicons name="analytics-outline" size={17} color={C.greenDark}/></View>
          <View><AppText style={S.overviewTitle}>Delivery overview</AppText><AppText style={S.overviewSub}>{short(selectedDate)}</AppText></View>
        </View>
        <View style={S.litre}><Ionicons name="water-outline" size={14} color={C.greenDark}/>
          <AppText style={S.litreText}>{totals.delivered.toFixed(2)} L delivered</AppText></View>
      </View>
      <View style={S.overviewStats}>
        <View style={S.overStat}><AppText style={S.overValue}>{totals.expected.toFixed(2)} L</AppText><AppText style={S.overLabel}>Expected</AppText></View>
        <View style={S.overDivider}/><View style={S.overStat}><AppText style={[S.overValue,{color:C.greenDark}]}>{totals.delivered.toFixed(2)} L</AppText><AppText style={S.overLabel}>Delivered</AppText></View>
        <View style={S.overDivider}/><View style={S.overStat}><AppText style={[S.overValue,{color:C.danger}]}>{missedCount}</AppText><AppText style={S.overLabel}>Missed</AppText></View>
      </View>
    </View>

    <View style={S.sectionHeader}>
      <View><AppText style={S.sectionTitle}>Today's deliveries</AppText><AppText style={S.sectionSub}>{filtered.length} customer{filtered.length===1?"":"s"} shown</AppText></View>
      <View style={S.countBadge}><AppText style={S.countBadgeText}>{deliveredCount} delivered</AppText></View>
    </View>
    {Toolbar()}
  </View>;

  const footer=<View style={[S.summary,mobile&&S.summaryMobile]}>
    <View style={S.summaryHead}>
      <View style={S.summaryIcon}><Ionicons name="bar-chart-outline" size={18} color={C.greenDark}/></View>
      <View style={S.summaryTitleWrap}><AppText style={S.summaryTitle}>Month summary</AppText><AppText style={S.summarySub}>{monthKey}</AppText></View>
      <View style={S.percent}><AppText style={S.percentValue}>{monthSummary.percent}%</AppText><AppText style={S.percentLabel}>delivered</AppText></View>
    </View>
    <View style={S.metrics}>
      <View style={S.metric}><AppText style={S.metricLabel}>PLANNED</AppText><AppText style={S.metricValue}>{monthSummary.planned.toFixed(2)} L</AppText></View>
      <View style={S.metric}><AppText style={S.metricLabel}>DELIVERED</AppText><AppText style={[S.metricValue,{color:C.greenDark}]}>{monthSummary.delivered.toFixed(2)} L</AppText></View>
      <View style={S.metric}><AppText style={S.metricLabel}>MISSED</AppText><AppText style={[S.metricValue,{color:C.danger}]}>{monthSummary.missed.toFixed(2)} L</AppText></View>
    </View>
    <View style={S.progress}><View style={[S.progressFill,{width:`${Math.min(Math.max(monthSummary.percent,0),100)}%`}]}/></View>
  </View>;

  return <SafeAreaView style={S.safe} edges={mobile?["top"]:[]}>
    <CalendarPicker visible={pickerVisible} date={selectedDate} onClose={()=>setPickerVisible(false)} onSelect={setSelectedDate}/>
    <FlatList
      style={{backgroundColor:C.background}}
      key={desktop?"desktop":"mobile"} data={filtered}
      keyExtractor={i=>i.id} numColumns={desktop?2:1}
      columnWrapperStyle={desktop?S.columns:undefined}
      renderItem={({item})=>{
        const missed=missedDeliveries.some(d=>d.customerId===item.customerId);
        const active=activeOn(item,selectedDate);
        return <DeliveryCard item={item} missed={missed} active={active} mobile={mobile}
          onToggle={()=>toggleDelivery(item.customerId)}/>;
      }}
      ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[S.content,mobile&&S.contentMobile]}
    />
  </SafeAreaView>;
}

const S=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.greenDeep},
  pickerOverlay:{flex:1,backgroundColor:"rgba(23,35,27,0.48)",alignItems:"center",justifyContent:"center",padding:18},
  pickerCard:{width:"100%",maxWidth:430,backgroundColor:C.white,borderRadius:22,padding:18,borderWidth:1,borderColor:C.border,shadowColor:"#000",shadowOffset:{width:0,height:8},shadowOpacity:.15,shadowRadius:24,elevation:8},
  pickerHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingBottom:14,borderBottomWidth:1,borderBottomColor:"#EDF1EC"},
  pickerHeaderText:{flex:1,minWidth:0},pickerEyebrow:{fontSize:8,fontWeight:"900",letterSpacing:1,color:C.muted},pickerTitle:{fontSize:17,fontWeight:"850",color:C.text,marginTop:3},
  pickerClose:{width:36,height:36,borderRadius:11,backgroundColor:C.greenSoft2,alignItems:"center",justifyContent:"center"},
  pickerMonthRow:{height:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},pickerMonth:{fontSize:15,fontWeight:"850",color:C.text},pickerNav:{width:38,height:38,borderRadius:11,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center"},
  weekRow:{flexDirection:"row",paddingBottom:7},weekText:{width:"14.2857%",textAlign:"center",fontSize:9,fontWeight:"800",color:C.muted},
  calendarGrid:{flexDirection:"row",flexWrap:"wrap"},dayCell:{width:"14.2857%",aspectRatio:1,alignItems:"center",justifyContent:"center",borderRadius:13},dayCellSelected:{backgroundColor:C.green},dayCellToday:{borderWidth:1.5,borderColor:C.green},dayCellDisabled:{opacity:.3},dayText:{fontSize:13,fontWeight:"700",color:C.text},dayTextSelected:{color:C.white,fontWeight:"900"},dayTextDisabled:{color:C.muted},
  pickerFooter:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:14,paddingTop:13,borderTopWidth:1,borderTopColor:"#EDF1EC"},todayPickerBtn:{height:42,paddingHorizontal:13,borderRadius:12,backgroundColor:C.greenSoft,flexDirection:"row",alignItems:"center"},todayPickerText:{marginLeft:6,fontSize:10.5,fontWeight:"850",color:C.greenDark},pickerCancel:{height:42,paddingHorizontal:14,borderRadius:12,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:C.border},pickerCancelText:{fontSize:10.5,fontWeight:"800",color:C.secondary},

  content:{width:"100%",maxWidth:1540,alignSelf:"center",paddingHorizontal:38,paddingTop:25,paddingBottom:70},
  contentMobile:{paddingHorizontal:14,paddingTop:12,paddingBottom:105},

  header:{minHeight:116,borderRadius:22,backgroundColor:C.white,borderWidth:1,borderColor:C.border,overflow:"hidden",marginBottom:17,position:"relative"},
  headerMobile:{minHeight:94,borderRadius:18,marginBottom:12},
  headerCircle:{position:"absolute",width:280,height:280,borderRadius:140,right:-125,top:-185,backgroundColor:C.greenSoft},
  headerInner:{flex:1,flexDirection:"row",alignItems:"center",paddingHorizontal:21,paddingVertical:18},
  pageIcon:{width:51,height:51,borderRadius:17,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:12},
  pageIconMobile:{width:43,height:43,borderRadius:14,marginRight:10},
  headerText:{flex:1,minWidth:0},
  title:{fontSize:25,fontWeight:"800",color:C.text,letterSpacing:-.7},
  titleMobile:{fontSize:20,letterSpacing:-.45},
  subtitle:{marginTop:3,fontSize:12,color:C.secondary},
  meta:{flexDirection:"row",alignItems:"center",marginTop:7},
  dot:{width:6,height:6,borderRadius:3,backgroundColor:C.green,marginRight:5},
  metaText:{fontSize:10,fontWeight:"700",color:C.secondary},
  bullet:{marginHorizontal:7,color:"#B6BDB8"},
  dateBadge:{width:58,height:58,borderRadius:17,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginLeft:12},
  dateBadgeDay:{fontSize:20,fontWeight:"900",color:C.greenDark},
  dateBadgeMonth:{fontSize:8.5,fontWeight:"800",color:C.secondary,marginTop:1},

  dateCard:{minHeight:82,backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.border,paddingHorizontal:17,paddingVertical:12,marginBottom:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  dateCardMobile:{minHeight:72,borderRadius:17,paddingHorizontal:12},
  dateInfo:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center"},
  dateIcon:{width:44,height:44,borderRadius:14,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:11},
  dateIconMobile:{width:39,height:39,borderRadius:12,marginRight:9},
  dateText:{flex:1,minWidth:0}, eyebrow:{color:C.muted,fontSize:8.5,fontWeight:"900",letterSpacing:.9},
  dateTitle:{color:C.text,fontSize:18,fontWeight:"800",marginTop:2},dateTitleMobile:{fontSize:14.5},
  dateControls:{flexDirection:"row",alignItems:"center",marginLeft:8},
  navBtn:{width:38,height:38,borderRadius:11,backgroundColor:C.greenSoft2,alignItems:"center",justifyContent:"center"},
  todayBtn:{height:38,paddingHorizontal:12,borderRadius:11,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginHorizontal:6},
  todayText:{color:C.greenDark,fontSize:10.5,fontWeight:"800"},disabled:{opacity:.45},

  overview:{backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.border,padding:15,marginBottom:17},
  overviewMobile:{borderRadius:17,padding:13,marginBottom:14},
  overviewTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  overviewTitleWrap:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center"},
  overviewIcon:{width:35,height:35,borderRadius:11,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:9},
  overviewTitle:{color:C.text,fontSize:13,fontWeight:"850"},overviewSub:{color:C.muted,fontSize:9,marginTop:2},
  litre:{height:32,paddingHorizontal:9,borderRadius:10,backgroundColor:C.greenSoft2,flexDirection:"row",alignItems:"center",marginLeft:8},
  litreText:{marginLeft:5,color:C.greenDark,fontSize:9.5,fontWeight:"800"},
  overviewStats:{flexDirection:"row",alignItems:"center",marginTop:13,paddingTop:12,borderTopWidth:1,borderTopColor:"#EDF1EC"},
  overStat:{flex:1,alignItems:"center"},overValue:{color:C.text,fontSize:18,fontWeight:"900"},overLabel:{marginTop:2,color:C.muted,fontSize:8.5,fontWeight:"700"},
  overDivider:{width:1,height:28,backgroundColor:C.border},

  sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:11},
  sectionTitle:{color:C.text,fontSize:17,fontWeight:"850",letterSpacing:-.3},sectionSub:{color:C.muted,fontSize:10,marginTop:2},
  countBadge:{height:30,paddingHorizontal:10,borderRadius:10,backgroundColor:C.greenSoft,justifyContent:"center"},
  countBadgeText:{color:C.greenDark,fontSize:9,fontWeight:"800"},

  toolbar:{flexDirection:"row",marginBottom:13},toolbarMobile:{flexDirection:"column",marginBottom:12},
  searchBox:{flex:1,height:48,borderRadius:14,backgroundColor:C.white,borderWidth:1,borderColor:C.border,paddingHorizontal:13,flexDirection:"row",alignItems:"center"},
  searchInput:{flex:1,minWidth:0,height:"100%",marginLeft:8,fontSize:12.5,color:C.text,outlineStyle:"none"},
  filters:{flexDirection:"row",alignItems:"center",marginLeft:8},filter:{minWidth:43,height:48,paddingHorizontal:10,borderRadius:14,backgroundColor:C.white,borderWidth:1,borderColor:C.border,marginLeft:6,flexDirection:"row",alignItems:"center",justifyContent:"center"},
  filterActive:{backgroundColor:C.greenSoft,borderColor:"#CFE5C8"},filterText:{marginLeft:5,color:C.secondary,fontSize:10,fontWeight:"750"},filterTextActive:{color:C.greenDark,fontWeight:"850"},

  columns:{marginHorizontal:-5,marginBottom:12},
  card:{flex:1,minWidth:0,backgroundColor:C.white,borderRadius:18,borderWidth:1,borderColor:C.border,padding:16,marginHorizontal:5,shadowColor:"#29442D",shadowOffset:{width:0,height:3},shadowOpacity:.035,shadowRadius:9,elevation:1},
  cardMobile:{width:"100%",marginHorizontal:0,marginBottom:11,padding:14,borderRadius:17},
  cardDelivered:{borderLeftWidth:3,borderLeftColor:C.green},cardMissed:{borderLeftWidth:3,borderLeftColor:C.danger},
  cardTop:{flexDirection:"row",alignItems:"center"},avatar:{width:49,height:49,borderRadius:15,alignItems:"center",justifyContent:"center",marginRight:11},
  avatarDelivered:{backgroundColor:C.greenSoft},avatarMissed:{backgroundColor:C.dangerSoft},avatarText:{fontSize:14,fontWeight:"900"},
  identity:{flex:1,minWidth:0},nameRow:{flexDirection:"row",alignItems:"center",minWidth:0},customerName:{flexShrink:1,color:C.text,fontSize:15,fontWeight:"850",marginRight:6},
  pill:{flexDirection:"row",alignItems:"center",paddingHorizontal:6,paddingVertical:3,borderRadius:20},pillDelivered:{backgroundColor:C.greenSoft},pillMissed:{backgroundColor:C.dangerSoft},
  pillDot:{width:5,height:5,borderRadius:3,marginRight:4},pillText:{fontSize:8,fontWeight:"900"},description:{marginTop:3,color:C.muted,fontSize:9.5},
  details:{marginTop:15,paddingTop:12,borderTopWidth:1,borderTopColor:"#EDF1EC"},
  detail:{flexDirection:"row",alignItems:"center",marginBottom:9},detailIcon:{width:31,height:31,borderRadius:10,backgroundColor:C.greenSoft2,alignItems:"center",justifyContent:"center",marginRight:8},
  detailText:{flex:1,minWidth:0},detailLabel:{color:C.muted,fontSize:7.5,fontWeight:"900",letterSpacing:.6},detailValue:{color:C.text,fontSize:11.5,fontWeight:"750",marginTop:2},
  actions:{marginTop:4,paddingTop:12,borderTopWidth:1,borderTopColor:"#EDF1EC",flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  hint:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center",marginRight:8},hintText:{marginLeft:5,fontSize:8.5,fontWeight:"750"},
  toggle:{minWidth:105,height:36,borderRadius:18,paddingHorizontal:6,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  toggleOn:{backgroundColor:C.greenSoft,borderWidth:1,borderColor:"#CFE5C8"},toggleOff:{backgroundColor:C.dangerSoft,borderWidth:1,borderColor:"#F0D0D0"},
  toggleText:{fontSize:9,fontWeight:"850",marginHorizontal:5},toggleTextOn:{color:C.greenDark},toggleTextOff:{color:C.danger},
  thumb:{width:24,height:24,borderRadius:12},thumbOn:{backgroundColor:C.green},thumbOff:{backgroundColor:C.danger},

  summary:{backgroundColor:C.white,borderRadius:20,borderWidth:1,borderColor:C.border,padding:16,marginTop:17},
  summaryMobile:{borderRadius:18,padding:14,marginTop:12},summaryHead:{flexDirection:"row",alignItems:"center"},
  summaryIcon:{width:40,height:40,borderRadius:13,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginRight:9},
  summaryTitleWrap:{flex:1,minWidth:0},summaryTitle:{color:C.text,fontSize:14,fontWeight:"850"},summarySub:{color:C.muted,fontSize:9,marginTop:2},
  percent:{minWidth:64,height:40,borderRadius:12,backgroundColor:C.greenSoft2,alignItems:"center",justifyContent:"center"},percentValue:{color:C.greenDark,fontSize:13,fontWeight:"900"},percentLabel:{color:C.muted,fontSize:7,fontWeight:"750"},
  metrics:{flexDirection:"row",marginTop:15,paddingTop:13,borderTopWidth:1,borderTopColor:"#EDF1EC"},metric:{flex:1,alignItems:"center"},
  metricLabel:{color:C.muted,fontSize:7.5,fontWeight:"900",letterSpacing:.6},metricValue:{color:C.text,fontSize:16,fontWeight:"900",marginTop:3},
  progress:{height:7,borderRadius:5,backgroundColor:"#EDF1EC",overflow:"hidden",marginTop:14},progressFill:{height:"100%",borderRadius:5,backgroundColor:C.green},

  empty:{minHeight:280,borderRadius:20,backgroundColor:C.white,borderWidth:1,borderColor:C.border,alignItems:"center",justifyContent:"center",paddingHorizontal:25},
  emptyMobile:{minHeight:250,borderRadius:18,paddingHorizontal:20},emptyIcon:{width:64,height:64,borderRadius:21,backgroundColor:C.greenSoft,alignItems:"center",justifyContent:"center",marginBottom:13},
  emptyTitle:{color:C.text,fontSize:17,fontWeight:"850",textAlign:"center"},emptySub:{maxWidth:440,marginTop:6,color:C.secondary,fontSize:11.5,lineHeight:17,textAlign:"center"},
  emptyButton:{height:42,paddingHorizontal:16,borderRadius:12,backgroundColor:C.green,flexDirection:"row",alignItems:"center",marginTop:16},emptyButtonText:{marginLeft:6,color:"#fff",fontSize:11,fontWeight:"800"},
});
