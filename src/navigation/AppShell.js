import React, {
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  signOut,
} from "firebase/auth";

import {
  auth,
} from "../firebase/firebase";

import DashboardScreen from "../screens/DashboardScreen";
import CustomersScreen from "../screens/CustomersScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import CalendarScreen from "../screens/CalendarScreen";
import DeliveryScreen from "../screens/DeliveryScreen";


/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  background: "#F3F7F1",
  sidebar: "#FBFDF9",
  white: "#FFFFFF",

  green: "#65B83E",
  greenDark: "#4D9B2E",
  greenDeep: "#367B25",

  greenSoft: "#E9F6DF",
  greenSoft2: "#F2F9ED",

  text: "#18231C",
  secondary: "#68756D",
  muted: "#9AA49D",

  border: "#E5EBE4",

  danger: "#D95858",
  dangerSoft: "#FFF0F0",
};


/* =========================================================
   MENU
========================================================= */

const MENU_ITEMS = [
  {
    key: "Dashboard",
    label: "Dashboard",
    icon: "grid-outline",
    activeIcon: "grid",
  },

  {
    key: "Customers",
    label: "Customers",
    icon: "people-outline",
    activeIcon: "people",
  },

  {
    key: "Subscription",
    label: "Subscriptions",
    icon: "repeat-outline",
    activeIcon: "repeat",
  },

  {
    key: "Calendar",
    label: "Calendar",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },

  {
    key: "Delivery",
    label: "Delivery",
    icon: "bicycle-outline",
    activeIcon: "bicycle",
  },
];


/* =========================================================
   MOBILE MENU
========================================================= */

const MOBILE_ITEMS = [
  "Dashboard",
  "Customers",
  "Subscription",
  "Calendar",
  "Delivery",
];


/* =========================================================
   APP SHELL
========================================================= */

export default function AppShell() {
  const {
    width,
  } = useWindowDimensions();

  const isDesktop =
    Platform.OS === "web" &&
    width >= 900;

  const [
    activeScreen,
    setActiveScreen,
  ] = useState("Dashboard");

  const [
    accountOpen,
    setAccountOpen,
  ] = useState(false);


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    try {
      /*
       * Close account menu first.
       */
      setAccountOpen(false);

      /*
       * Web confirmation.
       *
       * Alert.alert can behave differently
       * on React Native Web, so use the
       * browser confirmation there.
       */
      if (Platform.OS === "web") {
        const confirmed =
          window.confirm(
            "Are you sure you want to logout?"
          );

        if (!confirmed) {
          return;
        }
      } else {
        /*
         * Mobile confirmation.
         */
        const confirmed =
          await new Promise(
            (resolve) => {
              Alert.alert(
                "Logout",
                "Are you sure you want to logout?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () =>
                      resolve(false),
                  },

                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: () =>
                      resolve(true),
                  },
                ],
                {
                  cancelable: true,
                  onDismiss: () =>
                    resolve(false),
                }
              );
            }
          );

        if (!confirmed) {
          return;
        }
      }

      /*
       * Firebase logout.
       */
      await signOut(auth);

      console.log(
        "Firebase logout successful"
      );

    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      if (Platform.OS === "web") {
        window.alert(
          "Unable to logout. Please try again."
        );
      } else {
        Alert.alert(
          "Logout failed",
          "Unable to logout. Please try again."
        );
      }
    }
  };


  /* =======================================================
     SCREEN
  ======================================================= */

  const renderScreen = () => {
    switch (activeScreen) {
      case "Customers":
        return (
          <CustomersScreen />
        );

      case "Subscription":
        return (
          <SubscriptionScreen />
        );

      case "Calendar":
        return (
          <CalendarScreen />
        );

      case "Delivery":
        return (
          <DeliveryScreen />
        );

      case "Dashboard":
      default:
        return (
          <DashboardScreen />
        );
    }
  };


  return (
    <View
      style={styles.root}
    >

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      {isDesktop && (
        <DesktopSidebar
          activeScreen={
            activeScreen
          }
          setActiveScreen={
            setActiveScreen
          }
          accountOpen={
            accountOpen
          }
          setAccountOpen={
            setAccountOpen
          }
          onLogout={
            handleLogout
          }
        />
      )}


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <View
        style={styles.main}
      >

        <View
          style={styles.content}
        >
          {renderScreen()}
        </View>


        {/* =================================================
            MOBILE ACCOUNT BUTTON
        ================================================= */}

        {!isDesktop && (
          <MobileAccount
            open={
              accountOpen
            }
            setOpen={
              setAccountOpen
            }
            onLogout={
              handleLogout
            }
          />
        )}


        {/* =================================================
            MOBILE NAVIGATION
        ================================================= */}

        {!isDesktop && (
          <MobileNavigation
            activeScreen={
              activeScreen
            }
            setActiveScreen={
              setActiveScreen
            }
          />
        )}

      </View>
    </View>
  );
}


