import axios from "axios";
import inventoryTransactionApi from "../api/inventoryTransaction";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Normalizes an inventory transaction record to provide backward-compatible
 * fields for Bin Card and Stock Adjustment Logs interfaces.
 */
const normalizeTransactionEntry = (entry) => {
  if (!entry) return entry;

  const qtyIn = entry.quantityIn != null ? Number(entry.quantityIn) : 0;
  const qtyOut = entry.quantityOut != null ? Number(entry.quantityOut) : 0;
  const deltaUnits = qtyIn > 0 ? qtyIn : qtyOut > 0 ? -qtyOut : 0;

  let normAdjustmentType = entry.adjustmentType;
  if (!normAdjustmentType) {
    if (entry.transactionType === "ADJUSTMENT_ADD") {
      normAdjustmentType = "ADD";
    } else if (
      entry.transactionType === "ADJUSTMENT_SUB" ||
      entry.transactionType === "DISPENSE"
    ) {
      normAdjustmentType = "SUBTRACT";
    } else {
      normAdjustmentType = entry.transactionType || "ADJUSTMENT";
    }
  }

  return {
    ...entry,
    // Ledger / Bin Card UI compatibility
    timestamp: entry.createdAt || entry.timestamp,
    performedBy: entry.userName || entry.performedBy || "System",

    // Stock Adjustment Logs UI compatibility
    skuName:
      entry.skuName ||
      entry.genericName ||
      entry.brandName ||
      entry.skuCode ||
      "Unknown SKU",
    previousUnits:
      entry.previousUnits != null
        ? entry.previousUnits
        : entry.previousBalance != null
          ? entry.previousBalance
          : 0,
    newUnits:
      entry.newUnits != null
        ? entry.newUnits
        : entry.balanceAfter != null
          ? entry.balanceAfter
          : 0,
    deltaUnits: entry.deltaUnits != null ? entry.deltaUnits : deltaUnits,
    adjustmentType: normAdjustmentType,
  };
};

const inventoryTransactionService = {
  /**
   * Retrieves the complete historical inventory ledger (Bin Card) for a SKU in a pharmacy.
   */
  getLedger: async (skuId, pharmacyId, startDate, endDate, config = {}) => {
    const response = await axios.get(
      inventoryTransactionApi.getLedger(skuId, pharmacyId, startDate, endDate),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    const data = response.data;
    if (data && Array.isArray(data.entries)) {
      data.entries = data.entries.map(normalizeTransactionEntry);
    }
    return data;
  },

  /**
   * Alias for getLedger for compatibility with existing Bin Card views.
   */
  getSkuBinCard: async (skuId, pharmacyId, startDate, endDate, config = {}) => {
    return inventoryTransactionService.getLedger(
      skuId,
      pharmacyId,
      startDate,
      endDate,
      config,
    );
  },

  /**
   * Retrieves chronological transaction movements across the pharmacy.
   */
  getTransactionsByPharmacy: async (
    pharmacyId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    const response = await axios.get(
      inventoryTransactionApi.getTransactionsByPharmacy(
        pharmacyId,
        types,
        page,
        size,
        search,
        sortBy,
        sortDir,
      ),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    if (response.data && Array.isArray(response.data.content)) {
      return {
        ...response.data,
        content: response.data.content.map(normalizeTransactionEntry),
      };
    }
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeTransactionEntry);
  },

  getTransactionsByFacility: async (
    pharmacyId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    return inventoryTransactionService.getTransactionsByPharmacy(
      pharmacyId,
      types,
      page,
      size,
      search,
      sortBy,
      sortDir,
      config,
    );
  },

  /**
   * Retrieves chronological transaction movements for a specific SKU.
   */
  getTransactionsBySku: async (
    skuId,
    pharmacyId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    if (!pharmacyId) {
      throw new Error(
        "Pharmacy ID is strictly required to fetch transactions by SKU.",
      );
    }
    const response = await axios.get(
      inventoryTransactionApi.getTransactionsBySku(
        skuId,
        pharmacyId,
        types,
        page,
        size,
        search,
        sortBy,
        sortDir,
      ),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    if (response.data && Array.isArray(response.data.content)) {
      return {
        ...response.data,
        content: response.data.content.map(normalizeTransactionEntry),
      };
    }
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeTransactionEntry);
  },

  /**
   * Adjusts stock quantity for an SKU.
   */
  adjustStock: async (skuId, adjustmentData, config = {}) => {
    const response = await axios.patch(
      inventoryTransactionApi.adjustStock(skuId),
      adjustmentData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  /**
   * Retrieves stock adjustment audit logs for a pharmacy.
   */
  getAdjustmentLogsByPharmacy: async (
    pharmacyId,
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    if (!pharmacyId) {
      throw new Error(
        "Pharmacy ID is strictly required to fetch adjustment logs.",
      );
    }
    const response = await axios.get(
      inventoryTransactionApi.getAdjustmentLogsByPharmacy(
        pharmacyId,
        page,
        size,
        search,
        sortBy,
        sortDir,
      ),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    if (response.data && Array.isArray(response.data.content)) {
      return {
        ...response.data,
        content: response.data.content.map(normalizeTransactionEntry),
      };
    }
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeTransactionEntry);
  },

  getAdjustmentLogsByFacility: async (
    pharmacyId,
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    return inventoryTransactionService.getAdjustmentLogsByPharmacy(
      pharmacyId,
      page,
      size,
      search,
      sortBy,
      sortDir,
      config,
    );
  },

  /**
   * Retrieves stock adjustment audit logs for a specific SKU.
   */
  getAdjustmentLogsBySku: async (
    skuId,
    pharmacyId,
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    if (!pharmacyId) {
      throw new Error(
        "Pharmacy ID is strictly required to fetch adjustment logs by SKU.",
      );
    }
    const response = await axios.get(
      inventoryTransactionApi.getAdjustmentLogsBySku(
        skuId,
        pharmacyId,
        page,
        size,
        search,
        sortBy,
        sortDir,
      ),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    if (response.data && Array.isArray(response.data.content)) {
      return {
        ...response.data,
        content: response.data.content.map(normalizeTransactionEntry),
      };
    }
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(normalizeTransactionEntry);
  },

  /**
   * Retrieves aggregated transaction KPI summary for a pharmacy.
   */
  getTransactionSummary: async (pharmacyId, types = [], config = {}) => {
    if (!pharmacyId) {
      throw new Error(
        "Pharmacy ID is strictly required to fetch transaction summary.",
      );
    }
    const response = await axios.get(
      inventoryTransactionApi.getTransactionSummary(pharmacyId, types),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  /**
   * Retrieves aggregated stock adjustment KPI summary for a pharmacy.
   */
  getAdjustmentSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) {
      throw new Error(
        "Pharmacy ID is strictly required to fetch adjustment summary.",
      );
    }
    const response = await axios.get(
      inventoryTransactionApi.getAdjustmentSummary(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default inventoryTransactionService;
