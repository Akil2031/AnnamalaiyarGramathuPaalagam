import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../firebase/firebase";
import AppText from "../components/AppText";
import COLORS from "../theme/colors";

/* ========================================================================== */
/* UI                                                                         */
/* ========================================================================== */

const UI = {
  green: "#63B83F",
  greenDark: "#4E9F30",
  greenDeep: "#367C27",
  greenSoft: "#EAF7DF",

  background: "#F3F7F1",
  card: "#FFFFFF",
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

  red: "#DC2626",
  redSoft: "#FEF0F0",

  teal: "#0F766E",
  tealSoft: "#E8F8F6",
};

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `₹${num(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function qty(value) {
  return num(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getDate(value) {
  if (!value) return null;

  if (value?.toDate) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function dateKey(date = new Date()) {
  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthKey(date = new Date()) {
  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
  ].join("-");
}

function getRecordDate(record) {
  return (
    record?.date ||
    record?.saleDateKey ||
    record?.saleDate ||
    record?.createdAt ||
    record?.updatedAt ||
    null
  );
}

function getRecordDateKey(record) {
  const raw = getRecordDate(record);

  if (!raw) return null;

  if (
    typeof raw === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
  ) {
    return raw;
  }

  const d = getDate(raw);

  return d ? dateKey(d) : null;
}

function getRecordMonthKey(record) {
  const raw = getRecordDate(record);

  if (!raw) return null;

  if (
    typeof raw === "string" &&
    /^\d{4}-\d{2}/.test(raw)
  ) {
    return raw.slice(0, 7);
  }

  const d = getDate(raw);

  return d ? monthKey(d) : null;
}

function isToday(record) {
  return (
    getRecordDateKey(record) ===
    dateKey()
  );
}

function isMonth(record, month) {
  return (
    getRecordMonthKey(record) ===
    month
  );
}

function getSubscriptionQuantity(item) {
  return num(
    item?.quantityPerDay ??
      item?.dailyQuantity ??
      item?.quantity ??
      item?.litresPerDay ??
      item?.litres ??
      0
  );
}

function getSubscriptionRate(item) {
  return num(
    item?.pricePerLitre ??
      item?.price ??
      item?.rate ??
      0
  );
}

function getSubscriptionMonthlyValue(item) {
  return (
    getSubscriptionQuantity(item) *
    getSubscriptionRate(item) *
    num(item?.plannedDays || 30)
  );
}

function getProductStock(item) {
  return num(
    item?.stockQty ??
      item?.stock ??
      item?.quantity ??
      0
  );
}

function getPurchasePrice(item) {
  return num(
    item?.purchasePrice ??
      item?.costPrice ??
      0
  );
}

function getSaleTotal(item) {
  return num(
    item?.grandTotal ??
      item?.total ??
      item?.amount ??
      0
  );
}

function getSaleMargin(item) {
  return num(
    item?.marginTotal ??
      item?.margin ??
      0
  );
}

function getExpenseAmount(item) {
  const direct = num(
    item?.amount ??
      item?.total ??
      item?.paidAmount ??
      0
  );

  if (direct !== 0) {
    return direct;
  }

  return (
    num(item?.qty) *
    num(item?.rate)
  );
}

function monthName(month) {
  const [year, m] = month.split("-");

  return new Date(
    Number(year),
    Number(m) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "short",
  });
}

function monthFullName(month) {
  const [year, m] = month.split("-");

  return new Date(
    Number(year),
    Number(m) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

/* ========================================================================== */
/* Small Chart Components                                                     */
/* ========================================================================== */

function MiniLineChart({
  data = [],
  valueKey,
  width,
  height = 150,
  lineColor = UI.greenDark,
}) {
  const values = data.map((item) =>
    num(item[valueKey])
  );

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const padding = 15;
  const chartWidth = Math.max(
    width - 30,
    260
  );

  const chartHeight = height - 30;

  const points = values.map(
    (value, index) => {
      const x =
        values.length <= 1
          ? chartWidth / 2
          : padding +
            (index /
              (values.length - 1)) *
              (chartWidth -
                padding * 2);

      const y =
        chartHeight -
        ((value - min) / range) *
          (chartHeight - 20) +
        5;

      return `${x},${y}`;
    }
  );

  return (
    <View
      style={{
        width: "100%",
        alignItems: "center",
      }}
    >
      <View
        style={[
          styles.chartBox,
          { height },
        ]}
      >
        {[0, 1, 2, 3].map(
          (row) => (
            <View
              key={row}
              style={[
                styles.chartGrid,
                {
                  top:
                    8 +
                    row *
                      ((height - 35) /
                        3),
                },
              ]}
            />
          )
        )}

        <View
          style={[
            styles.lineContainer,
            {
              width: chartWidth,
              height:
                chartHeight,
            },
          ]}
        >
          {points.length > 1 ? (
            <View
              style={[
                styles.fakeLine,
                {
                  width:
                    Math.max(
                      chartWidth - 30,
                      10
                    ),
                  height: 3,
                  backgroundColor:
                    lineColor,
                  transform: [
                    {
                      rotate: "0deg",
                    },
                  ],
                },
              ]}
            />
          ) : null}

          <View
            style={
              styles.pointRow
            }
          >
            {values.map(
              (value, index) => {
                const left =
                  values.length <=
                  1
                    ? chartWidth / 2
                    : padding +
                      (index /
                        (values.length -
                          1)) *
                        (chartWidth -
                          padding *
                            2);

                const top =
                  chartHeight -
                  ((value - min) /
                    range) *
                    (chartHeight -
                      20) +
                  5;

                return (
                  <View
                    key={index}
                    style={[
                      styles.chartPoint,
                      {
                        left:
                          left - 5,
                        top:
                          top - 5,
                        backgroundColor:
                          lineColor,
                      },
                    ]}
                  />
                );
              }
            )}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.chartLabels,
          {
            width: chartWidth,
          },
        ]}
      >
        {data.map((item) => (
          <AppText
            key={item.month}
            style={
              styles.chartLabel
            }
          >
            {item.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

function SimpleBarChart({
  data = [],
  width,
  firstKey,
  secondKey,
}) {
  const max = Math.max(
    ...data.flatMap((item) => [
      num(item[firstKey]),
      num(item[secondKey]),
    ]),
    1
  );

  const chartWidth = Math.max(
    width - 35,
    270
  );

  return (
    <View
      style={{
        width: "100%",
        alignItems: "center",
      }}
    >
      <View
        style={[
          styles.barChartArea,
          {
            width: chartWidth,
          },
        ]}
      >
        {[0, 1, 2, 3].map(
          (row) => (
            <View
              key={row}
              style={[
                styles.chartGrid,
                {
                  top:
                    row *
                    42,
                },
              ]}
            />
          )
        )}

        <View
          style={
            styles.barGroups
          }
        >
          {data.map((item) => {
            const firstHeight =
              (num(item[firstKey]) /
                max) *
              145;

            const secondHeight =
              (num(
                item[secondKey]
              ) /
                max) *
              145;

            return (
              <View
                key={item.month}
                style={
                  styles.barGroup
                }
              >
                <View
                  style={
                    styles.barPair
                  }
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height:
                          Math.max(
                            firstHeight,
                            3
                          ),
                        backgroundColor:
                          UI.green,
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.bar,
                      {
                        height:
                          Math.max(
                            secondHeight,
                            3
                          ),
                        backgroundColor:
                          UI.orange,
                      },
                    ]}
                  />
                </View>

                <AppText
                  style={
                    styles.chartLabel
                  }
                >
                  {item.label}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>

      <View
        style={
          styles.chartLegend
        }
      >
        <View
          style={
            styles.legendItem
          }
        >
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor:
                  UI.green,
              },
            ]}
          />

          <AppText
            style={
              styles.legendText
            }
          >
            Sales
          </AppText>
        </View>

        <View
          style={
            styles.legendItem
          }
        >
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor:
                  UI.orange,
              },
            ]}
          />

          <AppText
            style={
              styles.legendText
            }
          >
            Expenses
          </AppText>
        </View>
      </View>
    </View>
  );
}

/* ========================================================================== */
/* Dashboard                                                                  */
/* ========================================================================== */

export default function DashboardScreen({
  deliveries = [],
  payments = [],
  onNavigate,
}) {
  const { width } =
    useWindowDimensions();

  const mobile = width < 700;
  const tablet =
    width >= 700 && width < 1100;

  const [customers, setCustomers] =
    useState([]);

  const [
    subscriptions,
    setSubscriptions,
  ] = useState([]);

  const [
    deliveryRecords,
    setDeliveryRecords,
  ] = useState([]);

  const [dailySales, setDailySales] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [storeSales, setStoreSales] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* ------------------------------------------------------------------------ */
  /* Firestore                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let completed = 0;

    const loaded = () => {
      completed += 1;

      if (completed >= 7) {
        setLoading(false);
      }
    };

    const unsubscribers = [];

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "customers"
        ),
        (snap) => {
          setCustomers(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] customers",
            error
          );

          loaded();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "subscriptions"
        ),
        (snap) => {
          setSubscriptions(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] subscriptions",
            error
          );

          loaded();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "deliveries"
        ),
        (snap) => {
          setDeliveryRecords(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] deliveries",
            error
          );

          loaded();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "dailySales"
        ),
        (snap) => {
          setDailySales(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] dailySales",
            error
          );

          loaded();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "finance"
        ),
        (snap) => {
          setExpenses(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] finance",
            error
          );

          loaded();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "products"
        ),
        (snap) => {
          setProducts(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] products",
            error
          );

          loaded();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(
          db,
          "storeSales"
        ),
        (snap) => {
          setStoreSales(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );

          loaded();
        },
        (error) => {
          console.error(
            "[Dashboard] storeSales",
            error
          );

          loaded();
        }
      )
    );

    return () => {
      unsubscribers.forEach(
        (unsubscribe) => {
          try {
            unsubscribe();
          } catch {}
        }
      );
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Delivery fallback                                                        */
  /* ------------------------------------------------------------------------ */

  const allDeliveries =
    deliveryRecords.length > 0
      ? deliveryRecords
      : Array.isArray(deliveries)
      ? deliveries
      : [];

  /* ------------------------------------------------------------------------ */
  /* Active subscriptions                                                     */
  /* ------------------------------------------------------------------------ */

  const activeSubscriptions =
    useMemo(() => {
      const current =
        monthKey();

      return subscriptions.filter(
        (subscription) => {
          if (
            subscription?.active ===
            false
          ) {
            return false;
          }

          const status =
            String(
              subscription?.status ||
                ""
            ).toLowerCase();

          if (
            [
              "inactive",
              "cancelled",
              "canceled",
              "expired",
            ].includes(status)
          ) {
            return false;
          }

          if (
            subscription?.month
          ) {
            return (
              subscription.month ===
              current
            );
          }

          return true;
        }
      );
    }, [subscriptions]);

  /* ------------------------------------------------------------------------ */
  /* Last 6 months                                                            */
  /* ------------------------------------------------------------------------ */

  const months = useMemo(() => {
    const result = [];

    const now = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      result.push(
        monthKey(d)
      );
    }

    return result;
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Monthly data                                                             */
  /* ------------------------------------------------------------------------ */

  const monthly = useMemo(() => {
    return months.map((month) => {
      const milkSales =
        dailySales
          .filter((r) =>
            isMonth(r, month)
          )
          .reduce(
            (sum, r) =>
              sum +
              num(
                r?.total ??
                  r?.amount ??
                  0
              ),
            0
          );

      const expense =
        expenses
          .filter((r) =>
            isMonth(r, month)
          )
          .reduce(
            (sum, r) =>
              sum +
              getExpenseAmount(r),
            0
          );

      const brandSales =
        storeSales
          .filter((r) =>
            isMonth(r, month)
          )
          .reduce(
            (sum, r) =>
              sum +
              getSaleTotal(r),
            0
          );

      /*
       * Subscription revenue is calculated from the currently active
       * subscriptions. Subscription records are month-specific in the
       * existing Dashboard data model, so this contributes to the
       * current month only.
       */
      const subscriptionRevenue =
        month === monthKey()
          ? activeSubscriptions.reduce(
              (sum, subscription) =>
                sum +
                getSubscriptionMonthlyValue(
                  subscription
                ),
              0
            )
          : 0;

      const totalRevenue =
        subscriptionRevenue +
        milkSales +
        brandSales;

      const brandMargin =
        storeSales
          .filter((r) =>
            isMonth(r, month)
          )
          .reduce(
            (sum, r) =>
              sum +
              getSaleMargin(r),
            0
          );

      return {
        month,
        label: monthName(month),
        subscriptionRevenue,
        milkSales,
        brandSales,
        brandMargin,
        expenses: expense,
        revenue: totalRevenue,
        net:
          totalRevenue -
          expense,
      };
    });
  }, [
    months,
    dailySales,
    expenses,
    storeSales,
    activeSubscriptions,
  ]);

  const currentMonth =
    monthKey();

  const currentMonthData =
    monthly.find(
      (item) =>
        item.month ===
        currentMonth
    ) || {
      subscriptionRevenue: 0,
      milkSales: 0,
      brandSales: 0,
      brandMargin: 0,
      expenses: 0,
      revenue: 0,
      net: 0,
    };

  /* ------------------------------------------------------------------------ */
  /* Milk overview                                                            */
  /* ------------------------------------------------------------------------ */

  const milkOverview =
    useMemo(() => {
      const dailyMilk =
        activeSubscriptions.reduce(
          (sum, subscription) =>
            sum +
            getSubscriptionQuantity(
              subscription
            ),
          0
        );

      const dailyValue =
        activeSubscriptions.reduce(
          (sum, subscription) =>
            sum +
            getSubscriptionQuantity(
              subscription
            ) *
              getSubscriptionRate(
                subscription
              ),
          0
        );

      const monthlyValue =
        activeSubscriptions.reduce(
          (sum, subscription) =>
            sum +
            getSubscriptionQuantity(
              subscription
            ) *
              getSubscriptionRate(
                subscription
              ) *
              num(
                subscription?.plannedDays ||
                  30
              ),
          0
        );

      return {
        customers:
          activeSubscriptions.length,
        dailyMilk,
        dailyValue,
        monthlyValue,
      };
    }, [activeSubscriptions]);

  /* ------------------------------------------------------------------------ */
  /* Delivery overview                                                        */
  /* ------------------------------------------------------------------------ */

  const deliveryOverview =
    useMemo(() => {
      /*
       * DeliveryScreen stores ONLY exceptions in Firestore.
       *
       * Delivered = active subscription with NO `missed` record for today.
       * Missed    = active subscription WITH a `missed` record for today.
       *
       * The previous Dashboard logic expected a positive `delivered` /
       * `completed` delivery document. That document is never created by
       * DeliveryScreen, so a successfully delivered day was incorrectly
       * shown as 0 L delivered.
       */
      const expected = milkOverview.dailyMilk;
      const expectedCustomers = activeSubscriptions.length;
      const activeCustomerIds = new Set(
        activeSubscriptions.map((s) => s?.customerId).filter(Boolean)
      );

      const todayMissed = allDeliveries.filter((delivery) => {
        const status = String(delivery?.status || '').toLowerCase();
        return (
          isToday(delivery) &&
          (status === 'missed' || delivery?.missed === true) &&
          activeCustomerIds.has(delivery?.customerId)
        );
      });

      const missedCustomerIds = new Set(
        todayMissed.map((delivery) => delivery?.customerId).filter(Boolean)
      );

      let missed = 0;
      let missedLitres = 0;

      todayMissed.forEach((delivery) => {
        missed += 1;

        let litres = num(
          delivery?.quantity ??
            delivery?.litres ??
            delivery?.qty
        );

        if (!litres) {
          const subscription = activeSubscriptions.find(
            (s) => s?.customerId === delivery?.customerId
          );
          litres = getSubscriptionQuantity(subscription);
        }

        missedLitres += litres;
      });

      /*
       * Every active subscription is considered delivered unless a missed
       * record exists for that customer/date. This matches DeliveryScreen's
       * actual persistence model exactly.
       */
      const deliveredCustomers = Math.max(
        0,
        expectedCustomers - missedCustomerIds.size
      );

      const delivered = Math.max(
        0,
        expected - missedLitres
      );

      const percentage =
        expected > 0
          ? Math.min(
              100,
              Math.round((delivered / expected) * 100)
            )
          : 0;

      return {
        expected,
        delivered,
        missed,
        percentage,
        expectedCustomers,
        deliveredCustomers,
      };
    }, [
      allDeliveries,
      activeSubscriptions,
      milkOverview.dailyMilk,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Today business                                                           */
  /* ------------------------------------------------------------------------ */

  const todayBusiness =
    useMemo(() => {
      const sales =
        dailySales.filter(
          isToday
        );

      const milkSales =
        sales.reduce(
          (sum, record) =>
            sum +
            num(
              record?.total ??
                record?.amount ??
                0
            ),
          0
        );

      const cash =
        sales.reduce(
          (sum, record) =>
            sum +
            num(record?.cash),
          0
        );

      const online =
        sales.reduce(
          (sum, record) =>
            sum +
            num(
              record?.online ??
                record?.upi ??
                record?.onlineAmount
            ),
          0
        );

      const todayExpense =
        expenses
          .filter(isToday)
          .reduce(
            (sum, record) =>
              sum +
              getExpenseAmount(
                record
              ),
            0
          );

      const brandSales =
        storeSales
          .filter(isToday)
          .reduce(
            (sum, record) =>
              sum +
              getSaleTotal(
                record
              ),
            0
          );

      const brandMargin =
        storeSales
          .filter(isToday)
          .reduce(
            (sum, record) =>
              sum +
              getSaleMargin(
                record
              ),
            0
          );

      return {
        milkSales,
        brandSales,
        brandMargin,
        sales:
          milkSales +
          brandSales,
        cash,
        online,
        expenses:
          todayExpense,
        net:
          milkSales +
          brandSales -
          todayExpense,
      };
    }, [
      dailySales,
      expenses,
      storeSales,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Inventory                                                                */
  /* ------------------------------------------------------------------------ */

  const inventory =
    useMemo(() => {
      const active =
        products.filter(
          (p) =>
            p?.active !== false
        );

      const stockUnits =
        active.reduce(
          (sum, p) =>
            sum +
            getProductStock(p),
          0
        );

      const stockValue =
        active.reduce(
          (sum, p) =>
            sum +
            getProductStock(p) *
              getPurchasePrice(
                p
              ),
          0
        );

      const lowStock =
        active.filter((p) => {
          const level = num(
            p?.lowStockLevel ??
              p?.lowStock
          );

          return (
            level > 0 &&
            getProductStock(
              p
            ) <= level
          );
        });

      return {
        count: active.length,
        stockUnits,
        stockValue,
        lowStock,
      };
    }, [products]);

  /* ------------------------------------------------------------------------ */
  /* Financial                                                                */
  /* ------------------------------------------------------------------------ */

  const financial =
    useMemo(() => {
      const revenue =
        currentMonthData.revenue;

      const expense =
        currentMonthData.expenses;

      const net =
        revenue - expense;

      const margin =
        revenue > 0
          ? (net / revenue) *
            100
          : 0;

      return {
        revenue,
        expense,
        net,
        margin,
      };
    }, [currentMonthData]);

  /* ------------------------------------------------------------------------ */
  /* Pending                                                                  */
  /* ------------------------------------------------------------------------ */

  const pendingAmount =
    useMemo(() => {
      if (
        !Array.isArray(
          payments
        )
      ) {
        return 0;
      }

      return payments
        .filter(
          (p) =>
            p?.month ===
              currentMonth &&
            !p?.paid
        )
        .reduce(
          (sum, p) =>
            sum +
            num(
              p?.amount ??
                p?.pendingAmount ??
                p?.total ??
                0
            ),
          0
        );
    }, [
      payments,
      currentMonth,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Customer growth                                                          */
  /* ------------------------------------------------------------------------ */

  const customerGrowth =
    useMemo(() => {
      return months.map(
        (month) => {
          const [year, m] =
            month.split("-");

          const end =
            new Date(
              Number(year),
              Number(m),
              0,
              23,
              59,
              59
            );

          const count =
            customers.filter(
              (customer) => {
                const created =
                  getDate(
                    customer?.createdAt
                  );

                if (!created) {
                  return false;
                }

                return (
                  created <= end
                );
              }
            ).length;

          return {
            month,
            label:
              monthName(
                month
              ),
            count,
          };
        }
      );
    }, [
      customers,
      months,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  function navigate(screen) {
    if (
      typeof onNavigate ===
      "function"
    ) {
      onNavigate(screen);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Greeting                                                                 */
  /* ------------------------------------------------------------------------ */

  const greeting = useMemo(() => {
    const hour =
      new Date().getHours();

    if (hour < 12)
      return "Good Morning";

    if (hour < 17)
      return "Good Afternoon";

    return "Good Evening";
  }, []);

  const todayLabel =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  /* ======================================================================== */
  /* Reusable components                                                      */
  /* ======================================================================== */

  function Section({
    title,
    subtitle,
    icon,
    iconBg,
    iconColor,
    onPress,
    children,
    style,
  }) {
    return (
      <View
        style={[
          styles.section,
          style,
        ]}
      >
        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionHeading
            }
          >
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    iconBg ||
                    UI.greenSoft,
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={18}
                color={
                  iconColor ||
                  UI.greenDark
                }
              />
            </View>

            <View>
              <AppText
                style={
                  styles.sectionTitle
                }
              >
                {title}
              </AppText>

              {subtitle ? (
                <AppText
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          </View>

          {onPress ? (
            <TouchableOpacity
              onPress={onPress}
              style={
                styles.viewButton
              }
            >
              <AppText
                style={
                  styles.viewButtonText
                }
              >
                View
              </AppText>

              <Ionicons
                name="chevron-forward"
                size={15}
                color={
                  UI.greenDark
                }
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {children}
      </View>
    );
  }

  function KPI({
    icon,
    label,
    value,
    subtitle,
    bg,
    color,
    screen,
  }) {
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() =>
          screen &&
          navigate(screen)
        }
        style={[
          styles.kpi,
          mobile &&
            styles.kpiMobile,
        ]}
      >
        <View
          style={[
            styles.kpiIcon,
            {
              backgroundColor:
                bg,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={21}
            color={color}
          />
        </View>

        <AppText
          style={
            styles.kpiLabel
          }
        >
          {label}
        </AppText>

        <AppText
          style={
            styles.kpiValue
          }
        >
          {value}
        </AppText>

        {subtitle ? (
          <AppText
            style={
              styles.kpiSubtitle
            }
          >
            {subtitle}
          </AppText>
        ) : null}
      </TouchableOpacity>
    );
  }

  function Metric({
    label,
    value,
    color = UI.text,
  }) {
    return (
      <View
        style={
          styles.metric
        }
      >
        <AppText
          style={
            styles.metricLabel
          }
        >
          {label}
        </AppText>

        <AppText
          style={[
            styles.metricValue,
            {
              color,
            },
          ]}
        >
          {value}
        </AppText>
      </View>
    );
  }

  /* ======================================================================== */
  /* Loading                                                                  */
  /* ======================================================================== */

  if (loading) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={UI.green}
        />

        <AppText
          style={
            styles.loadingText
          }
        >
          Preparing your business
          dashboard...
        </AppText>
      </View>
    );
  }

  /* ======================================================================== */
  /* Main render                                                              */
  /* ======================================================================== */

  return (
    <FlatList
      data={[
        {
          id: "dashboard",
        },
      ]}
      keyExtractor={(item) =>
        item.id
      }
      showsVerticalScrollIndicator={
        false
      }
      style={styles.list}
      contentContainerStyle={[
        styles.container,
        mobile &&
          styles.containerMobile,
      ]}
      renderItem={() => (
        <View
          style={[
            styles.content,
            !mobile &&
              !tablet &&
              styles.contentDesktop,
          ]}
        >
          {/* ================================================================ */}
          {/* HEADER                                                            */}
          {/* ================================================================ */}

          <View
            style={[
              styles.header,
              mobile &&
                styles.headerMobile,
            ]}
          >
            <View>
              <AppText
                style={
                  styles.pageTitle
                }
              >
                {greeting}, Admin
              </AppText>

              <AppText
                style={
                  styles.pageSubtitle
                }
              >
                Your complete business
                performance at a glance
              </AppText>

              {mobile ? (
                <AppText
                  style={
                    styles.mobileDate
                  }
                >
                  {todayLabel}
                </AppText>
              ) : null}
            </View>

            {!mobile ? (
              <View
                style={
                  styles.periodBadge
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={
                    UI.greenDark
                  }
                />

                <AppText
                  style={
                    styles.periodText
                  }
                >
                  {monthFullName(
                    currentMonth
                  )}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* ================================================================ */}
          {/* KPI CARDS                                                         */}
          {/* ================================================================ */}

          <View
            style={[
              styles.kpiGrid,
              mobile &&
                styles.kpiGridMobile,
            ]}
          >
            <KPI
              icon="people-outline"
              label="CUSTOMERS"
              value={num(
                customers.length
              ).toLocaleString(
                "en-IN"
              )}
              subtitle="Registered"
              bg={UI.greenSoft}
              color={UI.greenDark}
              screen="Customers"
            />

            <KPI
              icon="repeat-outline"
              label="ACTIVE SUBSCRIPTIONS"
              value={num(
                milkOverview.customers
              ).toLocaleString(
                "en-IN"
              )}
              subtitle={`${qty(
                milkOverview.dailyMilk
              )} L / day`}
              bg={UI.blueSoft}
              color={UI.blue}
              screen="Subscription"
            />

            <KPI
              icon="water-outline"
              label="MILK / DAY"
              value={`${qty(
                milkOverview.dailyMilk
              )} L`}
              subtitle="Subscribed quantity"
              bg={UI.tealSoft}
              color={UI.teal}
              screen="Subscription"
            />

            <KPI
              icon="trending-up-outline"
              label="MONTH REVENUE"
              value={money(
                financial.revenue
              )}
              subtitle="Milk + other brand"
              bg={UI.orangeSoft}
              color={UI.orange}
              screen="DailyBusiness"
            />

            <KPI
              icon="wallet-outline"
              label="MONTH EXPENSES"
              value={money(
                financial.expense
              )}
              subtitle="All finance expenses"
              bg={UI.purpleSoft}
              color={UI.purple}
              screen="Expenses"
            />
          </View>

          {/* ================================================================ */}
          {/* SALES TREND                                                       */}
          {/* ================================================================ */}

          <View
            style={[
              styles.twoColumn,
              mobile &&
                styles.twoColumnMobile,
            ]}
          >
            <Section
              title="Revenue Trend"
              subtitle="Last 6 months"
              icon="trending-up-outline"
              iconBg={UI.greenSoft}
              iconColor={UI.greenDark}
              screen="DailyBusiness"
              onPress={() =>
                navigate(
                  "DailyBusiness"
                )
              }
              style={
                styles.chartSection
              }
            >
              <MiniLineChart
                data={monthly}
                valueKey="revenue"
                width={
                  mobile
                    ? width - 45
                    : 560
                }
                lineColor={
                  UI.greenDark
                }
              />

              <View
                style={
                  styles.summaryRow
                }
              >
                <Metric
                  label="Current Month"
                  value={money(
                    financial.revenue
                  )}
                  color={
                    UI.greenDark
                  }
                />

                <Metric
                  label="Net Business"
                  value={money(
                    financial.net
                  )}
                  color={
                    financial.net >=
                    0
                      ? UI.greenDark
                      : UI.red
                  }
                />
              </View>
            </Section>

            <Section
              title="Sales vs Expenses"
              subtitle="6-month comparison"
              icon="bar-chart-outline"
              iconBg={UI.orangeSoft}
              iconColor={UI.orange}
              onPress={() =>
                navigate(
                  "Expenses"
                )
              }
              style={
                styles.chartSection
              }
            >
              <SimpleBarChart
                data={monthly}
                firstKey="revenue"
                secondKey="expenses"
                width={
                  mobile
                    ? width - 45
                    : 560
                }
              />

              <View
                style={
                  styles.summaryRow
                }
              >
                <Metric
                  label="Revenue"
                  value={money(
                    financial.revenue
                  )}
                  color={
                    UI.greenDark
                  }
                />

                <Metric
                  label="Expenses"
                  value={money(
                    financial.expense
                  )}
                  color={
                    UI.red
                  }
                />
              </View>
            </Section>
          </View>

          {/* ================================================================ */}
          {/* DELIVERY + FINANCIAL                                             */}
          {/* ================================================================ */}

          <View
            style={[
              styles.twoColumn,
              mobile &&
                styles.twoColumnMobile,
            ]}
          >
            <Section
              title="Milk Delivery Performance"
              subtitle="Today's delivery status"
              icon="bicycle-outline"
              iconBg={UI.greenSoft}
              iconColor={UI.greenDark}
              onPress={() =>
                navigate(
                  "Delivery"
                )
              }
              style={
                styles.flexSection
              }
            >
              <View
                style={
                  styles.deliveryHero
                }
              >
                <AppText
                  style={
                    styles.deliveryPercent
                  }
                >
                  {
                    deliveryOverview.percentage
                  }%
                </AppText>

                <AppText
                  style={
                    styles.deliveryCaption
                  }
                >
                  delivery completion
                </AppText>
              </View>

              <View
                style={
                  styles.progressTrack
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${deliveryOverview.percentage}%`,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.threeMetrics
                }
              >
                <Metric
                  label="Expected"
                  value={`${qty(
                    deliveryOverview.expected
                  )} L`}
                />

                <Metric
                  label="Delivered"
                  value={`${qty(
                    deliveryOverview.delivered
                  )} L`}
                  color={
                    UI.greenDark
                  }
                />

                <Metric
                  label="Missed"
                  value={qty(
                    deliveryOverview.missed
                  )}
                  color={
                    deliveryOverview.missed >
                    0
                      ? UI.red
                      : UI.greenDark
                  }
                />
              </View>
            </Section>

            <Section
              title="Financial Health"
              subtitle="Current month"
              icon="wallet-outline"
              iconBg={UI.blueSoft}
              iconColor={UI.blue}
              onPress={() =>
                navigate(
                  "Expenses"
                )
              }
              style={
                styles.flexSection
              }
            >
              <View
                style={
                  styles.financialHero
                }
              >
                <View>
                  <AppText
                    style={
                      styles.financialSmall
                    }
                  >
                    NET BUSINESS
                  </AppText>

                  <AppText
                    style={[
                      styles.financialBig,
                      {
                        color:
                          financial.net >=
                          0
                            ? UI.greenDark
                            : UI.red,
                      },
                    ]}
                  >
                    {money(
                      financial.net
                    )}
                  </AppText>
                </View>

                <View
                  style={
                    styles.marginBadge
                  }
                >
                  <AppText
                    style={
                      styles.marginValue
                    }
                  >
                    {financial.margin.toFixed(
                      1
                    )}%
                  </AppText>

                  <AppText
                    style={
                      styles.marginLabel
                    }
                  >
                    margin
                  </AppText>
                </View>
              </View>

              <View
                style={
                  styles.threeMetrics
                }
              >
                <Metric
                  label="Revenue"
                  value={money(
                    financial.revenue
                  )}
                  color={
                    UI.greenDark
                  }
                />

                <Metric
                  label="Expenses"
                  value={money(
                    financial.expense
                  )}
                  color={
                    UI.red
                  }
                />

                <Metric
                  label="Pending"
                  value={money(
                    pendingAmount
                  )}
                  color={
                    pendingAmount > 0
                      ? UI.orange
                      : UI.greenDark
                  }
                />
              </View>
            </Section>
          </View>

          {/* ================================================================ */}
          {/* CUSTOMER GROWTH + REVENUE MIX                                    */}
          {/* ================================================================ */}

          <View
            style={[
              styles.twoColumn,
              mobile &&
                styles.twoColumnMobile,
            ]}
          >
            <Section
              title="Customer Growth"
              subtitle="Registered customers over time"
              icon="people-outline"
              iconBg={UI.blueSoft}
              iconColor={UI.blue}
              onPress={() =>
                navigate(
                  "Customers"
                )
              }
              style={
                styles.flexSection
              }
            >
              <MiniLineChart
                data={
                  customerGrowth
                }
                valueKey="count"
                width={
                  mobile
                    ? width - 45
                    : 560
                }
                lineColor={
                  UI.blue
                }
              />

              <View
                style={
                  styles.customerFooter
                }
              >
                <AppText
                  style={
                    styles.customerFooterText
                  }
                >
                  {customers.length}{" "}
                  total registered
                  customers
                </AppText>
              </View>
            </Section>

            <Section
              title="Revenue Breakdown"
              subtitle="Current month"
              icon="pie-chart-outline"
              iconBg={UI.purpleSoft}
              iconColor={UI.purple}
              onPress={() =>
                navigate(
                  "OtherBrandProducts"
                )
              }
              style={
                styles.flexSection
              }
            >
              <View
                style={
                  styles.revenueTotal
                }
              >
                <AppText
                  style={
                    styles.revenueTotalLabel
                  }
                >
                  TOTAL REVENUE
                </AppText>

                <AppText
                  style={
                    styles.revenueTotalValue
                  }
                >
                  {money(
                    financial.revenue
                  )}
                </AppText>
              </View>

              <RevenueBreakdown
                subscription={
                  currentMonthData.subscriptionRevenue
                }
                milk={
                  currentMonthData.milkSales
                }
                other={
                  currentMonthData.brandSales
                }
              />
            </Section>
          </View>

          {/* ================================================================ */}
          {/* SUBSCRIPTIONS                                                     */}
          {/* ================================================================ */}

          <Section
            title="Subscription Overview"
            subtitle="Current milk subscription position"
            icon="repeat-outline"
            iconBg={UI.tealSoft}
            iconColor={UI.teal}
            onPress={() =>
              navigate(
                "Subscription"
              )
            }
          >
            <View
              style={[
                styles.subscriptionGrid,
                mobile &&
                  styles.subscriptionGridMobile,
              ]}
            >
              <OverviewBox
                icon="checkmark-circle-outline"
                label="Active"
                value={qty(
                  milkOverview.customers
                )}
                bg={UI.greenSoft}
                color={
                  UI.greenDark
                }
              />

              <OverviewBox
                icon="water-outline"
                label="Daily Milk"
                value={`${qty(
                  milkOverview.dailyMilk
                )} L`}
                bg={UI.blueSoft}
                color={UI.blue}
              />

              <OverviewBox
                icon="cash-outline"
                label="Daily Value"
                value={money(
                  milkOverview.dailyValue
                )}
                bg={UI.orangeSoft}
                color={UI.orange}
              />

              <OverviewBox
                icon="calendar-outline"
                label="Monthly Value"
                value={money(
                  milkOverview.monthlyValue
                )}
                bg={UI.purpleSoft}
                color={UI.purple}
              />
            </View>
          </Section>

          {/* ================================================================ */}
          {/* OTHER BRAND PRODUCTS                                              */}
          {/* ================================================================ */}

          <Section
            title="Other Brand Products"
            subtitle="Inventory, sales and margin"
            icon="cube-outline"
            iconBg={UI.purpleSoft}
            iconColor={UI.purple}
            onPress={() =>
              navigate(
                "OtherBrandProducts"
              )
            }
          >
            <View
              style={[
                styles.brandGrid,
                mobile &&
                  styles.brandGridMobile,
              ]}
            >
              <Metric
                label="Products"
                value={qty(
                  inventory.count
                )}
              />

              <Metric
                label="Stock Units"
                value={qty(
                  inventory.stockUnits
                )}
              />

              <Metric
                label="Stock Value"
                value={money(
                  inventory.stockValue
                )}
              />

              <Metric
                label="Low Stock"
                value={qty(
                  inventory.lowStock
                    .length
                )}
                color={
                  inventory.lowStock
                    .length > 0
                    ? UI.red
                    : UI.greenDark
                }
              />

              <Metric
                label="Month Sales"
                value={money(
                  currentMonthData.brandSales
                )}
                color={
                  UI.purple
                }
              />

              <Metric
                label="Month Margin"
                value={money(
                  currentMonthData.brandMargin
                )}
                color={
                  UI.greenDark
                }
              />
            </View>

            <View
              style={
                styles.inventoryHealth
              }
            >
              <View
                style={
                  styles.inventoryHeader
                }
              >
                <AppText
                  style={
                    styles.inventoryTitle
                  }
                >
                  Inventory Health
                </AppText>

                <AppText
                  style={
                    styles.inventoryPercent
                  }
                >
                  {inventory.count > 0
                    ? Math.round(
                        ((inventory.count -
                          inventory
                            .lowStock
                            .length) /
                          inventory.count) *
                          100
                      )
                    : 0}
                  %
                </AppText>
              </View>

              <View
                style={
                  styles.inventoryTrack
                }
              >
                <View
                  style={[
                    styles.inventoryFill,
                    {
                      width:
                        inventory.count >
                        0
                          ? `${Math.max(
                              0,
                              Math.min(
                                100,
                                ((inventory.count -
                                  inventory
                                    .lowStock
                                    .length) /
                                  inventory.count) *
                                  100
                              )
                            )}%`
                          : "0%",
                    },
                  ]}
                />
              </View>
            </View>
          </Section>

          {/* ================================================================ */}
          {/* ATTENTION                                                         */}
          {/* ================================================================ */}

          <Section
            title="Attention Required"
            subtitle="Items that may need action"
            icon="notifications-outline"
            iconBg={UI.yellowSoft}
            iconColor={UI.yellow}
          >
            {deliveryOverview.missed >
            0 ? (
              <AttentionRow
                icon="alert-circle-outline"
                bg={UI.redSoft}
                color={UI.red}
                title={`${qty(
                  deliveryOverview.missed
                )} deliveries missed`}
                subtitle="Review today's delivery status"
                onPress={() =>
                  navigate(
                    "Delivery"
                  )
                }
              />
            ) : null}

            {inventory.lowStock
              .length > 0 ? (
              <AttentionRow
                icon="cube-outline"
                bg={UI.yellowSoft}
                color={UI.yellow}
                title={`${qty(
                  inventory.lowStock
                    .length
                )} products running low`}
                subtitle="Review inventory and adjust stock"
                onPress={() =>
                  navigate(
                    "OtherBrandProducts"
                  )
                }
              />
            ) : null}

            {pendingAmount > 0 ? (
              <AttentionRow
                icon="cash-outline"
                bg={UI.orangeSoft}
                color={UI.orange}
                title={`${money(
                  pendingAmount
                )} pending collection`}
                subtitle="Review outstanding customer payments"
                onPress={() =>
                  navigate(
                    "Subscription"
                  )
                }
              />
            ) : null}

            {deliveryOverview.missed ===
              0 &&
            inventory.lowStock
              .length === 0 &&
            pendingAmount ===
              0 ? (
              <View
                style={
                  styles.allGood
                }
              >
                <View
                  style={
                    styles.allGoodIcon
                  }
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={25}
                    color={
                      UI.greenDark
                    }
                  />
                </View>

                <View>
                  <AppText
                    style={
                      styles.allGoodTitle
                    }
                  >
                    Everything looks good
                  </AppText>

                  <AppText
                    style={
                      styles.allGoodText
                    }
                  >
                    No urgent items require
                    your attention.
                  </AppText>
                </View>
              </View>
            ) : null}
          </Section>

          {/* ================================================================ */}
          {/* QUICK ACTIONS                                                     */}
          {/* ================================================================ */}

          <Section
            title="Quick Actions"
            subtitle="Common business tasks"
            icon="flash-outline"
            iconBg={UI.greenSoft}
            iconColor={UI.greenDark}
          >
            <View
              style={[
                styles.quickGrid,
                mobile &&
                  styles.quickGridMobile,
              ]}
            >
              <QuickAction
                icon="person-add-outline"
                label="Add Customer"
                color={
                  UI.greenDark
                }
                bg={
                  UI.greenSoft
                }
                screen="Customers"
              />

              <QuickAction
                icon="repeat-outline"
                label="New Subscription"
                color={
                  UI.blue
                }
                bg={
                  UI.blueSoft
                }
                screen="Subscription"
              />

              <QuickAction
                icon="cash-outline"
                label="Record Sale"
                color={
                  UI.orange
                }
                bg={
                  UI.orangeSoft
                }
                screen="DailyBusiness"
              />

              <QuickAction
                icon="receipt-outline"
                label="Record Expense"
                color={
                  UI.purple
                }
                bg={
                  UI.purpleSoft
                }
                screen="Expenses"
              />

              <QuickAction
                icon="cube-outline"
                label="Adjust Stock"
                color={
                  UI.purple
                }
                bg={
                  UI.purpleSoft
                }
                screen="OtherBrandProducts"
              />

              <QuickAction
                icon="bicycle-outline"
                label="Delivery"
                color={
                  UI.teal
                }
                bg={
                  UI.tealSoft
                }
                screen="Delivery"
              />
            </View>
          </Section>

          <View
            style={
              styles.bottomSpace
            }
          />
        </View>
      )}
    />
  );
}