/* =========================================================
   DESKTOP SIDEBAR
========================================================= */

function DesktopSidebar({
  activeScreen,
  setActiveScreen,
  accountOpen,
  setAccountOpen,
  onLogout,
}) {
  return (
    <View
      style={styles.sidebar}
    >

      {/* BRAND */}

      <View
        style={styles.brand}
      >

        <View
          style={styles.brandLogo}
        >
          <Ionicons
            name="water"
            size={25}
            color="#FFFFFF"
          />
        </View>

        <View>
          <Text
            style={styles.brandName}
          >
            AGP Milk
          </Text>

          <Text
            style={styles.brandTagline}
          >
            Milk Subscription
          </Text>
        </View>

      </View>


      {/* MENU */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.navigationContent
        }
      >

        <Text
          style={styles.sectionLabel}
        >
          MAIN MENU
        </Text>


        {MENU_ITEMS.map(
          (item) => {
            const active =
              activeScreen ===
              item.key;

            return (
              <TouchableOpacity
                key={
                  item.key
                }
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setActiveScreen(
                    item.key
                  )
                }
                style={[
                  styles.navItem,
                  active &&
                    styles.navItemActive,
                ]}
              >

                <View
                  style={[
                    styles.navIcon,
                    active &&
                      styles.navIconActive,
                  ]}
                >
                  <Ionicons
                    name={
                      active
                        ? item.activeIcon
                        : item.icon
                    }
                    size={19}
                    color={
                      active
                        ? COLORS.greenDark
                        : COLORS.secondary
                    }
                  />
                </View>


                <Text
                  style={[
                    styles.navText,
                    active &&
                      styles.navTextActive,
                  ]}
                >
                  {
                    item.label
                  }
                </Text>


                {active && (
                  <View
                    style={
                      styles.activeBar
                    }
                  />
                )}

              </TouchableOpacity>
            );
          }
        )}

      </ScrollView>


      {/* BOTTOM */}

      <View
        style={styles.sidebarBottom}
      >

        {/* SECURITY */}

        <View
          style={
            styles.secureCard
          }
        >

          <View
            style={
              styles.secureIcon
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color={
                COLORS.greenDark
              }
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >

            <Text
              style={
                styles.secureTitle
              }
            >
              Secure Business App
            </Text>

            <Text
              style={
                styles.secureSubtitle
              }
            >
              Your data is protected
            </Text>

          </View>

        </View>


        {/* ACCOUNT MENU */}

        {accountOpen && (
          <View
            style={
              styles.profileMenu
            }
          >

            <TouchableOpacity
              activeOpacity={
                0.75
              }
              style={
                styles.profileMenuItem
              }
              onPress={
                onLogout
              }
            >

              <View
                style={
                  styles.profileMenuIcon
                }
              >
                <Ionicons
                  name="log-out-outline"
                  size={17}
                  color={
                    COLORS.danger
                  }
                />
              </View>

              <Text
                style={
                  styles.profileLogoutText
                }
              >
                Logout
              </Text>

            </TouchableOpacity>

          </View>
        )}


        {/* PROFILE */}

        <TouchableOpacity
          activeOpacity={0.8}
          style={
            styles.profile
          }
          onPress={() =>
            setAccountOpen(
              (previous) =>
                !previous
            )
          }
        >

          <View
            style={
              styles.profileAvatar
            }
          >
            <Text
              style={
                styles.profileAvatarText
              }
            >
              A
            </Text>
          </View>


          <View
            style={
              styles.profileInfo
            }
          >

            <Text
              style={
                styles.profileName
              }
            >
              Admin
            </Text>

            <Text
              style={
                styles.profileRole
              }
            >
              Administrator
            </Text>

          </View>


          <Ionicons
            name={
              accountOpen
                ? "chevron-up"
                : "chevron-down"
            }
            size={16}
            color={
              COLORS.muted
            }
          />

        </TouchableOpacity>

      </View>
    </View>
  );
}


