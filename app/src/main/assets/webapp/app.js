/* Compatibility fixes for older Android WebView */
(function () {
  if (!NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }
  if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      var el = this;
      while (el && el.nodeType === 1) {
        if (el.matches(selector)) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
      if (this == null) throw new TypeError('Array.prototype.find called on null or undefined');
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      for (var i = 0; i < length; i++) {
        var value = list[i];
        if (predicate.call(thisArg, value, i, list)) return value;
      }
      return undefined;
    };
  }
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (search, pos) {
      pos = pos || 0;
      return this.substring(pos, pos + search.length) === search;
    };
  }
})();

var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var STORAGE_KEY = 'satis-offline-v1';
var PRINTER_STORAGE_KEY = 'satis-offline-printer';
var state = null;
var selectedCustomerId = null;
var toastTimer = null;
var saleDraftItems = [];
var lastInvoiceDocNo = '';
var seedData = {
    customers: [
        { id: 'c1', name: 'Ismayil Insaat', phone: '050 111 11 11', area: 'Xirdalan', note: 'Nümunə müştəri' },
        { id: 'c2', name: 'Elnur Insaat', phone: '050 222 22 22', area: 'Masazır', note: 'Nümunə müştəri' }
    ],
    products: [
        { id: 'p1', name: 'Qelem', initialStock: 100, costPrice: 0.2, standardPrice: 1, note: '', imageDataUrl: '' },
        { id: 'p2', name: 'Nelveri', initialStock: 100, costPrice: 0.8, standardPrice: 1.5, note: '', imageDataUrl: '' },
        { id: 'p3', name: 'Stakan', initialStock: 100, costPrice: 0.6, standardPrice: 1.2, note: '', imageDataUrl: '' }
    ],
    customerPrices: [
        { id: 'cp1', customerId: 'c1', productId: 'p1', price: 1 },
        { id: 'cp2', customerId: 'c2', productId: 'p1', price: 0.5 },
        { id: 'cp3', customerId: 'c1', productId: 'p2', price: 2.5 },
        { id: 'cp4', customerId: 'c2', productId: 'p2', price: 1.8 },
        { id: 'cp5', customerId: 'c1', productId: 'p3', price: 1.8 },
        { id: 'cp6', customerId: 'c2', productId: 'p3', price: 1.3 }
    ],
    sales: [
        { id: 's1', date: '2026-02-15', docNo: 'S-001', customerId: 'c1', productId: 'p1', qty: 10, price: 1, received: 7, note: '10 manatlıq satış, 7 manat alınıb' },
        { id: 's2', date: '2026-02-16', docNo: 'S-002', customerId: 'c2', productId: 'p1', qty: 6, price: 0.5, received: 3, note: 'Fərqli müştəri qiyməti' },
        { id: 's3', date: '2026-03-10', docNo: 'S-003', customerId: 'c1', productId: 'p2', qty: 4, price: 2.5, received: 5, note: 'Mart ayı nümunə satışı' }
    ],
    returns: [
        { id: 'r1', date: '2026-02-18', customerId: 'c1', productId: 'p1', originalQty: 5, defectiveQty: 1, replacementQty: 1, price: 1, note: '1 ədəd işləmədiyi üçün əvəz verildi' }
    ],
    payments: [
        { id: 'pay1', date: '2026-02-20', customerId: 'c1', amount: 2, note: 'Fevral borcundan əlavə ödəniş' }
    ]
};
state = loadState();
var els = {};
document.addEventListener('DOMContentLoaded', function () {
    bindEls();
    bindTabs();
    bindForms();
    window.addEventListener('bluetooth-permission-updated', function () { return refreshPrinterUi(true); });
    setDefaultDates();
    setProductImagePreview('');
    renderAll();
    showToast('Sistem hazırdır. Bütün məlumatlar telefonda saxlanılır.');
});
function bindEls() {
    var ids = [
        'customer-form', 'customer-id', 'customer-name', 'customer-phone', 'customer-area', 'customer-note', 'customer-reset',
        'price-form', 'price-id', 'price-customer', 'price-product', 'price-value', 'price-reset', 'customer-prices-table',
        'customers-summary-table', 'customer-detail',
        'product-form', 'product-id', 'product-image-data', 'product-name', 'product-stock', 'product-cost', 'product-price', 'product-image', 'product-image-preview', 'product-image-clear', 'product-note', 'product-reset', 'products-table',
        'sale-form', 'sale-date', 'sale-doc', 'sale-customer', 'sale-product', 'sale-qty', 'sale-price', 'sale-note', 'sale-preview', 'sale-add-item', 'sale-reset-current', 'sale-cart-table', 'sale-clear-cart', 'sale-received', 'sale-cart-summary', 'sale-print-last', 'sales-table',
        'return-form', 'return-date', 'return-customer', 'return-product', 'return-original', 'return-defective', 'return-replacement', 'return-note', 'return-preview', 'returns-table',
        'payment-form', 'payment-date', 'payment-customer', 'payment-amount', 'payment-note', 'payment-preview', 'payments-table',
        'dashboard-cards', 'today-label', 'today-sales-list', 'dashboard-debts',
        'reports-table', 'export-json', 'import-json', 'reset-demo', 'printer-device', 'printer-refresh', 'printer-test', 'printer-status', 'toast'
    ];
    ids.forEach(function (id) { els[id] = document.getElementById(id); });
}
function bindTabs() {
    document.querySelectorAll('.tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab').forEach(function (t) { return t.classList.remove('active'); });
            document.querySelectorAll('.screen').forEach(function (s) { return s.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById("screen-".concat(btn.dataset.tab)).classList.add('active');
        });
    });
}
function bindForms() {
    els['customer-form'].addEventListener('submit', onSaveCustomer);
    els['price-form'].addEventListener('submit', onSaveCustomerPrice);
    els['product-form'].addEventListener('submit', onSaveProduct);
    els['product-image'].addEventListener('change', onProductImageSelected);
    els['product-image-clear'].addEventListener('click', clearProductImage);
    els['sale-form'].addEventListener('submit', onSaveSale);
    els['sale-add-item'].addEventListener('click', addSaleDraftItem);
    els['sale-reset-current'].addEventListener('click', resetSaleLineFields);
    els['sale-clear-cart'].addEventListener('click', clearSaleDraft);
    els['sale-print-last'].addEventListener('click', printLastInvoice);
    els['return-form'].addEventListener('submit', onSaveReturn);
    els['payment-form'].addEventListener('submit', onSavePayment);
    els['customer-reset'].addEventListener('click', resetCustomerForm);
    els['price-reset'].addEventListener('click', resetPriceForm);
    els['product-reset'].addEventListener('click', resetProductForm);
    els['sale-customer'].addEventListener('change', updateSaleAutoFields);
    els['sale-product'].addEventListener('change', updateSaleAutoFields);
    els['sale-qty'].addEventListener('input', updateSalePreview);
    els['sale-price'].addEventListener('input', updateSalePreview);
    els['sale-received'].addEventListener('input', renderSaleDraft);
    els['return-product'].addEventListener('change', updateReturnPreview);
    els['return-replacement'].addEventListener('input', updateReturnPreview);
    els['payment-customer'].addEventListener('change', updatePaymentPreview);
    els['payment-amount'].addEventListener('input', updatePaymentPreview);
    els['export-json'].addEventListener('click', exportJsonBackup);
    els['import-json'].addEventListener('change', importJsonBackup);
    els['reset-demo'].addEventListener('click', resetToDemo);
    els['printer-device'].addEventListener('change', onPrinterSelectionChange);
    els['printer-refresh'].addEventListener('click', function () { return refreshPrinterUi(true); });
    els['printer-test'].addEventListener('click', testPrintReceipt);
    document.body.addEventListener('click', handleActionClick);
}
function handleActionClick(event) {
    var actionEl = event.target.closest('[data-action]');
    if (!actionEl)
        return;
    var action = actionEl.dataset.action;
    var id = actionEl.dataset.id;
    if (action === 'edit-customer')
        fillCustomerForm(id);
    if (action === 'delete-customer')
        deleteCustomer(id);
    if (action === 'edit-price')
        fillPriceForm(id);
    if (action === 'delete-price')
        deleteById('customerPrices', id, 'Qiymət silindi.');
    if (action === 'edit-product')
        fillProductForm(id);
    if (action === 'delete-product')
        deleteProduct(id);
    if (action === 'delete-sale')
        deleteById('sales', id, 'Satış silindi.');
    if (action === 'print-sale')
        printInvoiceByDocNo(id);
    if (action === 'delete-sale-draft') {
        saleDraftItems.splice(Number(id), 1);
        renderSaleDraft();
        updateSalePreview();
    }
    if (action === 'delete-return')
        deleteById('returns', id, 'İadə silindi.');
    if (action === 'delete-payment')
        deleteById('payments', id, 'Ödəniş silindi.');
    if (action === 'show-customer')
        showCustomerDetail(id);
}
function loadState() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return deepClone(seedData);
        var parsed = JSON.parse(raw);
        return normalizeState(parsed);
    }
    catch (error) {
        return deepClone(seedData);
    }
}
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function normalizeState(parsed) {
    if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.products) || !Array.isArray(parsed.sales))
        return deepClone(seedData);
    var normalized = {
        customers: parsed.customers.map(function (item) { return ({
            id: String(item.id || uid('c')),
            name: String(item.name || '').trim(),
            phone: String(item.phone || '').trim(),
            area: String(item.area || '').trim(),
            note: String(item.note || '').trim()
        }); }).filter(function (item) { return item.name; }),
        products: parsed.products.map(function (item) { return ({
            id: String(item.id || uid('p')),
            name: String(item.name || '').trim(),
            initialStock: Math.max(0, safeNumber(item.initialStock)),
            costPrice: Math.max(0, safeNumber(item.costPrice)),
            standardPrice: Math.max(0, safeNumber(item.standardPrice)),
            note: String(item.note || '').trim(),
            imageDataUrl: normalizeImageData(item.imageDataUrl)
        }); }).filter(function (item) { return item.name && item.standardPrice > 0; }),
        customerPrices: Array.isArray(parsed.customerPrices) ? parsed.customerPrices.map(function (item) { return ({
            id: String(item.id || uid('cp')),
            customerId: String(item.customerId || ''),
            productId: String(item.productId || ''),
            price: Math.max(0, safeNumber(item.price))
        }); }).filter(function (item) { return item.customerId && item.productId && item.price > 0; }) : [],
        sales: parsed.sales.map(function (item) { return ({
            id: String(item.id || uid('s')),
            batchId: String(item.batchId || item.docNo || uid('sb')),
            date: String(item.date || ''),
            docNo: String(item.docNo || '').trim(),
            customerId: String(item.customerId || ''),
            productId: String(item.productId || ''),
            qty: Math.max(0, safeNumber(item.qty)),
            price: Math.max(0, safeNumber(item.price)),
            received: Math.max(0, safeNumber(item.received)),
            note: String(item.note || '').trim()
        }); }).filter(function (item) { return item.date && item.docNo && item.customerId && item.productId && item.qty > 0 && item.price > 0; }),
        returns: Array.isArray(parsed.returns) ? parsed.returns.map(function (item) { return ({
            id: String(item.id || uid('r')),
            date: String(item.date || ''),
            customerId: String(item.customerId || ''),
            productId: String(item.productId || ''),
            originalQty: Math.max(0, safeNumber(item.originalQty)),
            defectiveQty: Math.max(0, safeNumber(item.defectiveQty)),
            replacementQty: Math.max(0, safeNumber(item.replacementQty)),
            price: Math.max(0, safeNumber(item.price)),
            note: String(item.note || '').trim()
        }); }).filter(function (item) { return item.date && item.customerId && item.productId; }) : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments.map(function (item) { return ({
            id: String(item.id || uid('pay')),
            date: String(item.date || ''),
            customerId: String(item.customerId || ''),
            amount: Math.max(0, safeNumber(item.amount)),
            note: String(item.note || '').trim()
        }); }).filter(function (item) { return item.date && item.customerId && item.amount > 0; }) : []
    };
    return normalized;
}
function uid(prefix) {
    return "".concat(prefix, "_").concat(Date.now(), "_").concat(Math.floor(Math.random() * 10000));
}
function setDefaultDates() {
    var today = todayIso();
    ['sale-date', 'return-date', 'payment-date'].forEach(function (key) { els[key].value = today; });
    if (!els['sale-doc'].value)
        els['sale-doc'].value = nextDocNo();
    if (!els['sale-received'].value)
        els['sale-received'].value = '0';
}
function formatLocalIso(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day);
}
function todayIso() {
    return formatLocalIso(new Date());
}
function nextDocNo() {
    var maxNo = state.sales.reduce(function (max, sale) {
        var value = parseInt(String(sale.docNo || '').replace(/\D/g, ''), 10);
        return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);
    return "S-".concat(String(maxNo + 1).padStart(3, '0'));
}
function currency(value) {
    var number = Number(value || 0);
    return "".concat(number.toFixed(2), " \u20BC");
}
function safeNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
}
function round2(value) {
    return Math.round(safeNumber(value) * 100) / 100;
}
function fmtDate(dateString) {
    if (!dateString)
        return '-';
    return new Date("".concat(dateString, "T00:00:00")).toLocaleDateString('az-AZ');
}
function escapeHtml(value) {
    var text = String(value !== null && value !== void 0 ? value : '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeImageData(value) {
    var text = String(value || '').trim();
    return text.startsWith('data:image/') ? text : '';
}
function renderProductThumb(product, className, placeholderText) {
    var imageDataUrl = normalizeImageData(product === null || product === void 0 ? void 0 : product.imageDataUrl);
    if (imageDataUrl) {
        return '<div class="' + (className || 'thumb') + '"><img src="' + imageDataUrl + '" alt="' + escapeHtml((product === null || product === void 0 ? void 0 : product.name) || 'Məhsul şəkli') + '" /></div>';
    }
    return '<div class="' + (className || 'thumb') + ' placeholder">' + escapeHtml(placeholderText || 'Şəkil yoxdur') + '</div>';
}
function renderProductInline(product, extraText, vertical) {
    return '<div class="product-inline' + (vertical ? ' vertical' : '') + '">' +
        renderProductThumb(product, 'thumb', 'Şəkil yoxdur') +
        '<div class="name-wrap"><div>' + escapeHtml((product === null || product === void 0 ? void 0 : product.name) || '-') + '</div>' +
        (extraText ? '<div class="subtext">' + escapeHtml(extraText) + '</div>' : '') +
        '</div></div>';
}
function setProductImagePreview(imageDataUrl) {
    var value = normalizeImageData(imageDataUrl);
    els['product-image-data'].value = value;
    if (value) {
        els['product-image-preview'].classList.remove('empty');
        els['product-image-preview'].innerHTML = '<img src="' + value + '" alt="Məhsul şəkli" />';
        els['product-image-clear'].style.display = 'block';
    }
    else {
        els['product-image-preview'].classList.add('empty');
        els['product-image-preview'].textContent = 'Şəkil seçilməyib';
        els['product-image-clear'].style.display = 'none';
    }
}
function clearProductImage() {
    els['product-image'].value = '';
    setProductImagePreview('');
}
function compressImageFile(file, done, fail) {
    if (!file) {
        done('');
        return;
    }
    if (String(file.type || '').indexOf('image/') !== 0) {
        fail('Yalnız şəkil faylı seçmək olar.');
        return;
    }
    var reader = new FileReader();
    reader.onload = function () {
        var img = new Image();
        img.onload = function () {
            try {
                var maxSize = 900;
                var width = img.width || maxSize;
                var height = img.height || maxSize;
                var scale = Math.min(1, maxSize / Math.max(width, height));
                var canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(width * scale));
                canvas.height = Math.max(1, Math.round(height * scale));
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                done(canvas.toDataURL('image/jpeg', 0.82));
            }
            catch (error) {
                fail('Şəkil emal olunmadı.');
            }
        };
        img.onerror = function () { return fail('Şəkil oxunmadı.'); };
        img.src = String(reader.result || '');
    };
    reader.onerror = function () { return fail('Şəkil faylı açıla bilmədi.'); };
    reader.readAsDataURL(file);
}
function onProductImageSelected(event) {
    var _a;
    var file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
    if (!file) {
        if (!els['product-image-data'].value)
            setProductImagePreview('');
        return;
    }
    compressImageFile(file, function (dataUrl) {
        setProductImagePreview(dataUrl);
        showToast('Şəkil hazırdır. Məhsulu yadda saxlayın.');
    }, function (message) {
        showToast(message);
        els['product-image'].value = '';
    });
}

