import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";

import AppText from "../components/AppText";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  db,
} from "../firebase/firebase";


/* =========================================================
   COLORS
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
   TOOLBAR
   Kept outside CustomersScreen so React Native Web does not
   remount the TextInput on every search keystroke.
========================================================= */

function Toolbar({
  search,
  setSearch,
  sortOrder,
  setSortOrder,
  isMobile,
}) {
  return (
    <View
      style={[
        styles.toolbar,
        isMobile && styles.toolbarMobile,
      ]}
    >
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={19}
          color={COLORS.muted}
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            isMobile
              ? "Search customers..."
              : "Search customers by name, mobile or address"
          }
          placeholderTextColor="#A0AAA4"
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.searchInput}
        />

        {search.length > 0 && (
          <TouchableOpacity
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

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.sortButton}
        onPress={() =>
          setSortOrder((current) =>
            current === "asc" ? "desc" : "asc"
          )
        }
      >
        <Ionicons
          name="swap-vertical-outline"
          size={18}
          color={COLORS.secondary}
        />

        {!isMobile && (
          <AppText style={styles.sortText}>
            Sort
          </AppText>
        )}

        <AppText style={styles.sortValue}>
          {sortOrder === "asc" ? "A–Z" : "Z–A"}
        </AppText>

        <Ionicons
          name="chevron-down"
          size={13}
          color={COLORS.secondary}
        />
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function CustomersScreen() {
  const { width, height } =
    useWindowDimensions();

  const isMobile =
    width < 700;

  const isDesktop =
    width >= 1050;

  const [customers, setCustomers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState("asc");

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [name, setName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deleteCustomerData, setDeleteCustomerData] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);


  /* =======================================================
     FIRESTORE
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "customers"
        ),
        (snapshot) => {
          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          setCustomers(data);
        },
        (error) => {
          console.error(
            "Customers listener error:",
            error
          );
        }
      );

    return unsubscribe;
  }, []);


  /* =======================================================
     STATISTICS
  ======================================================= */

  const stats = useMemo(() => {
    const total =
      customers.length;

    const active =
      customers.filter(
        (item) =>
          item.status ===
          "active"
      ).length;

    const inactive =
      total - active;

    return {
      total,
      active,
      inactive,
    };
  }, [customers]);


  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredCustomers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        customers.filter(
          (customer) => {
            if (!query) {
              return true;
            }

            const customerName =
              String(
                customer.name ||
                  ""
              ).toLowerCase();

            const customerMobile =
              String(
                customer.mobile ||
                  ""
              ).toLowerCase();

            const customerAddress =
              String(
                customer.address ||
                  ""
              ).toLowerCase();

            return (
              customerName.includes(
                query
              ) ||
              customerMobile.includes(
                query
              ) ||
              customerAddress.includes(
                query
              )
            );
          }
        );

      return result.sort(
        (a, b) => {
          const first =
            String(
              a.name || ""
            ).toLowerCase();

          const second =
            String(
              b.name || ""
            ).toLowerCase();

          return sortOrder ===
            "asc"
            ? first.localeCompare(
                second
              )
            : second.localeCompare(
                first
              );
        }
      );
    }, [
      customers,
      search,
      sortOrder,
    ]);


  /* =======================================================
     FORM
  ======================================================= */

  const resetForm = () => {
    setName("");
    setMobile("");
    setAddress("");
    setEditingId(null);
  };


  const openAddCustomer = () => {
    resetForm();
    setModalVisible(true);
  };


  const openEditCustomer =
    (customer) => {
      setEditingId(
        customer.id
      );

      setName(
        customer.name || ""
      );

      setMobile(
        customer.mobile || ""
      );

      setAddress(
        customer.address || ""
      );

      setModalVisible(true);
    };


  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    resetForm();
  };


  /* =======================================================
     SAVE
  ======================================================= */

  const saveCustomer = async () => {
    const cleanName =
      name.trim();

    const cleanMobile =
      mobile.trim();

    const cleanAddress =
      address.trim();

    if (
      !cleanName ||
      !cleanMobile ||
      !cleanAddress
    ) {
      showMessage(
        "Please complete all customer fields."
      );

      return;
    }


    const duplicate =
      customers.find(
        (customer) =>
          String(
            customer.mobile ||
              ""
          ).trim() ===
            cleanMobile &&
          customer.id !==
            editingId
      );


    if (duplicate) {
      showMessage(
        "This mobile number is already assigned to another customer."
      );

      return;
    }


    try {
      setSaving(true);

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "customers",
            editingId
          ),
          {
            name: cleanName,
            mobile: cleanMobile,
            address:
              cleanAddress,
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "customers"
          ),
          {
            name: cleanName,
            mobile: cleanMobile,
            address:
              cleanAddress,
            status: "active",
            createdAt:
              Date.now(),
          }
        );
      }

      setModalVisible(false);
      resetForm();

    } catch (error) {
      console.error(
        "Save customer error:",
        error
      );

      showMessage(
        "Unable to save the customer. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };


  /* =======================================================
     STATUS
  ======================================================= */

  const toggleStatus =
    async (customer) => {
      try {
        const nextStatus =
          customer.status ===
          "active"
            ? "inactive"
            : "active";

        await updateDoc(
          doc(
            db,
            "customers",
            customer.id
          ),
          {
            status: nextStatus,
          }
        );

      } catch (error) {
        console.error(
          "Status update error:",
          error
        );

        showMessage(
          "Unable to update customer status."
        );
      }
    };


  /* =======================================================
     DELETE
  ======================================================= */

  const requestDelete =
    (customer) => {
      /*
       * WEB
       *
       * Use native browser confirmation.
       * This avoids React Native Web Alert
       * problems.
       */
      if (
        Platform.OS ===
        "web"
      ) {
        const confirmed =
          window.confirm(
            `Delete ${customer.name}?\n\nThis customer will be permanently removed.`
          );

        if (
          confirmed
        ) {
          performDelete(
            customer
          );
        }

        return;
      }

      /*
       * MOBILE
       *
       * Show our own React Native
       * confirmation modal.
       */
      setDeleteCustomerData(
        customer
      );
    };


  const performDelete =
    async (customer) => {
      if (!customer?.id) {
        return;
      }

      try {
        setDeleting(true);

        await deleteDoc(
          doc(
            db,
            "customers",
            customer.id
          )
        );

        setDeleteCustomerData(
          null
        );

      } catch (error) {
        console.error(
          "Delete customer error:",
          error
        );

        /*
         * Keep the confirmation open
         * if deletion failed.
         */
        showMessage(
          "Unable to delete this customer. Please try again."
        );

      } finally {
        setDeleting(false);
      }
    };


  /* =======================================================
     MESSAGE
  ======================================================= */

  const showMessage =
    (message) => {
      if (
        Platform.OS ===
        "web"
      ) {
        window.alert(
          message
        );
      } else {
        /*
         * Small custom message
         * is handled below.
         */
        setDeleteCustomerData({
          __message: true,
          message,
        });
      }
    };


  /* =======================================================
     INITIALS
  ======================================================= */

  const getInitials =
    (customerName) => {
      const value =
        String(
          customerName ||
            ""
        ).trim();

      if (!value) {
        return "?";
      }

      const parts =
        value.split(
          /\s+/
        );

      if (
        parts.length ===
        1
      ) {
        return parts[0]
          .substring(0, 2)
          .toUpperCase();
      }

      return (
        parts[0][0] +
        parts[1][0]
      ).toUpperCase();
    };


  /* =======================================================
     STAT CARD
  ======================================================= */

  const StatCard = ({
    icon,
    label,
    value,
    type,
  }) => {
    const inactive =
      type ===
      "inactive";

    return (
      <View
        style={[
          styles.statCard,

          isMobile &&
            styles.statCardMobile,
        ]}
      >
        <View
          style={[
            styles.statIcon,
            inactive
              ? styles.statIconDanger
              : styles.statIconGreen,
          ]}
        >
          <Ionicons
            name={icon}
            size={
              isMobile
                ? 18
                : 20
            }
            color={
              inactive
                ? COLORS.danger
                : COLORS.greenDark
            }
          />
        </View>

        <View
          style={
            styles.statContent
          }
        >
          <AppText
            style={
              styles.statLabel
            }
          >
            {label}
          </AppText>

          <AppText
            style={
              styles.statValue
            }
          >
            {value}
          </AppText>
        </View>
      </View>
    );
  };


  /* =======================================================
     MOBILE SUMMARY
  ======================================================= */

  const MobileSummary =
    () => (
      <View
        style={
          styles.mobileSummary
        }
      >
        <View
          style={
            styles.mobileSummaryHeader
          }
        >
          <View
            style={
              styles.mobileSummaryIcon
            }
          >
            <Ionicons
              name="people"
              size={18}
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
            <AppText
              style={
                styles.mobileSummaryTitle
              }
            >
              Customer Overview
            </AppText>

            <AppText
              style={
                styles.mobileSummarySubtitle
              }
            >
              Your current customer base
            </AppText>
          </View>
        </View>

        <View
          style={
            styles.mobileSummaryStats
          }
        >
          <View
            style={
              styles.mobileSummaryItem
            }
          >
            <AppText
              style={
                styles.mobileSummaryValue
              }
            >
              {stats.total}
            </AppText>

            <AppText
              style={
                styles.mobileSummaryLabel
              }
            >
              Total
            </AppText>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.mobileSummaryItem
            }
          >
            <AppText
              style={[
                styles.mobileSummaryValue,
                {
                  color:
                    COLORS.greenDark,
                },
              ]}
            >
              {stats.active}
            </AppText>

            <AppText
              style={
                styles.mobileSummaryLabel
              }
            >
              Active
            </AppText>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.mobileSummaryItem
            }
          >
            <AppText
              style={[
                styles.mobileSummaryValue,
                {
                  color:
                    COLORS.danger,
                },
              ]}
            >
              {stats.inactive}
            </AppText>

            <AppText
              style={
                styles.mobileSummaryLabel
              }
            >
              Inactive
            </AppText>
          </View>
        </View>
      </View>
    );


  /* =======================================================
     CUSTOMER CARD
  ======================================================= */

  const CustomerCard =
    ({ item }) => {
      const active =
        item.status ===
        "active";

      return (
        <View
          style={[
            styles.customerCard,

            isMobile &&
              styles.customerCardMobile,
          ]}
        >

          {/* TOP */}

          <View
            style={
              styles.customerTop
            }
          >
            <View
              style={[
                styles.avatar,

                active
                  ? styles.avatarActive
                  : styles.avatarInactive,
              ]}
            >
              <AppText
                style={[
                  styles.avatarText,

                  active
                    ? styles.avatarTextActive
                    : styles.avatarTextInactive,
                ]}
              >
                {getInitials(
                  item.name
                )}
              </AppText>
            </View>


            <View
              style={
                styles.identity
              }
            >
              <View
                style={
                  styles.nameRow
                }
              >
                <AppText
                  style={
                    styles.customerName
                  }
                  numberOfLines={
                    1
                  }
                >
                  {item.name}
                </AppText>

                <View
                  style={[
                    styles.statusPill,

                    active
                      ? styles.activePill
                      : styles.inactivePill,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          active
                            ? COLORS.green
                            : COLORS.danger,
                      },
                    ]}
                  />

                  <AppText
                    style={[
                      styles.statusText,
                      {
                        color:
                          active
                            ? COLORS.greenDark
                            : COLORS.danger,
                      },
                    ]}
                  >
                    {active
                      ? "Active"
                      : "Inactive"}
                  </AppText>
                </View>
              </View>

              <AppText
                style={
                  styles.customerDescription
                }
              >
                Milk delivery customer
              </AppText>
            </View>


            <TouchableOpacity
              activeOpacity={
                0.75
              }
              style={
                styles.moreButton
              }
              onPress={() =>
                openEditCustomer(
                  item
                )
              }
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={17}
                color={
                  COLORS.secondary
                }
              />
            </TouchableOpacity>
          </View>


          {/* DETAILS */}

          <View
            style={
              styles.details
            }
          >
            <View
              style={
                styles.detailRow
              }
            >
              <View
                style={
                  styles.detailIcon
                }
              >
                <Ionicons
                  name="call-outline"
                  size={14}
                  color={
                    COLORS.greenDark
                  }
                />
              </View>

              <View
                style={
                  styles.detailTextArea
                }
              >
                <AppText
                  style={
                    styles.detailLabel
                  }
                >
                  MOBILE
                </AppText>

                <AppText
                  style={
                    styles.detailValue
                  }
                  numberOfLines={
                    1
                  }
                >
                  {item.mobile ||
                    "Not provided"}
                </AppText>
              </View>
            </View>


            <View
              style={
                styles.detailRow
              }
            >
              <View
                style={
                  styles.detailIcon
                }
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={
                    COLORS.greenDark
                  }
                />
              </View>

              <View
                style={
                  styles.detailTextArea
                }
              >
                <AppText
                  style={
                    styles.detailLabel
                  }
                >
                  DELIVERY ADDRESS
                </AppText>

                <AppText
                  style={
                    styles.detailValue
                  }
                  numberOfLines={
                    isMobile
                      ? 2
                      : 1
                  }
                >
                  {item.address ||
                    "Not provided"}
                </AppText>
              </View>
            </View>
          </View>


          {/* ACTIONS */}

          <View
            style={
              styles.cardActions
            }
          >
            <TouchableOpacity
              activeOpacity={
                0.75
              }
              style={
                styles.statusAction
              }
              onPress={() =>
                toggleStatus(
                  item
                )
              }
            >
              <Ionicons
                name={
                  active
                    ? "pause-circle-outline"
                    : "play-circle-outline"
                }
                size={16}
                color={
                  active
                    ? COLORS.warning
                    : COLORS.greenDark
                }
              />

              <AppText
                style={
                  styles.statusActionText
                }
              >
                {active
                  ? "Deactivate"
                  : "Activate"}
              </AppText>
            </TouchableOpacity>


            <View
              style={
                styles.actionGroup
              }
            >
              <TouchableOpacity
                activeOpacity={
                  0.75
                }
                style={
                  styles.editAction
                }
                onPress={() =>
                  openEditCustomer(
                    item
                  )
                }
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={
                    COLORS.secondary
                  }
                />

                <AppText
                  style={
                    styles.editActionText
                  }
                >
                  Edit
                </AppText>
              </TouchableOpacity>


              <TouchableOpacity
                activeOpacity={
                  0.75
                }
                style={
                  styles.deleteAction
                }
                onPress={() =>
                  requestDelete(
                    item
                  )
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={
                    COLORS.danger
                  }
                />

                <AppText
                  style={
                    styles.deleteActionText
                  }
                >
                  Delete
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    };


  /* =======================================================
     HEADER
  ======================================================= */

  const PageHeader =
    () => (
      <View
        style={[
          styles.pageHeader,

          isMobile &&
            styles.pageHeaderMobile,
        ]}
      >
        <View
          style={
            styles.headerDecoration
          }
        />

        <View
          style={
            styles.headerInner
          }
        >
          <View
            style={
              styles.pageIcon
            }
          >
            <Ionicons
              name="people"
              size={23}
              color={
                COLORS.greenDark
              }
            />
          </View>

          <View
            style={
              styles.headerText
            }
          >
            <AppText
              style={
                styles.pageTitle
              }
            >
              Customers
            </AppText>

            <AppText
              style={
                styles.pageSubtitle
              }
              numberOfLines={
                1
              }
            >
              Manage your milk delivery customers
            </AppText>

            {!isMobile && (
              <View
                style={
                  styles.headerMeta
                }
              >
                <View
                  style={
                    styles.headerDot
                  }
                />

                <AppText
                  style={
                    styles.headerMetaText
                  }
                >
                  {stats.total} customers
                </AppText>

                <AppText
                  style={
                    styles.headerBullet
                  }
                >
                  •
                </AppText>

                <AppText
                  style={
                    styles.headerMetaText
                  }
                >
                  {stats.active} active
                </AppText>
              </View>
            )}
          </View>


          {!isMobile && (
            <TouchableOpacity
              activeOpacity={
                0.85
              }
              style={
                styles.addButton
              }
              onPress={
                openAddCustomer
              }
            >
              <Ionicons
                name="add"
                size={19}
                color="#FFFFFF"
              />

              <AppText
                style={
                  styles.addButtonText
                }
              >
                Add Customer
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );


  /* =======================================================
     DIRECTORY
  ======================================================= */

  const DirectoryHeader =
    () => (
      <View
        style={
          styles.directoryHeader
        }
      >
        <View>
          <AppText
            style={
              styles.directoryTitle
            }
          >
            Customer Directory
          </AppText>

          <AppText
            style={
              styles.directorySubtitle
            }
          >
            {filteredCustomers.length}{" "}
            {filteredCustomers.length ===
            1
              ? "customer"
              : "customers"}{" "}
            shown
          </AppText>
        </View>

        {isMobile && (
          <TouchableOpacity
            activeOpacity={
              0.85
            }
            style={
              styles.smallAddButton
            }
            onPress={
              openAddCustomer
            }
          >
            <Ionicons
              name="add"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
      </View>
    );


  /* =======================================================
     EMPTY
  ======================================================= */

  const EmptyState =
    () => (
      <View
        style={
          styles.emptyState
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name={
              search
                ? "search-outline"
                : "people-outline"
            }
            size={29}
            color={
              COLORS.greenDark
            }
          />
        </View>

        <AppText
          style={
            styles.emptyTitle
          }
        >
          {search
            ? "No customers found"
            : "No customers yet"}
        </AppText>

        <AppText
          style={
            styles.emptySubtitle
          }
        >
          {search
            ? "Try another name, mobile number or address."
            : "Add your first customer to start managing milk deliveries."}
        </AppText>

        {!search && (
          <TouchableOpacity
            activeOpacity={
              0.85
            }
            style={
              styles.emptyButton
            }
            onPress={
              openAddCustomer
            }
          >
            <Ionicons
              name="add"
              size={18}
              color="#FFFFFF"
            />

            <AppText
              style={
                styles.emptyButtonText
              }
            >
              Add Customer
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    );


  /* =======================================================
     EDIT / ADD MODAL
  ======================================================= */

  const CustomerModal =
    () => (
      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType={
          isMobile
            ? "slide"
            : "fade"
        }
        onRequestClose={
          closeModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalRoot
          }
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : undefined
          }
        >
          <View
            style={
              styles.modalBackdrop
            }
          />

          <View
            style={[
              styles.modalCard,

              isMobile &&
                styles.modalCardMobile,
            ]}
          >
            {/* HANDLE */}

            {isMobile && (
              <View
                style={
                  styles.modalHandle
                }
              />
            )}

            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalHeaderLeft
                }
              >
                <View
                  style={
                    styles.modalIcon
                  }
                >
                  <Ionicons
                    name={
                      editingId
                        ? "create-outline"
                        : "person-add-outline"
                    }
                    size={21}
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
                  <AppText
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingId
                      ? "Edit Customer"
                      : "Add Customer"}
                  </AppText>

                  <AppText
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingId
                      ? "Update customer details"
                      : "Create a new customer profile"}
                  </AppText>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={
                  0.75
                }
                style={
                  styles.closeButton
                }
                onPress={
                  closeModal
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={
                    COLORS.secondary
                  }
                />
              </TouchableOpacity>
            </View>


            <ScrollView
              style={
                styles.modalScroll
              }
              contentContainerStyle={
                styles.modalScrollContent
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              <FormField
                icon="person-outline"
                label="Customer Name"
                placeholder="Enter customer name"
                value={name}
                onChangeText={
                  setName
                }
              />

              <FormField
                icon="call-outline"
                label="Mobile Number"
                placeholder="Enter mobile number"
                value={mobile}
                onChangeText={
                  setMobile
                }
                keyboardType="phone-pad"
              />

              <FormField
                icon="location-outline"
                label="Delivery Address"
                placeholder="Enter delivery address"
                value={address}
                onChangeText={
                  setAddress
                }
                multiline
              />

              <View
                style={[
                  styles.modalButtons,

                  isMobile &&
                    styles.modalButtonsMobile,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }
                  style={
                    styles.cancelButton
                  }
                  onPress={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  <AppText
                    style={
                      styles.cancelText
                    }
                  >
                    Cancel
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={
                    0.85
                  }
                  style={[
                    styles.saveButton,

                    saving &&
                      styles.saveDisabled,
                  ]}
                  onPress={
                    saveCustomer
                  }
                  disabled={
                    saving
                  }
                >
                  <Ionicons
                    name={
                      editingId
                        ? "checkmark"
                        : "add"
                    }
                    size={18}
                    color="#FFFFFF"
                  />

                  <AppText
                    style={
                      styles.saveText
                    }
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Customer"
                      : "Save Customer"}
                  </AppText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );


  /* =======================================================
     DELETE MODAL
  ======================================================= */

  const DeleteModal =
    () => {
      if (
        !deleteCustomerData
      ) {
        return null;
      }

      const isMessage =
        deleteCustomerData.__message;

      return (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() =>
            setDeleteCustomerData(
              null
            )
          }
        >
          <View
            style={
              styles.confirmRoot
            }
          >
            <View
              style={
                styles.confirmBackdrop
              }
            />

            <View
              style={[
                styles.confirmCard,

                isMobile &&
                  styles.confirmCardMobile,
              ]}
            >
              <View
                style={
                  styles.confirmIcon
                }
              >
                <Ionicons
                  name={
                    isMessage
                      ? "information-circle-outline"
                      : "trash-outline"
                  }
                  size={25}
                  color={
                    isMessage
                      ? COLORS.greenDark
                      : COLORS.danger
                  }
                />
              </View>

              <AppText
                style={
                  styles.confirmTitle
                }
              >
                {isMessage
                  ? "Notice"
                  : "Delete customer?"}
              </AppText>

              <AppText
                style={
                  styles.confirmText
                }
              >
                {isMessage
                  ? deleteCustomerData.message
                  : `Are you sure you want to permanently delete ${deleteCustomerData.name}?`}
              </AppText>

              <View
                style={
                  styles.confirmButtons
                }
              >
                <TouchableOpacity
                  activeOpacity={
                    0.8
                  }
                  style={
                    styles.confirmCancel
                  }
                  onPress={() =>
                    setDeleteCustomerData(
                      null
                    )
                  }
                  disabled={
                    deleting
                  }
                >
                  <AppText
                    style={
                      styles.confirmCancelText
                    }
                  >
                    {isMessage
                      ? "Close"
                      : "Cancel"}
                  </AppText>
                </TouchableOpacity>

                {!isMessage && (
                  <TouchableOpacity
                    activeOpacity={
                      0.85
                    }
                    style={[
                      styles.confirmDelete,

                      deleting &&
                        styles.saveDisabled,
                    ]}
                    onPress={() =>
                      performDelete(
                        deleteCustomerData
                      )
                    }
                    disabled={
                      deleting
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <AppText
                      style={
                        styles.confirmDeleteText
                      }
                    >
                      {deleting
                        ? "Deleting..."
                        : "Delete"}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      );
    };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
      edges={
        isMobile
          ? ["top"]
          : []
      }
    >
      <View
        style={
          styles.container
        }
      >
        <FlatList
          data={
            filteredCustomers
          }
          keyExtractor={(
            item
          ) => item.id}
          renderItem={({
            item,
          }) => (
            <CustomerCard
              item={item}
            />
          )}
          numColumns={
            isDesktop ? 2 : 1
          }
          columnWrapperStyle={
            isDesktop
              ? styles.columnWrapper
              : undefined
          }
          ListHeaderComponent={
            <>
              <PageHeader />

              {isMobile ? (
                <MobileSummary />
              ) : (
                <View
                  style={
                    styles.statsRow
                  }
                >
                  <StatCard
                    icon="people-outline"
                    label="TOTAL CUSTOMERS"
                    value={
                      stats.total
                    }
                    type="total"
                  />

                  <StatCard
                    icon="checkmark-circle-outline"
                    label="ACTIVE"
                    value={
                      stats.active
                    }
                    type="active"
                  />

                  <StatCard
                    icon="pause-circle-outline"
                    label="INACTIVE"
                    value={
                      stats.inactive
                    }
                    type="inactive"
                  />
                </View>
              )}

              <Toolbar
                search={search}
                setSearch={setSearch}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                isMobile={isMobile}
              />

              <DirectoryHeader />
            </>
          }
          ListEmptyComponent={
            EmptyState
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.listContent,

            isMobile &&
              styles.listContentMobile,
          ]}
        />


        {/* MOBILE FLOATING ADD */}

        {isMobile && (
          <TouchableOpacity
            activeOpacity={
              0.85
            }
            style={
              styles.fab
            }
            onPress={
              openAddCustomer
            }
          >
            <Ionicons
              name="add"
              size={27}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}


        {CustomerModal()}

        <DeleteModal />
      </View>
    </SafeAreaView>
  );
}


/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  multiline,
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <AppText
        style={
          styles.fieldLabel
        }
      >
        {label}
      </AppText>

      <View
        style={[
          styles.inputBox,

          multiline &&
            styles.inputBoxMultiline,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            COLORS.muted
          }
        />

        <TextInput
          value={value}
          onChangeText={
            onChangeText
          }
          placeholder={
            placeholder
          }
          placeholderTextColor="#A2ACA5"
          keyboardType={
            keyboardType
          }
          multiline={
            multiline
          }
          textAlignVertical={
            multiline
              ? "top"
              : "center"
          }
          autoCorrect={
            false
          }
          style={[
            styles.input,

            multiline &&
              styles.inputMultiline,
          ]}
        />
      </View>
    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    /* =====================================================
       ROOT
    ===================================================== */

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.greenDeep,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
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
      paddingBottom: 110,
    },


    /* =====================================================
       PAGE HEADER
    ===================================================== */

    pageHeader: {
      minHeight: 116,
      borderRadius: 22,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      overflow: "hidden",
      marginBottom: 17,
      position: "relative",
    },

    pageHeaderMobile: {
      minHeight: 92,
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
      backgroundColor:
        COLORS.greenSoft,
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
      backgroundColor:
        COLORS.greenSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
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
      backgroundColor:
        COLORS.green,
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
      backgroundColor:
        COLORS.green,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      shadowColor:
        COLORS.greenDark,
      shadowOffset: {
        width: 0,
        height: 5,
      },
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


    /* =====================================================
       DESKTOP STATS
    ===================================================== */

    statsRow: {
      flexDirection: "row",
      marginBottom: 18,
    },

    statCard: {
      flex: 1,
      height: 91,
      borderRadius: 17,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      marginRight: 11,
    },

    statIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    statIconGreen: {
      backgroundColor:
        COLORS.greenSoft,
    },

    statIconDanger: {
      backgroundColor:
        COLORS.dangerSoft,
    },

    statContent: {
      flex: 1,
    },

    statLabel: {
      fontSize: 8.5,
      fontWeight: "800",
      color: COLORS.muted,
      letterSpacing: 0.7,
    },

    statValue: {
      marginTop: 2,
      fontSize: 25,
      lineHeight: 29,
      fontWeight: "850",
      color: COLORS.text,
    },


    /* =====================================================
       MOBILE SUMMARY
    ===================================================== */

    mobileSummary: {
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 17,
      padding: 14,
      marginBottom: 12,
    },

    mobileSummaryHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    mobileSummaryIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        COLORS.greenSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    mobileSummaryTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: COLORS.text,
    },

    mobileSummarySubtitle: {
      marginTop: 2,
      fontSize: 9.5,
      color: COLORS.muted,
    },

    mobileSummaryStats: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 13,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "#EDF1EC",
    },

    mobileSummaryItem: {
      flex: 1,
      alignItems: "center",
    },

    mobileSummaryValue: {
      fontSize: 20,
      lineHeight: 23,
      fontWeight: "850",
      color: COLORS.text,
    },

    mobileSummaryLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "700",
      color: COLORS.muted,
    },

    summaryDivider: {
      width: 1,
      height: 28,
      backgroundColor:
        COLORS.border,
    },


    /* =====================================================
       TOOLBAR
    ===================================================== */

    toolbar: {
      flexDirection: "row",
      marginBottom: 21,
    },

    toolbarMobile: {
      marginBottom: 17,
    },

    searchBox: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
    },

    searchInput: {
      flex: 1,
      height: "100%",
      marginLeft: 8,
      fontSize: 12.5,
      color: COLORS.text,
      outlineStyle: "none",
    },

    sortButton: {
      height: 48,
      minWidth: 87,
      borderRadius: 14,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      marginLeft: 8,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    sortText: {
      marginLeft: 5,
      marginRight: 5,
      fontSize: 11,
      color: COLORS.secondary,
    },

    sortValue: {
      marginLeft: 5,
      fontSize: 11.5,
      fontWeight: "800",
      color: COLORS.text,
    },


    /* =====================================================
       DIRECTORY
    ===================================================== */

    directoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 11,
    },

    directoryTitle: {
      fontSize: 17,
      fontWeight: "850",
      color: COLORS.text,
      letterSpacing: -0.3,
    },

    directorySubtitle: {
      marginTop: 2,
      fontSize: 10,
      color: COLORS.muted,
    },

    smallAddButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        COLORS.green,
      alignItems: "center",
      justifyContent: "center",
    },


    /* =====================================================
       GRID
    ===================================================== */

    columnWrapper: {
      marginHorizontal: -5,
      marginBottom: 12,
    },


    /* =====================================================
       CUSTOMER CARD
    ===================================================== */

    customerCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor:
        COLORS.white,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 16,
      marginHorizontal: 5,

      shadowColor:
        "#29442D",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.035,
      shadowRadius: 9,
      elevation: 1,
    },

    customerCardMobile: {
      width: "100%",
      marginHorizontal: 0,
      marginBottom: 11,
      padding: 14,
      borderRadius: 17,
    },


    /* =====================================================
       CUSTOMER HEADER
    ===================================================== */

    customerTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 51,
      height: 51,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    avatarActive: {
      backgroundColor:
        COLORS.greenSoft,
    },

    avatarInactive: {
      backgroundColor:
        COLORS.inactive,
    },

    avatarText: {
      fontSize: 14,
      fontWeight: "850",
    },

    avatarTextActive: {
      color:
        COLORS.greenDark,
    },

    avatarTextInactive: {
      color: "#758078",
    },

    identity: {
      flex: 1,
      minWidth: 0,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },

    customerName: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "850",
      color: COLORS.text,
      marginRight: 6,
    },

    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 20,
    },

    activePill: {
      backgroundColor:
        COLORS.greenSoft,
    },

    inactivePill: {
      backgroundColor:
        COLORS.dangerSoft,
    },

    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginRight: 4,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "850",
    },

    customerDescription: {
      marginTop: 3,
      fontSize: 9.5,
      color: COLORS.muted,
    },

    moreButton: {
      width: 33,
      height: 33,
      borderRadius: 10,
      backgroundColor:
        "#F5F7F5",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 7,
    },


    /* =====================================================
       DETAILS
    ===================================================== */

    details: {
      marginTop: 15,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "#EDF1EC",
    },

    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    detailIcon: {
      width: 29,
      height: 29,
      borderRadius: 9,
      backgroundColor:
        "#F2F8EE",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },

    detailTextArea: {
      flex: 1,
      minWidth: 0,
    },

    detailLabel: {
      fontSize: 7,
      fontWeight: "850",
      color: COLORS.muted,
      letterSpacing: 0.55,
    },

    detailValue: {
      marginTop: 1,
      fontSize: 11,
      fontWeight: "600",
      color: COLORS.secondary,
    },


    /* =====================================================
       ACTIONS
    ===================================================== */

    cardActions: {
      marginTop: 3,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor:
        "#EDF1EC",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    statusAction: {
      height: 32,
      paddingHorizontal: 8,
      borderRadius: 9,
      backgroundColor:
        "#F7F9F6",
      flexDirection: "row",
      alignItems: "center",
    },

    statusActionText: {
      marginLeft: 4,
      fontSize: 9.5,
      fontWeight: "750",
      color: COLORS.secondary,
    },

    actionGroup: {
      flexDirection: "row",
      alignItems: "center",
    },

    editAction: {
      height: 32,
      paddingHorizontal: 9,
      borderRadius: 9,
      backgroundColor:
        "#F7F9F6",
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 5,
    },

    editActionText: {
      marginLeft: 5,
      fontSize: 9.5,
      fontWeight: "750",
      color: COLORS.secondary,
    },

    deleteAction: {
      height: 32,
      paddingHorizontal: 9,
      borderRadius: 9,
      backgroundColor:
        COLORS.dangerSoft,
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 5,
    },

    deleteActionText: {
      marginLeft: 5,
      fontSize: 9.5,
      fontWeight: "750",
      color: COLORS.danger,
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    emptyState: {
      minHeight: 300,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 25,
    },

    emptyIcon: {
      width: 65,
      height: 65,
      borderRadius: 21,
      backgroundColor:
        COLORS.greenSoft,
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
      maxWidth: 430,
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
      backgroundColor:
        COLORS.green,
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


    /* =====================================================
       FAB
    ===================================================== */

    fab: {
      position: "absolute",
      right: 18,
      bottom: 88,
      width: 55,
      height: 55,
      borderRadius: 18,
      backgroundColor:
        COLORS.green,
      alignItems: "center",
      justifyContent: "center",

      shadowColor:
        COLORS.greenDark,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.24,
      shadowRadius: 10,
      elevation: 8,
    },


    /* =====================================================
       ADD / EDIT MODAL
    ===================================================== */

    modalRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(20, 30, 22, 0.52)",
    },

    modalCard: {
      width: "92%",
      maxWidth: 520,
      maxHeight: "88%",
      backgroundColor:
        COLORS.white,
      borderRadius: 24,
      padding: 24,
      zIndex: 2,
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
      paddingTop: 11,
      paddingBottom: 8,
    },

    modalHandle: {
      alignSelf: "center",
      width: 42,
      height: 4,
      borderRadius: 4,
      backgroundColor:
        "#DCE2DD",
      marginBottom: 13,
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 18,
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
      backgroundColor:
        COLORS.greenSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: "850",
      color: COLORS.text,
    },

    modalSubtitle: {
      marginTop: 2,
      fontSize: 10,
      color: COLORS.secondary,
    },

    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        "#F3F5F3",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },

    modalScroll: {
      flexGrow: 0,
    },

    modalScrollContent: {
      paddingBottom: 7,
    },


    /* =====================================================
       FORM
    ===================================================== */

    field: {
      marginBottom: 14,
    },

    fieldLabel: {
      marginBottom: 6,
      fontSize: 11,
      fontWeight: "800",
      color: COLORS.text,
    },

    inputBox: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        "#FBFCFB",
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
    },

    inputBoxMultiline: {
      alignItems:
        "flex-start",
      paddingTop: 12,
    },

    input: {
      flex: 1,
      minHeight: 46,
      marginLeft: 8,
      fontSize: 13,
      color: COLORS.text,
      outlineStyle: "none",
    },

    inputMultiline: {
      minHeight: 70,
      paddingTop: 0,
    },


    /* =====================================================
       MODAL BUTTONS
    ===================================================== */

    modalButtons: {
      flexDirection: "row",
      justifyContent:
        "flex-end",
      marginTop: 5,
    },

    modalButtonsMobile: {
      flexDirection:
        "column-reverse",
    },

    cancelButton: {
      height: 46,
      paddingHorizontal: 19,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },

    cancelText: {
      fontSize: 12.5,
      fontWeight: "750",
      color: COLORS.secondary,
    },

    saveButton: {
      height: 46,
      paddingHorizontal: 19,
      borderRadius: 12,
      backgroundColor:
        COLORS.green,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    saveDisabled: {
      opacity: 0.6,
    },

    saveText: {
      marginLeft: 6,
      fontSize: 12.5,
      fontWeight: "800",
      color: "#FFFFFF",
    },


    /* =====================================================
       DELETE CONFIRMATION
    ===================================================== */

    confirmRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },

    confirmBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(20, 30, 22, 0.56)",
    },

    confirmCard: {
      width: "92%",
      maxWidth: 400,
      backgroundColor:
        COLORS.white,
      borderRadius: 22,
      padding: 24,
      zIndex: 2,
    },

    confirmCardMobile: {
      width: "100%",
      maxWidth: 370,
      borderRadius: 21,
      padding: 21,
    },

    confirmIcon: {
      width: 51,
      height: 51,
      borderRadius: 16,
      backgroundColor:
        COLORS.dangerSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    confirmTitle: {
      fontSize: 18,
      fontWeight: "850",
      color: COLORS.text,
    },

    confirmText: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.secondary,
    },

    confirmButtons: {
      flexDirection: "row",
      justifyContent:
        "flex-end",
      marginTop: 21,
    },

    confirmCancel: {
      height: 43,
      paddingHorizontal: 17,
      borderRadius: 11,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },

    confirmCancelText: {
      fontSize: 12,
      fontWeight: "750",
      color: COLORS.secondary,
    },

    confirmDelete: {
      height: 43,
      paddingHorizontal: 17,
      borderRadius: 11,
      backgroundColor:
        COLORS.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    confirmDeleteText: {
      marginLeft: 5,
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

  });