/* =========================================================
   MOBILE ACCOUNT
========================================================= */

function MobileAccount({
  open,
  setOpen,
  onLogout,
}) {
  return (
    <View
      pointerEvents="box-none"
      style={
        styles.mobileAccountContainer
      }
    >

      {/* ACCOUNT POPUP */}

      {open && (
        <View
          style={
            styles.mobileAccountMenu
          }
        >

          <View
            style={
              styles.mobileAccountHeader
            }
          >

            <View
              style={
                styles.mobileAccountAvatar
              }
            >
              <Text
                style={
                  styles.mobileAccountAvatarText
                }
              >
                A
              </Text>
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.mobileAccountName
                }
              >
                Admin
              </Text>

              <Text
                style={
                  styles.mobileAccountRole
                }
              >
                Administrator
              </Text>
            </View>

          </View>


          <View
            style={
              styles.mobileAccountDivider
            }
          />


          <TouchableOpacity
            activeOpacity={
              0.75
            }
            style={
              styles.mobileLogoutButton
            }
            onPress={
              onLogout
            }
          >

            <View
              style={
                styles.mobileLogoutIcon
              }
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color={
                  COLORS.danger
                }
              />
            </View>

            <Text
              style={
                styles.mobileLogoutText
              }
            >
              Logout
            </Text>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={
                COLORS.muted
              }
            />

          </TouchableOpacity>

        </View>
      )}


      {/* FLOATING ACCOUNT */}

      <TouchableOpacity
        activeOpacity={
          0.85
        }
        style={
          styles.mobileAccountButton
        }
        onPress={() =>
          setOpen(
            (previous) =>
              !previous
          )
        }
      >

        <Text
          style={
            styles.mobileAccountButtonText
          }
        >
          A
        </Text>

      </TouchableOpacity>

    </View>
  );
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function MobileNavigation({
  activeScreen,
  setActiveScreen,
}) {
  return (
    <View
      style={
        styles.mobileNav
      }
    >

      {MOBILE_ITEMS.map(
        (key) => {
          const item =
            MENU_ITEMS.find(
              (menu) =>
                menu.key ===
                key
            );

          const active =
            activeScreen ===
            key;

          return (
            <TouchableOpacity
              key={key}
              activeOpacity={
                0.8
              }
              style={
                styles.mobileItem
              }
              onPress={() =>
                setActiveScreen(
                  key
                )
              }
            >

              <View
                style={[
                  styles.mobileIcon,
                  active &&
                    styles.mobileIconActive,
                ]}
              >

                <Ionicons
                  name={
                    active
                      ? item.activeIcon
                      : item.icon
                  }
                  size={20}
                  color={
                    active
                      ? COLORS.greenDark
                      : "#9AA39C"
                  }
                />

              </View>


              <Text
                style={[
                  styles.mobileText,
                  active &&
                    styles.mobileTextActive,
                ]}
              >
                {key ===
                "Subscription"
                  ? "Plans"
                  : key}
              </Text>

            </TouchableOpacity>
          );
        }
      )}

    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    root: {
      flex: 1,
      flexDirection: "row",
      backgroundColor:
        COLORS.background,
    },

    main: {
      flex: 1,
      minWidth: 0,
      backgroundColor:
        COLORS.background,
    },

    content: {
      flex: 1,
      minWidth: 0,
    },


    /* =====================================================
       SIDEBAR
    ===================================================== */

    sidebar: {
      width: 250,
      backgroundColor:
        COLORS.sidebar,
      borderRightWidth: 1,
      borderRightColor:
        COLORS.border,
      paddingHorizontal: 14,
      paddingTop: 22,
      paddingBottom: 14,
    },

    brand: {
      height: 65,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      marginBottom: 30,
    },

    brandLogo: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor:
        COLORS.green,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    brandName: {
      fontSize: 19,
      fontWeight: "800",
      color: COLORS.text,
      letterSpacing: -0.4,
    },

    brandTagline: {
      marginTop: 2,
      fontSize: 10,
      color:
        COLORS.secondary,
    },

    navigationContent: {
      paddingBottom: 20,
    },

    sectionLabel: {
      marginLeft: 11,
      marginBottom: 10,
      fontSize: 9,
      fontWeight: "800",
      color: COLORS.muted,
      letterSpacing: 1.15,
    },

    navItem: {
      height: 50,
      borderRadius: 14,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
      position: "relative",
    },

    navItemActive: {
      backgroundColor:
        COLORS.greenSoft,
    },

    navIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    navIconActive: {
      backgroundColor:
        "#DFF2D3",
    },

    navText: {
      fontSize: 13.5,
      fontWeight: "600",
      color:
        COLORS.secondary,
    },

    navTextActive: {
      color:
        COLORS.greenDark,
      fontWeight: "800",
    },

    activeBar: {
      position: "absolute",
      right: 0,
      width: 3,
      height: 25,
      borderRadius: 3,
      backgroundColor:
        COLORS.green,
    },


    /* =====================================================
       SIDEBAR BOTTOM
    ===================================================== */

    sidebarBottom: {
      marginTop: "auto",
    },

    secureCard: {
      minHeight: 58,
      borderRadius: 15,
      backgroundColor:
        COLORS.greenSoft2,
      borderWidth: 1,
      borderColor:
        "#E0EEDB",
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
    },

    secureIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        "#E4F3DB",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    secureTitle: {
      fontSize: 10.5,
      fontWeight: "800",
      color: COLORS.text,
    },

    secureSubtitle: {
      marginTop: 2,
      fontSize: 8.5,
      color:
        COLORS.secondary,
    },

    profile: {
      minHeight: 61,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      paddingTop: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    profileAvatar: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor:
        COLORS.greenSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    profileAvatarText: {
      color:
        COLORS.greenDark,
      fontSize: 14,
      fontWeight: "800",
    },

    profileInfo: {
      flex: 1,
    },

    profileName: {
      fontSize: 12.5,
      fontWeight: "800",
      color: COLORS.text,
    },

    profileRole: {
      marginTop: 2,
      fontSize: 9.5,
      color: COLORS.muted,
    },

    profileMenu: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 13,
      padding: 5,
      marginBottom: 7,
      shadowColor:
        "#244127",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },

    profileMenuItem: {
      height: 42,
      borderRadius: 9,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
    },

    profileMenuIcon: {
      width: 29,
      height: 29,
      borderRadius: 8,
      backgroundColor:
        COLORS.dangerSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },

    profileLogoutText: {
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.danger,
    },


    /* =====================================================
       MOBILE ACCOUNT
    ===================================================== */

    mobileAccountContainer: {
      position: "absolute",
      right: 17,
      top: 17,
      zIndex: 100,
      alignItems: "flex-end",
    },

    mobileAccountButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: "center",
      justifyContent: "center",

      shadowColor:
        "#244127",

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },

    mobileAccountButtonText: {
      fontSize: 14,
      fontWeight: "850",
      color:
        COLORS.greenDark,
    },

    mobileAccountMenu: {
      width: 225,
      marginBottom: 9,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 17,
      padding: 12,

      shadowColor:
        "#244127",

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.16,
      shadowRadius: 15,
      elevation: 9,
    },

    mobileAccountHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    mobileAccountAvatar: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        COLORS.greenSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    mobileAccountAvatarText: {
      color:
        COLORS.greenDark,
      fontSize: 15,
      fontWeight: "850",
    },

    mobileAccountName: {
      fontSize: 13,
      fontWeight: "800",
      color: COLORS.text,
    },

    mobileAccountRole: {
      marginTop: 2,
      fontSize: 10,
      color:
        COLORS.secondary,
    },

    mobileAccountDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 11,
    },

    mobileLogoutButton: {
      minHeight: 43,
      borderRadius: 11,
      backgroundColor:
        COLORS.dangerSoft,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
    },

    mobileLogoutIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor:
        "#FFE4E4",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    mobileLogoutText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "800",
      color: COLORS.danger,
    },


    /* =====================================================
       MOBILE NAVIGATION
    ===================================================== */

    mobileNav: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom: 10,
      height: 68,
      borderRadius: 20,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-around",

      shadowColor:
        "#244127",

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.12,
      shadowRadius: 15,
      elevation: 8,
    },

    mobileItem: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
    },

    mobileIcon: {
      width: 33,
      height: 33,
      borderRadius: 10,
      alignItems: "center",
      justifyContent:
        "center",
    },

    mobileIconActive: {
      backgroundColor:
        COLORS.greenSoft,
    },

    mobileText: {
      marginTop: 2,
      fontSize: 9,
      color: "#959F99",
      fontWeight: "600",
    },

    mobileTextActive: {
      color:
        COLORS.greenDark,
      fontWeight: "800",
    },

  });