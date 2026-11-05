import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Building2,
  MapPin,
  FileBadge,
  Hash,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Loader2,
  Plus,
  AlertCircle,
  Pencil,
  Check,
  Users,
  RefreshCw,
} from "lucide-react";

import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";
import SearchableChecklist from "./components/searchableChecklist";
import PortalEntityCard from "./components/portalEntityCard";
import Modal from "../../components/common/modal";
import DeleteModal from "../../components/common/deleteModal";
import SuccessModal from "../../components/common/successModal";
import RoleGuard from "../../components/guard/roleGuard";

// Services, Data & Hooks
import pharmacyService from "../../services/pharmacy";
import assignPharmacyService from "../../services/assignPharmacy";
import userService from "../../services/user";
import { ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import useError from "../../hooks/useError";
import { DEFAULT_PHARMACY_FORM } from "../../utils/constants";
import { validatePharmacyForm } from "../../validators/pharmacy.validator";

function SelectPharmacy() {
  const navigate = useNavigate();
  const {
    user,
    facility: activeFacility,
    pharmacy: currentSavedPharmacy,
    selectPharmacy,
    setPharmacy,
    logout,
  } = useAuth();
  const { isSuperAdmin, roleDetails } = useRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pharmacies list state loaded from backend API
  const [pharmacyList, setPharmacyList] = useState([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(true);
  const [fetchPharmaciesError, setFetchPharmaciesError] = useState("");

  // Submitting states for CRUD
  const [isCreatingPharmacy, setIsCreatingPharmacy] = useState(false);
  const [isUpdatingPharmacy, setIsUpdatingPharmacy] = useState(false);
  const [isDeletingPharmacy, setIsDeletingPharmacy] = useState(false);
  const [deletePharmacyError, setDeletePharmacyError] = useState("");

  // User list state for managing staff assignments (loaded live from backend)
  const [userList, setUserList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Modal state for adding a pharmacy
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_PHARMACY_FORM);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearErrors: clearAddPharmacyErrors,
    handleInputChange: handleAddPharmacyChange,
    handleApiError: handleAddPharmacyApiError,
  } = useError();
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // Modal & form state for editing a pharmacy
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState(null);
  const [editFormData, setEditFormData] = useState(DEFAULT_PHARMACY_FORM);
  const {
    errors: editFormErrors,
    setErrors: setEditFormErrors,
    clearErrors: clearEditPharmacyErrors,
    handleInputChange: handleEditPharmacyChange,
    handleApiError: handleEditPharmacyApiError,
  } = useError();
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  // Modal state for deleting a pharmacy
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pharmacyToDelete, setPharmacyToDelete] = useState(null);

  // Modal & Form state for assigning users to a pharmacy
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [selectedPharmacyIdForAssignment, setSelectedPharmacyIdForAssignment] =
    useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [assignErrorMsg, setAssignErrorMsg] = useState("");

  // SuccessModal state for assignment confirmation
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] =
    useState(false);
  const [assignSuccessData, setAssignSuccessData] = useState({
    pharmacyName: "",
    count: 0,
  });

  // If no facility is selected, redirect to select-facility
  useEffect(() => {
    if (!activeFacility) {
      navigate("/select-facility", { replace: true });
    }
  }, [activeFacility, navigate]);

  // Fetch pharmacies from backend API:
  // - Super Admin: fetch all pharmacies for the selected active facility
  // - Admin & staff: fetch assigned pharmacies filtered to the selected active facility
  const fetchPharmacies = useCallback(async () => {
    const targetFacilityId = activeFacility?.id;
    if (!targetFacilityId) {
      setPharmacyList([]);
      setIsLoadingPharmacies(false);
      return;
    }

    if (isSuperAdmin) {
      try {
        setIsLoadingPharmacies(true);
        setFetchPharmaciesError("");
        const pharmacies =
          await pharmacyService.getPharmaciesByFacilityId(targetFacilityId);
        setPharmacyList(Array.isArray(pharmacies) ? pharmacies : []);
      } catch (err) {
        console.error("Failed to fetch pharmacies by facility:", err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to load pharmacies from server.";
        setFetchPharmaciesError(
          typeof errMsg === "string" ? errMsg : "Failed to load pharmacies.",
        );
      } finally {
        setIsLoadingPharmacies(false);
      }
      return;
    }

    // Admin & staff: fetch assigned pharmacies directly from backend
    try {
      setIsLoadingPharmacies(true);
      setFetchPharmaciesError("");
      const pharmacies = await assignPharmacyService.getMyAssignedPharmacies();
      const list = Array.isArray(pharmacies)
        ? pharmacies
            .filter((p) => Number(p.facilityId) === Number(targetFacilityId))
            .map((p) => ({ ...p, isAssignedToCurrentUser: true }))
        : [];
      setPharmacyList(list);
    } catch (err) {
      console.error("Failed to fetch assigned pharmacies:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load assigned pharmacies.";
      setFetchPharmaciesError(
        typeof errMsg === "string"
          ? errMsg
          : "Failed to load assigned pharmacies.",
      );
    } finally {
      setIsLoadingPharmacies(false);
    }
  }, [isSuperAdmin, activeFacility?.id]);

  // Fetch users list for pharmacy staff delegation (SuperAdmin only)
  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingUsers(true);
      const backendUsers = await userService.getAllUsers();
      if (Array.isArray(backendUsers)) {
        setUserList(
          backendUsers.map((u) => {
            const pharmIds = Array.isArray(u.assignedPharmacyIds)
              ? u.assignedPharmacyIds
              : Array.isArray(u.assignedPharmacies)
                ? u.assignedPharmacies
                : [];

            return {
              ...u,
              assignedPharmacies: pharmIds,
              assignedPharmacyIds: pharmIds,
              status: u.status ? "Active" : "Inactive",
            };
          }),
        );
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (activeFacility?.id) {
      fetchPharmacies();
      if (isSuperAdmin) {
        fetchUsers();
      }
    }
  }, [activeFacility?.id, isSuperAdmin, fetchPharmacies, fetchUsers]);

  // Pharmacies assigned to the user
  const userAssignedPharmacies = useMemo(() => {
    if (!user) return [];
    return pharmacyList;
  }, [user, pharmacyList]);

  const facilityHasNoPharmacies = userAssignedPharmacies.length === 0;

  // Filtered pharmacies based on search query
  const filteredPharmacies = useMemo(() => {
    return userAssignedPharmacies.filter((pharmacy) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        (pharmacy.pharmacyName || "").toLowerCase().includes(query) ||
        (pharmacy.pharmacyCode || "").toLowerCase().includes(query) ||
        (pharmacy.address || "").toLowerCase().includes(query) ||
        (pharmacy.licenseNo || "").toLowerCase().includes(query)
      );
    });
  }, [userAssignedPharmacies, searchQuery]);

  const handleSelect = (pharmacy) => {
    if (pharmacy.status !== "Active") return;
    setSelectedPharmacyId(pharmacy.id);
    setIsSubmitting(true);

    setTimeout(() => {
      selectPharmacy(pharmacy);
    }, 400);
  };

  const getPharmacyIcon = () => {
    return <Store className="w-5 h-5 text-emerald-600" />;
  };

  // Modal Handlers
  const handleOpenAddModal = () => {
    if (!isSuperAdmin) return;
    setFormData({
      ...DEFAULT_PHARMACY_FORM,
      address: activeFacility?.address || "",
    });
    clearAddPharmacyErrors();
    setAddSuccessMsg("");
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormData(DEFAULT_PHARMACY_FORM);
    clearAddPharmacyErrors();
  };

  const handleInputChange = (e) => {
    handleAddPharmacyChange(e, setFormData);
  };

  const handleCreatePharmacySubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    const { isValid, errors } = validatePharmacyForm(formData);
    if (!isValid) {
      setFormErrors(errors);
      return;
    }

    const targetFacilityId = Number(activeFacility?.id);
    if (!targetFacilityId) {
      setFormErrors((prev) => ({
        ...prev,
        general: "An active facility is required to create a pharmacy.",
      }));
      return;
    }

    try {
      setIsCreatingPharmacy(true);
      const lguIdTrimmed =
        formData.lguId !== undefined && formData.lguId !== null
          ? String(formData.lguId).trim()
          : "";
      const payload = {
        facilityId: targetFacilityId,
        pharmacyCode: formData.pharmacyCode.trim(),
        pharmacyName: formData.pharmacyName.trim(),
        lguId: lguIdTrimmed ? Number(lguIdTrimmed) : null,
        licenseNo: formData.licenseNo?.trim() || null,
        address: formData.address.trim(),
        status: formData.status || "Active",
      };

      const newPharmacy = await pharmacyService.createPharmacy(payload);

      setPharmacyList((prev) => [newPharmacy, ...prev]);

      setAddSuccessMsg(
        `Pharmacy "${newPharmacy.pharmacyName}" created successfully!`,
      );
      setTimeout(() => {
        handleCloseAddModal();
        setAddSuccessMsg("");
      }, 700);
    } catch (err) {
      handleAddPharmacyApiError(
        err,
        "Failed to create pharmacy. Please try again.",
      );
    } finally {
      setIsCreatingPharmacy(false);
    }
  };

  // --- EDIT PHARMACY HANDLERS ---
  const handleOpenEditModal = (pharm) => {
    if (!isSuperAdmin) return;
    setEditingPharmacy(pharm);
    setEditFormData({
      pharmacyName: pharm.pharmacyName || "",
      pharmacyCode: pharm.pharmacyCode || "",
      lguId:
        pharm.lguId !== undefined && pharm.lguId !== null
          ? String(pharm.lguId)
          : "",
      licenseNo: pharm.licenseNo || "",
      address: pharm.address || "",
      status: pharm.status || "Active",
      facilityId: pharm.facilityId
        ? String(pharm.facilityId)
        : activeFacility
          ? String(activeFacility.id)
          : "",
    });
    clearEditPharmacyErrors();
    setEditSuccessMsg("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPharmacy(null);
    clearEditPharmacyErrors();
    setEditSuccessMsg("");
  };

  const handleEditInputChange = (e) => {
    handleEditPharmacyChange(e, setEditFormData);
  };

  const handleUpdatePharmacySubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!editingPharmacy) return;

    const { errors } = validatePharmacyForm(editFormData);
    const targetFacilityId = Number(
      editFormData.facilityId ||
        editingPharmacy.facilityId ||
        activeFacility?.id,
    );
    const finalErrors = { ...errors };
    if (!targetFacilityId) {
      finalErrors.facilityId = "Facility selection is required.";
    }
    if (Object.keys(finalErrors).length > 0) {
      setEditFormErrors(finalErrors);
      return;
    }

    try {
      setIsUpdatingPharmacy(true);
      const lguIdTrimmed =
        editFormData.lguId !== undefined && editFormData.lguId !== null
          ? String(editFormData.lguId).trim()
          : "";
      const payload = {
        facilityId: targetFacilityId,
        pharmacyCode: editFormData.pharmacyCode.trim(),
        pharmacyName: editFormData.pharmacyName.trim(),
        lguId: lguIdTrimmed ? Number(lguIdTrimmed) : null,
        licenseNo: editFormData.licenseNo?.trim() || null,
        address: editFormData.address.trim(),
        status: editFormData.status || "Active",
      };

      const updatedPharmacy = await pharmacyService.updatePharmacy(
        editingPharmacy.id,
        payload,
      );

      setPharmacyList((prev) =>
        prev.map((p) =>
          p.id === editingPharmacy.id ? { ...p, ...updatedPharmacy } : p,
        ),
      );

      // If this pharmacy is currently active in session, update session
      if (currentSavedPharmacy?.id === editingPharmacy.id) {
        setPharmacy({ ...currentSavedPharmacy, ...updatedPharmacy });
      }

      setEditSuccessMsg(
        `Pharmacy "${updatedPharmacy.pharmacyName}" updated successfully!`,
      );
      setTimeout(() => {
        handleCloseEditModal();
        setEditSuccessMsg("");
      }, 700);
    } catch (err) {
      handleEditPharmacyApiError(
        err,
        "Failed to update pharmacy. Please try again.",
      );
    } finally {
      setIsUpdatingPharmacy(false);
    }
  };

  // --- DELETE PHARMACY HANDLERS ---
  const handleOpenDeleteModal = (pharm) => {
    if (!isSuperAdmin) return;
    setPharmacyToDelete(pharm);
    setDeletePharmacyError("");
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPharmacyToDelete(null);
    setDeletePharmacyError("");
  };

  const handleConfirmDeletePharmacy = async () => {
    if (!isSuperAdmin || !pharmacyToDelete) return;
    const targetId = pharmacyToDelete.id;

    try {
      setIsDeletingPharmacy(true);
      setDeletePharmacyError("");
      await pharmacyService.deletePharmacy(targetId);

      // Remove from pharmacy list
      setPharmacyList((prev) => prev.filter((p) => p.id !== targetId));

      // Clean up if it was the active pharmacy in session
      if (currentSavedPharmacy?.id === targetId) {
        setPharmacy(null);
      }
      if (selectedPharmacyId === targetId) {
        setSelectedPharmacyId(null);
      }

      handleCloseDeleteModal();
    } catch (err) {
      console.error("Failed to delete pharmacy:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to delete pharmacy. Please try again.";
      setDeletePharmacyError(
        typeof errMsg === "string" ? errMsg : "Failed to delete pharmacy.",
      );
    } finally {
      setIsDeletingPharmacy(false);
    }
  };

  // Helper: All assignable user accounts (excluding Super Admin)
  const assignableUsers = useMemo(() => {
    return userList.filter(
      (u) => u.role !== ROLES.SUPER_ADMIN && u.role !== "Super Admin",
    );
  }, [userList]);

  // Helper: Get users assigned to a specific pharmacy
  const getAssignedUsers = (pharmacyId) => {
    const pharm = pharmacyList.find((p) => p.id === Number(pharmacyId));
    if (!pharm || !Array.isArray(pharm.assignedUserIds)) return [];
    return userList.filter(
      (u) =>
        u.role !== ROLES.SUPER_ADMIN &&
        u.role !== "Super Admin" &&
        pharm.assignedUserIds.includes(u.id),
    );
  };

  // Helper: Get accurate number of pharmacies assigned to a user
  const getUserPharmacyCount = useCallback(
    (u) => {
      if (
        Array.isArray(u?.assignedPharmacyIds) &&
        u.assignedPharmacyIds.length > 0
      ) {
        return u.assignedPharmacyIds.length;
      }
      if (
        Array.isArray(u?.assignedPharmacies) &&
        u.assignedPharmacies.length > 0
      ) {
        return u.assignedPharmacies.length;
      }
      return pharmacyList.filter(
        (p) =>
          Array.isArray(p.assignedUserIds) && p.assignedUserIds.includes(u?.id),
      ).length;
    },
    [pharmacyList],
  );

  // --- Assign Users Modal Handlers (SuperAdmin only) ---
  const handleOpenAssignUsersModal = async (pharmacy) => {
    if (!isSuperAdmin) return;
    const targetPharmacy =
      pharmacy ||
      userAssignedPharmacies[0] ||
      filteredPharmacies[0] ||
      pharmacyList[0];
    if (!targetPharmacy) return;

    const pid = targetPharmacy.id;
    setSelectedPharmacyIdForAssignment(pid);
    setUserSearchTerm("");
    setAssignErrorMsg("");
    setIsAssignUserModalOpen(true);

    // Fetch latest user list from backend if not yet populated
    if (userList.length === 0) {
      fetchUsers();
    }

    // Immediate selection from cached assignedUserIds if available
    if (Array.isArray(targetPharmacy.assignedUserIds)) {
      setSelectedUserIds(targetPharmacy.assignedUserIds);
    }

    // Fetch on-demand assigned users specifically for this pharmacy from backend
    try {
      const assignedUsers =
        await assignPharmacyService.getUsersByPharmacyId(pid);
      const userIds = Array.isArray(assignedUsers)
        ? assignedUsers.map((u) => u.id)
        : [];
      setSelectedUserIds(userIds);
      setPharmacyList((prev) =>
        prev.map((p) =>
          p.id === pid ? { ...p, assignedUserIds: userIds } : p,
        ),
      );

      // Merge any missing live user objects into userList
      if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
        setUserList((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUsers = assignedUsers
            .filter((u) => !existingIds.has(u.id))
            .map((u) => ({
              ...u,
              status: u.status ? "Active" : "Inactive",
            }));
          return newUsers.length > 0 ? [...prev, ...newUsers] : prev;
        });
      }
    } catch (err) {
      console.error("Failed to load pharmacy assigned users:", err);
    }
  };

  const handlePharmacyChangeInModal = async (pharmacyId) => {
    const pid = Number(pharmacyId);
    setSelectedPharmacyIdForAssignment(pid);
    setAssignErrorMsg("");

    const targetPharm = pharmacyList.find((p) => p.id === pid);
    if (targetPharm && Array.isArray(targetPharm.assignedUserIds)) {
      setSelectedUserIds(targetPharm.assignedUserIds);
    }

    try {
      const assignedUsers =
        await assignPharmacyService.getUsersByPharmacyId(pid);
      const userIds = Array.isArray(assignedUsers)
        ? assignedUsers.map((u) => u.id)
        : [];
      setSelectedUserIds(userIds);
      setPharmacyList((prev) =>
        prev.map((p) =>
          p.id === pid ? { ...p, assignedUserIds: userIds } : p,
        ),
      );

      // Merge any missing live user objects into userList
      if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
        setUserList((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUsers = assignedUsers
            .filter((u) => !existingIds.has(u.id))
            .map((u) => ({
              ...u,
              status: u.status ? "Active" : "Inactive",
            }));
          return newUsers.length > 0 ? [...prev, ...newUsers] : prev;
        });
      }
    } catch (err) {
      console.error("Failed to load pharmacy assigned users:", err);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSaveAssignments = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin || !selectedPharmacyIdForAssignment) return;

    const targetPid = Number(selectedPharmacyIdForAssignment);
    const targetPharm = pharmacyList.find((p) => p.id === targetPid);

    // Current assigned user IDs for this pharmacy
    const currentAssigned = getAssignedUsers(targetPid).map((u) => u.id);

    // Newly selected users to assign
    const usersToAssign = selectedUserIds.filter(
      (id) => !currentAssigned.includes(id),
    );
    // Users to unassign
    const usersToUnassign = currentAssigned.filter(
      (id) => !selectedUserIds.includes(id),
    );

    try {
      setIsSavingAssignments(true);
      setAssignErrorMsg("");

      // Call backend assign/unassign endpoints
      if (usersToAssign.length > 0) {
        await assignPharmacyService.assignUsersToPharmacy(targetPid, {
          userIds: usersToAssign,
        });
      }
      if (usersToUnassign.length > 0) {
        await assignPharmacyService.unassignUsersFromPharmacy(targetPid, {
          userIds: usersToUnassign,
        });
      }

      // Update pharmacyList with new assignedUserIds
      setPharmacyList((prevPharmacies) =>
        prevPharmacies.map((p) =>
          p.id === targetPid
            ? {
                ...p,
                assignedUserIds: selectedUserIds,
              }
            : p,
        ),
      );

      // Update userList assignedPharmacies
      setUserList((prevUsers) =>
        prevUsers.map((u) => {
          if (u.role === ROLES.SUPER_ADMIN || u.role === "Super Admin")
            return u;
          const shouldBeAssigned = selectedUserIds.includes(u.id);
          const currentPharmacies = Array.isArray(u.assignedPharmacies)
            ? u.assignedPharmacies
            : [];

          if (shouldBeAssigned && !currentPharmacies.includes(targetPid)) {
            return {
              ...u,
              assignedPharmacies: [...currentPharmacies, targetPid],
            };
          } else if (
            !shouldBeAssigned &&
            currentPharmacies.includes(targetPid)
          ) {
            return {
              ...u,
              assignedPharmacies: currentPharmacies.filter(
                (pid) => pid !== targetPid,
              ),
            };
          }
          return u;
        }),
      );

      // Close assign modal and open SuccessModal
      setIsAssignUserModalOpen(false);
      setAssignSuccessData({
        pharmacyName: targetPharm?.pharmacyName || "the pharmacy",
        count: selectedUserIds.length,
      });
      setIsAssignSuccessModalOpen(true);
    } catch (err) {
      console.error("Failed to save pharmacy assignments:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update assignments. Please try again.";
      setAssignErrorMsg(
        typeof errMsg === "string" ? errMsg : "Failed to update assignments.",
      );
    } finally {
      setIsSavingAssignments(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header Navigation */}
      <PortalHeader
        user={user}
        roleInfo={roleDetails}
        subtitle="Multi-Pharmacy Portal"
        onLogout={logout}
        badgeTheme="emerald"
      />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-8 flex-1">
        {/* Hero Welcome Banner */}
        <PortalHeroBanner
          badgeText="Assigned Operating Pharmacies"
          badgeIcon={Sparkles}
          badgeTheme="emerald"
          title="Select Your Operating Pharmacy"
          description={`Welcome back, ${user.name}. Please choose an assigned pharmacy dispensary or storage unit under ${activeFacility?.name || "your facility"} to access your workspace.`}
        >
          {/* Active Facility indicator and switcher */}
          {activeFacility && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg">
                <Building2 className="w-3.5 h-3.5" />
                Active Facility:{" "}
                <strong className="font-bold">{activeFacility.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => navigate("/select-facility")}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Switch Facility
              </button>
            </div>
          )}
        </PortalHeroBanner>

        {/* Search Bar Toolbar */}
        <PortalToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery("")}
          placeholder="Search pharmacy by name, code, license number, or address..."
          showingCount={filteredPharmacies.length}
          totalCount={userAssignedPharmacies.length}
          itemLabel="assigned pharmacies"
        >
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() =>
                  handleOpenAssignUsersModal(
                    filteredPharmacies[0] || pharmacyList[0],
                  )
                }
                className="btn-secondary py-2 px-3 text-xs shadow-sm flex items-center gap-1.5 shrink-0 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                title="Assign Users to Pharmacy"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Assign Users</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-primary py-2 px-3.5 text-xs shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Create New Pharmacy"
              >
                <Plus className="w-4 h-4" />
                <span>Create Pharmacy</span>
              </button>
            </div>
          </RoleGuard>
        </PortalToolbar>

        {/* Pharmacies Grid */}
        {isLoadingPharmacies ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-medium">
              Loading pharmacies from server...
            </p>
          </div>
        ) : fetchPharmaciesError ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div>
              <p className="font-semibold text-red-900">
                Unable to load pharmacies
              </p>
              <p className="text-xs text-red-700 mt-1">
                {fetchPharmaciesError}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPharmacies}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-lg shadow-2xs hover:bg-emerald-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredPharmacies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up-2">
            {filteredPharmacies.map((pharmacy) => {
              const isSelected = selectedPharmacyId === pharmacy.id;
              const isCurrentlyActiveInSession =
                currentSavedPharmacy?.id === pharmacy.id;

              return (
                <PortalEntityCard
                  key={pharmacy.id}
                  icon={getPharmacyIcon()}
                  code={pharmacy.pharmacyCode}
                  badgeText="Dispensary Unit"
                  title={pharmacy.pharmacyName}
                  themeColor="emerald"
                  status={pharmacy.status}
                  showStatusBadge={true}
                  isActiveSession={isCurrentlyActiveInSession}
                  sessionBadgeLabel="Current Session"
                  isSelected={isSelected}
                  isSubmitting={isSubmitting}
                  onSelect={() => handleSelect(pharmacy)}
                  onEdit={() => handleOpenEditModal(pharmacy)}
                  onDelete={() => handleOpenDeleteModal(pharmacy)}
                  editRoles={[ROLES.SUPER_ADMIN]}
                  editTitle="Edit Pharmacy"
                  deleteTitle="Delete Pharmacy"
                  showAssigned={isSuperAdmin}
                  assignedLabel="Assigned Users"
                  assignedItems={getAssignedUsers(pharmacy.id)}
                  assignedIconType="user"
                  assignRoles={[ROLES.SUPER_ADMIN]}
                  onAssign={() => handleOpenAssignUsersModal(pharmacy)}
                  emptyAssignedText="No users assigned yet"
                  footerVariant="full"
                  selectButtonText="Select Pharmacy"
                  enteringText="Entering Pharmacy..."
                >
                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{pharmacy.address || "—"}</span>
                  </div>

                  {/* License Number & LGU ID Details */}
                  {(pharmacy.licenseNo || pharmacy.lguId) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                      {pharmacy.licenseNo && (
                        <div className="flex items-center gap-2">
                          <FileBadge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate font-mono text-gray-700">
                            License: {pharmacy.licenseNo}
                          </span>
                        </div>
                      )}
                      {pharmacy.lguId && (
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">LGU ID: {pharmacy.lguId}</span>
                        </div>
                      )}
                    </div>
                  )}
                </PortalEntityCard>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <EmptyState
            icon={Store}
            title={
              facilityHasNoPharmacies && isSuperAdmin && activeFacility
                ? "No Pharmacies in Facility"
                : "No Pharmacies Found"
            }
            description={
              searchQuery
                ? "No assigned pharmacies match your search query."
                : isSuperAdmin && activeFacility && facilityHasNoPharmacies
                  ? `The facility "${activeFacility.name}" currently contains no pharmacies. Create a pharmacy to get started.`
                  : "No assigned pharmacies are currently linked to your user account in this facility. Please contact an administrator."
            }
            actionText={
              searchQuery
                ? "Clear Search"
                : isSuperAdmin
                  ? "Create Pharmacy"
                  : null
            }
            onAction={
              searchQuery
                ? () => setSearchQuery("")
                : isSuperAdmin
                  ? handleOpenAddModal
                  : null
            }
          />
        )}
      </main>

      {/* Footer */}
      <PortalFooter text="Exakt Med Multi-Pharmacy Inventory Management System © 2026-2027" />

      {/* Super Admin Add Pharmacy Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Create New Pharmacy"
        size="md"
      >
        <form onSubmit={handleCreatePharmacySubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800">
            <Store className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">
                {activeFacility
                  ? `Assigning to Facility: ${activeFacility.name}`
                  : "New Pharmacy Registration"}
              </p>
              <p className="mt-0.5 text-emerald-700">
                Register a new pharmacy dispensary, outpatient pharmacy, or
                central pharmacy under this facility.
              </p>
            </div>
          </div>

          {formErrors.general && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formErrors.general}</span>
            </div>
          )}

          {addSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{addSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Pharmacy Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="pharm-name"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Pharmacy Name <span className="text-red-500">*</span>
              </label>
              <input
                id="pharm-name"
                type="text"
                name="pharmacyName"
                value={formData.pharmacyName}
                onChange={handleInputChange}
                placeholder="e.g. Main Outpatient Pharmacy"
                className={`input text-xs ${
                  formErrors.pharmacyName
                    ? "border-red-400 focus:border-red-500"
                    : ""
                }`}
                autoFocus
                disabled={isCreatingPharmacy}
              />
              {formErrors.pharmacyName && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.pharmacyName}
                </p>
              )}
            </div>

            {/* Pharmacy Code */}
            <div>
              <label
                htmlFor="pharm-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Pharmacy Code <span className="text-red-500">*</span>
              </label>
              <input
                id="pharm-code"
                type="text"
                name="pharmacyCode"
                value={formData.pharmacyCode}
                onChange={handleInputChange}
                placeholder="e.g. PHM-001"
                className={`input text-xs font-mono ${
                  formErrors.pharmacyCode
                    ? "border-red-400 focus:border-red-500"
                    : ""
                }`}
                disabled={isCreatingPharmacy}
              />
              {formErrors.pharmacyCode && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.pharmacyCode}
                </p>
              )}
            </div>

            {/* Operational Status */}
            <div>
              <label
                htmlFor="pharm-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Operational Status
              </label>
              <select
                id="pharm-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input text-xs"
                disabled={isCreatingPharmacy}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* License Number (Optional) */}
            <div>
              <label
                htmlFor="pharm-licenseNo"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                License Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="pharm-licenseNo"
                  type="text"
                  name="licenseNo"
                  value={formData.licenseNo}
                  onChange={handleInputChange}
                  placeholder="e.g. LTO-3000001234"
                  className={`input text-xs pl-8 font-mono ${
                    formErrors.licenseNo
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  disabled={isCreatingPharmacy}
                />
                <FileBadge className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.licenseNo && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.licenseNo}
                </p>
              )}
            </div>

            {/* LGU ID (Optional) */}
            <div>
              <label
                htmlFor="pharm-lguId"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                LGU ID <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="pharm-lguId"
                  type="number"
                  name="lguId"
                  value={formData.lguId}
                  onChange={handleInputChange}
                  placeholder="e.g. 101"
                  className={`input text-xs pl-8 ${
                    formErrors.lguId
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  disabled={isCreatingPharmacy}
                />
                <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.lguId && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.lguId}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="pharm-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Physical Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="pharm-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Ground Floor, Main Wing, E. Rodriguez Sr. Ave"
                  className={`input text-xs pl-8 ${
                    formErrors.address
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  disabled={isCreatingPharmacy}
                />
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.address && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.address}
                </p>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isCreatingPharmacy}
              onClick={handleCloseAddModal}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingPharmacy}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isCreatingPharmacy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>
                {isCreatingPharmacy ? "Creating..." : "Create Pharmacy"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Edit Pharmacy Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isUpdatingPharmacy && handleCloseEditModal()}
        title={`Edit Pharmacy - ${editingPharmacy?.pharmacyName || ""}`}
        size="md"
      >
        <form onSubmit={handleUpdatePharmacySubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <Pencil className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                Modify Pharmacy Information
              </p>
              <p className="mt-0.5 text-amber-800">
                Update pharmacy dispensary details, license info, or operating
                status.
              </p>
            </div>
          </div>

          {editFormErrors.general && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{editFormErrors.general}</span>
            </div>
          )}

          {editSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{editSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pharmacy Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-pharm-name"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Pharmacy Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-pharm-name"
                type="text"
                name="pharmacyName"
                value={editFormData.pharmacyName}
                onChange={handleEditInputChange}
                className={`input text-xs ${editFormErrors.pharmacyName ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
                disabled={isUpdatingPharmacy}
              />
              {editFormErrors.pharmacyName && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {editFormErrors.pharmacyName}
                </p>
              )}
            </div>

            {/* Pharmacy Code */}
            <div>
              <label
                htmlFor="edit-pharm-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Pharmacy Code <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-pharm-code"
                type="text"
                name="pharmacyCode"
                value={editFormData.pharmacyCode}
                onChange={handleEditInputChange}
                className={`input text-xs font-mono ${editFormErrors.pharmacyCode ? "border-red-500" : ""}`}
                disabled={isUpdatingPharmacy}
              />
              {editFormErrors.pharmacyCode && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.pharmacyCode}
                </p>
              )}
            </div>

            {/* Operational Status */}
            <div>
              <label
                htmlFor="edit-pharm-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Operational Status
              </label>
              <select
                id="edit-pharm-status"
                name="status"
                value={editFormData.status}
                onChange={handleEditInputChange}
                className="input text-xs"
                disabled={isUpdatingPharmacy}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* License Number (Optional) */}
            <div>
              <label
                htmlFor="edit-pharm-licenseNo"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                License Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="edit-pharm-licenseNo"
                  type="text"
                  name="licenseNo"
                  value={editFormData.licenseNo}
                  onChange={handleEditInputChange}
                  className={`input text-xs pl-8 font-mono ${editFormErrors.licenseNo ? "border-red-500" : ""}`}
                  disabled={isUpdatingPharmacy}
                />
                <FileBadge className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {editFormErrors.licenseNo && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.licenseNo}
                </p>
              )}
            </div>

            {/* LGU ID (Optional) */}
            <div>
              <label
                htmlFor="edit-pharm-lguId"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                LGU ID <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="edit-pharm-lguId"
                  type="number"
                  name="lguId"
                  value={editFormData.lguId}
                  onChange={handleEditInputChange}
                  className={`input text-xs pl-8 ${editFormErrors.lguId ? "border-red-500" : ""}`}
                  disabled={isUpdatingPharmacy}
                />
                <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {editFormErrors.lguId && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.lguId}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-pharm-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Physical Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-pharm-address"
                  type="text"
                  name="address"
                  value={editFormData.address}
                  onChange={handleEditInputChange}
                  className={`input text-xs pl-8 ${editFormErrors.address ? "border-red-500" : ""}`}
                  disabled={isUpdatingPharmacy}
                />
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {editFormErrors.address && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.address}
                </p>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isUpdatingPharmacy}
              onClick={handleCloseEditModal}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingPharmacy}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isUpdatingPharmacy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isUpdatingPharmacy ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Delete Pharmacy Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeletePharmacy}
        title="Delete Pharmacy"
        itemName={pharmacyToDelete?.pharmacyName}
        itemCode={pharmacyToDelete?.pharmacyCode}
        itemType="pharmacy"
        message={
          pharmacyToDelete && (
            <>
              This will permanently delete{" "}
              <strong className="font-bold text-red-900">
                {pharmacyToDelete.pharmacyName}
              </strong>{" "}
              (
              <span className="font-mono font-semibold">
                {pharmacyToDelete.pharmacyCode}
              </span>
              ) from this facility. If it is currently selected in your active
              session, it will be unselected. This action cannot be undone.
            </>
          )
        }
        isDeleting={isDeletingPharmacy}
        error={deletePharmacyError}
        confirmText="Delete Pharmacy"
      />

      {/* Super Admin Assign Users Modal */}
      <Modal
        isOpen={isAssignUserModalOpen}
        onClose={() => setIsAssignUserModalOpen(false)}
        title="Assign Users to Pharmacy"
        size="md"
      >
        <form onSubmit={handleSaveAssignments} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800">
            <Users className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">
                Pharmacy Staff Delegation
              </p>
              <p className="mt-0.5 text-emerald-700">
                Grant or revoke user access to pharmacy dispensaries. Assigned
                users will be able to select and manage inventory within this
                pharmacy.
              </p>
            </div>
          </div>

          {assignErrorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{assignErrorMsg}</span>
            </div>
          )}

          {/* Select Target Pharmacy Dropdown */}
          <div>
            <label
              htmlFor="targetPharmacy"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Target Operating Pharmacy
            </label>
            <select
              id="targetPharmacy"
              value={selectedPharmacyIdForAssignment || ""}
              onChange={(e) => handlePharmacyChangeInModal(e.target.value)}
              className="input text-xs font-medium"
            >
              {pharmacyList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pharmacyName} ({getAssignedUsers(p.id).length} Users) -{" "}
                  {p.pharmacyCode}
                </option>
              ))}
            </select>
          </div>

          {/* Users List */}
          <SearchableChecklist
            label="Select Users"
            selectedCount={selectedUserIds.length}
            totalCount={assignableUsers.length}
            selectedIds={selectedUserIds}
            onToggle={handleToggleUser}
            onSelectAll={() =>
              setSelectedUserIds(assignableUsers.map((u) => u.id))
            }
            onDeselectAll={() => setSelectedUserIds([])}
            searchTerm={userSearchTerm}
            onSearchChange={setUserSearchTerm}
            placeholder="Search users by name, username, or email..."
            items={assignableUsers.filter((u) => {
              if (!userSearchTerm.trim()) return true;
              const term = userSearchTerm.toLowerCase();
              return (
                u.name.toLowerCase().includes(term) ||
                u.username.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                (u.role && u.role.toLowerCase().includes(term))
              );
            })}
            maxHeight="max-h-56"
            helperText="Checked staff will have access to select and manage inventory in this pharmacy upon logging in."
            emptyMessage={
              isLoadingUsers
                ? "Loading staff users from server..."
                : "No matching staff users found."
            }
            renderItem={(u, isChecked, toggleFn) => {
              const pharmCount = getUserPharmacyCount(u);

              return (
                <label
                  key={u.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-emerald-50/90 text-emerald-950 border border-emerald-200/90 shadow-2xs"
                      : "hover:bg-white text-gray-700 bg-white/70 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={toggleFn}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="truncate text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-900 truncate">
                          {u.name}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium shrink-0">
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        @{u.username} &bull; {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right ml-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      <Store className="w-2.5 h-2.5" />
                      {pharmCount} {pharmCount === 1 ? "pharmacy" : "pharmacies"}
                    </span>
                  </div>
                </label>
              );
            }}
          />

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isSavingAssignments}
              onClick={() => setIsAssignUserModalOpen(false)}
              className="btn-secondary text-xs cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingAssignments}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSavingAssignments ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Assignments</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Assignments Success Modal */}
      <SuccessModal
        isOpen={isAssignSuccessModalOpen}
        onClose={() => setIsAssignSuccessModalOpen(false)}
        title="Staff Assignments Updated!"
        message={`User delegation for ${assignSuccessData.pharmacyName} has been saved successfully.`}
        details={`${assignSuccessData.count} staff member(s) now have authorized access to operate in ${assignSuccessData.pharmacyName}.`}
        confirmText="Done"
      />
    </div>
  );
}

export default SelectPharmacy;