function getCustomer(id) { return state.customers.find(function (item) { return item.id === id; }); }
function getProduct(id) { return state.products.find(function (item) { return item.id === id; }); }
function getCustomerPrice(customerId, productId) {
    return state.customerPrices.find(function (item) { return item.customerId === customerId && item.productId === productId; });
}
function getEffectiveSalePrice(customerId, productId) {
    var _a;
    var custom = getCustomerPrice(customerId, productId);
    if (custom)
        return safeNumber(custom.price);
    return safeNumber((_a = getProduct(productId)) === null || _a === void 0 ? void 0 : _a.standardPrice);
}
function saleComputed(sale) {
    var product = getProduct(sale.productId);
    var qty = safeNumber(sale.qty);
    var price = safeNumber(sale.price);
    var amount = qty * price;
    var costAmount = qty * safeNumber(product === null || product === void 0 ? void 0 : product.costPrice);
    var received = safeNumber(sale.received);
    return {
        amount: amount,
        costAmount: costAmount,
        profit: amount - costAmount,
        debt: amount - received
    };
}
function getCurrentStock(productId) {
    var product = getProduct(productId);
    var initialStock = safeNumber(product === null || product === void 0 ? void 0 : product.initialStock);
    var sold = state.sales
        .filter(function (sale) { return sale.productId === productId; })
        .reduce(function (sum, sale) { return sum + safeNumber(sale.qty); }, 0);
    var replaced = state.returns
        .filter(function (entry) { return entry.productId === productId; })
        .reduce(function (sum, entry) { return sum + safeNumber(entry.replacementQty); }, 0);
    return initialStock - sold - replaced;
}
function getProductCommittedQty(productId) {
    var sold = state.sales
        .filter(function (sale) { return sale.productId === productId; })
        .reduce(function (sum, sale) { return sum + safeNumber(sale.qty); }, 0);
    var replaced = state.returns
        .filter(function (entry) { return entry.productId === productId; })
        .reduce(function (sum, entry) { return sum + safeNumber(entry.replacementQty); }, 0);
    return sold + replaced;
}
function saleDocExists(docNo, excludeId) {
    var normalizedDoc = String(docNo || '').trim().toLowerCase();
    return state.sales.some(function (sale) { return sale.id !== excludeId && String(sale.docNo || '').trim().toLowerCase() === normalizedDoc; });
}
function getCustomerMetrics(customerId) {
    var sales = state.sales.filter(function (sale) { return sale.customerId === customerId; });
    var payments = state.payments.filter(function (payment) { return payment.customerId === customerId; });
    var totalSales = sales.reduce(function (sum, sale) { return sum + saleComputed(sale).amount; }, 0);
    var initialPayments = sales.reduce(function (sum, sale) { return sum + safeNumber(sale.received); }, 0);
    var extraPayments = payments.reduce(function (sum, item) { return sum + safeNumber(item.amount); }, 0);
    var totalPayments = initialPayments + extraPayments;
    var debt = totalSales - totalPayments;
    var lastSaleDate = maxDate(sales.map(function (sale) { return sale.date; }));
    var paymentDates = __spreadArray(__spreadArray([], sales.filter(function (sale) { return safeNumber(sale.received) > 0; }).map(function (sale) { return sale.date; }), true), payments.filter(function (payment) { return safeNumber(payment.amount) > 0; }).map(function (payment) { return payment.date; }), true);
    var lastPaymentDate = maxDate(paymentDates);
    var _a = prevMonthRange(), prevStart = _a.prevStart, prevEnd = _a.prevEnd;
    var year = new Date().getFullYear();
    var prevMonthSales = sales.filter(function (sale) { return sale.date >= prevStart && sale.date <= prevEnd; })
        .reduce(function (sum, sale) { return sum + saleComputed(sale).amount; }, 0);
    var prevMonthPayments = __spreadArray([], sales.filter(function (sale) { return sale.date >= prevStart && sale.date <= prevEnd; }), true).reduce(function (sum, sale) { return sum + safeNumber(sale.received); }, 0) + payments
        .filter(function (payment) { return payment.date >= prevStart && payment.date <= prevEnd; })
        .reduce(function (sum, payment) { return sum + safeNumber(payment.amount); }, 0);
    var currentYearSales = sales.filter(function (sale) { return sale.date.startsWith(String(year)); });
    var currentYearTurnover = currentYearSales.reduce(function (sum, sale) { return sum + saleComputed(sale).amount; }, 0);
    var currentYearProfit = currentYearSales.reduce(function (sum, sale) { return sum + saleComputed(sale).profit; }, 0);
    return {
        totalSales: totalSales,
        initialPayments: initialPayments,
        extraPayments: extraPayments,
        totalPayments: totalPayments,
        debt: debt,
        lastSaleDate: lastSaleDate,
        lastPaymentDate: lastPaymentDate,
        prevMonthSales: prevMonthSales,
        prevMonthPayments: prevMonthPayments,
        currentYearTurnover: currentYearTurnover,
        currentYearProfit: currentYearProfit,
        giftLimit: currentYearProfit * 0.05
    };
}
function prevMonthRange() {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
        prevStart: formatLocalIso(start),
        prevEnd: formatLocalIso(end)
    };
}
function maxDate(items) {
    return items.filter(Boolean).sort().slice(-1)[0] || '';
}
function getSalesByDocNo(docNo) {
    return state.sales.filter(function (sale) { return sale.docNo === docNo; });
}
function getSaleDraftTotal() {
    return round2(saleDraftItems.reduce(function (sum, item) { return sum + (safeNumber(item.qty) * safeNumber(item.price)); }, 0));
}
function getDraftQtyForProduct(productId) {
    return saleDraftItems.filter(function (item) { return item.productId === productId; }).reduce(function (sum, item) { return sum + safeNumber(item.qty); }, 0);
}
function resetSaleLineFields() {
    els['sale-product'].value = '';
    els['sale-qty'].value = '';
    els['sale-price'].value = '';
    els['sale-note'].value = '';
    updateSalePreview();
}
function clearSaleDraft() {
    saleDraftItems = [];
    els['sale-received'].value = '0';
    renderSaleDraft();
    updateSalePreview();
}
function renderSaleDraft() {
    var rows = saleDraftItems.map(function (item, index) {
        var product = getProduct(item.productId);
        var amount = round2(safeNumber(item.qty) * safeNumber(item.price));
        return '<tr>' +
            '<td>' + renderProductInline(product, item.note || '', false) + '</td>' +
            '<td>' + item.qty + '</td>' +
            '<td>' + currency(item.price) + '</td>' +
            '<td>' + currency(amount) + '</td>' +
            '<td><button class="small danger" data-action="delete-sale-draft" data-id="' + index + '">Sil</button></td>' +
            '</tr>';
    }).join('');
    els['sale-cart-table'].innerHTML = '<table>' +
        '<thead><tr><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Məbləğ</th><th>Əməliyyat</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="5">Səbətdə məhsul yoxdur.</td></tr>') + '</tbody>' +
        '</table>';
    var total = getSaleDraftTotal();
    var received = round2(els['sale-received'].value);
    var debt = round2(total - received);
    els['sale-cart-summary'].innerHTML = '<div class="invoice-summary-grid">' +
        '<div><span class="muted">Sətir sayı</span><strong>' + saleDraftItems.length + '</strong></div>' +
        '<div><span class="muted">Ümumi məbləğ</span><strong>' + currency(total) + '</strong></div>' +
        '<div><span class="muted">Alınan pul</span><strong>' + currency(received) + '</strong></div>' +
        '<div><span class="muted">Qalan borc</span><strong>' + currency(debt) + '</strong></div>' +
        '</div>';
}
function addSaleDraftItem() {
    var customerId = els['sale-customer'].value;
    var productId = els['sale-product'].value;
    var qty = safeNumber(els['sale-qty'].value);
    var price = safeNumber(els['sale-price'].value);
    var note = els['sale-note'].value.trim();
    if (!customerId)
        return showToast('Əvvəlcə müştəri seçin.');
    if (!productId || qty <= 0 || price <= 0)
        return showToast('Məhsul, say və qiyməti düzgün daxil et.');
    var availableStock = getCurrentStock(productId) - getDraftQtyForProduct(productId);
    if (availableStock < qty)
        return showToast('Səbətdəki sayla birlikdə bu qədər stok yoxdur.');
    saleDraftItems.push({ productId: productId, qty: qty, price: price, note: note });
    renderSaleDraft();
    resetSaleLineFields();
    showToast('Məhsul səbətə əlavə olundu.');
}
function printerBridgeAvailable() {
    return !!(window.AndroidPrinter && typeof window.AndroidPrinter.getPairedPrintersJson === 'function');
}
function setPrinterStatus(message) {
    els['printer-status'].textContent = message;
}
function refreshPrinterUi(showToastOnRefresh) {
    if (!els['printer-device'])
        return;
    if (!printerBridgeAvailable()) {
        els['printer-device'].innerHTML = '<option value="">Android tətbiqində aktivdir</option>';
        setPrinterStatus('Bluetooth çap yalnız Android tətbiqi içində işləyir. Printer əvvəlcədən pair olunmalıdır.');
        return;
    }
    try {
        var devices = JSON.parse(window.AndroidPrinter.getPairedPrintersJson() || '[]');
        if (!devices.length) {
            els['printer-device'].innerHTML = '<option value="">Pair olunmuş printer tapılmadı</option>';
            setPrinterStatus('Pair olunmuş ESC/POS printer tapılmadı.');
            if (showToastOnRefresh)
                showToast('Pair olunmuş printer tapılmadı.');
            return;
        }
        var saved = localStorage.getItem(PRINTER_STORAGE_KEY) || '';
        els['printer-device'].innerHTML = '<option value="">Printer seçin</option>' + devices.map(function (device) {
            return '<option value="' + escapeHtml(device.address) + '">' + escapeHtml(device.name || device.address) + '</option>';
        }).join('');
        els['printer-device'].value = saved;
        if (!els['printer-device'].value && devices[0]) {
            els['printer-device'].value = devices[0].address;
            localStorage.setItem(PRINTER_STORAGE_KEY, devices[0].address);
        }
        var selectedOption = els['printer-device'].options && els['printer-device'].options[els['printer-device'].selectedIndex];
        var selectedText = selectedOption ? selectedOption.textContent : 'Printer seçin';
        setPrinterStatus('Seçilmiş printer: ' + selectedText);
        if (showToastOnRefresh)
            showToast('Printer siyahısı yeniləndi.');
    }
    catch (error) {
        setPrinterStatus('Printer siyahısı oxunmadı.');
        if (showToastOnRefresh)
            showToast('Printer siyahısı oxunmadı.');
    }
}
function onPrinterSelectionChange() {
    localStorage.setItem(PRINTER_STORAGE_KEY, els['printer-device'].value || '');
    setPrinterStatus(els['printer-device'].value ? 'Printer seçildi və yadda saxlandı.' : 'Printer seçilməyib.');
}
function buildReceiptLine(left, right) {
    var width = 32;
    var leftText = String(left || '');
    var rightText = String(right || '');
    if (leftText.length + rightText.length >= width) {
        leftText = leftText.slice(0, Math.max(0, width - rightText.length - 1));
    }
    return leftText + new Array(Math.max(2, width - leftText.length - rightText.length) + 1).join(' ') + rightText;
}
function buildInvoiceReceipt(docNo) {
    var lines = getSalesByDocNo(docNo);
    if (!lines.length)
        return '';
    var customer = getCustomer(lines[0].customerId);
    var total = round2(lines.reduce(function (sum, sale) { return sum + saleComputed(sale).amount; }, 0));
    var received = round2(lines.reduce(function (sum, sale) { return sum + safeNumber(sale.received); }, 0));
    var debt = round2(total - received);
    var text = '';
    text += 'SATIS QAIME\n';
    text += '==============================\n';
    text += 'Tarix: ' + fmtDate(lines[0].date) + '\n';
    text += 'Qaime No: ' + docNo + '\n';
    text += 'Musteri: ' + ((customer && customer.name) || '-') + '\n';
    text += '------------------------------\n';
    lines.forEach(function (sale, index) {
        var product = getProduct(sale.productId);
        var amount = round2(safeNumber(sale.qty) * safeNumber(sale.price));
        text += (index + 1) + '. ' + ((product && product.name) || '-') + '\n';
        text += buildReceiptLine(String(sale.qty) + ' x ' + round2(sale.price).toFixed(2), round2(amount).toFixed(2)) + '\n';
        if (sale.note)
            text += 'Qeyd: ' + sale.note + '\n';
    });
    text += '------------------------------\n';
    text += buildReceiptLine('CEMI', total.toFixed(2) + ' AZN') + '\n';
    text += buildReceiptLine('ALINAN', received.toFixed(2) + ' AZN') + '\n';
    text += buildReceiptLine('BORC', debt.toFixed(2) + ' AZN') + '\n';
    text += 'Tesekkur edirik!\n\n\n';
    return text;
}
function printTextToSelectedPrinter(text) {
    if (!printerBridgeAvailable()) {
        showToast('Printer funksiyası yalnız Android tətbiqində işləyir.');
        return false;
    }
    var address = els['printer-device'].value || localStorage.getItem(PRINTER_STORAGE_KEY) || '';
    if (!address) {
        showToast('Əvvəlcə printer seçin.');
        return false;
    }
    try {
        var result = window.AndroidPrinter.printText(address, text || '');
        setPrinterStatus(result || 'Çap göndərildi.');
        showToast(result || 'Çap göndərildi.');
        return String(result || '').toLowerCase().indexOf('xeta') === -1 && String(result || '').toLowerCase().indexOf('error') === -1;
    }
    catch (error) {
        setPrinterStatus('Çap alınmadı.');
        showToast('Çap alınmadı.');
        return false;
    }
}
function printInvoiceByDocNo(docNo) {
    var receipt = buildInvoiceReceipt(docNo);
    if (!receipt)
        return showToast('Qaimə tapılmadı.');
    if (printTextToSelectedPrinter(receipt))
        lastInvoiceDocNo = docNo;
}
function printLastInvoice() {
    if (!lastInvoiceDocNo)
        return showToast('Çap üçün son qaimə yoxdur.');
    printInvoiceByDocNo(lastInvoiceDocNo);
}
function testPrintReceipt() {
    printTextToSelectedPrinter('TEST CAP\nSatis Offline\nBluetooth ESC/POS\n\n\n');
}
function renderAll() {
    saveState();
    refreshSelects();
    renderDashboard();
    renderCustomers();
    renderCustomerPrices();
    renderProducts();
    renderSales();
    renderSaleDraft();
    renderReturns();
    renderPayments();
    renderReports();
    updateSaleAutoFields();
    updateReturnPreview();
    updatePaymentPreview();
    refreshPrinterUi(false);
}
function refreshSelects() {
    var customerOptions = ['<option value="">Seçin</option>']
        .concat(state.customers.map(function (customer) { return "<option value=\"".concat(customer.id, "\">").concat(escapeHtml(customer.name), "</option>"); }))
        .join('');
    var productOptions = ['<option value="">Seçin</option>']
        .concat(state.products.map(function (product) { return "<option value=\"".concat(product.id, "\">").concat(escapeHtml(product.name), "</option>"); }))
        .join('');
    ['price-customer', 'sale-customer', 'return-customer', 'payment-customer'].forEach(function (id) {
        var current = els[id].value;
        els[id].innerHTML = customerOptions;
        els[id].value = current;
    });
    ['price-product', 'sale-product', 'return-product'].forEach(function (id) {
        var current = els[id].value;
        els[id].innerHTML = productOptions;
        els[id].value = current;
    });
}
function renderDashboard() {
    var today = todayIso();
    var todaySales = state.sales.filter(function (sale) { return sale.date === today; });
    var todayQty = todaySales.reduce(function (sum, sale) { return sum + safeNumber(sale.qty); }, 0);
    var todayAmount = todaySales.reduce(function (sum, sale) { return sum + saleComputed(sale).amount; }, 0);
    var todayProfit = todaySales.reduce(function (sum, sale) { return sum + saleComputed(sale).profit; }, 0);
    var totalDebt = state.customers.reduce(function (sum, customer) { return sum + getCustomerMetrics(customer.id).debt; }, 0);
    var stockValue = state.products.reduce(function (sum, product) { return sum + (getCurrentStock(product.id) * safeNumber(product.costPrice)); }, 0);
    els['today-label'].textContent = fmtDate(today);
    els['dashboard-cards'].innerHTML = "\n    <div class=\"mini-card\"><div class=\"label\">Bug\u00FCnk\u00FC sat\u0131lan say</div><div class=\"value\">".concat(todayQty, "</div><div class=\"sub\">\u018Fd\u0259d</div></div>\n    <div class=\"mini-card\"><div class=\"label\">Bug\u00FCnk\u00FC sat\u0131\u015F</div><div class=\"value\">").concat(currency(todayAmount), "</div><div class=\"sub\">C\u0259mi d\u00F6vriyy\u0259</div></div>\n    <div class=\"mini-card\"><div class=\"label\">Bug\u00FCnk\u00FC xeyir</div><div class=\"value\">").concat(currency(todayProfit), "</div><div class=\"sub\">M\u0259nf\u0259\u0259t</div></div>\n    <div class=\"mini-card\"><div class=\"label\">\u00DCmumi qal\u0131q borc</div><div class=\"value\">").concat(currency(totalDebt), "</div><div class=\"sub\">B\u00FCt\u00FCn m\u00FC\u015Ft\u0259ril\u0259r</div></div>\n    <div class=\"mini-card\"><div class=\"label\">Stok d\u0259y\u0259ri</div><div class=\"value\">").concat(currency(stockValue), "</div><div class=\"sub\">Maya il\u0259</div></div>\n    <div class=\"mini-card\"><div class=\"label\">M\u00FC\u015Ft\u0259ri say\u0131</div><div class=\"value\">").concat(state.customers.length, "</div><div class=\"sub\">Aktiv baza</div></div>\n    <div class=\"mini-card\"><div class=\"label\">M\u0259hsul say\u0131</div><div class=\"value\">").concat(state.products.length, "</div><div class=\"sub\">Anbar \u00E7e\u015Fidi</div></div>\n    <div class=\"mini-card\"><div class=\"label\">Sat\u0131\u015F qeyd say\u0131</div><div class=\"value\">").concat(state.sales.length, "</div><div class=\"sub\">Tarix\u00E7\u0259</div></div>\n  ");
    els['today-sales-list'].innerHTML = todaySales.length ? todaySales.map(function (sale) {
        var customer = getCustomer(sale.customerId);
        var product = getProduct(sale.productId);
        var computed = saleComputed(sale);
        return '<div class="list-item has-thumb">' +
            renderProductThumb(product, 'thumb', 'Yoxdur') +
            '<div class="content">' +
            '<div class="row"><div class="title">' + escapeHtml((customer === null || customer === void 0 ? void 0 : customer.name) || '-') + '</div><div>' + currency(computed.amount) + '</div></div>' +
            '<div class="meta">' + escapeHtml((product === null || product === void 0 ? void 0 : product.name) || '-') + ' • ' + sale.qty + ' ədəd • Alınan: ' + currency(sale.received) + ' • Borc: ' + currency(computed.debt) + '</div>' +
            '</div></div>';
    }).join('') : '<div class="info-box">Bu gün üçün satış yoxdur.</div>';
    var debtItems = state.customers
        .map(function (customer) { return ({ customer: customer, metrics: getCustomerMetrics(customer.id) }); })
        .filter(function (item) { return item.metrics.debt > 0; })
        .sort(function (a, b) { return b.metrics.debt - a.metrics.debt; });
    els['dashboard-debts'].innerHTML = debtItems.length ? debtItems.map(function (item) { return "\n    <div class=\"list-item\">\n      <div class=\"row\"><div class=\"title\">".concat(escapeHtml(item.customer.name), "</div><div class=\"danger-text\">").concat(currency(item.metrics.debt), "</div></div>\n      <div class=\"meta\">Son sat\u0131\u015F: ").concat(fmtDate(item.metrics.lastSaleDate), " \u2022 Son \u00F6d\u0259ni\u015F: ").concat(fmtDate(item.metrics.lastPaymentDate), "</div>\n    </div>"); }).join('') : '<div class="info-box">Borc qalıqları yoxdur.</div>';
}
function renderCustomers() {
    var rows = state.customers.map(function (customer) {
        var metrics = getCustomerMetrics(customer.id);
        return "\n      <tr class=\"clickable\" data-action=\"show-customer\" data-id=\"".concat(customer.id, "\">\n        <td>").concat(escapeHtml(customer.name), "</td>\n        <td>").concat(escapeHtml(customer.phone || '-'), "</td>\n        <td>").concat(escapeHtml(customer.area || '-'), "</td>\n        <td>").concat(fmtDate(metrics.lastSaleDate), "</td>\n        <td>").concat(fmtDate(metrics.lastPaymentDate), "</td>\n        <td>").concat(currency(metrics.totalSales), "</td>\n        <td>").concat(currency(metrics.totalPayments), "</td>\n        <td><span class=\"badge ").concat(metrics.debt > 0 ? 'danger' : 'ok', "\">").concat(currency(metrics.debt), "</span></td>\n        <td>\n          <button class=\"small secondary\" data-action=\"edit-customer\" data-id=\"").concat(customer.id, "\">D\u00FCz\u0259lt</button>\n          <button class=\"small danger\" data-action=\"delete-customer\" data-id=\"").concat(customer.id, "\">Sil</button>\n        </td>\n      </tr>");
    }).join('');
    els['customers-summary-table'].innerHTML = "\n    <table>\n      <thead>\n        <tr>\n          <th>M\u00FC\u015Ft\u0259ri</th><th>\u018Flaq\u0259</th><th>\u018Frazi</th><th>Son sat\u0131\u015F</th><th>Son \u00F6d\u0259ni\u015F</th><th>C\u0259mi sat\u0131\u015F</th><th>C\u0259mi \u00F6d\u0259ni\u015F</th><th>Borc</th><th>\u018Fm\u0259liyyat</th>\n        </tr>\n      </thead>\n      <tbody>".concat(rows || '<tr><td colspan="9">Müştəri yoxdur.</td></tr>', "</tbody>\n    </table>");
    if (!selectedCustomerId && state.customers[0])
        selectedCustomerId = state.customers[0].id;
    showCustomerDetail(selectedCustomerId);
}
function showCustomerDetail(customerId) {
    selectedCustomerId = customerId;
    var customer = getCustomer(customerId);
    if (!customer) {
        els['customer-detail'].classList.add('hidden');
        return;
    }
    var metrics = getCustomerMetrics(customerId);
    els['customer-detail'].classList.remove('hidden');
    els['customer-detail'].innerHTML = "\n    <strong>".concat(escapeHtml(customer.name), "</strong><br>\n    \u018Flaq\u0259: ").concat(escapeHtml(customer.phone || '-'), " \u2022 \u018Frazi: ").concat(escapeHtml(customer.area || '-'), "<br>\n    Ke\u00E7\u0259n ay sat\u0131\u015F: ").concat(currency(metrics.prevMonthSales), " \u2022 Ke\u00E7\u0259n ay \u00F6d\u0259ni\u015F: ").concat(currency(metrics.prevMonthPayments), "<br>\n    Cari il d\u00F6vriyy\u0259: ").concat(currency(metrics.currentYearTurnover), " \u2022 Cari il xeyir: ").concat(currency(metrics.currentYearProfit), "<br>\n    H\u0259diyy\u0259 limiti (5%): ").concat(currency(metrics.giftLimit), "\n  ");
}
function renderCustomerPrices() {
    var rows = state.customerPrices.map(function (item) {
        var _a, _b;
        return "\n    <tr>\n      <td>".concat(escapeHtml(((_a = getCustomer(item.customerId)) === null || _a === void 0 ? void 0 : _a.name) || '-'), "</td>\n      <td>").concat(escapeHtml(((_b = getProduct(item.productId)) === null || _b === void 0 ? void 0 : _b.name) || '-'), "</td>\n      <td>").concat(currency(item.price), "</td>\n      <td>\n        <button class=\"small secondary\" data-action=\"edit-price\" data-id=\"").concat(item.id, "\">D\u00FCz\u0259lt</button>\n        <button class=\"small danger\" data-action=\"delete-price\" data-id=\"").concat(item.id, "\">Sil</button>\n      </td>\n    </tr>");
    }).join('');
    els['customer-prices-table'].innerHTML = "\n    <table>\n      <thead><tr><th>M\u00FC\u015Ft\u0259ri</th><th>M\u0259hsul</th><th>Qiym\u0259t</th><th>\u018Fm\u0259liyyat</th></tr></thead>\n      <tbody>".concat(rows || '<tr><td colspan="4">Özəl qiymət yoxdur.</td></tr>', "</tbody>\n    </table>");
}
function renderProducts() {
    var rows = state.products.map(function (product) {
        var stock = getCurrentStock(product.id);
        var badgeClass = stock < 0 ? 'danger' : stock < 10 ? 'warn' : 'ok';
        return '<tr>' +
            '<td>' + renderProductInline(product, product.note || '', false) + '</td>' +
            '<td>' + product.initialStock + '</td>' +
            '<td>' + currency(product.costPrice) + '</td>' +
            '<td>' + currency(product.standardPrice) + '</td>' +
            '<td><span class="badge ' + badgeClass + '">' + stock + '</span></td>' +
            '<td>' + currency(stock * safeNumber(product.costPrice)) + '</td>' +
            '<td>' +
            '<button class="small secondary" data-action="edit-product" data-id="' + product.id + '">Düzəlt</button> ' +
            '<button class="small danger" data-action="delete-product" data-id="' + product.id + '">Sil</button>' +
            '</td>' +
            '</tr>';
    }).join('');
    els['products-table'].innerHTML = '<table>' +
        '<thead><tr><th>Məhsul</th><th>Başlanğıc stok</th><th>Maya</th><th>Satış qiyməti</th><th>Hazırkı stok</th><th>Stok dəyəri</th><th>Əməliyyat</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="7">Məhsul yoxdur.</td></tr>') + '</tbody>' +
        '</table>';
}
function renderSales() {
    var rows = __spreadArray([], state.sales, true).sort(function (a, b) {
        if (b.date === a.date)
            return String(b.docNo).localeCompare(String(a.docNo));
        return b.date.localeCompare(a.date);
    }).map(function (sale) {
        var customer = getCustomer(sale.customerId);
        var product = getProduct(sale.productId);
        var computed = saleComputed(sale);
        return '<tr>' +
            '<td>' + fmtDate(sale.date) + '</td>' +
            '<td>' + escapeHtml(sale.docNo) + '</td>' +
            '<td>' + escapeHtml((customer === null || customer === void 0 ? void 0 : customer.name) || '-') + '</td>' +
            '<td>' + renderProductInline(product, product && product.note ? product.note : '', false) + '</td>' +
            '<td>' + sale.qty + '</td>' +
            '<td>' + currency(sale.price) + '</td>' +
            '<td>' + currency(computed.amount) + '</td>' +
            '<td>' + currency(sale.received) + '</td>' +
            '<td>' + currency(computed.debt) + '</td>' +
            '<td><div class="invoice-actions"><button class="small secondary" data-action="print-sale" data-id="' + sale.docNo + '">Çap et</button><button class="small danger" data-action="delete-sale" data-id="' + sale.id + '">Sil</button></div></td>' +
            '</tr>';
    }).join('');
    els['sales-table'].innerHTML = '<table>' +
        '<thead><tr><th>Tarix</th><th>Qaimə</th><th>Müştəri</th><th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Məbləğ</th><th>Alınan</th><th>Borc</th><th>Əməliyyat</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="10">Satış yoxdur.</td></tr>') + '</tbody>' +
        '</table>';
}
function renderReturns() {
    var rows = __spreadArray([], state.returns, true).sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (entry) {
        var _a, _b;
        return "\n    <tr>\n      <td>".concat(fmtDate(entry.date), "</td>\n      <td>").concat(escapeHtml(((_a = getCustomer(entry.customerId)) === null || _a === void 0 ? void 0 : _a.name) || '-'), "</td>\n      <td>").concat(escapeHtml(((_b = getProduct(entry.productId)) === null || _b === void 0 ? void 0 : _b.name) || '-'), "</td>\n      <td>").concat(entry.originalQty, "</td>\n      <td>").concat(entry.defectiveQty, "</td>\n      <td>").concat(entry.replacementQty, "</td>\n      <td>").concat(escapeHtml(entry.note || '-'), "</td>\n      <td><button class=\"small danger\" data-action=\"delete-return\" data-id=\"").concat(entry.id, "\">Sil</button></td>\n    </tr>");
    }).join('');
    els['returns-table'].innerHTML = "\n    <table>\n      <thead><tr><th>Tarix</th><th>M\u00FC\u015Ft\u0259ri</th><th>M\u0259hsul</th><th>\u0130lk say</th><th>Q\u00FCsurlu</th><th>\u018Fv\u0259z</th><th>Qeyd</th><th>\u018Fm\u0259liyyat</th></tr></thead>\n      <tbody>".concat(rows || '<tr><td colspan="8">İadə yoxdur.</td></tr>', "</tbody>\n    </table>");
}
function renderPayments() {
    var rows = __spreadArray([], state.payments, true).sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (payment) {
        var _a;
        return "\n    <tr>\n      <td>".concat(fmtDate(payment.date), "</td>\n      <td>").concat(escapeHtml(((_a = getCustomer(payment.customerId)) === null || _a === void 0 ? void 0 : _a.name) || '-'), "</td>\n      <td>").concat(currency(payment.amount), "</td>\n      <td>").concat(escapeHtml(payment.note || '-'), "</td>\n      <td><button class=\"small danger\" data-action=\"delete-payment\" data-id=\"").concat(payment.id, "\">Sil</button></td>\n    </tr>");
    }).join('');
    els['payments-table'].innerHTML = "\n    <table>\n      <thead><tr><th>Tarix</th><th>M\u00FC\u015Ft\u0259ri</th><th>M\u0259bl\u0259\u011F</th><th>Qeyd</th><th>\u018Fm\u0259liyyat</th></tr></thead>\n      <tbody>".concat(rows || '<tr><td colspan="5">Ödəniş yoxdur.</td></tr>', "</tbody>\n    </table>");
}
function renderReports() {
    var rows = state.customers.map(function (customer) {
        var metrics = getCustomerMetrics(customer.id);
        return "\n      <tr>\n        <td>".concat(escapeHtml(customer.name), "</td>\n        <td>").concat(currency(metrics.totalSales), "</td>\n        <td>").concat(currency(metrics.totalPayments), "</td>\n        <td>").concat(currency(metrics.debt), "</td>\n        <td>").concat(currency(metrics.prevMonthSales), "</td>\n        <td>").concat(currency(metrics.prevMonthPayments), "</td>\n        <td>").concat(currency(metrics.currentYearTurnover), "</td>\n        <td>").concat(currency(metrics.currentYearProfit), "</td>\n        <td>").concat(currency(metrics.giftLimit), "</td>\n      </tr>");
    }).join('');
    els['reports-table'].innerHTML = "\n    <table>\n      <thead><tr><th>M\u00FC\u015Ft\u0259ri</th><th>C\u0259mi sat\u0131\u015F</th><th>C\u0259mi \u00F6d\u0259ni\u015F</th><th>Borc</th><th>Ke\u00E7\u0259n ay sat\u0131\u015F</th><th>Ke\u00E7\u0259n ay \u00F6d\u0259ni\u015F</th><th>Cari il d\u00F6vriyy\u0259</th><th>Cari il xeyir</th><th>5% limit</th></tr></thead>\n      <tbody>".concat(rows || '<tr><td colspan="9">Məlumat yoxdur.</td></tr>', "</tbody>\n    </table>");
}
function onSaveCustomer(event) {
    event.preventDefault();
    var id = els['customer-id'].value;
    var payload = {
        id: id || uid('c'),
        name: els['customer-name'].value.trim(),
        phone: els['customer-phone'].value.trim(),
        area: els['customer-area'].value.trim(),
        note: els['customer-note'].value.trim()
    };
    if (!payload.name)
        return showToast('Müştəri adı boş ola bilməz.');
    if (id) {
        state.customers = state.customers.map(function (item) { return item.id === id ? payload : item; });
        showToast('Müştəri yeniləndi.');
    }
    else {
        state.customers.push(payload);
        showToast('Yeni müştəri əlavə olundu.');
    }
    resetCustomerForm();
    renderAll();
}
function resetCustomerForm() {
    els['customer-form'].reset();
    els['customer-id'].value = '';
}
function fillCustomerForm(id) {
    var customer = getCustomer(id);
    if (!customer)
        return;
    els['customer-id'].value = customer.id;
    els['customer-name'].value = customer.name;
    els['customer-phone'].value = customer.phone || '';
    els['customer-area'].value = customer.area || '';
    els['customer-note'].value = customer.note || '';
}
function deleteCustomer(id) {
    var metrics = getCustomerMetrics(id);
    var hasUsage = metrics.totalSales > 0 || metrics.totalPayments > 0 || state.customerPrices.some(function (item) { return item.customerId === id; }) || state.returns.some(function (item) { return item.customerId === id; });
    if (hasUsage)
        return showToast('Bu müştərinin tarixçəsi var, silmək olmaz.');
    state.customers = state.customers.filter(function (item) { return item.id !== id; });
    showToast('Müştəri silindi.');
    renderAll();
}
function onSaveCustomerPrice(event) {
    event.preventDefault();
    var id = els['price-id'].value;
    var customerId = els['price-customer'].value;
    var productId = els['price-product'].value;
    var price = safeNumber(els['price-value'].value);
    if (!customerId || !productId || price <= 0)
        return showToast('Qiymət üçün bütün sahələri düzgün doldur.');
    var existing = state.customerPrices.find(function (item) { return item.customerId === customerId && item.productId === productId && item.id !== id; });
    if (existing)
        return showToast('Bu müştəri və məhsul üçün artıq qiymət var.');
    var payload = { id: id || uid('cp'), customerId: customerId, productId: productId, price: price };
    if (id) {
        state.customerPrices = state.customerPrices.map(function (item) { return item.id === id ? payload : item; });
        showToast('Özəl qiymət yeniləndi.');
    }
    else {
        state.customerPrices.push(payload);
        showToast('Özəl qiymət əlavə olundu.');
    }
    resetPriceForm();
    renderAll();
}
function resetPriceForm() {
    els['price-form'].reset();
    els['price-id'].value = '';
}
function fillPriceForm(id) {
    var item = state.customerPrices.find(function (row) { return row.id === id; });
    if (!item)
        return;
    els['price-id'].value = item.id;
    els['price-customer'].value = item.customerId;
    els['price-product'].value = item.productId;
    els['price-value'].value = item.price;
}
function finalizeSaveProduct(imageDataUrl) {
    var id = els['product-id'].value;
    var payload = {
        id: id || uid('p'),
        name: els['product-name'].value.trim(),
        initialStock: safeNumber(els['product-stock'].value),
        costPrice: safeNumber(els['product-cost'].value),
        standardPrice: safeNumber(els['product-price'].value),
        note: els['product-note'].value.trim(),
        imageDataUrl: normalizeImageData(imageDataUrl || els['product-image-data'].value)
    };
    if (!payload.name || payload.initialStock < 0 || payload.costPrice < 0 || payload.standardPrice <= 0) {
        return showToast('Məhsul məlumatlarını düzgün daxil et.');
    }
    var committedQty = id ? getProductCommittedQty(id) : 0;
    if (payload.initialStock < committedQty) {
        return showToast("Başlanğıc stok ".concat(committedQty, "-dən az ola bilməz. Çünki bu məhsul üzrə tarixçə var."));
    }
    if (id) {
        state.products = state.products.map(function (item) { return item.id === id ? payload : item; });
        showToast('Məhsul yeniləndi.');
    }
    else {
        state.products.push(payload);
        showToast('Məhsul əlavə olundu.');
    }
    resetProductForm();
    renderAll();
}
function onSaveProduct(event) {
    var _a;
    event.preventDefault();
    var currentImage = els['product-image-data'].value;
    var file = (_a = els['product-image'].files) === null || _a === void 0 ? void 0 : _a[0];
    if (currentImage || !file) {
        finalizeSaveProduct(currentImage);
        return;
    }
    compressImageFile(file, function (dataUrl) { return finalizeSaveProduct(dataUrl); }, function (message) { return showToast(message); });
}
function resetProductForm() {
    els['product-form'].reset();
    els['product-id'].value = '';
    clearProductImage();
}
function fillProductForm(id) {
    var product = getProduct(id);
    if (!product)
        return;
    els['product-id'].value = product.id;
    els['product-name'].value = product.name;
    els['product-stock'].value = product.initialStock;
    els['product-cost'].value = product.costPrice;
    els['product-price'].value = product.standardPrice;
    els['product-note'].value = product.note || '';
    els['product-image'].value = '';
    setProductImagePreview(product.imageDataUrl || '');
}
function deleteProduct(id) {
    var hasUsage = state.sales.some(function (sale) { return sale.productId === id; }) || state.returns.some(function (item) { return item.productId === id; }) || state.customerPrices.some(function (item) { return item.productId === id; });
    if (hasUsage)
        return showToast('Bu məhsulun tarixçəsi var, silmək olmaz.');
    state.products = state.products.filter(function (item) { return item.id !== id; });
    showToast('Məhsul silindi.');
    renderAll();
}
function updateSaleAutoFields() {
    var customerId = els['sale-customer'].value;
    var productId = els['sale-product'].value;
    var price = getEffectiveSalePrice(customerId, productId);
    if (customerId && productId)
        els['sale-price'].value = price ? price.toFixed(2) : '';
    if (!els['sale-doc'].value)
        els['sale-doc'].value = nextDocNo();
    updateSalePreview();
}
function updateSalePreview() {
    var customerId = els['sale-customer'].value;
    var productId = els['sale-product'].value;
    var qty = safeNumber(els['sale-qty'].value);
    var price = safeNumber(els['sale-price'].value);
    if (!customerId || !productId || qty <= 0 || price <= 0) {
        els['sale-preview'].innerHTML = 'Müştəri seçin, məhsulu yazın və səbətə əlavə edin. Sonra ən sonda ümumi satış tamamlanacaq.';
        return;
    }
    var product = getProduct(productId);
    var currentAmount = round2(qty * price);
    var remainingStock = getCurrentStock(productId) - getDraftQtyForProduct(productId) - qty;
    els['sale-preview'].innerHTML = '<div class="sale-preview-box">' +
        renderProductThumb(product, 'thumb', 'Şəkil yoxdur') +
        '<div class="metrics"><strong>' + escapeHtml((product === null || product === void 0 ? void 0 : product.name) || '-') + '</strong><br>' +
        'Cari sətir məbləği: <strong>' + currency(currentAmount) + '</strong><br>' +
        'Səbətdə qalan stok: <strong>' + remainingStock + '</strong><br>' +
        'Qaimə toplamı: <strong>' + currency(getSaleDraftTotal() + currentAmount) + '</strong></div>' +
        '</div>';
}
function distributeReceivedAcrossDraft(totalReceived) {
    var totalAmount = getSaleDraftTotal();
    var remaining = round2(totalReceived);
    return saleDraftItems.map(function (item, index) {
        var amount = round2(safeNumber(item.qty) * safeNumber(item.price));
        var lineReceived = index === saleDraftItems.length - 1 ? remaining : round2(totalReceived * amount / Math.max(totalAmount, 0.01));
        remaining = round2(remaining - lineReceived);
        return Math.max(0, lineReceived);
    });
}
function onSaveSale(event) {
    event.preventDefault();
    var customerId = els['sale-customer'].value;
    var docNo = els['sale-doc'].value.trim();
    var date = els['sale-date'].value;
    var receivedTotal = round2(els['sale-received'].value);
    var totalAmount = getSaleDraftTotal();
    if (!date || !docNo || !customerId)
        return showToast('Tarix, sənəd və müştərini seçin.');
    if (!saleDraftItems.length)
        return showToast('Ən azı bir məhsulu səbətə əlavə et.');
    if (saleDocExists(docNo))
        return showToast('Bu sənəd nömrəsi artıq istifadə olunub.');
    if (receivedTotal < 0 || receivedTotal > totalAmount)
        return showToast('Alınan pul ümumi qaimə məbləğini keçə bilməz.');
    var productTotals = {};
    saleDraftItems.forEach(function (item) {
        productTotals[item.productId] = safeNumber(productTotals[item.productId]) + safeNumber(item.qty);
    });
    for (var productId in productTotals) {
        if (getCurrentStock(productId) < productTotals[productId])
            return showToast('Səbətdə olan məhsullardan biri üçün stok kifayət deyil.');
    }
    var batchId = uid('sb');
    var receivedParts = distributeReceivedAcrossDraft(receivedTotal);
    saleDraftItems.forEach(function (item, index) {
        state.sales.push({
            id: uid('s'),
            batchId: batchId,
            date: date,
            docNo: docNo,
            customerId: customerId,
            productId: item.productId,
            qty: safeNumber(item.qty),
            price: safeNumber(item.price),
            received: safeNumber(receivedParts[index]),
            note: item.note || ''
        });
    });
    lastInvoiceDocNo = docNo;
    saleDraftItems = [];
    els['sale-form'].reset();
    setDefaultDates();
    els['sale-received'].value = '0';
    renderAll();
    showToast('Çoxməhsullu satış əlavə olundu.');
    if (printerBridgeAvailable() && (els['printer-device'].value || localStorage.getItem(PRINTER_STORAGE_KEY) || '') && confirm('Qaimə indi çap edilsin?')) {
        printInvoiceByDocNo(docNo);
    }
}
function updateReturnPreview() {
    var productId = els['return-product'].value;
    var replacementQty = safeNumber(els['return-replacement'].value);
    if (!productId) {
        els['return-preview'].innerHTML = 'Əvəz verilən say və stok təsiri burada görünəcək.';
        return;
    }
    var stock = getCurrentStock(productId);
    els['return-preview'].innerHTML = "Haz\u0131rk\u0131 stok: <strong>".concat(stock, "</strong><br>\u018Fv\u0259zd\u0259n sonra stok: <strong>").concat(stock - replacementQty, "</strong>");
}
function onSaveReturn(event) {
    event.preventDefault();
    var payload = {
        id: uid('r'),
        date: els['return-date'].value,
        customerId: els['return-customer'].value,
        productId: els['return-product'].value,
        originalQty: safeNumber(els['return-original'].value),
        defectiveQty: safeNumber(els['return-defective'].value),
        replacementQty: safeNumber(els['return-replacement'].value),
        price: getEffectiveSalePrice(els['return-customer'].value, els['return-product'].value),
        note: els['return-note'].value.trim()
    };
    if (!payload.date || !payload.customerId || !payload.productId)
        return showToast('İadə üçün vacib sahələri doldur.');
    if (payload.replacementQty < 0 || payload.defectiveQty < 0 || payload.originalQty <= 0)
        return showToast('Say mənfi və ya sıfır ola bilməz.');
    if (payload.defectiveQty > payload.originalQty)
        return showToast('Qüsurlu say ilk satılan saydan çox ola bilməz.');
    if (payload.replacementQty > payload.defectiveQty)
        return showToast('Əvəz verilən say qüsurlu saydan çox ola bilməz.');
    if (payload.defectiveQty === 0 && payload.replacementQty > 0)
        return showToast('Əvəz üçün əvvəlcə qüsurlu say yazılmalıdır.');
    if (payload.defectiveQty === 0 && payload.replacementQty === 0)
        return showToast('İadədə ən azı bir say daxil edilməlidir.');
    if (getCurrentStock(payload.productId) < payload.replacementQty)
        return showToast('Əvəz üçün anbarda kifayət qədər məhsul yoxdur.');
    state.returns.push(payload);
    showToast('İadə əlavə olundu.');
    els['return-form'].reset();
    setDefaultDates();
    renderAll();
}
function updatePaymentPreview() {
    var customerId = els['payment-customer'].value;
    if (!customerId) {
        els['payment-preview'].innerHTML = 'Müştəri seçildikdə cari borc görünəcək.';
        return;
    }
    var metrics = getCustomerMetrics(customerId);
    var amount = safeNumber(els['payment-amount'].value);
    els['payment-preview'].innerHTML = "Cari borc: <strong>".concat(currency(metrics.debt), "</strong><br>\u00D6d\u0259ni\u015Fd\u0259n sonra qalacaq borc: <strong>").concat(currency(metrics.debt - amount), "</strong>");
}
function onSavePayment(event) {
    event.preventDefault();
    var customerId = els['payment-customer'].value;
    var amount = safeNumber(els['payment-amount'].value);
    if (!els['payment-date'].value || !customerId || amount <= 0)
        return showToast('Ödəniş üçün vacib sahələri doldur.');
    var metrics = getCustomerMetrics(customerId);
    if (amount > metrics.debt)
        return showToast('Ödəniş mövcud borcdan çox ola bilməz.');
    state.payments.push({
        id: uid('pay'),
        date: els['payment-date'].value,
        customerId: customerId,
        amount: amount,
        note: els['payment-note'].value.trim()
    });
    showToast('Ödəniş əlavə olundu.');
    els['payment-form'].reset();
    setDefaultDates();
    renderAll();
}
function canDeleteSaleWithoutBreakingDebt(id) {
    var sale = state.sales.find(function (item) { return item.id === id; });
    if (!sale)
        return true;
    var remainingSales = state.sales.filter(function (item) { return item.id !== id && item.customerId === sale.customerId; });
    var customerPayments = state.payments.filter(function (item) { return item.customerId === sale.customerId; });
    var remainingSalesAmount = remainingSales.reduce(function (sum, item) { return sum + saleComputed(item).amount; }, 0);
    var remainingInitialPayments = remainingSales.reduce(function (sum, item) { return sum + safeNumber(item.received); }, 0);
    var extraPayments = customerPayments.reduce(function (sum, item) { return sum + safeNumber(item.amount); }, 0);
    return remainingSalesAmount - (remainingInitialPayments + extraPayments) >= 0;
}
function deleteById(key, id, message) {
    if (key === 'sales' && !canDeleteSaleWithoutBreakingDebt(id))
        return showToast('Bu satışı silmək olmaz. Müştəriyə artıq ödəniş vəziyyəti yaranır.');
    state[key] = state[key].filter(function (item) { return item.id !== id; });
    showToast(message);
    renderAll();
}
function exportJsonBackup() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = "satis-backup-".concat(todayIso(), ".json");
    link.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup hazırlandı.');
}
function importJsonBackup(event) {
    var _a;
    var file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
    if (!file)
        return;
    var reader = new FileReader();
    reader.onload = function () {
        try {
            var parsed = JSON.parse(reader.result);
            state = normalizeState(parsed);
            showToast('Backup yükləndi.');
            renderAll();
            event.target.value = '';
        }
        catch (error) {
            showToast('JSON faylı oxunmadı.');
        }
    };
    reader.readAsText(file, 'utf-8');
}
function resetToDemo() {
    if (!confirm('Bütün cari məlumatlar silinsin və demo məlumatı geri yüklənsin?'))
        return;
    state = deepClone(seedData);
    saleDraftItems = [];
    lastInvoiceDocNo = '';
    resetCustomerForm();
    resetPriceForm();
    resetProductForm();
    clearSaleDraft();
    showToast('Demo məlumatı bərpa olundu.');
    renderAll();
}
function showToast(message) {
    els['toast'].textContent = message;
    els['toast'].classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { return els['toast'].classList.add('hidden'); }, 2400);
}
