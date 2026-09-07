import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";

import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

/* =========================================================
   CUSTOMER-SCREEN BRAND COLORS
   Kept intentionally aligned with CustomersScreen.
========================================================= */

const COLORS = {
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

  inactive: "#EEF1EF",
};

/* =========================================================
   DATE HELPERS
========================================================= */

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDaysInMonth = (year, month) =>
  new Date(year, month, 0).getDate();

const getDateKey = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const monthKeyFrom = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}`;

const monthLabel = (year, month) =>
  new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

const isSameMonth = (year, month, date = new Date()) =>
  year === date.getFullYear() &&
  month === date.getMonth() + 1;

const todayStr = getLocalDateKey();

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText style={styles.legendText}>{label}</AppText>
    </View>
  );
}

function StatCard({ icon, label, value, tone, isMobile = false }) {
  const toneStyle =
    tone === "green"
      ? styles.statGreen
      : tone === "red"
      ? styles.statRed
      : tone === "amber"
      ? styles.statAmber
      : styles.statGray;

  const iconColor =
    tone === "red"
      ? COLORS.danger
      : tone === "amber"
      ? COLORS.warning
      : tone === "gray"
      ? COLORS.secondary
      : COLORS.greenDark;

  return (
    <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
      <View style={[styles.statIcon, toneStyle]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.statContent}>
        <AppText style={styles.statLabel}>{label}</AppText>
        <AppText style={styles.statValue}>{value}</AppText>
      </View>
    </View>
  );
}

function CalendarDay({ item, isToday, isMobile }) {
  if (item.blank) {
    return (
      <View style={[styles.dayCell, isMobile && styles.dayCellMobile]}>
        <View style={styles.blankDay} />
      </View>
    );
  }

  const stateStyle = item.expired
    ? styles.dayExpired
    : item.missed
    ? styles.dayMissed
    : item.disabled
    ? styles.dayFuture
    : styles.dayDelivered;

  const textStyle = item.expired
    ? styles.dayTextExpired
    : item.disabled
    ? styles.dayTextDisabled
    : styles.dayText;

  return (
    <View style={[styles.dayCell, isMobile && styles.dayCellMobile]}>
      <View
        style={[
          styles.dayBox,
          isMobile && styles.dayBoxMobile,
          stateStyle,
          isToday && styles.dayToday,
        ]}
      >
        <AppText
          style={[
            textStyle,
            isMobile && styles.dayTextMobile,
          ]}
        >
          {item.day}
        </AppText>

        {!item.disabled && !item.expired && (
          <View
            style={[
              styles.dayStatusDot,
              item.missed
                ? styles.dayStatusDotMissed
                : styles.dayStatusDotDelivered,
              isMobile && styles.dayStatusDotMobile,
            ]}
          />
        )}

        {isToday && (
          <View
            pointerEvents="none"
            style={[
              styles.todayRing,
              isMobile && styles.todayRingMobile,
            ]}
          />
        )}
      </View>
    </View>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function CalendarScreen() {
  const { width } = useWindowDimensions();

  const isMobile = width < 700;
  const isDesktop = width >= 1050;

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(
    new Date().getMonth() + 1
  );

  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState(null);
  const [deliveries, setDeliveries] = useState([]);

  const [customerModal, setCustomerModal] =
    useState(false);
  const [search, setSearch] = useState("");

  const monthKey = monthKeyFrom(year, month);

  /* =======================================================
     SUBSCRIPTIONS
  ======================================================= */

  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "subscriptions"),
        where("month", "==", monthKey)
      ),
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => {
            const data = item.data();

            return {
              id: item.id,
              customerId: data.customerId,
              customerName: data.customerName,
              endDate: data.endDate,
            };
          })
          .sort((a, b) =>
            String(a.customerName || "").localeCompare(
              String(b.customerName || "")
            )
          );

        setSubscriptions(list);
        setSelectedCustomer(null);
        setDeliveries([]);
      },
      (error) => {
        console.error(
          "Calendar subscriptions listener error:",
          error
        );
      }
    );
  }, [monthKey]);

  /* =======================================================
     DELIVERIES
  ======================================================= */

  useEffect(() => {
    if (!selectedCustomer?.customerId) {
      setDeliveries([]);
      return undefined;
    }

    return onSnapshot(
      query(
        collection(db, "deliveries"),
        where(
          "customerId",
          "==",
          selectedCustomer.customerId
        ),
        where("date", ">=", `${monthKey}-01`),
        where("date", "<=", `${monthKey}-31`)
      ),
      (snapshot) => {
        setDeliveries(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (error) => {
        console.error(
          "Calendar deliveries listener error:",
          error
        );
      }
    );
  }, [selectedCustomer, monthKey]);

  /* =======================================================
     CALENDAR DATA
  ======================================================= */

  const daysInMonth = getDaysInMonth(year, month);

  const calendarData = useMemo(() => {
    return Array.from(
      { length: daysInMonth },
      (_, index) => {
        const day = index + 1;
        const date = getDateKey(year, month, day);

        const missed = deliveries.some(
          (delivery) =>
            delivery.date === date &&
            delivery.status === "missed"
        );

        const expired =
          Boolean(selectedCustomer?.endDate) &&
          date > selectedCustomer.endDate;

        return {
          day,
          date,
          missed,
          expired,
          disabled: date > todayStr,
        };
      }
    );
  }, [
    daysInMonth,
    year,
    month,
    deliveries,
    selectedCustomer,
  ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const calendarSummary = useMemo(() => {
    const delivered = calendarData.filter(
      (item) =>
        !item.disabled &&
        !item.expired &&
        !item.missed
    ).length;

    const missed = calendarData.filter(
      (item) =>
        !item.disabled &&
        !item.expired &&
        item.missed
    ).length;

    const expired = calendarData.filter(
      (item) => item.expired
    ).length;

    const upcoming = calendarData.filter(
      (item) => item.disabled
    ).length;

    return {
      delivered,
      missed,
      expired,
      upcoming,
      total: calendarData.length,
    };
  }, [calendarData]);

  /* =======================================================
     CUSTOMER SEARCH
  ======================================================= */

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return subscriptions;

    return subscriptions.filter((customer) =>
      String(customer.customerName || "")
        .toLowerCase()
        .includes(term)
    );
  }, [subscriptions, search]);

  /* =======================================================
     MONTH NAVIGATION
  ======================================================= */

  const currentDate = new Date();

  const canGoNext =
    year < currentDate.getFullYear() ||
    (year === currentDate.getFullYear() &&
      month < currentDate.getMonth() + 1);

  const moveMonth = (delta) => {
    const next = new Date(year, month - 1, 1);
    next.setMonth(next.getMonth() + delta);

    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth() + 1;

    if (
      nextYear > currentDate.getFullYear() ||
      (nextYear === currentDate.getFullYear() &&
        nextMonth > currentDate.getMonth() + 1)
    ) {
      return;
    }

    setYear(nextYear);
    setMonth(nextMonth);
  };

  const goToday = () => {
    setYear(currentDate.getFullYear());
    setMonth(currentDate.getMonth() + 1);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerModal(false);
    setSearch("");
  };

  /* =======================================================
     7-COLUMN CALENDAR GRID
  ======================================================= */

  const firstDay = new Date(
    year,
    month - 1,
    1
  ).getDay();

  const gridData = useMemo(() => {
    const blanks = Array.from(
      { length: firstDay },
      (_, index) => ({
        id: `blank-${index}`,
        blank: true,
      })
    );

    return [
      ...blanks,
      ...calendarData.map((item) => ({
        ...item,
        blank: false,
      })),
    ];
  }, [firstDay, calendarData]);

  /* =======================================================
     HEADER
  ======================================================= */

  const PageHeader = () => (
    <View
      style={[
        styles.pageHeader,
        isMobile && styles.pageHeaderMobile,
      ]}
    >
      <View style={styles.headerDecoration} />

      <View style={styles.headerInner}>
        <View
          style={[
            styles.pageIcon,
            isMobile && styles.pageIconMobile,
          ]}
        >
          <Ionicons
            name="calendar"
            size={isMobile ? 21 : 24}
            color={COLORS.greenDark}
          />
        </View>

        <View style={styles.headerText}>
          <AppText
            style={[
              styles.pageTitle,
              isMobile && styles.pageTitleMobile,
            ]}
            numberOfLines={1}
          >
            Delivery Calendar
          </AppText>

          <AppText
            style={styles.pageSubtitle}
            numberOfLines={isMobile ? 2 : 1}
          >
            Track daily milk delivery, missed days and
            subscription periods
          </AppText>

          {!isMobile && (
            <View style={styles.headerMeta}>
              <View style={styles.headerDot} />

              <AppText
                style={styles.headerMetaText}
                numberOfLines={1}
              >
                {selectedCustomer
                  ? selectedCustomer.customerName
                  : "Select a customer"}
              </AppText>

              <AppText style={styles.headerBullet}>•</AppText>

              <AppText style={styles.headerMetaText}>
                {monthLabel(year, month)}
              </AppText>
            </View>
          )}
        </View>

        {!isMobile && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addButton}
            onPress={() => setCustomerModal(true)}
          >
            <Ionicons
              name="person-outline"
              size={16}
              color="#FFFFFF"
            />
            <AppText style={styles.addButtonText}>
              {selectedCustomer
                ? "Change Customer"
                : "Select Customer"}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  /* =======================================================
     MONTH CARD
  ======================================================= */

  const MonthCard = () => (
    <View
      style={[
        styles.monthCard,
        isMobile && styles.monthCardMobile,
      ]}
    >
      <View style={styles.monthInfo}>
        <View
          style={[
            styles.monthIcon,
            isMobile && styles.monthIconMobile,
          ]}
        >
          <AppText style={styles.monthIconText}>
            {String(month).padStart(2, "0")}
          </AppText>
        </View>

        <View style={styles.monthText}>
          <AppText style={styles.monthEyebrow}>
            DELIVERY MONTH
          </AppText>

          <AppText
            style={[
              styles.monthTitle,
              isMobile && styles.monthTitleMobile,
            ]}
            numberOfLines={1}
          >
            {monthLabel(year, month)}
          </AppText>
        </View>
      </View>

      <View style={styles.monthControls}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => moveMonth(-1)}
          style={styles.monthNavButton}
        >
          <Ionicons
            name="chevron-back"
            size={17}
            color={COLORS.greenDark}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={goToday}
          style={[
            styles.todayButton,
            isSameMonth(year, month) &&
              styles.todayButtonActive,
          ]}
        >
          <AppText style={styles.todayButtonText}>
            Today
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!canGoNext}
          onPress={() => moveMonth(1)}
          style={[
            styles.monthNavButton,
            !canGoNext && styles.monthNavDisabled,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={17}
            color={
              canGoNext
                ? COLORS.greenDark
                : COLORS.muted
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  /* =======================================================
     CUSTOMER SELECTOR
  ======================================================= */

  const CustomerSelector = () => (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => setCustomerModal(true)}
      style={[
        styles.customerSelector,
        isMobile && styles.customerSelectorMobile,
      ]}
    >
      <View style={styles.customerSelectorIcon}>
        <Ionicons
          name="person"
          size={17}
          color={COLORS.greenDark}
        />
      </View>

      <View style={styles.customerSelectorText}>
        <AppText style={styles.selectorLabel}>
          CUSTOMER
        </AppText>

        <AppText
          style={styles.selectorValue}
          numberOfLines={1}
        >
          {selectedCustomer
            ? selectedCustomer.customerName
            : "Select customer"}
        </AppText>
      </View>

      <View style={styles.selectorAction}>
        <AppText style={styles.selectorActionText}>
          {selectedCustomer ? "Change" : "Select"}
        </AppText>
        <Ionicons
          name="chevron-forward"
          size={15}
          color={COLORS.greenDark}
        />
      </View>
    </TouchableOpacity>
  );

  /* =======================================================
     CALENDAR CARD HEADER
  ======================================================= */

  const CalendarHeader = () => (
    <View
      style={[
        styles.calendarCardHeader,
        isMobile && styles.calendarCardHeaderMobile,
      ]}
    >
      <View style={styles.calendarHeaderText}>
        <View style={styles.calendarTitleRow}>
          <View style={styles.calendarTitleIcon}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={COLORS.greenDark}
            />
          </View>

          <AppText style={styles.calendarTitle}>
            Daily delivery
          </AppText>
        </View>

        <AppText style={styles.calendarSubtitle}>
          {selectedCustomer?.customerName} ·{" "}
          {monthLabel(year, month)}
        </AppText>
      </View>

      <View
        style={[
          styles.legend,
          isMobile && styles.legendMobile,
        ]}
      >
        <LegendItem
          color={COLORS.green}
          label="Delivered"
        />
        <LegendItem
          color={COLORS.danger}
          label="Missed"
        />
        <LegendItem
          color="#C9CFCA"
          label="Expired"
        />
        <LegendItem
          color="#E8ECE9"
          label="Upcoming"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView
        style={styles.safeArea}
        edges={isMobile ? ["top"] : []}
      >
        <FlatList
          style={{ backgroundColor: COLORS.background }}
          data={selectedCustomer ? gridData : []}
          keyExtractor={(item) =>
            item.blank ? item.id : item.date
          }
          renderItem={({ item }) => (
            <CalendarDay
              item={item}
              isToday={item.date === todayStr}
              isMobile={isMobile}
            />
          )}
          numColumns={7}
          columnWrapperStyle={[
            styles.calendarRow,
            isMobile && styles.calendarRowMobile,
          ]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            isMobile && styles.listContentMobile,
          ]}
          ListHeaderComponent={
            <View>
              <PageHeader />

              <MonthCard />

              <CustomerSelector />

              {selectedCustomer && (
                <>
                  <View
                    style={[
                      styles.statsRow,
                      isMobile && styles.statsRowMobile,
                    ]}
                  >
                    <StatCard
                      icon="checkmark-circle-outline"
                      label="DELIVERED"
                      value={calendarSummary.delivered}
                      tone="green"
                      isMobile={isMobile}
                    />

                    <StatCard
                      icon="alert-circle-outline"
                      label="MISSED"
                      value={calendarSummary.missed}
                      tone="red"
                      isMobile={isMobile}
                    />

                    <StatCard
                      icon="calendar-outline"
                      label="EXPIRED"
                      value={calendarSummary.expired}
                      tone="gray"
                      isMobile={isMobile}
                    />

                    <StatCard
                      icon="time-outline"
                      label="UPCOMING"
                      value={calendarSummary.upcoming}
                      tone="amber"
                      isMobile={isMobile}
                    />
                  </View>

                  <View
                    style={[
                      styles.calendarCard,
                      isMobile &&
                        styles.calendarCardMobile,
                    ]}
                  >
                    <CalendarHeader />

                    <View
                      style={[
                        styles.weekHeader,
                        isMobile &&
                          styles.weekHeaderMobile,
                      ]}
                    >
                      {[
                        "Sun",
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                      ].map((day) => (
                        <View
                          key={day}
                          style={styles.weekCell}
                        >
                          <AppText
                            style={[
                              styles.weekText,
                              isMobile &&
                                styles.weekTextMobile,
                            ]}
                          >
                            {isMobile
                              ? day.substring(0, 1)
                              : day}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {!selectedCustomer && (
                <View
                  style={[
                    styles.emptyState,
                    isMobile &&
                      styles.emptyStateMobile,
                  ]}
                >
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={28}
                      color={COLORS.greenDark}
                    />
                  </View>

                  <AppText style={styles.emptyTitle}>
                    Select a customer
                  </AppText>

                  <AppText style={styles.emptySubtitle}>
                    Choose a customer to view the monthly
                    delivery calendar, missed days and
                    subscription expiry.
                  </AppText>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.emptyButton}
                    onPress={() =>
                      setCustomerModal(true)
                    }
                  >
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color="#FFFFFF"
                    />
                    <AppText style={styles.emptyButtonText}>
                      Select Customer
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            selectedCustomer ? (
              <View style={styles.calendarFooter}>
                <View style={styles.footerPill}>
                  <AppText style={styles.footerText}>
                    {calendarSummary.delivered} delivered
                  </AppText>
                  <View style={styles.footerDivider} />
                  <AppText style={styles.footerText}>
                    {calendarSummary.missed} missed
                  </AppText>
                  <View style={styles.footerDivider} />
                  <AppText style={styles.footerText}>
                    {calendarSummary.expired} expired
                  </AppText>
                </View>
              </View>
            ) : null
          }
        />

      {/* =====================================================
          CUSTOMER MODAL
      ===================================================== */}
      <Modal
        visible={customerModal}
        transparent
        animationType={
          Platform.OS === "web" ? "fade" : "slide"
        }
        onRequestClose={() =>
          setCustomerModal(false)
        }
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() =>
              setCustomerModal(false)
            }
          />

          <View
            style={[
              styles.modalCard,
              isMobile && styles.modalCardMobile,
            ]}
          >
            {isMobile && (
              <View style={styles.modalHandle} />
            )}

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIcon}>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={COLORS.greenDark}
                  />
                </View>

                <View
                  style={styles.modalHeaderText}
                >
                  <AppText style={styles.modalTitle}>
                    Select Customer
                  </AppText>

                  <AppText
                    style={styles.modalSubtitle}
                    numberOfLines={2}
                  >
                    {subscriptions.length} customer
                    {subscriptions.length === 1
                      ? ""
                      : "s"} with a subscription in{" "}
                    {monthLabel(year, month)}
                  </AppText>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.closeButton}
                onPress={() =>
                  setCustomerModal(false)
                }
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={COLORS.secondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color={COLORS.muted}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search customer..."
                placeholderTextColor="#A0AAA4"
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.modalSearchInput}
              />

              {!!search && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.clearButton}
                  onPress={() => setSearch("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#AAB3AD"
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.customerListContent
              }
            >
              {filteredCustomers.length === 0 ? (
                <View style={styles.noCustomer}>
                  <View style={styles.noCustomerIcon}>
                    <Ionicons
                      name="search-outline"
                      size={22}
                      color={COLORS.greenDark}
                    />
                  </View>

                  <AppText
                    style={styles.noCustomerTitle}
                  >
                    No customers found
                  </AppText>

                  <AppText
                    style={styles.noCustomerText}
                  >
                    Try another name or change the
                    delivery month.
                  </AppText>
                </View>
              ) : (
                filteredCustomers.map((customer) => {
                  const active =
                    selectedCustomer?.customerId ===
                    customer.customerId;

                  return (
                    <TouchableOpacity
                      key={`${customer.customerId}-${customer.id}`}
                      activeOpacity={0.82}
                      onPress={() =>
                        selectCustomer(customer)
                      }
                      style={[
                        styles.customerRow,
                        active &&
                          styles.customerRowActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.customerAvatar,
                          active &&
                            styles.customerAvatarActive,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.customerAvatarText,
                            active &&
                              styles.customerAvatarTextActive,
                          ]}
                        >
                          {String(
                            customer.customerName ||
                              "?"
                          )
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </AppText>
                      </View>

                      <View
                        style={
                          styles.customerRowText
                        }
                      >
                        <AppText
                          style={[
                            styles.customerName,
                            active &&
                              styles.customerNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {customer.customerName}
                        </AppText>

                        <AppText
                          style={styles.customerMeta}
                          numberOfLines={1}
                        >
                          Delivery calendar
                          {customer.endDate
                            ? ` · Ends ${new Date(
                                customer.endDate
                              ).toLocaleDateString(
                                "en-IN"
                              )}`
                            : ""}
                        </AppText>
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.greenDeep,
  },

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
    paddingBottom: 105,
  },

  /* =======================================================
     PAGE HEADER
  ======================================================= */

  pageHeader: {
    minHeight: 116,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 17,
    position: "relative",
  },

  pageHeaderMobile: {
    minHeight: 94,
    borderRadius: 18,
    marginBottom: 12,
  },

  headerDecoration: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -125,
    top: -185,
    backgroundColor: COLORS.greenSoft,
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
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  pageIconMobile: {
    width: 43,
    height: 43,
    borderRadius: 14,
    marginRight: 10,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.7,
  },

  pageTitleMobile: {
    fontSize: 20,
    letterSpacing: -0.45,
  },

  pageSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.secondary,
  },

  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginRight: 5,
  },

  headerMetaText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  headerBullet: {
    marginHorizontal: 7,
    color: "#B6BDB8",
  },

  addButton: {
    height: 44,
    paddingHorizontal: 17,
    borderRadius: 13,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.greenDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },

  addButtonText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* =======================================================
     MONTH
  ======================================================= */

  monthCard: {
    minHeight: 82,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 17,
    paddingVertical: 12,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  monthCardMobile: {
    minHeight: 70,
    borderRadius: 17,
    paddingHorizontal: 12,
  },

  monthInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  monthIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  monthIconMobile: {
    width: 39,
    height: 39,
    borderRadius: 12,
    marginRight: 9,
  },

  monthIconText: {
    color: COLORS.greenDark,
    fontSize: 12,
    fontWeight: "900",
  },

  monthText: {
    flex: 1,
    minWidth: 0,
  },

  monthEyebrow: {
    color: COLORS.muted,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  monthTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },

  monthTitleMobile: {
    fontSize: 15,
  },

  monthControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  monthNavButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.greenSoft2,
    alignItems: "center",
    justifyContent: "center",
  },

  monthNavDisabled: {
    opacity: 0.45,
  },

  todayButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#F5F7F5",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },

  todayButtonActive: {
    backgroundColor: COLORS.greenSoft,
  },

  todayButtonText: {
    color: COLORS.greenDark,
    fontSize: 10.5,
    fontWeight: "800",
  },

  /* =======================================================
     CUSTOMER SELECTOR
  ======================================================= */

  customerSelector: {
    minHeight: 67,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  customerSelectorMobile: {
    minHeight: 62,
    borderRadius: 16,
    marginBottom: 12,
  },

  customerSelectorIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  customerSelectorText: {
    flex: 1,
    minWidth: 0,
  },

  selectorLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  selectorValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },

  selectorAction: {
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: COLORS.greenSoft2,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  selectorActionText: {
    color: COLORS.greenDark,
    fontSize: 9.5,
    fontWeight: "800",
    marginRight: 2,
  },

  /* =======================================================
     STATS
  ======================================================= */

  statsRow: {
    flexDirection: "row",
    marginBottom: 17,
  },

  statCard: {
    flex: 1,
    height: 82,
    minWidth: 130,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  statCardMobile: {
    flexBasis: "46%",
    minWidth: 0,
    marginHorizontal: 4,
    marginBottom: 8,
    height: 72,
    paddingHorizontal: 10,
  },

  statsRowMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 12,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  statGreen: {
    backgroundColor: COLORS.greenSoft,
  },

  statRed: {
    backgroundColor: COLORS.dangerSoft,
  },

  statAmber: {
    backgroundColor: COLORS.warningSoft,
  },

  statGray: {
    backgroundColor: COLORS.inactive,
  },

  statContent: {
    flex: 1,
    minWidth: 0,
  },

  statLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.muted,
    letterSpacing: 0.6,
  },

  statValue: {
    marginTop: 2,
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "900",
    color: COLORS.text,
  },

  /* =======================================================
     CALENDAR
  ======================================================= */

  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

  calendarCardMobile: {
    borderRadius: 18,
  },

  calendarCardHeader: {
    minHeight: 76,
    paddingHorizontal: 17,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarCardHeaderMobile: {
    minHeight: 94,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  calendarHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  calendarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  calendarTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  calendarTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "850",
  },

  calendarSubtitle: {
    color: COLORS.muted,
    fontSize: 9.5,
    marginTop: 3,
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 10,
  },

  legendMobile: {
    width: "100%",
    justifyContent: "flex-start",
    marginLeft: 0,
    marginTop: 8,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 11,
    marginVertical: 3,
  },

  legendMobileItem: {
    marginLeft: 0,
    marginRight: 12,
  },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  legendText: {
    color: COLORS.secondary,
    fontSize: 8.5,
    fontWeight: "700",
  },

  weekHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#EDF1EC",
    backgroundColor: "#F8FAF8",
    paddingHorizontal: 7,
  },

  weekHeaderMobile: {
    paddingHorizontal: 3,
  },

  weekCell: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  weekText: {
    color: COLORS.secondary,
    fontSize: 8.5,
    fontWeight: "850",
  },

  weekTextMobile: {
    fontSize: 10,
    color: COLORS.greenDark,
  },

  calendarRow: {
    paddingHorizontal: 7,
    backgroundColor: COLORS.white,
  },

  calendarRowMobile: {
    paddingHorizontal: 3,
  },

  dayCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
  },

  dayCellMobile: {
    paddingVertical: 3,
  },

  blankDay: {
    width: "92%",
    height: 86,
  },

  dayBox: {
    width: "92%",
    height: 86,
    maxWidth: 104,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    overflow: "hidden",
  },

  dayBoxMobile: {
    width: "94%",
    height: 55,
    borderRadius: 12,
    maxWidth: undefined,
  },

  dayDelivered: {
    backgroundColor: COLORS.greenSoft2,
    borderColor: "#D5E8CF",
  },

  dayMissed: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: "#F1D0D0",
  },

  dayExpired: {
    backgroundColor: COLORS.inactive,
    borderColor: "#DCE2DD",
  },

  dayFuture: {
    backgroundColor: "#FAFBFA",
    borderColor: "#E8EDE9",
  },

  dayText: {
    color: COLORS.greenDeep,
    fontSize: 16,
    fontWeight: "900",
  },

  dayTextMobile: {
    fontSize: 14,
  },

  dayTextDisabled: {
    color: "#A0AAA3",
  },

  dayTextExpired: {
    color: "#7C8780",
  },

  dayStatusDot: {
    position: "absolute",
    bottom: 10,
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  dayStatusDotMobile: {
    bottom: 6,
    width: 4,
    height: 4,
  },

  dayStatusDotDelivered: {
    backgroundColor: COLORS.green,
  },

  dayStatusDotMissed: {
    backgroundColor: COLORS.danger,
  },

  dayToday: {
    borderColor: COLORS.green,
    borderWidth: 2,
  },

  todayRing: {
    position: "absolute",
    left: 3,
    right: 3,
    top: 3,
    bottom: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(99,184,63,0.30)",
  },

  todayRingMobile: {
    borderRadius: 9,
  },

  calendarFooter: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },

  footerPill: {
    minHeight: 31,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.greenSoft2,
    borderWidth: 1,
    borderColor: "#DDEBD7",
    flexDirection: "row",
    alignItems: "center",
  },

  footerText: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: "750",
  },

  footerDivider: {
    width: 1,
    height: 13,
    backgroundColor: "#D7E2D5",
    marginHorizontal: 8,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  emptyState: {
    minHeight: 300,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    marginBottom: 10,
  },

  emptyStateMobile: {
    minHeight: 270,
    borderRadius: 18,
    paddingHorizontal: 22,
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "850",
    color: COLORS.text,
  },

  emptySubtitle: {
    maxWidth: 450,
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.secondary,
    textAlign: "center",
  },

  emptyButton: {
    height: 43,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
  },

  emptyButtonText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* =======================================================
     CUSTOMER MODAL
  ======================================================= */

  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 30, 22, 0.52)",
  },

  modalCard: {
    width: "92%",
    maxWidth: 520,
    maxHeight: "88%",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    zIndex: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },

  modalCardMobile: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    maxWidth: undefined,
    maxHeight: "88%",
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },

  modalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#DCE2DD",
    marginBottom: 13,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  modalHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  modalIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "850",
    color: COLORS.text,
  },

  modalSubtitle: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.secondary,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  modalSearchBox: {
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FBFCFB",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  modalSearchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 12.5,
    outlineStyle: "none",
  },

  clearButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  customerListContent: {
    paddingBottom: 5,
  },

  customerRow: {
    minHeight: 61,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 5,
  },

  customerRowActive: {
    backgroundColor: COLORS.greenSoft2,
    borderColor: "#D5E8CF",
  },

  customerAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.inactive,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  customerAvatarActive: {
    backgroundColor: COLORS.greenSoft,
  },

  customerAvatarText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "900",
  },

  customerAvatarTextActive: {
    color: COLORS.greenDark,
  },

  customerRowText: {
    flex: 1,
    minWidth: 0,
  },

  customerName: {
    color: "#33423A",
    fontSize: 12.5,
    fontWeight: "800",
  },

  customerNameActive: {
    color: COLORS.greenDark,
  },

  customerMeta: {
    color: COLORS.muted,
    fontSize: 9.5,
    marginTop: 3,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5CF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  radioActive: {
    borderColor: COLORS.green,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },

  noCustomer: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  noCustomerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  noCustomerTitle: {
    fontSize: 15,
    fontWeight: "850",
    color: COLORS.text,
  },

  noCustomerText: {
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 16,
    color: COLORS.secondary,
    textAlign: "center",
  },
});