/* ========================================================================== */
/* Revenue Breakdown                                                          */
/* ========================================================================== */

function RevenueBreakdown({
  subscription,
  milk,
  other,
}) {
  const total =
    num(subscription) +
    num(milk) +
    num(other);

  const subscriptionPercent =
    total > 0
      ? (num(subscription) /
          total) *
        100
      : 0;

  const milkPercent =
    total > 0
      ? (num(milk) /
          total) *
        100
      : 0;

  const otherPercent =
    total > 0
      ? (num(other) /
          total) *
        100
      : 0;

  return (
    <View>
      <View
        style={
          styles.revenueBar
        }
      >
        <View
          style={[
            styles.revenueSubscription,
            {
              width: `${subscriptionPercent}%`,
            },
          ]}
        />

        <View
          style={[
            styles.revenueMilk,
            {
              width: `${milkPercent}%`,
            },
          ]}
        />

        <View
          style={[
            styles.revenueOther,
            {
              width: `${otherPercent}%`,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.revenueLegend,
          styles.revenueLegendWrap,
        ]}
      >
        <View
          style={
            styles.revenueLegendItem
          }
        >
          <View
            style={[
              styles.revenueDot,
              {
                backgroundColor:
                  UI.teal,
              },
            ]}
          />

          <View>
            <AppText
              style={
                styles.revenueLabel
              }
            >
              Subscription
            </AppText>

            <AppText
              style={
                styles.revenueAmount
              }
            >
              {money(subscription)}
            </AppText>
          </View>
        </View>

        <View
          style={
            styles.revenueLegendItem
          }
        >
          <View
            style={[
              styles.revenueDot,
              {
                backgroundColor:
                  UI.green,
              },
            ]}
          />

          <View>
            <AppText
              style={
                styles.revenueLabel
              }
            >
              Milk Sales
            </AppText>

            <AppText
              style={
                styles.revenueAmount
              }
            >
              {money(milk)}
            </AppText>
          </View>
        </View>

        <View
          style={
            styles.revenueLegendItem
          }
        >
          <View
            style={[
              styles.revenueDot,
              {
                backgroundColor:
                  UI.purple,
              },
            ]}
          />

          <View>
            <AppText
              style={
                styles.revenueLabel
              }
            >
              Other Brand
            </AppText>

            <AppText
              style={
                styles.revenueAmount
              }
            >
              {money(other)}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ========================================================================== */
/* Overview Box                                                               */
/* ========================================================================== */

function OverviewBox({
  icon,
  label,
  value,
  bg,
  color,
}) {
  return (
    <View
      style={[
        styles.overviewBox,
        {
          backgroundColor:
            bg,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={color}
      />

      <AppText
        style={
          styles.overviewValue
        }
      >
        {value}
      </AppText>

      <AppText
        style={
          styles.overviewLabel
        }
      >
        {label}
      </AppText>
    </View>
  );
}

/* ========================================================================== */
/* Attention Row                                                              */
/* ========================================================================== */

function AttentionRow({
  icon,
  bg,
  color,
  title,
  subtitle,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={
        styles.attentionRow
      }
    >
      <View
        style={[
          styles.attentionIcon,
          {
            backgroundColor:
              bg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={color}
        />
      </View>

      <View
        style={
          styles.attentionContent
        }
      >
        <AppText
          style={
            styles.attentionTitle
          }
        >
          {title}
        </AppText>

        <AppText
          style={
            styles.attentionSubtitle
          }
        >
          {subtitle}
        </AppText>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          UI.secondary
        }
      />
    </TouchableOpacity>
  );
}

/* ========================================================================== */
/* Quick Action                                                               */
/* ========================================================================== */

function QuickAction({
  icon,
  label,
  color,
  bg,
  screen,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={
        styles.quickAction
      }
      onPress={() => {
        /*
         * Navigation is connected by DashboardScreen's
         * own wrapper below when the screen is rendered.
         *
         * This function intentionally dispatches a DOM-style
         * custom event only as a fallback for web.
         */
        if (
          typeof window !==
            "undefined" &&
          window.dispatchEvent
        ) {
          window.dispatchEvent(
            new CustomEvent(
              "dashboardNavigate",
              {
                detail: screen,
              }
            )
          );
        }
      }}
    >
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor:
              bg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={color}
        />
      </View>

      <AppText
        style={
          styles.quickActionText
        }
      >
        {label}
      </AppText>

      <Ionicons
        name="arrow-forward"
        size={15}
        color={
          UI.muted
        }
      />
    </TouchableOpacity>
  );
}

/* ========================================================================== */
/* Styles                                                                     */
/* ========================================================================== */

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor:
      UI.background,
  },

  container: {
    flexGrow: 1,
    backgroundColor:
      UI.background,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 36,
  },

  containerMobile: {
    paddingHorizontal: 14,
    paddingTop: 17,
    paddingBottom: 25,
  },

  content: {
    width: "100%",
    alignSelf: "center",
  },

  contentDesktop: {
    maxWidth: 1540,
  },

  /* Header */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 24,
  },

  headerMobile: {
    alignItems:
      "flex-start",
    marginBottom: 17,
  },

  pageTitle: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "800",
    color: UI.text,
    letterSpacing: -0.5,
  },

  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI.secondary,
    marginTop: 4,
  },

  mobileDate: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: UI.greenDark,
    marginTop: 7,
  },

  periodBadge: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor:
      UI.card,
    borderWidth: 1,
    borderColor:
      UI.border,
    borderRadius: 12,
  },

  periodText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: UI.secondary,
  },

  /* KPI */

  kpiGrid: {
    flexDirection:
      "row",
    gap: 14,
    marginBottom: 18,
  },

  kpiGridMobile: {
    flexWrap:
      "wrap",
    gap: 10,
    marginBottom: 14,
  },

  kpi: {
    flex: 1,
    minHeight: 137,
    padding: 17,
    backgroundColor:
      UI.card,
    borderWidth: 1,
    borderColor:
      UI.border,
    borderRadius: 16,
    shadowColor:
      "#000",
    shadowOpacity:
      0.035,
    shadowRadius:
      8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  kpiMobile: {
    flexBasis:
      "47%",
    minWidth: 0,
    minHeight: 121,
    padding: 13,
    borderRadius: 14,
  },

  kpiIcon: {
    width: 41,
    height: 41,
    borderRadius: 11,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginBottom: 10,
  },

  kpiLabel: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    color: UI.secondary,
    letterSpacing: 0.2,
  },

  kpiValue: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    color: UI.text,
    marginTop: 3,
  },

  kpiSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: UI.muted,
    marginTop: 2,
  },

  /* Sections */

  twoColumn: {
    flexDirection:
      "row",
    gap: 18,
    marginBottom: 0,
  },

  twoColumnMobile: {
    flexDirection:
      "column",
    gap: 0,
  },

  section: {
    backgroundColor:
      UI.card,
    borderWidth: 1,
    borderColor:
      UI.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    shadowColor:
      "#000",
    shadowOpacity:
      0.025,
    shadowRadius:
      7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  flexSection: {
    flex: 1,
  },

  chartSection: {
    flex: 1,
  },

  sectionHeader: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    marginBottom: 16,
  },

  sectionHeading: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 10,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  sectionTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: UI.text,
  },

  sectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.muted,
    marginTop: 1,
  },

  viewButton: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 2,
  },

  viewButtonText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: UI.greenDark,
  },

  /* Metrics */

  metric: {
    minWidth: 85,
  },

  metricLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: UI.secondary,
  },

  metricValue: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: UI.text,
    marginTop: 3,
  },

  threeMetrics: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
  },

  summaryRow: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    borderTopWidth: 1,
    borderTopColor:
      "#EEF2EE",
    paddingTop: 12,
    marginTop: 5,
  },

  /* Charts */

  chartBox: {
    width: "100%",
    position:
      "relative",
    overflow: "hidden",
  },

  chartGrid: {
    position:
      "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor:
      "#E9EEE9",
  },

  lineContainer: {
    position:
      "relative",
    alignSelf:
      "center",
  },

  fakeLine: {
    position:
      "absolute",
    left: 15,
    top: "50%",
    opacity: 0,
  },

  pointRow: {
    position:
      "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },

  chartPoint: {
    position:
      "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  chartLabels: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    paddingHorizontal: 5,
  },

  chartLabel: {
    fontSize: 10,
    lineHeight: 15,
    color: UI.muted,
  },

  barChartArea: {
    height: 170,
    position:
      "relative",
    overflow:
      "hidden",
  },

  barGroups: {
    position:
      "absolute",
    left: 8,
    right: 8,
    bottom: 0,
    height: 160,
    flexDirection:
      "row",
    justifyContent:
      "space-around",
    alignItems:
      "flex-end",
  },

  barGroup: {
    flex: 1,
    alignItems:
      "center",
  },

  barPair: {
    height: 145,
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    gap: 3,
  },

  bar: {
    width: 8,
    borderRadius: 5,
  },

  chartLegend: {
    flexDirection:
      "row",
    justifyContent:
      "center",
    gap: 20,
    marginTop: 5,
  },

  legendItem: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 6,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    fontSize: 11,
    color: UI.secondary,
  },

  /* Delivery */

  deliveryHero: {
    alignItems:
      "center",
    marginBottom: 12,
  },

  deliveryPercent: {
    fontSize: 38,
    lineHeight: 45,
    fontWeight: "800",
    color: UI.greenDark,
  },

  deliveryCaption: {
    fontSize: 12,
    lineHeight: 17,
    color: UI.secondary,
  },

  progressTrack: {
    height: 11,
    borderRadius: 11,
    backgroundColor:
      "#E9EEE8",
    overflow:
      "hidden",
    marginBottom: 16,
  },

  progressFill: {
    height: "100%",
    borderRadius: 11,
    backgroundColor:
      UI.green,
  },

  /* Finance */

  financialHero: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    backgroundColor:
      "#F7FAF7",
    borderRadius: 13,
    padding: 14,
    marginBottom: 13,
  },

  financialSmall: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    color: UI.secondary,
    letterSpacing: 0.4,
  },

  financialBig: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    marginTop: 2,
  },

  marginBadge: {
    alignItems:
      "center",
    backgroundColor:
      UI.greenSoft,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  marginValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: UI.greenDark,
  },

  marginLabel: {
    fontSize: 9,
    lineHeight: 13,
    color: UI.secondary,
  },

  /* Customer */

  customerFooter: {
    borderTopWidth: 1,
    borderTopColor:
      "#EEF2EE",
    paddingTop: 11,
    marginTop: 4,
  },

  customerFooterText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: UI.blue,
  },

  /* Revenue */

  revenueTotal: {
    alignItems:
      "center",
    marginBottom: 18,
  },

  revenueTotalLabel: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    color: UI.secondary,
    letterSpacing: 0.3,
  },

  revenueTotalValue: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: UI.text,
    marginTop: 3,
  },

  revenueBar: {
    height: 18,
    width: "100%",
    borderRadius: 12,
    overflow:
      "hidden",
    flexDirection:
      "row",
    backgroundColor:
      "#EDF1EC",
  },

  revenueSubscription: {
    height: "100%",
    backgroundColor:
      UI.teal,
  },

  revenueMilk: {
    height: "100%",
    backgroundColor:
      UI.green,
  },

  revenueOther: {
    height: "100%",
    backgroundColor:
      UI.purple,
  },

  revenueLegend: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    marginTop: 14,
  },

  revenueLegendWrap: {
    flexWrap: "wrap",
    gap: 14,
  },

  revenueLegendItem: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 8,
  },

  revenueDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  revenueLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.secondary,
  },

  revenueAmount: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: UI.text,
  },

  /* Subscription */

  subscriptionGrid: {
    flexDirection:
      "row",
    gap: 12,
  },

  subscriptionGridMobile: {
    flexWrap:
      "wrap",
  },

  overviewBox: {
    flex: 1,
    minHeight: 112,
    borderRadius: 13,
    padding: 14,
  },

  overviewValue: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    color: UI.text,
    marginTop: 8,
  },

  overviewLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.secondary,
    marginTop: 2,
  },

  /* Brand */

  brandGrid: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    gap: 12,
  },

  brandGridMobile: {
    flexWrap:
      "wrap",
  },

  inventoryHealth: {
    borderTopWidth: 1,
    borderTopColor:
      UI.border,
    paddingTop: 15,
    marginTop: 16,
  },

  inventoryHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    marginBottom: 7,
  },

  inventoryTitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: UI.secondary,
  },

  inventoryPercent: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: UI.purple,
  },

  inventoryTrack: {
    height: 9,
    borderRadius: 9,
    backgroundColor:
      "#ECEFEB",
    overflow:
      "hidden",
  },

  inventoryFill: {
    height: "100%",
    borderRadius: 9,
    backgroundColor:
      UI.purple,
  },

  /* Attention */

  attentionRow: {
    minHeight: 68,
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor:
      "#EEF2EE",
  },

  attentionIcon: {
    width: 41,
    height: 41,
    borderRadius: 11,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  attentionContent: {
    flex: 1,
  },

  attentionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: UI.text,
  },

  attentionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.secondary,
    marginTop: 2,
  },

  allGood: {
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 12,
  },

  allGoodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor:
      UI.greenSoft,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  allGoodTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: UI.text,
  },

  allGoodText: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.secondary,
    marginTop: 2,
  },

  /* Quick actions */

  quickGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 10,
  },

  quickGridMobile: {
    gap: 8,
  },

  quickAction: {
    flexBasis:
      "30%",
    flexGrow: 1,
    minHeight: 51,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor:
      UI.border,
    borderRadius: 11,
    backgroundColor:
      "#FBFCFB",
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 8,
  },

  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  quickActionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: UI.text,
  },

  /* Loading */

  loading: {
    flex: 1,
    minHeight: 500,
    backgroundColor:
      UI.background,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  loadingText: {
    fontSize: 14,
    lineHeight: 20,
    color: UI.secondary,
    marginTop: 12,
  },

  bottomSpace: {
    height: 20,
  },
});