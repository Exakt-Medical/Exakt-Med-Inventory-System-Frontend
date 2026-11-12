import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle,
  AlertCircle,
  PackagePlus,
  ShoppingCart,
  Pill,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Clock,
  Send,
  Eye,
  Trash2,
  Plus,
  Layers,
  CheckSquare,
  Square,
  ListPlus,
  ClipboardList,
  User,
  RefreshCw,
  FileText,
  XCircle,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import SuccessModal from "../../components/common/successModal";
import Dropdown from "../../components/common/dropdown";
import Skeleton from "../../components/common/skeleton";
import ComboBox from "../../components/common/comboBox";

// Constants & Helper Imports
import { getStockStatus } from "../../helpers/inventory";
import { DEFAULT_ORDER_FORM } from "../../utils/constants";
import useAuth from "../../hooks/useAuth";
import skuService from "../../services/sku";
import supplierService from "../../services/supplier";
import orderService from "../../services/order";
import reorderQuotationService from "../../services/reorderQuotation";

const extractDosageFromDescription = (description) => {
  if (!description) return "";

  const singleDosePattern =
    /(?:\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|iu|units?|u|meq|mmol)(?:\s*\/\s*\d*(?:\.\d+)?\s*(?:ml|l|g|dose|actuation|drop|spray))?\b)/i;

  const comboPattern = new RegExp(
    `${singleDosePattern.source}(?:\\s*\\+\\s*${singleDosePattern.source})+`,
    "i",
  );

  const comboMatch = description.match(comboPattern);
  if (comboMatch) {
    return comboMatch[0].trim();
  }

  const formKeywords =
    /(TABLET|CAPSULE|OINTMENT|CREAM|SYRUP|SUSPENSION|SOLUTION|INJECTION|DROPS|GEL|LOTION|INHALER|PATCH|SUPPOSITORY|POWDER|SHAMPOO)/i;
  const formIndex = description.search(formKeywords);

  const unitPatternGlobal = new RegExp(singleDosePattern.source, "gi");

  if (formIndex > 0) {
    const textBeforeForm = description.substring(0, formIndex);
    const matchesBefore = textBeforeForm.match(unitPatternGlobal);
    if (matchesBefore && matchesBefore.length > 0) {
      return matchesBefore[0].trim();
    }
  }

  const allMatches = description.match(unitPatternGlobal);
  if (allMatches && allMatches.length > 0) {
    const nonPackMatches = allMatches.filter((m) => {
      const regex = new RegExp(
        `${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:bottle|tube|vial|ampoule|pack|box|bag|canister)`,
        "i",
      );
      return !regex.test(description);
    });
    if (nonPackMatches.length > 0) {
      return nonPackMatches[0].trim();
    }
    return allMatches[0].trim();
  }

  return "";
};

const mapDtoToSku = (dto) => {
  return {
    id: dto.id,
    sku: dto.name || "",
    name: dto.name || "",
    medicineId: dto.medicineId,
    brandName: dto.brandName || "",
    genericName: dto.drugDescription || "",
    dosage:
      dto.dosageStrength ||
      extractDosageFromDescription(dto.drugDescription) ||
      "",
    dosageStrength:
      dto.dosageStrength ||
      extractDosageFromDescription(dto.drugDescription) ||
      "",
    dosageForm: dto.dosageForm || "",
    packagingUnit: dto.packagingUnit || "",
    type: dto.dosageForm || "General",
    currentStock: Number(dto.units ?? 0),
    units: Number(dto.units ?? 0),
    minimumLevel: Number(dto.minimumLevel ?? 0),
    reorderLevel: Number(dto.reorderLevel ?? 0),
    maximumLevel: Number(dto.maximumLevel ?? 0),
    pharmacyId: dto.pharmacyId,
    pharmacy: dto.pharmacyName || "",
    facilityId: dto.facilityId,
    facility: dto.pharmacyName || dto.facilityName || "",
    status: "Active",
    createdAt: dto.createdAt
      ? String(dto.createdAt).split("T")[0]
      : new Date().toISOString().split("T")[0],
    updatedAt: dto.updatedAt ? String(dto.updatedAt).split("T")[0] : "",
  };
};

