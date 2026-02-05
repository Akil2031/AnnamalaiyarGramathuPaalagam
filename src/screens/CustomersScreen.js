import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  StatusBar,
} from "react-native";

import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");

  /* 🔥 Firestore sync */
  useEffect(() => {
    return onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
  }, []);

  /* 🔒 LOGOUT */
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Do you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => signOut(auth),
        },
      ]
    );
  };

  const resetForm = () => {
    setName("");
    setMobile("");
    setAddress("");
    setEditingId(null);
    setModalVisible(false);
  };

  const saveCustomer = async () => {
    if (!name || !mobile || !address) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    const duplicate = customers.find(
      (c) => c.mobile === mobile && c.id !== editingId
    );
    if (duplicate) {
      Alert.alert("Error", "Mobile number already exists");
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "customers", editingId), {
          name,
          mobile,
          address,
        });
      } else {
        await addDoc(collection(db, "customers"), {
          name,
          mobile,
          address,
          status: "active",
          createdAt: Date.now(),
        });
      }
      resetForm();
    } catch (e) {
      Alert.alert("Save failed");
    }
  };

  const toggleStatus = async (item) => {
    await updateDoc(doc(db, "customers", item.id), {
      status: item.status === "active" ? "inactive" : "active",
    });
  };

  const confirmDelete = (id) => {
    Alert.alert("Delete Customer", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDoc(doc(db, "customers", id)),
      },
    ]);
  };

  /* 🔍 SEARCH + 🔼🔽 SORT */
  const filteredCustomers = [...customers]
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.mobile.includes(search)
    )
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      return sortOrder === "asc"
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <Text
          style={[
            styles.badge,
            item.status === "active"
              ? styles.active
              : styles.inactive,
          ]}
        >
          {item.status.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.subText}>📞 {item.mobile}</Text>
      <Text style={styles.subText}>📍 {item.address}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => toggleStatus(item)}>
          <Text style={styles.link}>
            {item.status === "active" ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setEditingId(item.id);
            setName(item.name);
            setMobile(item.mobile);
            setAddress(item.address);
            setModalVisible(true);
          }}
        >
          <Text style={styles.link}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => confirmDelete(item.id)}>
          <Text style={styles.delete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Welcome back!</Text>
            <Text style={styles.headerSub}>
              Manage your milk delivery customers
            </Text>
          </View>

          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutBtn}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* COUNT + SORT */}
      <View style={styles.listHeader}>
        <Text style={styles.countText}>
          Total Customers: {filteredCustomers.length}
        </Text>

        <TouchableOpacity
          onPress={() =>
            setSortOrder((p) => (p === "asc" ? "desc" : "asc"))
          }
        >
          <Text style={styles.sortText}>
            Sort: {sortOrder === "asc" ? "A → Z" : "Z → A"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search customers"
          value={search}
          onChangeText={setSearch}
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredCustomers}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>
              {editingId ? "Edit Customer" : "Add Customer"}
            </Text>

            <TextInput
              style={styles.sheetInput}
              placeholder="Customer name"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.sheetInput}
              placeholder="Mobile number"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />

            <TextInput
              style={[styles.sheetInput, { height: 80 }]}
              placeholder="Address"
              multiline
              value={address}
              onChangeText={setAddress}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={saveCustomer}
            >
              <Text style={styles.primaryBtnText}>
                {editingId ? "Update Customer" : "Save Customer"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={resetForm}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F8E9" },

  topHeader: {
    backgroundColor: "#2E7D32",
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },

  headerSub: { color: "#E8F5E9", marginTop: 4 },

  logoutBtn: {
    color: "#fff",
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
  },

  countText: { fontWeight: "700", color: "#1F2937" },
  sortText: { fontWeight: "700", color: "#2563EB" },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 25,
    elevation: 2,
  },

  searchInput: { flex: 1, paddingVertical: 14 },
  clearBtn: { fontSize: 18, color: "#64748B", paddingLeft: 8 },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: { fontSize: 16, fontWeight: "700" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  active: { backgroundColor: "#DCFCE7", color: "#15803D" },
  inactive: { backgroundColor: "#FEE2E2", color: "#DC2626" },

  subText: { color: "#64748B", marginTop: 6 },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  link: { color: "#2563EB", fontWeight: "600" },
  delete: { color: "#DC2626", fontWeight: "600" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  fabText: { color: "#fff", fontSize: 28 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  bottomSheet: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },

  sheetInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  primaryBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelBtn: { alignItems: "center", marginTop: 8 },
  cancelText: { color: "#6B7280" },
});
