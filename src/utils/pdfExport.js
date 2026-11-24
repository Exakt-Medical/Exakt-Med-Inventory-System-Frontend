export const escapeHtml = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const printHtmlDocument = (html) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (!frameDoc) {
    document.body.removeChild(iframe);
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.contentWindow.onafterprint = cleanup;
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(cleanup, 1000);
  }, 150);
};

const BASE_PDF_STYLES = `
  @page { size: A4; margin: 16mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.45;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .brand-title {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .doc-subtitle {
    font-size: 12px;
    color: #475569;
    margin: 3px 0 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .meta-right { text-align: right; }
  .doc-num {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }
  .badges {
    margin-top: 6px;
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    background: #f1f5f9;
    color: #334155;
    border: 1px solid #cbd5e1;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 18px;
  }
  .info-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    font-weight: 600;
  }
  .info-value {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    margin-top: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  th {
    background: #f1f5f9;
    color: #334155;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 8px;
    border-bottom: 2px solid #cbd5e1;
    text-align: left;
  }
  td {
    padding: 8px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tfoot td {
    background: #f8fafc;
    border-top: 2px solid #94a3b8;
    border-bottom: none;
    font-weight: 700;
    font-size: 13px;
  }
  .notes-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .danger-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
  }
`;

export const exportPurchaseOrderPdf = (order) => {
  if (!order) return;

  const items = Array.isArray(order.items) ? order.items : [];
  const poNumber = escapeHtml(order.orderNumber || `PO-${order.id}`);
  const status = escapeHtml(order.status || "Pending");
  const priority = escapeHtml(order.priority || "Normal");
  const pharmacyName = escapeHtml(order.targetFacility || "—");
  const supplierName = escapeHtml(order.supplierName || "—");
  const requestedDate = escapeHtml(order.requestedDate || "—");
  const totalOrdered = Number(order.quantity || 0).toLocaleString();
  const totalReceived = Number(order.receivedQuantity || 0).toLocaleString();
  const totalCost = Number(order.estimatedCost || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const notesText = order.rejectionReason
    ? `Denial Reason: ${order.rejectionReason}`
    : order.notes || "";

  const rowsHtml = items
    .map((item, idx) => {
      const ordered = Number(item.orderedUnits) || 0;
      const received = Number(item.receivedUnits) || 0;
      const subtotal = Number(item.price) || 0;
      const unitPrice =
        item.pricePerUnit !== undefined && item.pricePerUnit !== null
          ? Number(item.pricePerUnit)
          : ordered > 0
            ? subtotal / ordered
            : 0;

      return `
        <tr>
          <td style="text-align:center;color:#64748b;">${idx + 1}</td>
          <td>
            <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.genericName || item.skuName || "—")}</div>
            <div style="font-size:11px;color:#64748b;">SKU: ${escapeHtml(item.skuName || "—")}</div>
          </td>
          <td>${escapeHtml(item.brandName || "—")}</td>
          <td>${escapeHtml(item.packagingUnit || "—")}</td>
          <td style="text-align:right;font-weight:600;">${ordered.toLocaleString()}</td>
          <td style="text-align:right;">${received.toLocaleString()}</td>
          <td style="text-align:right;">₱${unitPrice.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:right;font-weight:600;">₱${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Exakt Medical Inventory System - ${poNumber}</title>
        <style>${BASE_PDF_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">Exakt Medical Inventory System</h1>
            <p class="doc-subtitle">Purchase Order Requisition</p>
          </div>
          <div class="meta-right">
            <div class="doc-num">${poNumber}</div>
            <div class="badges">
              <span class="badge">Status: ${status}</span>
              <span class="badge">Priority: ${priority}</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-label">Pharmacy / Facility</div>
            <div class="info-value">${pharmacyName}</div>
          </div>
          <div>
            <div class="info-label">Supplier / Vendor</div>
            <div class="info-value">${supplierName}</div>
          </div>
          <div>
            <div class="info-label">Requested Date</div>
            <div class="info-value">${requestedDate}</div>
          </div>
          <div>
            <div class="info-label">Total Units (Ordered / Received)</div>
            <div class="info-value">${totalOrdered} / ${totalReceived}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:28px;text-align:center;">#</th>
              <th>Medicine / SKU</th>
              <th>Brand</th>
              <th>Packaging</th>
              <th style="text-align:right;">Ordered</th>
              <th style="text-align:right;">Received</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center;color:#64748b;">No line items</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;">Total</td>
              <td style="text-align:right;">${totalOrdered}</td>
              <td style="text-align:right;">${totalReceived}</td>
              <td></td>
              <td style="text-align:right;">₱${totalCost}</td>
            </tr>
          </tfoot>
        </table>

        ${notesText ? `<div class="notes-box"><strong>Notes:</strong> ${escapeHtml(notesText)}</div>` : ""}

        <div class="footer">
          <span>Exakt Medical Inventory System</span>
          <span>Generated on ${escapeHtml(new Date().toLocaleString())}</span>
        </div>
      </body>
    </html>
  `;

  printHtmlDocument(html);
};

export const exportReorderQuotationPdf = (quotation, pharmacyNameFallback = "—") => {
  if (!quotation) return;

  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const hasQuotedPrices = items.some((it) => Number(it.estimatedPrice || 0) > 0);
  const quotationNum = escapeHtml(quotation.quotationNumber || `QT-${quotation.id}`);
  const status = escapeHtml(quotation.status || "Pending");
  const priority = escapeHtml(quotation.priority || "Normal");
  const pharmacyName = escapeHtml(quotation.pharmacyName || pharmacyNameFallback || "—");
  const supplierName = escapeHtml(quotation.supplierName || "—");
  const requestedBy = escapeHtml(quotation.userName || "Pharmacist");
  const createdDate = quotation.createdAt
    ? escapeHtml(new Date(quotation.createdAt).toLocaleString())
    : "—";
  const poNum = quotation.purchaseOrderNum ? escapeHtml(quotation.purchaseOrderNum) : null;
  const totalUnits = Number(
    quotation.totalUnits ??
      items.reduce((sum, it) => sum + (Number(it.requestedUnits) || 0), 0),
  ).toLocaleString();
  const totalQuotedCost = Number(quotation.estimatedTotalCost || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const rowsHtml = items
    .map((item, idx) => {
      const requested = Number(item.requestedUnits) || 0;
      const quotedPrice = Number(item.estimatedPrice) || 0;

      return `
        <tr>
          <td style="text-align:center;color:#64748b;">${idx + 1}</td>
          <td>
            <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.genericName || item.brandName || item.skuCode || "—")}</div>
            <div style="font-size:11px;color:#64748b;">SKU: ${escapeHtml(item.skuCode || "—")}${item.dosage ? ` • ${escapeHtml(item.dosage)}` : ""}</div>
          </td>
          <td>${escapeHtml(item.brandName || "—")}</td>
          <td>${escapeHtml(item.packagingUnit || "—")}</td>
          <td style="text-align:right;">${item.currentStock !== null && item.currentStock !== undefined ? Number(item.currentStock).toLocaleString() : "—"}</td>
          <td style="text-align:right;font-weight:600;">${requested.toLocaleString()}</td>
          ${
            hasQuotedPrices
              ? `<td style="text-align:right;font-weight:600;">${quotedPrice > 0 ? `₱${quotedPrice.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</td>`
              : ""
          }
          <td>${escapeHtml(item.notes || "—")}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Exakt Medical Inventory System - ${quotationNum}</title>
        <style>${BASE_PDF_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">Exakt Medical Inventory System</h1>
            <p class="doc-subtitle">Reorder Quotation Request</p>
          </div>
          <div class="meta-right">
            <div class="doc-num">${quotationNum}</div>
            <div class="badges">
              <span class="badge">Status: ${status}</span>
              <span class="badge">Priority: ${priority}</span>
              ${poNum ? `<span class="badge">PO: ${poNum}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-label">Pharmacy</div>
            <div class="info-value">${pharmacyName}</div>
          </div>
          <div>
            <div class="info-label">Supplier / Vendor</div>
            <div class="info-value">${supplierName}</div>
          </div>
          <div>
            <div class="info-label">Requested By</div>
            <div class="info-value">${requestedBy}</div>
          </div>
          <div>
            <div class="info-label">Created Date</div>
            <div class="info-value">${createdDate}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:28px;text-align:center;">#</th>
              <th>Medication &amp; SKU</th>
              <th>Brand</th>
              <th>Packaging</th>
              <th style="text-align:right;">Current Stock</th>
              <th style="text-align:right;">Requested Units</th>
              ${hasQuotedPrices ? '<th style="text-align:right;">Quoted Price</th>' : ""}
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${
              rowsHtml ||
              `<tr><td colspan="${hasQuotedPrices ? 8 : 7}" style="text-align:center;color:#64748b;">No line items</td></tr>`
            }
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right;">Total Requested Units</td>
              <td style="text-align:right;">${totalUnits}</td>
              ${hasQuotedPrices ? `<td style="text-align:right;">₱${totalQuotedCost}</td>` : ""}
              <td></td>
            </tr>
          </tfoot>
        </table>

        ${quotation.notes ? `<div class="notes-box"><strong>Pharmacist Notes:</strong> ${escapeHtml(quotation.notes)}</div>` : ""}
        ${quotation.rejectionReason ? `<div class="danger-box"><strong>Rejection Reason:</strong> ${escapeHtml(quotation.rejectionReason)}</div>` : ""}

        <div class="footer">
          <span>Exakt Medical Inventory System</span>
          <span>Generated on ${escapeHtml(new Date().toLocaleString())}</span>
        </div>
      </body>
    </html>
  `;

  printHtmlDocument(html);
};
