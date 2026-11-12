import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  FilePlus,
  Building2,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Truck,
  User,
  Calendar,
  Layers,
  Pencil,
  AlertTriangle,
  Send,
  Pill,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import SuccessModal from "../../components/common/successModal";
import Dropdown from "../../components/common/dropdown";
import Skeleton from "../../components/common/skeleton";

// Services & Hooks
import useAuth from "../../hooks/useAuth";
import reorderQuotationService from "../../services/reorderQuotation";
import supplierService from "../../services/supplier";
import skuService from "../../services/sku";

const STATUS_BADGES = {
  Pending: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
    label: "Pending Review",
  },
  Approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
    label: "Approved (PO Created)",
  },
  Rejected: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: XCircle,
    label: "Rejected",
  },
  Cancelled: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: AlertCircle,
    label: "Cancelled",
  },
};

const DEFAULT_FORM_DATA = {
  supplierId: "",
  priority: "Normal",
  notes: "",
  items: [],
};

function ReorderQuotationPage() {
  const { facility, pharmacy } = useAuth();

  const currentFacilityName = useMemo(() => {
    return pharmacy?.pharmacyName || pharmacy?.name || facility?.name || "";
  }, [pharmacy, facility]);

  const targetPharmacyId = useMemo(() => {
    return pharmacy?.id || null;
  }, [pharmacy]);

  const supplierFacilityId = useMemo(() => {
    return facility?.id || pharmacy?.facilityId || null;
  }, [facility, pharmacy]);

  // Quotations List State
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("");

  // Suppliers & Catalog SKUs for Form
  const [supplierList, setSupplierList] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [skuCatalog, setSkuCatalog] = useState([]);
  const [isLoadingSkuCatalog, setIsLoadingSkuCatalog] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item Picker inside Form Modal
  const [selectedSkuToAdd, setSelectedSkuToAdd] = useState("");

  // View Details Modal
  const [selectedQuotationForView, setSelectedQuotationForView] =
    useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  // Cancel Confirmation Modal
  const [quotationToCancel, setQuotationToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch Quotations Paginated
  const fetchQuotations = useCallback(
    async (page = 1, search = "") => {
      if (!targetPharmacyId) {
        setQuotations([]);
        setIsLoadingQuotations(false);
        return;
      }
      try {
        setIsLoadingQuotations(true);
        const data = await reorderQuotationService.getQuotationsPaginated({
          pharmacyId: targetPharmacyId,
          supplierId: selectedSupplierFilter || undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
          search: search ? search.trim() : undefined,
          page: Math.max(0, page - 1),
          size: itemsPerPage,
          sortBy: "createdAt",
          sortDir: "DESC",
        });

        if (data && Array.isArray(data.content)) {
          setQuotations(data.content);
          setTotalPages(data.totalPages || 1);
          setTotalElements(data.totalElements || 0);
        } else {
          setQuotations([]);
          setTotalPages(1);
          setTotalElements(0);
        }
      } catch (err) {
        console.error("Failed to load reorder quotations:", err);
      } finally {
        setIsLoadingQuotations(false);
      }
    },
    [
      targetPharmacyId,
      selectedSupplierFilter,
      selectedStatus,
      selectedPriority,
      itemsPerPage,
    ],
  );

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchQuotations(currentPage, searchQuery);
      return;
    }
    const timer = setTimeout(() => {
      fetchQuotations(currentPage, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchQuotations, currentPage, searchQuery]);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    if (!supplierFacilityId) return;
    try {
      setIsLoadingSuppliers(true);
      const data = await supplierService.getAllSuppliers(supplierFacilityId);
      if (Array.isArray(data)) {
        setSupplierList(data);
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [supplierFacilityId]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const activeSuppliers = useMemo(() => {
    return supplierList.filter(
      (s) => !s.status || s.status.toLowerCase() === "active",
    );
  }, [supplierList]);

  // Fetch Sku Catalog for the pharmacy
  const fetchSkuCatalog = useCallback(async () => {
    if (!targetPharmacyId) return;
    try {
      setIsLoadingSkuCatalog(true);
      const data = await skuService.getDropdownSkus(targetPharmacyId);
      if (Array.isArray(data)) {
        setSkuCatalog(data);
      }
    } catch (err) {
      console.error("Failed to load SKU catalog for quotation:", err);
    } finally {
      setIsLoadingSkuCatalog(false);
    }
  }, [targetPharmacyId]);

  useEffect(() => {
    fetchSkuCatalog();
  }, [fetchSkuCatalog]);

  // Metrics for KPI Cards
  const pendingCount = useMemo(() => {
    return quotations.filter((q) => q.status === "Pending").length;
  }, [quotations]);

  const approvedCount = useMemo(() => {
    return quotations.filter((q) => q.status === "Approved").length;
  }, [quotations]);

  // Available SKUs not yet added to form
  const availableSkusForForm = useMemo(() => {
    const addedSkuIds = new Set(formData.items.map((i) => i.skuId));
    return skuCatalog.filter((sku) => !addedSkuIds.has(sku.id));
  }, [skuCatalog, formData.items]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingQuotationId(null);
    setFormData({
      supplierId: activeSuppliers[0]?.id ? String(activeSuppliers[0].id) : "",
      priority: "Normal",
      notes: "",
      items: [],
    });
    setFormErrors({});
    setSelectedSkuToAdd("");
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (quotation) => {
    setIsEditing(true);
    setEditingQuotationId(quotation.id);
    setFormData({
      supplierId: String(quotation.supplierId || ""),
      priority: quotation.priority || "Normal",
      notes: quotation.notes || "",
      items: (quotation.items || []).map((it) => ({
        skuId: it.skuId,
        skuCode: it.skuCode,
        brandName: it.brandName,
        genericName: it.genericName,
        dosage: it.dosageStrength || it.dosageForm,
        packagingUnit: it.packagingUnit,
        currentStock: it.currentStock,
        requestedUnits: it.requestedUnits,
        notes: it.notes || "",
      })),
    });
    setFormErrors({});
    setSelectedSkuToAdd("");
    setIsFormModalOpen(true);
  };

  // Add SKU to Quotation Form
  const handleAddItemToForm = (skuId) => {
    if (!skuId) return;
    const targetSku = skuCatalog.find((s) => String(s.id) === String(skuId));
    if (!targetSku) return;

    if (formData.items.some((i) => i.skuId === targetSku.id)) {
      setFormErrors((prev) => ({
        ...prev,
        itemAdd: "This medicine is already added to the quotation.",
      }));
      return;
    }

    const defaultQty =
      targetSku.maximumLevel && targetSku.currentStock !== undefined
        ? Math.max(1, targetSku.maximumLevel - targetSku.currentStock)
        : 10;

    const newItem = {
      skuId: targetSku.id,
      skuCode: targetSku.sku || targetSku.name,
      brandName: targetSku.brandName,
      genericName: targetSku.genericName,
      dosage: targetSku.dosage,
      packagingUnit: targetSku.packagingUnit,
      currentStock: targetSku.currentStock,
      requestedUnits: defaultQty,
      notes: "",
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setSelectedSkuToAdd("");
    setFormErrors((prev) => ({ ...prev, itemAdd: "", items: "" }));
  };

  // Remove SKU from Quotation Form
  const handleRemoveItemFromForm = (skuId) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.skuId !== skuId),
    }));
  };

  // Update item quantity
  const handleUpdateItemQty = (skuId, qty) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.skuId === skuId
          ? {
              ...i,
              requestedUnits:
                qty === "" ? "" : Math.max(1, parseInt(qty, 10) || 1),
            }
          : i,
      ),
    }));
  };

  // Update item note
  const handleUpdateItemNotes = (skuId, note) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.skuId === skuId ? { ...i, notes: note } : i,
      ),
    }));
  };

  // Computed Form Totals
  const totalFormUnits = useMemo(() => {
    return formData.items.reduce(
      (sum, i) => sum + (Number(i.requestedUnits) || 0),
      0,
    );
  }, [formData.items]);

  // Submit Form (Create or Update)
  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.supplierId) {
      errors.supplierId = "Please select a target supplier.";
    }
    if (!formData.items || formData.items.length === 0) {
      errors.items = "Please add at least one medicine item to the quotation.";
    }

    const hasInvalidQty = formData.items.some(
      (i) => !i.requestedUnits || Number(i.requestedUnits) < 1,
    );
    if (hasInvalidQty) {
      errors.items = "All items must have a requested quantity of at least 1.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        pharmacyId: targetPharmacyId,
        supplierId: Number(formData.supplierId),
        priority: formData.priority,
        notes: formData.notes ? formData.notes.trim() : "",
        items: formData.items.map((i) => ({
          skuId: i.skuId,
          requestedUnits: Number(i.requestedUnits),
          estimatedPrice: 0,
          notes: i.notes ? i.notes.trim() : "",
        })),
      };

      let result;
      if (isEditing && editingQuotationId) {
        result = await reorderQuotationService.updateQuotation(
          editingQuotationId,
          payload,
        );
      } else {
        result = await reorderQuotationService.createQuotation(payload);
      }

      setIsFormModalOpen(false);
      setSuccessInfo({
        quotationNumber: result.quotationNumber,
        supplierName: result.supplierName,
        totalUnits: result.totalUnits,
        totalItems: result.items?.length || formData.items.length,
        isEditing,
      });
      setIsSuccessModalOpen(true);
      fetchQuotations(1, searchQuery);
    } catch (err) {
      console.error("Failed to submit quotation:", err);
      setFormErrors({
        general:
          err.response?.data?.message ||
          err.message ||
          "Failed to submit reorder quotation. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open View Modal
  const handleOpenViewModal = async (quotation) => {
    try {
      const full = await reorderQuotationService.getQuotationById(quotation.id);
      setSelectedQuotationForView(full);
    } catch (err) {
      console.error("Failed to load quotation details:", err);
      setSelectedQuotationForView(quotation);
    }
    setIsViewModalOpen(true);
  };

  // Confirm Cancel Quotation
  const handleConfirmCancelQuotation = async () => {
    if (!quotationToCancel) return;
    try {
      setIsCancelling(true);
      await reorderQuotationService.cancelQuotation(quotationToCancel.id);
      setQuotationToCancel(null);
      fetchQuotations(currentPage, searchQuery);
    } catch (err) {
      console.error("Failed to cancel quotation:", err);
      alert(
        err.response?.data?.message ||
          "Failed to cancel quotation. Please try again.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-blue-600" />
              <span>Reorder Quotations</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Create supplier replenishment quotations and forward them to
            Procurement for Purchase Order generation
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchQuotations(currentPage, searchQuery)}
            disabled={isLoadingQuotations}
            className="btn-secondary p-2.5 text-gray-600 hover:text-blue-600 shadow-xs"
            title="Refresh Quotations"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingQuotations ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="btn-primary shadow-xs"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create Reorder Quotation</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up-1">
        {/* 1. Pending Review */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending Procurement Review
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                {pendingCount}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Awaiting PO Decision
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 2. Approved / Converted to PO */}
        <Card className="p-5 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all bg-linear-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Approved (PO Created)
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1.5">
                {approvedCount}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Converted to Orders
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 3. Total Quotations */}
        <Card className="p-5 border border-blue-200/80 shadow-xs hover:border-blue-300 transition-all bg-linear-to-br from-white to-blue-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Total Quotations
              </p>
              <h3 className="text-3xl font-extrabold text-blue-600 mt-1.5">
                {totalElements}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 mt-1 bg-blue-100/70 px-2 py-0.5 rounded-full">
                <Layers className="w-3 h-3" /> All Pharmacist Submissions
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Workspace Card */}
      <Card className="p-0 overflow-hidden border border-gray-200 animate-slide-up-2">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search quotation #, supplier, drug name..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Status Filter */}
            <Dropdown
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-full sm:w-40"
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "Pending", label: "Pending Review" },
                { value: "Approved", label: "Approved (PO Created)" },
                { value: "Rejected", label: "Rejected" },
                { value: "Cancelled", label: "Cancelled" },
              ]}
            />

            {/* Priority Filter */}
            <Dropdown
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-full sm:w-36"
              options={[
                { value: "ALL", label: "All Priorities" },
                { value: "Normal", label: "Normal Priority" },
                { value: "Urgent", label: "Urgent Priority" },
              ]}
            />

            {/* Supplier Filter */}
            <Dropdown
              value={selectedSupplierFilter}
              onChange={(e) => {
                setSelectedSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              size="sm"
              className="w-full sm:w-44"
              options={[
                { value: "", label: "All Suppliers" },
                ...activeSuppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          </div>
        </div>

        {/* Quotations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Quotation # & Date
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Assigned Supplier
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Total Items & Units
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Priority
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status & PO Ref
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoadingQuotations ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Skeleton className="h-8 w-20 ml-auto rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : quotations.length > 0 ? (
                quotations.map((quotation, index) => {
                  const badge =
                    STATUS_BADGES[quotation.status] || STATUS_BADGES.Pending;
                  const BadgeIcon = badge.icon;
                  const isPending = quotation.status === "Pending";

                  return (
                    <tr
                      key={quotation.id}
                      className="hover:bg-blue-50/30 transition-colors animate-slide-up"
                      style={{ animationDelay: `${index * 0.04}s` }}
                    >
                      {/* Quotation Number & Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                            {quotation.quotationNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {quotation.createdAt
                              ? new Date(
                                  quotation.createdAt,
                                ).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>{quotation.userName || "Pharmacist"}</span>
                        </div>
                      </td>

                      {/* Assigned Supplier */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-900 text-xs">
                            {quotation.supplierName || "Unassigned"}
                          </span>
                        </div>
                      </td>

                      {/* Total Items & Units */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-800">
                          {quotation.items?.length || 0} Medicine
                          {(quotation.items?.length || 0) !== 1 ? "s" : ""}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                          {Number(quotation.totalUnits || 0).toLocaleString()}{" "}
                          total units
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            quotation.priority === "Urgent"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {quotation.priority || "Normal"}
                        </span>
                      </td>

                      {/* Status & Linked PO */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                        {quotation.purchaseOrderNum && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-emerald-700 font-mono font-semibold">
                              PO: {quotation.purchaseOrderNum}
                            </span>
                            {quotation.purchaseOrderStatus && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                  quotation.purchaseOrderStatus === "Received"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : quotation.purchaseOrderStatus === "Approved"
                                      ? "bg-blue-100 text-blue-800"
                                      : quotation.purchaseOrderStatus === "Partially_Received"
                                        ? "bg-purple-100 text-purple-800"
                                        : quotation.purchaseOrderStatus === "Denied"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {quotation.purchaseOrderStatus.replace("_", " ")}
                              </span>
                            )}
                          </div>
                        )}
                        {quotation.rejectionReason && (
                          <div
                            className="text-[11px] text-red-600 truncate max-w-xs mt-1 italic"
                            title={quotation.rejectionReason}
                          >
                            Reason: {quotation.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(quotation)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 cursor-pointer"
                            title="View Quotation Details"
                            aria-label={`View quotation ${quotation.quotationNumber}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(quotation)}
                                className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 cursor-pointer"
                                title="Edit Quotation"
                                aria-label={`Edit quotation ${quotation.quotationNumber}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuotationToCancel(quotation)}
                                className="btn-secondary p-1.5 text-gray-600 hover:text-red-600 cursor-pointer"
                                title="Cancel Quotation"
                                aria-label={`Cancel quotation ${quotation.quotationNumber}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-base font-semibold text-gray-700">
                      No reorder quotations found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Create a replenishment quotation to forward SKU requests
                      to the Procurement Officer.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalElements}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 1. MODAL: CREATE / EDIT REORDER QUOTATION                */}
      {/* ======================================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={
          isEditing
            ? `Edit Reorder Quotation (${formData.items.length} Medicines)`
            : "Create Reorder Quotation"
        }
        size="4xl"
      >
        <form onSubmit={handleSubmitQuotation} className="space-y-4 text-xs">
          {formErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {formErrors.general}
            </div>
          )}

          {/* Supplier, Facility & Priority Controls */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Dropdown
                id="quote-supplier"
                name="supplierId"
                label="Target Supplier"
                required
                value={formData.supplierId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplierId: e.target.value,
                  }))
                }
                size="sm"
                options={
                  isLoadingSuppliers && activeSuppliers.length === 0
                    ? [{ value: "", label: "Loading suppliers..." }]
                    : activeSuppliers.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))
                }
              />
              {formErrors.supplierId && (
                <p className="text-red-500 text-[11px] mt-1">
                  {formErrors.supplierId}
                </p>
              )}
            </div>

            <div>
              <Dropdown
                id="quote-priority"
                name="priority"
                label="Priority"
                required
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: e.target.value,
                  }))
                }
                size="sm"
                options={[
                  { value: "Normal", label: "Normal (Standard Lead Time)" },
                  { value: "Urgent", label: "Urgent (Priority Order)" },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="quote-notes"
                className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Clinical Remarks / Justification (Optional)
              </label>
              <textarea
                id="quote-notes"
                rows="2"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="State any specific urgency, clinic department demand, or vendor agreements..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
              />
            </div>
          </div>

          {/* Section: Select Medicines */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Medicines to Quote ({formData.items.length})
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  Total Units: {totalFormUnits.toLocaleString()}
                </span>
              </div>

              {/* Add Medicine Dropdown */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Dropdown
                  value={selectedSkuToAdd}
                  onChange={(e) => setSelectedSkuToAdd(e.target.value)}
                  placeholder="+ Add medicine from catalog"
                  size="sm"
                  className="w-full sm:w-72"
                  options={availableSkusForForm.map((s) => ({
                    value: s.id,
                    label: `${s.brandName || s.name} (${s.sku || s.name}) — Stock: ${s.currentStock}`,
                  }))}
                />
                <button
                  type="button"
                  onClick={() => handleAddItemToForm(selectedSkuToAdd)}
                  disabled={!selectedSkuToAdd}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {formErrors.itemAdd && (
              <p className="text-xs text-amber-600">{formErrors.itemAdd}</p>
            )}
            {formErrors.items && (
              <p className="text-xs text-red-500">{formErrors.items}</p>
            )}

            {/* Medicines List Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Medication & SKU</th>
                    <th className="px-3.5 py-2.5 w-24">Current Stock</th>
                    <th className="px-3.5 py-2.5 w-32">Requested Units *</th>
                    <th className="px-3.5 py-2.5 w-48">Item Remark</th>
                    <th className="px-3.5 py-2.5 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {formData.items.length > 0 ? (
                    formData.items.map((item) => (
                      <tr key={item.skuId} className="hover:bg-gray-50/80">
                        {/* Medication info */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">
                              {item.brandName || item.skuCode}
                            </span>
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                              {item.skuCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {item.genericName}{" "}
                            {item.dosage && `• ${item.dosage}`}
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="px-3.5 py-2.5 font-mono text-gray-700">
                          {item.currentStock ?? "—"}
                        </td>

                        {/* Requested Units */}
                        <td className="px-3.5 py-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.requestedUnits}
                            onChange={(e) =>
                              handleUpdateItemQty(item.skuId, e.target.value)
                            }
                            required
                            className="w-24 px-2 py-1 border border-gray-300 rounded font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>

                        {/* Item remark */}
                        <td className="px-3.5 py-2.5">
                          <input
                            type="text"
                            placeholder="Reason (e.g. ICU spike)"
                            value={item.notes}
                            onChange={(e) =>
                              handleUpdateItemNotes(item.skuId, e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </td>

                        {/* Remove */}
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromForm(item.skuId)}
                            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        <Pill className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                        No medicines added yet. Use the dropdown above to add
                        items to quote.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {formData.items.length > 0 && (
                <span>
                  Total items: <strong>{formData.items.length}</strong> (
                  <strong className="text-blue-700 font-mono">
                    {totalFormUnits.toLocaleString()}
                  </strong>{" "}
                  units)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="btn-secondary text-xs"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || formData.items.length === 0}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isEditing ? "Save Changes" : "Submit Quotation"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: VIEW QUOTATION DETAILS                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewModalOpen && Boolean(selectedQuotationForView)}
        onClose={() => setIsViewModalOpen(false)}
        title="Reorder Quotation Details"
        size="3xl"
      >
        {selectedQuotationForView && (
          <div className="space-y-4 text-xs">
            {/* Header Status Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {selectedQuotationForView.quotationNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        STATUS_BADGES[selectedQuotationForView.status]?.bg
                      } ${STATUS_BADGES[selectedQuotationForView.status]?.text}`}
                    >
                      {STATUS_BADGES[selectedQuotationForView.status]?.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Target Supplier:{" "}
                    <strong>{selectedQuotationForView.supplierName}</strong>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Priority
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedQuotationForView.priority === "Urgent"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {selectedQuotationForView.priority || "Normal"}
                </span>
              </div>
            </div>

            {/* Approved / Converted Banner */}
            {selectedQuotationForView.purchaseOrderNum && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Converted into Purchase Order #{selectedQuotationForView.purchaseOrderNum}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Procurement approved this quotation and scheduled replenishment.
                    </p>
                  </div>
                </div>
                {selectedQuotationForView.purchaseOrderStatus && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border shadow-xs ${
                      selectedQuotationForView.purchaseOrderStatus === "Received"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : selectedQuotationForView.purchaseOrderStatus === "Approved"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : selectedQuotationForView.purchaseOrderStatus === "Partially_Received"
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : selectedQuotationForView.purchaseOrderStatus === "Denied"
                              ? "bg-red-100 text-red-800 border-red-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    PO Status: {selectedQuotationForView.purchaseOrderStatus.replace("_", " ")}
                  </span>
                )}
              </div>
            )}

            {/* Rejection Banner */}
            {selectedQuotationForView.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-900">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-bold">
                    Procurement Rejection Justification
                  </p>
                  <p className="text-[11px] text-red-700 italic">
                    "{selectedQuotationForView.rejectionReason}"
                  </p>
                </div>
              </div>
            )}

            {/* Metadata info */}
            <div
              className={`grid grid-cols-2 ${
                Number(selectedQuotationForView.estimatedTotalCost || 0) > 0
                  ? "sm:grid-cols-4"
                  : "sm:grid-cols-3"
              } gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-600`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Created By
                </span>
                <span className="font-semibold text-gray-800">
                  {selectedQuotationForView.userName || "Pharmacist"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Created At
                </span>
                <span className="font-semibold text-gray-800">
                  {selectedQuotationForView.createdAt
                    ? new Date(
                        selectedQuotationForView.createdAt,
                      ).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Total Units
                </span>
                <span className="font-bold text-blue-700 font-mono">
                  {Number(
                    selectedQuotationForView.totalUnits || 0,
                  ).toLocaleString()}{" "}
                  units
                </span>
              </div>
              {Number(selectedQuotationForView.estimatedTotalCost || 0) > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Total Quoted Cost
                  </span>
                  <span className="font-bold text-emerald-700 font-mono">
                    ₱{Number(
                      selectedQuotationForView.estimatedTotalCost,
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Clinical remarks */}
            {selectedQuotationForView.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Pharmacist Notes & Remarks
                </span>
                <p className="text-gray-700 italic whitespace-pre-wrap">
                  "{selectedQuotationForView.notes}"
                </p>
              </div>
            )}

            {/* Items Table */}
            {(() => {
              const hasQuotedPrices = (selectedQuotationForView.items || []).some(
                (item) => Number(item.estimatedPrice || 0) > 0,
              );
              return (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="px-3.5 py-2.5">Medication & SKU</th>
                        <th className="px-3.5 py-2.5">Current Stock</th>
                        <th className="px-3.5 py-2.5">Requested Units</th>
                        {hasQuotedPrices && (
                          <th className="px-3.5 py-2.5">Quoted Price (₱)</th>
                        )}
                        <th className="px-3.5 py-2.5">Item Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(selectedQuotationForView.items || []).map((item) => (
                        <tr
                          key={item.id || item.skuId}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-3.5 py-2.5">
                            <div className="font-bold text-gray-900">
                              {item.brandName || item.skuCode}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {item.skuCode} {item.dosage && `• ${item.dosage}`}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono">
                            {item.currentStock ?? "—"}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-blue-700 font-mono">
                            {item.requestedUnits} units
                          </td>
                          {hasQuotedPrices && (
                            <td className="px-3.5 py-2.5 font-mono">
                              {item.estimatedPrice && Number(item.estimatedPrice) > 0 ? (
                                <div>
                                  <span className="font-bold text-gray-900">
                                    ₱{Number(item.estimatedPrice).toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      },
                                    )}
                                  </span>
                                  {item.estimatedPricePerUnit > 0 && (
                                    <span className="text-[10px] text-gray-500 block">
                                      ₱{Number(
                                        item.estimatedPricePerUnit,
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}{" "}
                                      / unit
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-3.5 py-2.5 text-gray-500 italic">
                            {item.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 3. MODAL: SUCCESS CONFIRMATION                           */}
      {/* ======================================================== */}
      {successInfo && (
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => {
            setIsSuccessModalOpen(false);
            setSuccessInfo(null);
          }}
          title={
            successInfo.isEditing
              ? "Quotation Updated Successfully"
              : "Reorder Quotation Submitted"
          }
          message={`Quotation ${successInfo.quotationNumber} for supplier '${successInfo.supplierName}' (${successInfo.totalItems} medicines, ${successInfo.totalUnits} units) has been forwarded to Procurement for review.`}
        />
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: CANCEL CONFIRMATION                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(quotationToCancel)}
        onClose={() => setQuotationToCancel(null)}
        title="Cancel Reorder Quotation"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">
                Cancel {quotationToCancel?.quotationNumber}?
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Are you sure you want to cancel this pending replenishment
                quotation? Procurement will no longer process it into a Purchase
                Order.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setQuotationToCancel(null)}
              className="btn-secondary text-xs"
              disabled={isCancelling}
            >
              Keep Quotation
            </button>
            <button
              type="button"
              onClick={handleConfirmCancelQuotation}
              disabled={isCancelling}
              className="btn-danger text-xs flex items-center gap-1.5 shadow-xs"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Cancel Quotation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ReorderQuotationPage;
