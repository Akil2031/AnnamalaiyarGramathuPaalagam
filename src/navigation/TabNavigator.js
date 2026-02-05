import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import CustomersScreen from "../screens/CustomersScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import CalendarScreen from "../screens/CalendarScreen";
import DeliveryScreen from "../screens/DeliveryScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator({
  customers,
  setCustomers,
  deliveries,
  setDeliveries,
}) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // ✅ IMPORTANT
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Customers: "people-outline",
            Subscription: "wallet-outline",
            Calendar: "calendar-outline",
            Delivery: "bicycle-outline",
          };

          return (
            <Ionicons
              name={icons[route.name]}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: "#2E7D32",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Customers">
        {() => (
          <CustomersScreen
            customers={customers}
            setCustomers={setCustomers}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Subscription">
        {() => <SubscriptionScreen customers={customers} />}
      </Tab.Screen>

      <Tab.Screen name="Calendar">
        {() => <CalendarScreen customers={customers} />}
      </Tab.Screen>

      <Tab.Screen name="Delivery">
        {() => (
          <DeliveryScreen
            customers={customers}
            deliveries={deliveries}
            setDeliveries={setDeliveries}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