function OrderRequest() {
  const { facility, pharmacy } = useAuth();

  // Automatically detect current active pharmacy
  const currentFacilityName = useMemo(() => {
    return pharmacy?.pharmacyName || pharmacy?.name || facility?.name || "";
  }, [pharmacy, facility]);

  const targetPharmacyId = useMemo(() => {
    return pharmacy?.id || null;
  }, [pharmacy]);

  const supplierFacilityId = useMemo(() => {
    return facility?.id || pharmacy?.facilityId || null;
  }, [facility, pharmacy]);

  const [skuList, setSkuList] = useState([]);
  const [isLoadingSkus, setIsLoadingSkus] = useState(true);
  const [skuError, setSkuError] = useState(null);
  const [supplierList, setSupplierList] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch SKUs that need reordering from backend API (excluding active Pending/Approved orders)
  const fetchSkus = useCallback(
    async (query = "") => {
      try {
        setIsLoadingSkus(true);
        setSkuError(null);

        if (!targetPharmacyId) {
          setSkuList([]);
          return;
        }

        const data = await skuService.getReorderNeededSkus(
          targetPharmacyId,
          query ? query.trim() : "",
        );

        if (Array.isArray(data)) {
          setSkuList(data.map(mapDtoToSku));
        }
      } catch (err) {
        console.error("Failed to load SKUs in Order Request:", err);
        setSkuError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load SKUs from server.",
        );
      } finally {
        setIsLoadingSkus(false);
      }
    },
    [targetPharmacyId, currentFacilityName],
  );

  const initialSkuFetchDone = useRef(false);

  // Debounced search when user types in search bar (immediate on mount)
  useEffect(() => {
    if (!initialSkuFetchDone.current) {
      initialSkuFetchDone.current = true;
      fetchSkus("");
      return;
    }

    const timer = setTimeout(() => {
      fetchSkus(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSkus]);

  // Fetch suppliers from backend API
  const fetchSuppliers = useCallback(async () => {
    if (!supplierFacilityId) {
      setSupplierList([]);
      return;
    }
    try {
      setIsLoadingSuppliers(true);
      const data = await supplierService.getAllSuppliers(supplierFacilityId);
      if (Array.isArray(data)) {
        setSupplierList(data);
      }
    } catch (err) {
      console.error("Failed to load suppliers in Order Request:", err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [supplierFacilityId]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filter active suppliers, fallback to all suppliers in list if none explicitly active
  const activeSuppliers = useMemo(() => {
    const active = supplierList.filter(
      (s) => !s.status || s.status.toLowerCase() === "active",
    );
    return active.length > 0 ? active : supplierList;
  }, [supplierList]);

  // Filter SKUs that reference the current active facility
  const currentFacilitySkus = useMemo(() => {
    if (!targetPharmacyId) return [];
    return skuList.filter((s) => s.pharmacyId === targetPharmacyId);
  }, [skuList, targetPharmacyId]);

  // Multi-Selection State for Table Checkboxes
  const [selectedSkuIds, setSelectedSkuIds] = useState([]);

  // Modal States
  const [selectedSkuForView, setSelectedSkuForView] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'order' | 'view' | 'success' | null
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Multi-Item Order Form State
  const [orderForm, setOrderForm] = useState({
    ...DEFAULT_ORDER_FORM,
    supplierId: "",
    targetFacility: currentFacilityName,
  });
  const [formErrors, setFormErrors] = useState({});

  // Additional SKU Selector inside Modal
  const [skuToAdd, setSkuToAdd] = useState("");

  // Navigation Tabs: "quotations" | "thresholds"
  const [activeTab, setActiveTab] = useState("quotations");

  // Reorder Quotations State
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [quotationSearchQuery, setQuotationSearchQuery] = useState("");
  const [quotationStatusFilter, setQuotationStatusFilter] = useState("ALL");
  const [quotationPriorityFilter, setQuotationPriorityFilter] = useState("ALL");
  const [quotationCurrentPage, setQuotationCurrentPage] = useState(1);
  const [quotationTotalPages, setQuotationTotalPages] = useState(1);
  const [quotationTotalElements, setQuotationTotalElements] = useState(0);

  // Conversion / PO Generation Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [quotationToConvert, setQuotationToConvert] = useState(null);
  const [convertFormData, setConvertFormData] = useState({
    supplierId: "",
    priority: "Normal",
    notes: "",
    items: [],
  });
  const [isSubmittingConversion, setIsSubmittingConversion] = useState(false);
  const [convertFormErrors, setConvertFormErrors] = useState({});

  // Reject Quotation Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [quotationToReject, setQuotationToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // View Quotation Details Modal State
  const [selectedQuotationForView, setSelectedQuotationForView] = useState(null);
  const [isViewQuotationModalOpen, setIsViewQuotationModalOpen] = useState(false);

  // Fetch Reorder Quotations Paginated
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
          status:
            quotationStatusFilter !== "ALL" ? quotationStatusFilter : undefined,
          priority:
            quotationPriorityFilter !== "ALL"
              ? quotationPriorityFilter
              : undefined,
          search: search ? search.trim() : undefined,
          page: Math.max(0, page - 1),
          size: 6,
          sortBy: "createdAt",
          sortDir: "DESC",
        });

        if (data && Array.isArray(data.content)) {
          setQuotations(data.content);
          setQuotationTotalPages(data.totalPages || 1);
          setQuotationTotalElements(data.totalElements || 0);
        } else {
          setQuotations([]);
          setQuotationTotalPages(1);
          setQuotationTotalElements(0);
        }
      } catch (err) {
        console.error("Failed to load quotations:", err);
      } finally {
        setIsLoadingQuotations(false);
      }
    },
    [targetPharmacyId, quotationStatusFilter, quotationPriorityFilter],
  );

  const initialQuotationFetchDone = useRef(false);

  useEffect(() => {
    if (!initialQuotationFetchDone.current) {
      initialQuotationFetchDone.current = true;
      fetchQuotations(quotationCurrentPage, quotationSearchQuery);
      return;
    }
    const timer = setTimeout(() => {
      fetchQuotations(quotationCurrentPage, quotationSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchQuotations, quotationCurrentPage, quotationSearchQuery]);

  // Count pending quotations awaiting review
  const pendingQuotationsCount = useMemo(() => {
    return quotations.filter((q) => q.status === "Pending").length;
  }, [quotations]);

  // Conversion Handlers (Review quotation, remove SKUs, set prices, convert to PO)
  const handleOpenConvertModal = (quotation) => {
    setQuotationToConvert(quotation);
    setConvertFormData({
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
        orderedUnits: it.requestedUnits,
        price: it.estimatedPrice || "",
      })),
    });
    setConvertFormErrors({});
    setIsConvertModalOpen(true);
  };

  const handleRemoveItemFromConversion = (skuId) => {
    setConvertFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.skuId !== skuId),
    }));
  };

  const handleUpdateItemQtyInConversion = (skuId, qty) => {
    setConvertFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.skuId === skuId
          ? {
              ...i,
              orderedUnits:
                qty === "" ? "" : Math.max(1, parseInt(qty, 10) || 1),
            }
          : i,
      ),
    }));
  };

  const handleUpdateItemPriceInConversion = (skuId, price) => {
    setConvertFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.skuId === skuId ? { ...i, price } : i,
      ),
    }));
  };

  const computedConversionTotalUnits = useMemo(() => {
    return convertFormData.items.reduce(
      (sum, i) => sum + (Number(i.orderedUnits) || 0),
      0,
    );
  }, [convertFormData.items]);

  const computedConversionTotalCost = useMemo(() => {
    return convertFormData.items.reduce(
      (sum, i) => sum + (Number(i.price) || 0),
      0,
    );
  }, [convertFormData.items]);

  const handleSubmitConversion = async (e) => {
    e.preventDefault();
    if (!convertFormData.items || convertFormData.items.length === 0) {
      setConvertFormErrors({
        general: "Please include at least one medicine item in the purchase order.",
      });
      return;
    }

    const missingPriceItem = convertFormData.items.find(
      (it) => !it.price || Number(it.price) <= 0,
    );
    if (missingPriceItem) {
      setConvertFormErrors({
        general: `Please enter the negotiated total price for "${missingPriceItem.brandName || missingPriceItem.skuCode}" before generating the purchase order.`,
      });
      return;
    }

    try {
      setIsSubmittingConversion(true);
      const payload = {
        supplierId: Number(convertFormData.supplierId),
        priority: convertFormData.priority,
        notes: convertFormData.notes,
        totalPrice: computedConversionTotalCost,
        items: convertFormData.items.map((i) => ({
          skuId: i.skuId,
          orderedUnits: Number(i.orderedUnits) || 1,
          price: Number(i.price) || 0,
        })),
      };

      const result = await reorderQuotationService.convertToOrder(
        quotationToConvert.id,
        payload,
      );

      setIsConvertModalOpen(false);

      // Show success modal with the created PO
      setSubmittedOrder({
        orderId: result.purchaseOrderNum || `PO-${Date.now()}`,
        status: "Pending",
        supplierName: result.supplierName || "Assigned Supplier",
        targetFacility: currentFacilityName,
        totalCost: computedConversionTotalCost,
        totalUnits: computedConversionTotalUnits,
        items: convertFormData.items.map((i) => ({
          sku: i.skuCode,
          brandName: i.brandName,
          dosage: i.dosage,
          quantity: i.orderedUnits,
          price: i.price,
        })),
      });
      setModalMode("success");
      fetchQuotations(quotationCurrentPage, quotationSearchQuery);
      fetchSkus(searchQuery);
    } catch (err) {
      console.error("Failed to convert quotation to PO:", err);
      setConvertFormErrors({
        general:
          err.response?.data?.message ||
          err.message ||
          "Failed to convert quotation. Please try again.",
      });
    } finally {
      setIsSubmittingConversion(false);
    }
  };

  // Reject Modal Handlers
  const handleOpenRejectModal = (quotation) => {
    setQuotationToReject(quotation);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    try {
      setIsSubmittingReject(true);
      await reorderQuotationService.rejectQuotation(quotationToReject.id, {
        rejectionReason: rejectionReason.trim(),
      });
      setIsRejectModalOpen(false);
      setQuotationToReject(null);
      fetchQuotations(quotationCurrentPage, quotationSearchQuery);
    } catch (err) {
      console.error("Failed to reject quotation:", err);
      alert(
        err.response?.data?.message ||
          "Failed to reject quotation. Please try again.",
      );
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // View Quotation Details
  const handleOpenViewQuotationModal = async (quotation) => {
    try {
      const full = await reorderQuotationService.getQuotationById(quotation.id);
      setSelectedQuotationForView(full);
    } catch (err) {
      console.error("Failed to load quotation details:", err);
      setSelectedQuotationForView(quotation);
    }
    setIsViewQuotationModalOpen(true);
  };

  // 1. Total Minimum SKUs for Current Facility (currentStock <= minimumLevel)
  const totalMinimumSkus = useMemo(() => {
    return currentFacilitySkus.filter((s) => s.currentStock <= s.minimumLevel)
      .length;
  }, [currentFacilitySkus]);

  // 2. Total Needs Reorder SKUs for Current Facility (currentStock <= reorderLevel)
  const totalNeedsReorderSkus = useMemo(() => {
    return currentFacilitySkus.filter((s) => s.currentStock <= s.reorderLevel)
      .length;
  }, [currentFacilitySkus]);

  // Filtered List: Only display SKUs for current facility that need reordering (currentStock <= reorderLevel)
  const reorderSkus = useMemo(() => {
    return currentFacilitySkus.filter((item) => {
      const needsReorder = item.currentStock <= item.reorderLevel;
      if (!needsReorder) return false;

      const matchesSearch =
        !searchQuery.trim() ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dosage.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesUrgency = true;
      if (selectedUrgency === "MINIMUM") {
        matchesUrgency = item.currentStock <= item.minimumLevel;
      } else if (selectedUrgency === "REORDER_ONLY") {
        matchesUrgency =
          item.currentStock <= item.reorderLevel &&
          item.currentStock > item.minimumLevel;
      }

      return matchesSearch && matchesUrgency;
    });
  }, [currentFacilitySkus, searchQuery, selectedUrgency]);

  // Pagination calculation
  const totalPages = Math.ceil(reorderSkus.length / itemsPerPage) || 1;
  const paginatedReorderSkus = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return reorderSkus.slice(startIndex, startIndex + itemsPerPage);
  }, [reorderSkus, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleUrgencyChange = (e) => {
    setSelectedUrgency(e.target.value);
    setCurrentPage(1);
  };

  // Checkbox Selection Handlers
  const handleToggleSelectSku = (skuId) => {
    setSelectedSkuIds((prev) =>
      prev.includes(skuId)
        ? prev.filter((id) => id !== skuId)
        : [...prev, skuId],
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = paginatedReorderSkus.map((s) => s.id);
    const allSelected = visibleIds.every((id) => selectedSkuIds.includes(id));
    if (allSelected) {
      setSelectedSkuIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedSkuIds((prev) => [
        ...prev,
        ...visibleIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSelectAllCritical = () => {
    const criticalIds = currentFacilitySkus
      .filter((s) => s.currentStock <= s.minimumLevel)
      .map((s) => s.id);
    setSelectedSkuIds(criticalIds);
  };

  // Helper to build line item with suggested quantity (Maximum Level - Current Stock)
  const buildLineItem = (sku) => {
    const max = Number(sku.maximumLevel) || 0;
    const current = Number(sku.currentStock) || 0;
    const defaultQty =
      sku.maximumLevel !== undefined && sku.currentStock !== undefined
        ? Math.max(1, max - current)
        : 1;

    return {
      rowId: `catalog_${sku.id || sku.sku}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      id: sku.id,
      sku: sku.sku,
      brandName: sku.brandName,
      genericName: sku.genericName,
      dosage: sku.dosage,
      dosageForm: sku.dosageForm,
      packagingUnit: sku.packagingUnit,
      currentStock: sku.currentStock,
      minimumLevel: sku.minimumLevel,
      maximumLevel: sku.maximumLevel,
      reorderLevel: sku.reorderLevel,
      quantity: defaultQty,
      price: "",
      isCatalogOrder: true,
    };
  };

  // Open Multi-Item Requisition Modal with selected items (or empty list by default)
  const handleOpenMultiOrderModal = (initialSkusToOrder = []) => {
    let itemsToInclude = [];

    if (Array.isArray(initialSkusToOrder) && initialSkusToOrder.length > 0) {
      itemsToInclude = initialSkusToOrder.map(buildLineItem);
    }

    const hasCritical = itemsToInclude.some(
      (item) => item.currentStock <= item.minimumLevel,
    );

    setOrderForm({
      supplierId: activeSuppliers[0]?.id
        ? String(activeSuppliers[0].id)
        : supplierList[0]?.id
          ? String(supplierList[0].id)
          : "",
      targetFacility: currentFacilityName,
      priority: hasCritical ? "Urgent" : "Normal",
      totalCost: "",
      notes: "",
      items: itemsToInclude,
    });
    setFormErrors({});
    setSkuToAdd("");
    setModalMode("order");
  };

  // Open Order Modal for a single row button
  const handleOpenSingleOrderModal = (sku) => {
    handleOpenMultiOrderModal([sku]);
  };

  // Open View SKU Threshold Diagnostics Modal
  const handleOpenViewModal = (sku) => {
    setSelectedSkuForView(sku);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSkuForView(null);
    setFormErrors({});
    setSkuToAdd("");
  };

  // Add Item to Order Form within the Modal from SKU Catalog
  const handleAddItemToForm = (skuCode) => {
    if (!skuCode) return;
    const targetSku = currentFacilitySkus.find((s) => s.sku === skuCode);
    if (!targetSku) return;

    if (
      orderForm.items.some((i) => i.sku === targetSku.sku)
    ) {
      setFormErrors((prev) => ({
        ...prev,
        itemAdd:
          "A standard inventory row for this medicine is already in the order.",
      }));
      return;
    }

    setOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, buildLineItem(targetSku)],
    }));
    setFormErrors((prev) => ({ ...prev, itemAdd: "", items: "" }));
    setSkuToAdd("");
  };

  // Remove Item from Order Form within the Modal (using rowKey)
  const handleRemoveItemFromForm = (rowKey) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => (i.rowId || i.sku) !== rowKey),
    }));
  };

  // Update item quantity in Order Form (using rowKey)
  const handleUpdateItemQuantity = (rowKey, qty) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        (i.rowId || i.sku) === rowKey
          ? {
              ...i,
              quantity: qty === "" ? "" : Math.max(1, parseInt(qty, 10) || 1),
            }
          : i,
      ),
    }));
  };

  // Update item price in Order Form (using rowKey)
  const handleUpdateItemPrice = (rowKey, price) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        (i.rowId || i.sku) === rowKey ? { ...i, price } : i,
      ),
    }));
  };

  // Total Units in the current Order Form
  const totalFormUnits = useMemo(() => {
    return orderForm.items.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0),
      0,
    );
  }, [orderForm.items]);

  // Total Quoted Cost in the current Order Form (auto-calculated from sum of item prices)
  const computedTotalCost = useMemo(() => {
    return orderForm.items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  }, [orderForm.items]);

  // Available SKUs that need restocking in active facility and haven't had a standard order row added yet
  const availableSkusToAdd = useMemo(() => {
    const addedCatalogSkus = new Set(orderForm.items.map((i) => i.sku));
    return currentFacilitySkus.filter(
      (s) => s.currentStock <= s.reorderLevel && !addedCatalogSkus.has(s.sku),
    );
  }, [currentFacilitySkus, orderForm.items]);

  // Handle Form Submission
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!orderForm.supplierId) {
      errors.supplierId = "Please select an assigned supplier.";
    }

    if (!orderForm.items || orderForm.items.length === 0) {
      errors.items = "Please add at least one medicine to this purchase order.";
    }

    if (orderForm.items.some((i) => !i.quantity || Number(i.quantity) <= 0)) {
      errors.items =
        "All ordered medicines must have a quantity greater than 0.";
    }

    if (
      orderForm.items.some(
        (i) =>
          i.price === "" ||
          i.price === null ||
          i.price === undefined ||
          Number(i.price) < 0 ||
          isNaN(Number(i.price)),
      )
    ) {
      errors.items =
        "Please enter a valid price (₱0 or higher) for each ordered medicine.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const supplierObj = supplierList.find(
      (s) => s.id === Number(orderForm.supplierId),
    );

    const targetPharmacyIdToSave = pharmacy?.id || targetPharmacyId;

    if (!targetPharmacyIdToSave) {
      setFormErrors({
        supplierId:
          "Operating pharmacy could not be determined. Please re-select your pharmacy.",
      });
      return;
    }

    const orderPayload = {
      pharmacyId: Number(targetPharmacyIdToSave),
      supplierId: Number(orderForm.supplierId),
      priority: orderForm.priority || "Normal",
      totalPrice: Math.round(computedTotalCost),
      notes: orderForm.notes || "",
      items: orderForm.items.map((i) => {
        const matchedSku = skuList.find(
          (s) => s.sku === i.sku || s.id === i.id,
        );
        return {
          skuId: matchedSku?.id || i.id,
          orderedUnits: Number(i.quantity) || 1,
          price: Math.round(Number(i.price) || 0),
        };
      }),
    };

    try {
      setIsSubmittingOrder(true);
      const response = await orderService.createOrder(orderPayload);

      const resolvedPoNumber =
        response.purchaseOrderNum || response.poNumberFormatted;

      const newRequest = {
        orderId: resolvedPoNumber,
        orderNumber: resolvedPoNumber,
        supplierId: response.supplierId || Number(orderForm.supplierId),
        supplierName:
          response.supplierName ||
          (supplierObj ? supplierObj.name : "Supplier"),
        targetFacility: orderForm.targetFacility,
        priority: response.priority || orderForm.priority,
        status: response.status || "Pending",
        totalCost: response.totalPrice ?? Math.round(computedTotalCost),
        notes: orderForm.notes,
        items: orderForm.items,
        totalUnits: totalFormUnits,
        createdAt: new Date().toLocaleDateString(),
      };

      setSubmittedOrder(newRequest);
      setSelectedSkuIds([]); // Clear selection
      setModalMode("success");

      // Optimistically remove ordered items from current list
      const orderedIds = new Set(orderPayload.items.map((i) => i.skuId));
      setSkuList((prev) => prev.filter((s) => !orderedIds.has(s.id)));
      fetchSkus(searchQuery);
    } catch (err) {
      console.error("Failed to submit purchase order to backend:", err);
      // Fallback format PO-[year]-[month]-[id] if offline during local dev
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const fallbackPo = `PO-${year}-${month}-0001`;

      const fallbackRequest = {
        orderId: fallbackPo,
        orderNumber: fallbackPo,
        supplierId: Number(orderForm.supplierId),
        supplierName: supplierObj ? supplierObj.name : "Supplier",
        targetFacility: orderForm.targetFacility,
        priority: orderForm.priority,
        status: "Pending",
        totalCost: Number(orderForm.totalCost) || 0,
        notes: orderForm.notes,
        items: orderForm.items,
        totalUnits: totalFormUnits,
        createdAt: new Date().toLocaleDateString(),
      };
      setSubmittedOrder(fallbackRequest);
      setSelectedSkuIds([]);
      setModalMode("success");

      // Optimistically remove ordered items in fallback
      const orderedIds = new Set(orderPayload.items.map((i) => i.skuId));
      setSkuList((prev) => prev.filter((s) => !orderedIds.has(s.id)));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <PackagePlus className="w-7 h-7 text-blue-600" />
              <span>Procurement Order Requests</span>
            </h1>
            {/* Active Facility Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage replenishment requests and create purchase order requisitions
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchSkus(searchQuery);
              fetchQuotations(quotationCurrentPage, quotationSearchQuery);
            }}
            disabled={isLoadingSkus || isLoadingQuotations}
            className="btn-secondary p-2.5 text-gray-600 hover:text-blue-600 shadow-xs"
            title="Refresh All"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoadingSkus || isLoadingQuotations ? "animate-spin" : ""
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => handleOpenMultiOrderModal([])}
            className="btn-primary shadow-xs flex items-center gap-2 text-xs py-2 px-3.5 cursor-pointer"
          >
            <ListPlus className="w-4 h-4" />
            <span>Create Multi-Item PO Request</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up-1">
        {/* 1. Total Minimum SKUs */}
        <Card className="p-5 border border-red-200/80 shadow-xs hover:border-red-300 transition-all bg-linear-to-br from-white to-red-50/20">
          {isLoadingSkus ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-32 bg-red-200/60" />
                <Skeleton className="h-8 w-16 mt-1.5 bg-red-200/60" />
                <Skeleton className="h-5 w-44 mt-1 rounded-full bg-red-200/60" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl shrink-0 bg-red-200/60" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Total Minimum SKUs
                </p>
                <h3 className="text-3xl font-extrabold text-red-600 mt-1.5">
                  {totalMinimumSkus}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100/70 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Critical shortage (&le;
                    Min)
                  </span>
                  {totalMinimumSkus > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("thresholds");
                        handleSelectAllCritical();
                      }}
                      className="text-[11px] font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
                    >
                      Select Critical
                    </button>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          )}
        </Card>

        {/* 2. Total Needs Reorder SKUs */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          {isLoadingSkus ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-32 bg-amber-200/60" />
                <Skeleton className="h-8 w-16 mt-1.5 bg-amber-200/60" />
                <Skeleton className="h-5 w-36 mt-1 rounded-full bg-amber-200/60" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl shrink-0 bg-amber-200/60" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Needs Reorder SKUs
                </p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                  {totalNeedsReorderSkus}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> &le; Reorder point
                  </span>
                  {totalNeedsReorderSkus > 0 && activeTab !== "thresholds" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("thresholds")}
                      className="text-[11px] font-bold text-amber-700 underline hover:text-amber-900 cursor-pointer"
                    >
                      View Alerts
                    </button>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>
          )}
        </Card>

        {/* 3. Pending Pharmacist Quotations */}
        <Card className="p-5 border border-blue-200/80 shadow-xs hover:border-blue-300 transition-all bg-linear-to-br from-white to-blue-50/20">
          {isLoadingQuotations ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-36 bg-blue-200/60" />
                <Skeleton className="h-8 w-16 mt-1.5 bg-blue-200/60" />
                <Skeleton className="h-5 w-36 mt-1 rounded-full bg-blue-200/60" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl shrink-0 bg-blue-200/60" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Pharmacist Quotations
                </p>
                <h3 className="text-3xl font-extrabold text-blue-600 mt-1.5">
                  {pendingQuotationsCount}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> Awaiting Review
                  </span>
                  {activeTab !== "quotations" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("quotations")}
                      className="text-[11px] font-bold text-blue-700 underline hover:text-blue-900 cursor-pointer"
                    >
                      Review Quotations
                    </button>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Main Workspace Card with Navigation Tabs */}
      <Card className="p-0 overflow-hidden border border-gray-200 animate-slide-up-2">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-gray-200 bg-gray-50/75 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("quotations")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "quotations"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pharmacist Reorder Quotations</span>
            {pendingQuotationsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-600 text-white shadow-xs">
                {pendingQuotationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("thresholds")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "thresholds"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>System Threshold Alerts</span>
            {reorderSkus.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white shadow-xs">
                {reorderSkus.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: PHARMACIST REORDER QUOTATIONS */}
        {activeTab === "quotations" && (
          <div>
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <div className="w-full md:w-80">
                <SearchBar
                  value={quotationSearchQuery}
                  onChange={(e) => {
                    setQuotationSearchQuery(e.target.value);
                    setQuotationCurrentPage(1);
                  }}
                  onClear={() => {
                    setQuotationSearchQuery("");
                    setQuotationCurrentPage(1);
                  }}
                  placeholder="Search quotation #, supplier, requester..."
                />
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
                <Dropdown
                  value={quotationStatusFilter}
                  onChange={(e) => {
                    setQuotationStatusFilter(e.target.value);
                    setQuotationCurrentPage(1);
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

                <Dropdown
                  value={quotationPriorityFilter}
                  onChange={(e) => {
                    setQuotationPriorityFilter(e.target.value);
                    setQuotationCurrentPage(1);
                  }}
                  size="sm"
                  className="w-full sm:w-36"
                  options={[
                    { value: "ALL", label: "All Priorities" },
                    { value: "Normal", label: "Normal Priority" },
                    { value: "Urgent", label: "Urgent Priority" },
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
                      Requester & Target Supplier
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Medicines & Units
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
                      <tr
                        key={`quote-skeleton-${index}`}
                        className="animate-pulse"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-28 rounded" />
                          <Skeleton className="h-3 w-20 mt-1" />
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
                          <Skeleton className="h-8 w-24 ml-auto rounded-lg" />
                        </td>
                      </tr>
                    ))
                  ) : quotations.length > 0 ? (
                    quotations.map((quotation, index) => {
                      const isPending = quotation.status === "Pending";
                      return (
                        <tr
                          key={quotation.id}
                          className="hover:bg-blue-50/30 transition-colors animate-slide-up"
                          style={{ animationDelay: `${index * 0.04}s` }}
                        >
                          {/* Quotation # & Date */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                              {quotation.quotationNumber}
                            </span>
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
                            </div>
                          </td>

                          {/* Requester & Supplier */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                              <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>
                                {quotation.supplierName || "Unassigned"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                              <User className="w-3 h-3 text-gray-400" />
                              <span>
                                By: {quotation.userName || "Pharmacist"}
                              </span>
                            </div>
                          </td>

                          {/* Medicines & Total Units */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-gray-800">
                              {quotation.items?.length || 0} Medicine
                              {(quotation.items?.length || 0) !== 1 ? "s" : ""}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                              {Number(
                                quotation.totalUnits || 0,
                              ).toLocaleString()}{" "}
                              units
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                quotation.priority === "Urgent"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {quotation.priority || "Normal"}
                            </span>
                          </td>

                          {/* Status & PO Ref */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                quotation.status === "Pending"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : quotation.status === "Approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : quotation.status === "Rejected"
                                      ? "bg-red-50 text-red-800 border-red-200"
                                      : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {quotation.status === "Approved" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : quotation.status === "Rejected" ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {quotation.status === "Approved"
                                  ? "Approved (PO Created)"
                                  : quotation.status}
                              </span>
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
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenViewQuotationModal(quotation)
                                }
                                className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 cursor-pointer"
                                title="View Quotation Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenConvertModal(quotation)
                                    }
                                    className="btn-primary py-1.5 px-3 text-xs shadow-xs"
                                    title="Review items and convert into Purchase Order"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    <span>Process into PO</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenRejectModal(quotation)
                                    }
                                    className="btn-secondary p-1.5 text-gray-500 hover:text-red-600 cursor-pointer"
                                    title="Reject Quotation"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
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
                        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-500" />
                        <p className="text-base font-semibold text-gray-800">
                          No pending pharmacist reorder quotations!
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          All submitted replenishment quotations have been
                          processed or reviewed.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Quotations */}
            {quotationTotalElements > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/40">
                <Pagination
                  currentPage={quotationCurrentPage}
                  totalPages={quotationTotalPages}
                  totalItems={quotationTotalElements}
                  itemsPerPage={6}
                  onPageChange={setQuotationCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SYSTEM THRESHOLD ALERTS */}
        {activeTab === "thresholds" && (
          <div>
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <div className="w-full md:w-80">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClear={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  placeholder="Search reorder SKU, drug name..."
                />
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
                {/* Urgency Filter */}
                <Dropdown
                  value={selectedUrgency}
                  onChange={handleUrgencyChange}
                  size="sm"
                  className="w-full sm:w-44"
                  options={[
                    {
                      value: "ALL",
                      label: `All Reorder Items (${reorderSkus.length})`,
                    },
                    {
                      value: "MINIMUM",
                      label: "Critical (≤ Minimum Level)",
                    },
                    {
                      value: "REORDER_ONLY",
                      label: "Reorder Triggered Only",
                    },
                  ]}
                />
              </div>
            </div>

            {/* Multi-Select Floating Action Bar if items checked */}
            {selectedSkuIds.length > 0 && (
              <div className="p-3 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
                    {selectedSkuIds.length}
                  </span>
                  <span>Medicines selected for batch requisition</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSkuIds([])}
                    className="btn-secondary py-1 px-2.5 text-xs text-gray-600 hover:text-gray-900"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedObjList = currentFacilitySkus.filter((s) =>
                        selectedSkuIds.includes(s.id),
                      );
                      handleOpenMultiOrderModal(selectedObjList);
                    }}
                    className="btn-primary py-1 px-3 text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>Create Combined PO ({selectedSkuIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Select all visible on page"
                        aria-label="Select all visible on page"
                      >
                        {paginatedReorderSkus.length > 0 &&
                        paginatedReorderSkus.every((s) =>
                          selectedSkuIds.includes(s.id),
                        ) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      SKU & Medicine
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Form & Packaging
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Current vs Thresholds
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingSkus ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr
                        key={`sku-skeleton-${index}`}
                        className="animate-pulse"
                      >
                        <td className="px-4 py-4 text-center">
                          <Skeleton className="h-4 w-4 mx-auto rounded" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start gap-3">
                            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-16 rounded" />
                              </div>
                              <Skeleton className="h-3 w-36" />
                              <Skeleton className="h-2.5 w-20" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-12 rounded" />
                            <Skeleton className="h-8 w-12 rounded" />
                            <Skeleton className="h-8 w-12 rounded" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-7 w-7 rounded-lg" />
                            <Skeleton className="h-7 w-20 rounded-lg" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedReorderSkus.length > 0 ? (
                    paginatedReorderSkus.map((item, index) => {
                      const status = getStockStatus(item);
                      const isSelected = selectedSkuIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/30 transition-colors animate-slide-up ${
                            isSelected
                              ? "bg-blue-50/20"
                              : item.currentStock <= item.minimumLevel
                                ? "bg-red-50/15"
                                : ""
                          }`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectSku(item.id)}
                              className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                              aria-label={`Select SKU ${item.sku}`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* SKU & Drug Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-lg font-semibold text-xs border shrink-0 mt-0.5 ${
                                  item.currentStock <= item.minimumLevel
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : "bg-amber-50 text-amber-600 border-amber-200"
                                }`}
                              >
                                <Pill className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {item.brandName}
                                  </span>
                                  <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                    {item.sku}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.genericName} • {item.dosage}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {item.type}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Dosage Form & Packaging */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-semibold text-gray-800">
                              {item.dosageForm}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.packagingUnit}
                            </div>
                          </td>

                          {/* Current Stock vs Thresholds */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-2">
                              <div className="bg-gray-100 px-2.5 py-1 rounded text-center">
                                <span className="text-[10px] block uppercase font-medium text-gray-500">
                                  Current
                                </span>
                                <span className="font-bold text-gray-900 text-xs">
                                  {item.currentStock}
                                </span>
                              </div>
                              <div className="bg-red-50 border border-red-100 text-red-700 px-2 py-1 rounded text-center">
                                <span className="text-[10px] block uppercase font-medium text-red-500">
                                  Min
                                </span>
                                <span className="font-bold">
                                  {item.minimumLevel}
                                </span>
                              </div>
                              <div className="bg-amber-50 border border-amber-100 text-amber-700 px-2 py-1 rounded text-center">
                                <span className="text-[10px] block uppercase font-medium text-amber-500">
                                  Reorder
                                </span>
                                <span className="font-bold">
                                  {item.reorderLevel}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}
                              />
                              {status.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenViewModal(item)}
                                className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600"
                                title="View SKU Diagnostics"
                                aria-label="View SKU Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSingleOrderModal(item)}
                                className="btn-primary py-1.5 px-3 text-xs shadow-sm flex items-center gap-1.5 font-medium"
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                                <span>Add to PO</span>
                              </button>
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
                        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-500" />
                        <p className="text-base font-semibold text-gray-800">
                          All inventory stock levels are healthy!
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          No SKUs currently require purchase reordering.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Section */}
            {reorderSkus.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/40">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={reorderSkus.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 1. MODAL: CREATE MULTI-ITEM PURCHASE ORDER REQUEST       */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "order"}
        onClose={handleCloseModal}
        title="Create Purchase Order Requisition (Multi-Medicine)"
        size="4xl"
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {/* Supplier, Facility & Priority Header Controls */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Supplier Selection */}
            <div>
              <Dropdown
                id="order-supplier"
                name="supplierId"
                label="Assigned Supplier"
                required
                value={orderForm.supplierId}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    supplierId: Number(e.target.value),
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
            </div>

            {/* Requisition Priority */}
            <div>
              <Dropdown
                id="order-priority"
                name="priority"
                label="Requisition Priority"
                required
                value={orderForm.priority}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    priority: e.target.value,
                  }))
                }
                size="sm"
                options={[
                  { value: "Normal", label: "Normal Standard Lead Time" },
                  { value: "Urgent", label: "Urgent Emergency Restock" },
                ]}
              />
            </div>

            {/* Destination Facility (Auto-detected based on active facility) */}
            <div className="sm:col-span-2">
              <label
                htmlFor="order-facility"
                className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Destination Facility
              </label>
              <div
                id="order-facility"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900"
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{currentFacilityName}</span>
              </div>
            </div>
          </div>

          {/* Section: Included Medicines List */}
          <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800 whitespace-nowrap">
                Ordered Medicines ({orderForm.items.length})
              </span>
              <div className="flex justify-center">
                <span className="text-xs text-blue-700 font-mono font-bold bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-center whitespace-nowrap">
                  Total Units {totalFormUnits.toLocaleString()}
                </span>
              </div>

              {/* Action ComboBox: Inventory Medicine */}
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 w-full sm:w-80">
                  <div className="flex-1 min-w-0">
                    <ComboBox
                      id="order-requisition-catalog-combobox"
                      name="skuToAdd"
                      options={availableSkusToAdd}
                      value={skuToAdd}
                      onChange={(e) => setSkuToAdd(e.target.value)}
                      onSelect={(sku) => setSkuToAdd(sku ? sku.sku : "")}
                      placeholder="Search medicine from catalog..."
                      emptyText="No matching medicines in catalog"
                      getOptionValue={(s) => s.sku}
                      getOptionLabel={(s) =>
                        s.brandName
                          ? `${s.brandName} (${s.genericName || s.sku})`
                          : s.sku
                      }
                      getOptionSubtext={(s) =>
                        `SKU: ${s.sku} • Stock: ${s.currentStock ?? 0} (Reorder: ${s.reorderLevel ?? 0})${s.dosage ? ` • ${s.dosage}` : ""}`
                      }
                      getDisplayValue={(s) =>
                        s.brandName ? `${s.brandName} (${s.sku})` : s.sku
                      }
                      inputClassName="!py-1.5 !text-xs !px-3"
                      className="w-full text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddItemToForm(skuToAdd)}
                    disabled={!skuToAdd}
                    className={`${
                      skuToAdd ? "btn-primary" : "btn-secondary"
                    } py-1.5 px-3 text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all`}
                    title="Add selected medicine to purchase order"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {formErrors.itemAdd && (
              <p className="text-xs text-amber-600">{formErrors.itemAdd}</p>
            )}
            {formErrors.items && (
              <p className="text-xs text-red-500">{formErrors.items}</p>
            )}

            {/* Medicines Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2.5 bg-gray-100">
                      Medication & SKU
                    </th>
                    <th className="px-3.5 py-2.5 bg-gray-100">Current / Max</th>
                    <th className="px-3.5 py-2.5 w-28 bg-gray-100">
                      Order Quantity
                    </th>
                    <th className="px-3.5 py-2.5 w-32 bg-gray-100">
                      Total Price (₱)
                    </th>
                    <th className="px-3.5 py-2.5 w-28 text-right bg-gray-100">
                      Price / Unit
                    </th>
                    <th className="px-3.5 py-2.5 w-10 text-center bg-gray-100">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orderForm.items.length > 0 ? (
                    orderForm.items.map((item, idx) => {
                      const rowKey = item.rowId || `${item.sku}-${idx}`;
                      const qty = Number(item.quantity) || 0;
                      const hasPrice =
                        item.price !== "" &&
                        item.price !== null &&
                        item.price !== undefined &&
                        !isNaN(Number(item.price));
                      const priceVal = hasPrice ? Number(item.price) : null;
                      const unitPrice =
                        priceVal !== null && qty > 0 ? priceVal / qty : null;

                      return (
                        <tr key={rowKey} className="hover:bg-gray-50/80">
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900">
                                {item.brandName}
                              </span>
                              <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                                {item.sku}
                              </span>
                              <span className="font-mono text-[10px] text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.2 rounded font-medium">
                                Threshold Alert
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {item.genericName} • {item.dosage} (
                              {item.packagingUnit})
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span
                                className={`font-bold ${
                                  item.currentStock <= item.minimumLevel
                                    ? "text-red-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {item.currentStock}
                              </span>
                              <span className="text-gray-400">/</span>
                              <span className="text-gray-600">
                                {item.maximumLevel}
                              </span>
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(
                                    rowKey,
                                    e.target.value,
                                  )
                                }
                                className="input py-1 px-2 text-xs w-20 font-bold text-gray-900"
                              />
                              <span className="text-[10px] text-gray-500">
                                units
                              </span>
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5">
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-gray-400 text-xs font-bold">
                                ₱
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.price ?? ""}
                                onChange={(e) =>
                                  handleUpdateItemPrice(rowKey, e.target.value)
                                }
                                className="input py-1 pl-6 pr-2 text-xs w-28 font-mono font-bold text-gray-900"
                              />
                            </div>
                          </td>

                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {unitPrice !== null ? (
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-xs font-semibold text-emerald-700">
                                  ₱
                                  {unitPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  / unit
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs font-mono">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromForm(rowKey)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Remove line item from this PO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        <Layers className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                        <p className="font-semibold text-gray-600">
                          No medicines selected
                        </p>
                        <p className="text-[11px]">
                          Search and choose from the combobox above to add
                          medicines to this PO.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Financial & Notes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Total Cost Field (Read-only, auto-calculated from item prices) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="order-total-cost"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Total PO Cost (₱)
                </label>
                <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                  Read Only • Auto Calculated
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                  ₱
                </span>
                <input
                  id="order-total-cost"
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={computedTotalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  className="input pl-7 font-mono font-bold bg-gray-100/80 text-gray-700 cursor-not-allowed border-gray-200 select-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="order-notes"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Procurement Justification Notes
              </label>
              <input
                id="order-notes"
                type="text"
                value={orderForm.notes}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="e.g. Critical hospital safety buffer depleted"
                className="input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={orderForm.items.length === 0 || isSubmittingOrder}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSubmittingOrder ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Requisition...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Submit Purchase Requisition ({orderForm.items.length} SKUs)
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: ORDER SUCCESS CONFIRMATION                     */}
      {/* ======================================================== */}
      <SuccessModal
        isOpen={modalMode === "success" && Boolean(submittedOrder)}
        onClose={handleCloseModal}
        title="Purchase Order Requisition Submitted"
        message="Consolidated purchase order reference has been generated and dispatched to the supplier."
        size="3xl"
        confirmText="Done"
      >
        {submittedOrder && (
          <div className="space-y-4 text-left">
            {/* PO Summary Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">PO Number:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {submittedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Status:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {submittedOrder.status || "Pending"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Vendor:</span>
                <span className="font-semibold text-gray-900">
                  {submittedOrder.supplierName}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Destination Facility:</span>
                <span className="font-semibold text-gray-800">
                  {submittedOrder.targetFacility}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Total Quoted Cost:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₱
                  {Number(submittedOrder.totalCost).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Volume:</span>
                <span className="font-bold text-gray-900">
                  {submittedOrder.totalUnits.toLocaleString()} units (
                  {submittedOrder.items.length} line items)
                </span>
              </div>
            </div>

            {/* Included Line Items Table */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                Included Medication Line Items
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-1.5 bg-gray-100">Medicine</th>
                      <th className="px-3 py-1.5 bg-gray-100">SKU</th>
                      <th className="px-3 py-1.5 text-right bg-gray-100">
                        Quantity
                      </th>
                      <th className="px-3 py-1.5 text-right bg-gray-100">
                        Price / Unit
                      </th>
                      <th className="px-3 py-1.5 text-right bg-gray-100">
                        Total Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {submittedOrder.items.map((item) => {
                      const qty = Number(item.quantity) || 0;
                      const priceVal = Number(item.price) || 0;
                      const unitPrice = qty > 0 ? priceVal / qty : null;

                      return (
                        <tr key={item.sku}>
                          <td className="px-3 py-1.5 font-semibold text-gray-900">
                            {item.brandName} ({item.dosage})
                          </td>
                          <td className="px-3 py-1.5 font-mono text-[11px] text-blue-700">
                            {item.sku}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-gray-900">
                            {qty.toLocaleString()} units
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-[11px] text-gray-700">
                            {unitPrice !== null
                              ? `₱${unitPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">
                            ₱
                            {priceVal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </SuccessModal>

      {/* ======================================================== */}
      {/* 3. MODAL: VIEW SKU THRESHOLD DETAILS                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedSkuForView)}
        onClose={handleCloseModal}
        title="SKU Inventory & Threshold Diagnostics"
        size="md"
      >
        {selectedSkuForView && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shrink-0">
                <Pill className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedSkuForView.brandName}
                  </h3>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                    {selectedSkuForView.sku}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedSkuForView.genericName} • {selectedSkuForView.dosage}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-gray-500">
                  <span>{selectedSkuForView.dosageForm}</span>
                  <span>•</span>
                  <span>{selectedSkuForView.packagingUnit}</span>
                </div>
              </div>
            </div>

            {/* Threshold Cards */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
                <span className="text-[10px] uppercase font-bold text-red-600 block">
                  Minimum Level
                </span>
                <span className="font-bold text-red-900 text-sm">
                  {selectedSkuForView.minimumLevel}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">
                  Reorder Trigger
                </span>
                <span className="font-bold text-amber-900 text-sm">
                  {selectedSkuForView.reorderLevel}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Max Capacity
                </span>
                <span className="font-bold text-emerald-900 text-sm">
                  {selectedSkuForView.maximumLevel}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseModal();
                  handleOpenSingleOrderModal(selectedSkuForView);
                }}
                className="btn-primary text-xs"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Create Order Request</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL: REVIEW QUOTATION & CONVERT TO PURCHASE ORDER   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isConvertModalOpen && Boolean(quotationToConvert)}
        onClose={() => setIsConvertModalOpen(false)}
        title={`Review & Convert to Purchase Order (${quotationToConvert?.quotationNumber})`}
        size="4xl"
      >
        {quotationToConvert && (
          <form onSubmit={handleSubmitConversion} className="space-y-4 text-xs">
            {convertFormErrors.general && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {convertFormErrors.general}
              </div>
            )}

            {/* Banner: Quotation Origin & Pharmacist Note */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      Quotation #{quotationToConvert.quotationNumber}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Pending Conversion
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Requested by:{" "}
                    <strong>{quotationToConvert.userName || "Pharmacist"}</strong>{" "}
                    for{" "}
                    <strong>
                      {quotationToConvert.supplierName || "Assigned Supplier"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Requisition Priority
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    quotationToConvert.priority === "Urgent"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {quotationToConvert.priority || "Normal"}
                </span>
              </div>
            </div>

            {/* Pharmacist Clinical Justification */}
            {quotationToConvert.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 italic">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5 not-italic">
                  Pharmacist Clinical Justification:
                </span>
                "{quotationToConvert.notes}"
              </div>
            )}

            {/* Procurement Order Settings */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <Dropdown
                  id="convert-supplier"
                  label="Target Supplier"
                  required
                  value={convertFormData.supplierId}
                  onChange={(e) =>
                    setConvertFormData((prev) => ({
                      ...prev,
                      supplierId: e.target.value,
                    }))
                  }
                  size="sm"
                  options={activeSuppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </div>

              <div>
                <Dropdown
                  id="convert-priority"
                  label="Order Priority"
                  required
                  value={convertFormData.priority}
                  onChange={(e) =>
                    setConvertFormData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  size="sm"
                  options={[
                    { value: "Normal", label: "Normal (Standard Lead Time)" },
                    { value: "Urgent", label: "Urgent (Priority Emergency)" },
                  ]}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Procurement Notes (Optional)
                </label>
                <input
                  type="text"
                  value={convertFormData.notes}
                  onChange={(e) =>
                    setConvertFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Notes for vendor or delivery instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Line Items Table with SKU Removal and Price Editing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    PO Line Items ({convertFormData.items.length})
                  </span>
                  <span className="text-[11px] text-gray-400 ml-2">
                    Procurement may remove SKUs, calibrate units, or adjust prices
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Total Units: {computedConversionTotalUnits.toLocaleString()}
                </div>
              </div>

              {convertFormErrors.items && (
                <p className="text-xs text-red-500">{convertFormErrors.items}</p>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Medication & SKU</th>
                      <th className="px-3.5 py-2.5 w-24">Current Stock</th>
                      <th className="px-3.5 py-2.5 w-28">Order Units *</th>
                      <th className="px-3.5 py-2.5 w-32">Total Price (₱) *</th>
                      <th className="px-3.5 py-2.5 w-28 text-right">Price / Unit</th>
                      <th className="px-3.5 py-2.5 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {convertFormData.items.length > 0 ? (
                      convertFormData.items.map((item) => {
                        const qty = Number(item.orderedUnits) || 0;
                        const priceVal =
                          item.price !== "" && !isNaN(Number(item.price))
                            ? Number(item.price)
                            : null;
                        const unitPrice =
                          priceVal !== null && qty > 0 ? priceVal / qty : null;

                        return (
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
                                {item.genericName} {item.dosage && `• ${item.dosage}`}
                              </div>
                            </td>

                            {/* Current Stock */}
                            <td className="px-3.5 py-2.5 font-mono text-gray-700">
                              {item.currentStock ?? "—"}
                            </td>

                            {/* Order Units (Editable) */}
                            <td className="px-3.5 py-2.5">
                              <input
                                type="number"
                                min="1"
                                value={item.orderedUnits}
                                onChange={(e) =>
                                  handleUpdateItemQtyInConversion(
                                    item.skuId,
                                    e.target.value,
                                  )
                                }
                                required
                                className="w-24 px-2 py-1 border border-gray-300 rounded font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </td>

                            {/* Total Price (Editable - Required for Procurement) */}
                            <td className="px-3.5 py-2.5">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                placeholder="Enter total ₱"
                                value={item.price}
                                onChange={(e) =>
                                  handleUpdateItemPriceInConversion(
                                    item.skuId,
                                    e.target.value,
                                  )
                                }
                                required
                                className="w-28 px-2 py-1 border border-gray-300 rounded font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </td>

                            {/* Calculated Price Per Unit */}
                            <td className="px-3.5 py-2.5 text-right font-mono text-gray-700">
                              {unitPrice !== null
                                ? `₱${unitPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "—"}
                            </td>

                            {/* Remove SKU Button */}
                            <td className="px-3.5 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveItemFromConversion(item.skuId)
                                }
                                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                                title="Remove this SKU from the purchase order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          All SKUs have been removed. At least one SKU is required
                          to convert to a purchase order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 font-medium">
                <span>
                  Total Quoted Cost:{" "}
                  <strong className="text-emerald-700 font-mono text-sm">
                    ₱{computedConversionTotalCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </span>
                <span className="ml-2 text-gray-400">
                  (New PO status will be <strong>Pending</strong>)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="btn-secondary text-xs"
                  disabled={isSubmittingConversion}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingConversion || convertFormData.items.length === 0
                  }
                  className="btn-primary text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingConversion ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Converting to PO...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Convert to Purchase Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 5. MODAL: REJECT QUOTATION                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRejectModalOpen && Boolean(quotationToReject)}
        onClose={() => setIsRejectModalOpen(false)}
        title={`Reject Quotation (${quotationToReject?.quotationNumber})`}
        size="md"
      >
        <form onSubmit={handleSubmitReject} className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900">
            <p className="font-bold">
              Reject Reorder Quotation #{quotationToReject?.quotationNumber}?
            </p>
            <p className="text-[11px] text-red-700 mt-1">
              Please state why this replenishment quotation cannot be converted
              into a purchase order (e.g. stock surplus, budget limit, or
              unapproved vendor).
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows="3"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter explanation for the requesting pharmacist..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={isSubmittingReject}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReject || !rejectionReason.trim()}
              className="btn-danger text-xs flex items-center gap-1.5 shadow-xs"
            >
              {isSubmittingReject ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Quotation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 6. MODAL: VIEW QUOTATION DETAILS                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewQuotationModalOpen && Boolean(selectedQuotationForView)}
        onClose={() => setIsViewQuotationModalOpen(false)}
        title="Pharmacist Reorder Quotation Details"
        size="3xl"
      >
        {selectedQuotationForView && (
          <div className="space-y-4 text-xs">
            {/* Header Status */}
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
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedQuotationForView.status === "Pending"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : selectedQuotationForView.status === "Approved"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : selectedQuotationForView.status === "Rejected"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {selectedQuotationForView.status === "Approved"
                        ? "Approved (PO Created)"
                        : selectedQuotationForView.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Vendor:{" "}
                    <strong>{selectedQuotationForView.supplierName}</strong> •
                    Requester:{" "}
                    <strong>
                      {selectedQuotationForView.userName || "Pharmacist"}
                    </strong>
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

            {/* If Converted */}
            {selectedQuotationForView.purchaseOrderNum && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Converted into Purchase Order #{selectedQuotationForView.purchaseOrderNum}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Procurement Purchase Order generated from this replenishment quotation
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

            {/* If Rejected */}
            {selectedQuotationForView.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-900">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-bold">Rejection Reason</p>
                  <p className="text-[11px] text-red-700 italic">
                    "{selectedQuotationForView.rejectionReason}"
                  </p>
                </div>
              </div>
            )}

            {/* Pharmacist clinical justification */}
            {selectedQuotationForView.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Pharmacist Notes
                </span>
                <p className="text-gray-700 italic whitespace-pre-wrap">
                  "{selectedQuotationForView.notes}"
                </p>
              </div>
            )}

            {/* Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Medication & SKU</th>
                    <th className="px-3.5 py-2.5">Current Stock</th>
                    <th className="px-3.5 py-2.5">Requested Units</th>
                    <th className="px-3.5 py-2.5">Quoted Price (₱)</th>
                    <th className="px-3.5 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(selectedQuotationForView.items || []).map((item) => (
                    <tr key={item.id || item.skuId} className="hover:bg-gray-50">
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
                      <td className="px-3.5 py-2.5 font-mono">
                        {item.estimatedPrice && Number(item.estimatedPrice) > 0 ? (
                          <div>
                            <span className="font-bold text-gray-900">
                              ₱{Number(item.estimatedPrice).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            {item.estimatedPricePerUnit > 0 && (
                              <span className="text-[10px] text-gray-500 block">
                                ₱{Number(item.estimatedPricePerUnit).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}/unit
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-sans">
                            Pending PO Conversion
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-gray-500 italic">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-wrap gap-2">
              <div className="text-xs text-gray-600 font-mono flex items-center gap-3 flex-wrap">
                <span>
                  Total units:{" "}
                  <strong className="text-gray-900">
                    {Number(selectedQuotationForView.totalUnits || 0).toLocaleString()}
                  </strong>
                </span>
                {selectedQuotationForView.estimatedTotalCost > 0 && (
                  <span>
                    Total Quoted Cost:{" "}
                    <strong className="text-emerald-700 font-bold">
                      ₱{Number(selectedQuotationForView.estimatedTotalCost).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsViewQuotationModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                {selectedQuotationForView.status === "Pending" && (
                  <button
                    type="button"
                    onClick={() => {
                      const quote = selectedQuotationForView;
                      setIsViewQuotationModalOpen(false);
                      handleOpenConvertModal(quote);
                    }}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Process into PO</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

export default OrderRequest;
