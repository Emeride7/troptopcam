(function() {
  // Récupération des utilitaires partagés
  const { uid, storage, fmtMoney, todayISO, clampNumber, getDataUrlMime, downscaleImageToDataURL } = Shared;

  // Constantes de stockage
  const STORAGE = {
    draft: 'invoiceDraft.v2',
    history: 'invoiceHistory.v2',
    counters: 'invoiceCounters.v2',
    pending: 'pendingInvoiceData'
  };

  // État global
  const state = {
    mode: 'proforma',
    logoDataURL: null,
    draftId: uid(),
    _saveTimer: null,
    lastFocused: null,
    archiveButtonDisabled: false
  };

  // Références DOM
  const refs = {
    btnHistory: $('#btnHistory'),
    btnArchive: $('#btnArchive'),
    btnNew: $('#btnNew'),
    btnPdf: $('#btnPdf'),
    btnExcel: $('#btnExcel'),
    btnProforma: $('#btnProforma'),
    btnFacture: $('#btnFacture'),
    itemsBody: $('#itemsBody'),
    addRow: $('#addRow'),
    vatRate: $('#vatRate'),
    vatRateDisplay: $('#vatRateDisplay'),
    vatRow: $('#vatRow'),
    currency: $('#currency'),
    docTitle: $('#docTitle'),
    docNumber: $('#docNumber'),
    docDate: $('#docDate'),
    emitterName: $('#emitterName'),
    emitterAddress: $('#emitterAddress'),
    emitterExtra: $('#emitterExtra'),
    emitterTel: $('#emitterTel'),
    clientSectionLabel: $('#clientSectionLabel'),
    clientName: $('#clientName'),
    clientAddress: $('#clientAddress'),
    clientExtra: $('#clientExtra'),
    clientIfu: $('#clientIfu'),
    logoUpload: $('#logoUpload'),
    logoPreview: $('#logoPreview'),
    logoPlaceholder: $('#logoPlaceholder'),
    footerBrand: $('#footerBrand'),
    historyOverlay: $('#historyOverlay'),
    historyList: $('#historyList'),
    historySearch: $('#historySearch'),
    btnCloseHistory: $('#btnCloseHistory'),
    toast: $('#toast')
  };

  // Helper pour sélection
  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  // Notification toast
  function showToast(msg, type = 'info', duration = 2500) {
    const t = refs.toast;
    t.textContent = msg;
    t.style.background = type === 'error' ? '#7f1d1d' : type === 'success' ? '#14532d' : 'var(--primary)';
    t.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove('show'), duration);
  }

  // Création d'une ligne d'article avec note
  function createItemRow(item) {
    const tr = document.createElement('tr');
    tr.dataset.itemId = item.id || uid();

    // Colonne poignée
    const tdDrag = document.createElement('td');
    tdDrag.className = 'drag-handle';
    tdDrag.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    tr.appendChild(tdDrag);

    // Description
    const tdDesc = document.createElement('td');
    const inpDesc = document.createElement('input');
    inpDesc.type = 'text';
    inpDesc.className = 'item-input';
    inpDesc.placeholder = 'Description';
    inpDesc.value = item.description || '';
    inpDesc.setAttribute('list', 'itemDatalist');
    inpDesc.setAttribute('data-field', 'description');
    tdDesc.appendChild(inpDesc);
    tr.appendChild(tdDesc);

    // Note
    const tdNote = document.createElement('td');
    const inpNote = document.createElement('input');
    inpNote.type = 'text';
    inpNote.className = 'item-input';
    inpNote.placeholder = 'Note (optionnelle)';
    inpNote.value = item.note || '';
    inpNote.setAttribute('data-field', 'note');
    tdNote.appendChild(inpNote);
    tr.appendChild(tdNote);

    // Quantité
    const tdQty = document.createElement('td');
    const inpQty = document.createElement('input');
    inpQty.type = 'number';
    inpQty.className = 'item-input num';
    inpQty.min = '0';
    inpQty.step = '0.01';
    inpQty.inputMode = 'decimal';
    inpQty.value = String(item.qty ?? 1);
    inpQty.setAttribute('data-field', 'qty');
    tdQty.appendChild(inpQty);
    tr.appendChild(tdQty);

    // Prix
    const tdPrice = document.createElement('td');
    const inpPrice = document.createElement('input');
    inpPrice.type = 'number';
    inpPrice.className = 'item-input num';
    inpPrice.min = '0';
    inpPrice.step = '0.01';
    inpPrice.inputMode = 'decimal';
    inpPrice.value = String(item.price ?? 0);
    inpPrice.setAttribute('data-field', 'price');
    tdPrice.appendChild(inpPrice);
    tr.appendChild(tdPrice);

    // Total HT
    const tdTotal = document.createElement('td');
    tdTotal.className = 'line-total-cell';
    tdTotal.textContent = fmtMoney.format(clampNumber(item.qty) * clampNumber(item.price));
    tr.appendChild(tdTotal);

    // Bouton Supprimer
    const tdActions = document.createElement('td');
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'remove-row-btn';
    btnDel.textContent = 'Suppr.';
    btnDel.setAttribute('data-action', 'remove-row');
    tdActions.appendChild(btnDel);
    tr.appendChild(tdActions);

    // Écouteurs de drag & drop
    tr.addEventListener('dragstart', handleDragStart);
    tr.addEventListener('dragover', handleDragOver);
    tr.addEventListener('drop', handleDrop);
    tr.addEventListener('dragend', handleDragEnd);

    return tr;
  }

  function addItemRow(item = { id: uid(), description: '', note: '', qty: 1, price: 0 }, { focus = false } = {}) {
    const row = createItemRow(item);
    refs.itemsBody.appendChild(row);
    if (focus) row.querySelector('input')?.focus();
    updateTotals();
    scheduleSave();
  }

  function ensureAtLeastOneRow() {
    if (refs.itemsBody.children.length === 0) {
      addItemRow({ id: uid(), description: '', note: '', qty: 1, price: 0 });
    }
  }

  // Variables pour le drag & drop
  let draggedRow = null;

  function handleDragStart(e) {
    const target = e.target;
    if (!target.closest('.drag-handle')) {
      e.preventDefault();
      return false;
    }
    draggedRow = this;
    e.dataTransfer.effectAllowed = 'move';
    this.style.opacity = '0.5';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetRow = this;
    if (targetRow !== draggedRow && targetRow.tagName === 'TR') {
      const rect = targetRow.getBoundingClientRect();
      const next = (e.clientY - rect.top) > (rect.height / 2);
      const tbody = targetRow.parentNode;
      if (next) {
        tbody.insertBefore(draggedRow, targetRow.nextSibling);
      } else {
        tbody.insertBefore(draggedRow, targetRow);
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    updateTotals();
    scheduleSave();
  }

  function handleDragEnd(e) {
    this.style.opacity = '1';
    draggedRow = null;
  }

  // Calculs
  function computeSubtotal() {
    let subtotal = 0;
    for (const tr of refs.itemsBody.rows) {
      const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
      const price = clampNumber(tr.querySelector('[data-field="price"]').value);
      subtotal += qty * price;
    }
    return subtotal;
  }

  function updateTotals() {
    for (const tr of refs.itemsBody.rows) {
      const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
      const price = clampNumber(tr.querySelector('[data-field="price"]').value);
      const line = qty * price;
      tr.querySelector('.line-total-cell').textContent = fmtMoney.format(line);
    }

    const subtotal = computeSubtotal();
    const vatRate = clampNumber(refs.vatRate.value);
    refs.vatRateDisplay.textContent = String(vatRate);

    const tax = subtotal * vatRate / 100;
    const total = subtotal + tax;

    $('#subtotal').textContent = fmtMoney.format(subtotal);
    $('#totalTax').textContent = fmtMoney.format(tax);
    $('#grandTotal').textContent = fmtMoney.format(total);

    refs.vatRow.style.display = vatRate > 0 ? '' : 'none';
  }

  function updateCurrencyDisplay() {
    const curr = (refs.currency.value || 'CFA').trim() || 'CFA';
    $$('.curr').forEach(el => el.textContent = curr);
  }

  // Mode et numérotation
  function setMode(mode) {
    state.mode = mode;
    refs.docTitle.textContent = mode === 'facture' ? 'FACTURE' : 'PRO FORMA';
    refs.clientSectionLabel.textContent = mode === 'facture' ? 'FACTURÉ À' : 'CLIENT';

    refs.btnProforma.classList.toggle('active', mode === 'proforma');
    refs.btnFacture.classList.toggle('active', mode === 'facture');
    refs.btnProforma.setAttribute('aria-selected', String(mode === 'proforma'));
    refs.btnFacture.setAttribute('aria-selected', String(mode === 'facture'));

    const v = (refs.docNumber.value || '').trim();
    if (v) {
      refs.docNumber.value = normalizeDocNumber(v, mode);
    } else {
      refs.docNumber.value = generateNextNumber(mode);
    }
    scheduleSave();
  }

  function getYearForCounter() {
    const d = refs.docDate.value || todayISO();
    const y = String(d).slice(0, 4);
    return /^\d{4}$/.test(y) ? y : String(new Date().getFullYear());
  }

  function pad3(n) { return String(n).padStart(3, '0'); }

  function normalizeDocNumber(raw, mode) {
    const wantedPrefix = mode === 'facture' ? 'F' : 'PF';
    const cleaned = raw.replace(/\s+/g, '').replace(/_/g, '-');
    const m = /^(PF|F)[-\s]?(\d{4})[-\s]?(\d{1,6})$/i.exec(cleaned);
    if (m) {
      return `${m[1].toUpperCase()}-${m[2]}-${pad3(m[3])}`;
    }
    return raw;
  }

  function generateNextNumber(mode) {
    let counters = storage.get(STORAGE.counters, {});
    if (typeof counters !== 'object' || counters === null) {
      counters = {};
    }
    const year = getYearForCounter();
    const key = `${mode}-${year}`;
    const next = (counters[key] || 0) + 1;
    counters[key] = next;
    storage.set(STORAGE.counters, counters);
    const prefix = mode === 'facture' ? 'F' : 'PF';
    return `${prefix}-${year}-${pad3(next)}`;
  }

  // Collecte des données
  function collectData() {
    const items = [];
    for (const tr of refs.itemsBody.rows) {
      items.push({
        id: tr.dataset.itemId || uid(),
        description: tr.querySelector('[data-field="description"]').value || '',
        note: tr.querySelector('[data-field="note"]').value || '',
        qty: clampNumber(tr.querySelector('[data-field="qty"]').value),
        price: clampNumber(tr.querySelector('[data-field="price"]').value)
      });
    }

    return {
      id: state.draftId,
      mode: state.mode,
      docNumber: (refs.docNumber.value || '').trim(),
      docDate: refs.docDate.value || '',
      currency: (refs.currency.value || 'CFA').trim(),
      vatRate: clampNumber(refs.vatRate.value),
      emitter: {
        name: refs.emitterName.value || '',
        address: refs.emitterAddress.value || '',
        extra: refs.emitterExtra.value || '',
        tel: refs.emitterTel.value || ''
      },
      client: {
        name: refs.clientName.value || '',
        address: refs.clientAddress.value || '',
        extra: refs.clientExtra.value || '',
        ifu: refs.clientIfu.value || ''
      },
      logo: state.logoDataURL,
      items,
      updatedAt: new Date().toISOString()
    };
  }

  function applyData(data) {
    state.draftId = data?.id || uid();
    
    refs.docNumber.value = data?.docNumber || '';
    setMode(data?.mode || 'proforma');
    
    refs.docDate.value = data?.docDate || todayISO();

    refs.emitterName.value = data?.emitter?.name || '';
    refs.emitterAddress.value = data?.emitter?.address || '';
    refs.emitterExtra.value = data?.emitter?.extra || '';
    refs.emitterTel.value = data?.emitter?.tel || '';

    refs.clientName.value = data?.client?.name || '';
    refs.clientAddress.value = data?.client?.address || '';
    refs.clientExtra.value = data?.client?.extra || '';
    refs.clientIfu.value = data?.client?.ifu || '';

    refs.currency.value = data?.currency || 'CFA';
    refs.vatRate.value = data?.vatRate ?? 18;

    if (data?.logo) {
      state.logoDataURL = data.logo;
      refs.logoPreview.src = state.logoDataURL;
      refs.logoPreview.style.display = 'block';
      refs.logoPlaceholder.style.display = 'none';
    } else {
      state.logoDataURL = null;
      refs.logoPreview.style.display = 'none';
      refs.logoPlaceholder.style.display = 'flex';
    }

    refs.footerBrand.textContent = refs.emitterName.value || 'Votre entreprise';

    refs.itemsBody.innerHTML = '';
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length) {
      items.forEach(it => refs.itemsBody.appendChild(createItemRow(it)));
    } else {
      addItemRow({ id: uid(), description: '', note: '', qty: 1, price: 0 });
    }

    updateCurrencyDisplay();
    updateTotals();
    renderClientDatalist();
    renderItemDatalist();
  }

  // Sauvegarde automatique
  function scheduleSave() {
    clearTimeout(state._saveTimer);
    state._saveTimer = setTimeout(saveDraft, 450);
  }

  function saveDraft() {
    const ok = storage.set(STORAGE.draft, collectData());
    refs.footerBrand.textContent = refs.emitterName.value || 'Votre entreprise';
    if (!ok) showToast('⚠️ Impossible de sauvegarder (quota ou mode privé).', 'error', 3200);
    updateStoredClientsAndItems();
  }

  function loadDraft() {
    const d = storage.get(STORAGE.draft, null);
    if (d) {
      applyData(d);
      return;
    }
    applyData({
      id: uid(),
      mode: 'proforma',
      docDate: todayISO(),
      docNumber: generateNextNumber('proforma'),
      vatRate: 18,
      currency: 'CFA',
      items: [{ id: uid(), description: '', note: '', qty: 1, price: 0 }]
    });
  }

  // Chargement des données en attente depuis l'entretien
  function loadPendingInvoiceData() {
    const pending = storage.get(STORAGE.pending, null);
    if (!pending) return false;

    if (pending.client) {
      refs.clientName.value = pending.client.name || '';
      refs.clientAddress.value = pending.client.address || '';
      refs.clientExtra.value = pending.client.extra || '';
      refs.clientIfu.value = pending.client.ifu || '';
    }

    if (Array.isArray(pending.items) && pending.items.length > 0) {
      refs.itemsBody.innerHTML = '';
      pending.items.forEach(item => {
        addItemRow({
          id: uid(),
          description: item.description,
          note: item.note,
          qty: item.qty || 1,
          price: item.price || 0
        });
      });
    }

    storage.remove(STORAGE.pending);
    showToast('Données du rapport de maintenance chargées.', 'success');
    return true;
  }

  // Historique
  function getHistory() {
    const hist = storage.get(STORAGE.history, []);
    return Array.isArray(hist) ? hist : [];
  }

  function saveHistory(hist) {
    const trimmed = hist.slice(0, 50);
    storage.set(STORAGE.history, trimmed);
  }

  function archiveCurrentDocument({ silent = false } = {}) {
    const data = collectData();
    data.savedAt = new Date().toISOString();
    const hist = getHistory();
    const top = hist[0];
    const sameTop = top && top.docNumber === data.docNumber && top.updatedAt === data.updatedAt;
    if (!sameTop) hist.unshift(data);
    saveHistory(hist);
    if (!silent) showToast('💾 Document sauvegardé dans l\'historique', 'success');
    updateStoredClientsAndItems();
  }

  function openHistory() {
    state.lastFocused = document.activeElement;
    renderHistory();
    refs.historyOverlay.classList.add('open');
    refs.historyOverlay.setAttribute('aria-hidden', 'false');
    refs.historySearch.value = '';
    refs.historySearch.focus();
  }

  function closeHistory() {
    refs.historyOverlay.classList.remove('open');
    refs.historyOverlay.setAttribute('aria-hidden', 'true');
    if (state.lastFocused) {
      state.lastFocused.focus();
      state.lastFocused = null;
    }
  }

  function historyMatches(item, q) {
    if (!q) return true;
    const s = q.toLowerCase();
    return [item?.docNumber, item?.client?.name, item?.docDate, item?.mode]
      .filter(Boolean).join(' ').toLowerCase().includes(s);
  }

  function renderHistory() {
    const q = (refs.historySearch.value || '').trim();
    const hist = getHistory().filter(it => historyMatches(it, q));
    refs.historyList.innerHTML = '';

    if (hist.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = q ? 'Aucun résultat.' : 'Aucun document sauvegardé.';
      refs.historyList.appendChild(empty);
      return;
    }

    hist.forEach((item, idx) => {
      const subtotal = Array.isArray(item.items)
        ? item.items.reduce((s, it) => s + (clampNumber(it.qty) * clampNumber(it.price)), 0)
        : 0;
      const vatRate = clampNumber(item.vatRate);
      const tax = subtotal * vatRate / 100;
      const ttc = subtotal + tax;

      const savedAt = item.savedAt ? new Date(item.savedAt) : null;
      const savedLabel = savedAt
        ? savedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      const box = document.createElement('div');
      box.className = 'history-item';

      const title = document.createElement('div');
      title.className = 'hi-title';
      title.textContent = `${item.mode === 'facture' ? 'FACTURE' : 'PRO FORMA'} — ${item.docNumber || '?'}`;

      const sub1 = document.createElement('div');
      sub1.className = 'hi-sub';
      sub1.textContent = `Client : ${item?.client?.name || 'Inconnu'}`;

      const sub2 = document.createElement('div');
      sub2.className = 'hi-sub';
      sub2.textContent = `Date : ${item.docDate || '?'} · Sauvegardé : ${savedLabel}`;

      const amount = document.createElement('div');
      amount.className = 'hi-amount';
      amount.textContent = `${fmtMoney.format(ttc)} ${item.currency || 'CFA'}`;

      const actions = document.createElement('div');
      actions.className = 'history-item-actions';

      const btnLoad = document.createElement('button');
      btnLoad.type = 'button';
      btnLoad.className = 'btn-load';
      btnLoad.textContent = 'Charger';
      btnLoad.addEventListener('click', () => loadHistoryItem(idx));

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-del-hist';
      btnDel.textContent = 'Supprimer';
      btnDel.addEventListener('click', () => deleteHistoryItem(idx));

      actions.append(btnLoad, btnDel);
      box.append(title, sub1, sub2, amount, actions);
      refs.historyList.appendChild(box);
    });
  }

  function loadHistoryItem(idx) {
    const hist = getHistory();
    const item = hist[idx];
    if (!item) return;

    if (!confirm('Charger ce document ?\n\nLe document actuel sera d\'abord sauvegardé dans l\'historique.')) return;

    archiveCurrentDocument({ silent: true });
    applyData(item);
    saveDraft();
    closeHistory();
    showToast('✅ Document chargé', 'success');
  }

  function deleteHistoryItem(idx) {
    const hist = getHistory();
    const item = hist[idx];
    if (!item) return;

    const token = (item.docNumber || '').trim();
    const typed = prompt(`Suppression sécurisée.\n\nTapez le numéro du document pour confirmer :\n${token}`);
    if (typed !== token) {
      showToast('Suppression annulée.', 'info');
      return;
    }

    hist.splice(idx, 1);
    saveHistory(hist);
    renderHistory();
    showToast('🗑 Document supprimé', 'success');
  }

  // Validation avant export
  function validateBeforeExport() {
    if (!refs.docDate.value) refs.docDate.value = todayISO();

    const num = (refs.docNumber.value || '').trim();
    if (!num) {
      showToast('Veuillez renseigner le numéro du document.', 'error');
      refs.docNumber.focus();
      return false;
    }

    ensureAtLeastOneRow();

    const hasAny = Array.from(refs.itemsBody.rows).some(tr => {
      const d = tr.querySelector('[data-field="description"]').value.trim();
      const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
      const price = clampNumber(tr.querySelector('[data-field="price"]').value);
      return d || (qty > 0 && price > 0);
    });

    if (!hasAny) {
      showToast('Ajoutez au moins une prestation (ou une ligne non vide).', 'error');
      return false;
    }

    return true;
  }

  // Export PDF
  function cleanSpaces(str) {
    return String(str).replace(/[\s\u00A0\u202F\u2000-\u200A]/g, ' ');
  }

  function ensurePdfRoom(doc, yNeeded) {
    const pageH = doc.internal.pageSize.getHeight();
    if (yNeeded > pageH - 20) {
      doc.addPage();
      return 20;
    }
    return yNeeded;
  }

  function exportPDF() {
    if (!validateBeforeExport()) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const pageW = 210;
    const margin = 15;

    doc.setFillColor(30, 60, 114);
    doc.rect(0, 0, pageW, 35, 'F'); // Bandeau un peu réduit

    let logoEndX = margin;
    if (state.logoDataURL) {
      try {
        const mime = getDataUrlMime(state.logoDataURL);
        const type = (mime === 'image/png') ? 'PNG' : 'JPEG';
        doc.addImage(state.logoDataURL, type, margin, 6, 24, 24, undefined, 'FAST');
        logoEndX = margin + 28;
      } catch (e) {
        showToast('Le logo n’a pas pu être intégré au PDF.', 'warning');
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(refs.emitterName.value || 'Votre entreprise', logoEndX, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(refs.emitterAddress.value || '', logoEndX, 18);
    doc.text(refs.emitterExtra.value || '', logoEndX, 22);
    doc.text(refs.emitterTel.value || '', logoEndX, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const title = refs.docTitle.textContent;
    doc.text(title, pageW - margin, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`N° ${refs.docNumber.value}`, pageW - margin, 20, { align: 'right' });
    doc.text(`Date : ${refs.docDate.value}`, pageW - margin, 26, { align: 'right' });

    let y = 45;
    doc.setFillColor(232, 238, 255);
    doc.roundedRect(margin, y, pageW - margin * 2, 32, 3, 3, 'F');
    doc.setDrawColor(42, 82, 152);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin, y + 32);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(42, 82, 152);
    doc.text(state.mode === 'facture' ? 'FACTURÉ À' : 'CLIENT', margin + 4, y + 6);

    doc.setTextColor(10, 10, 40);
    doc.setFontSize(9.5);
    doc.text(refs.clientName.value || '', margin + 4, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(refs.clientAddress.value || '', margin + 4, y + 19);
    doc.text(refs.clientExtra.value || '', margin + 4, y + 25);
    if (refs.clientIfu.value) doc.text(`IFU : ${refs.clientIfu.value}`, margin + 4, y + 31);

    y += 40;

    const tableData = [];
    for (const tr of refs.itemsBody.rows) {
      const desc = tr.querySelector('[data-field="description"]').value || '';
      const note = tr.querySelector('[data-field="note"]').value || '';
      const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
      const price = clampNumber(tr.querySelector('[data-field="price"]').value);
      const tot = qty * price;
      tableData.push([desc, note, cleanSpaces(String(qty)), cleanSpaces(fmtMoney.format(price)), cleanSpaces(fmtMoney.format(tot))]);
    }

    doc.autoTable({
      head: [['Description', 'Note', 'Qté', 'Prix unitaire HT', 'Total HT']],
      body: tableData,
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [30, 60, 114], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 40 },
        4: { halign: 'right', cellWidth: 38 }
      },
      alternateRowStyles: { fillColor: [248, 250, 255] }
    });

    let finalY = (doc.lastAutoTable?.finalY || y) + 8;
    finalY = ensurePdfRoom(doc, finalY + 40);

    const curr = (refs.currency.value || 'CFA').trim() || 'CFA';
    const subtotal = cleanSpaces($('#subtotal').textContent);
    const tax = cleanSpaces($('#totalTax').textContent);
    const total = cleanSpaces($('#grandTotal').textContent);
    const vat = clampNumber(refs.vatRate.value);

    const boxW = 85;
    const boxH = vat > 0 ? 30 : 22;
    const boxX = pageW - margin - boxW;

    doc.setFillColor(232, 238, 255);
    doc.roundedRect(boxX, finalY, boxW, boxH, 3, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 120);

    doc.text('Sous-total HT', boxX + 4, finalY + 8);
    if (vat > 0) doc.text(`TVA (${vat}%)`, boxX + 4, finalY + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 60, 114);
    doc.text('Total TTC', boxX + 4, finalY + (vat > 0 ? 24 : 16));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(10, 10, 40);
    doc.text(`${subtotal} ${curr}`, pageW - margin - 2, finalY + 8, { align: 'right' });
    if (vat > 0) doc.text(`${tax} ${curr}`, pageW - margin - 2, finalY + 15, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 60, 114);
    doc.text(`${total} ${curr}`, pageW - margin - 2, finalY + (vat > 0 ? 24 : 16), { align: 'right' });

    let sigY = finalY + boxH + 18;
    sigY = ensurePdfRoom(doc, sigY + 20);
    doc.setDrawColor(42, 82, 152);
    doc.setLineWidth(0.5);
    doc.line(margin, sigY, margin + 60, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 120);
    doc.text('Signature', margin, sigY + 5);

    doc.setFontSize(7);
    doc.setTextColor(180, 180, 200);
    doc.text(refs.emitterName.value || 'Votre entreprise', pageW / 2, 295, { align: 'center' });

    doc.save(`${title}_${refs.docNumber.value}.pdf`);
    showToast('PDF téléchargé.', 'success');
  }

  // Export Excel
  function exportExcel() {
    if (!validateBeforeExport()) return;

    const wb = XLSX.utils.book_new();
    const curr = (refs.currency.value || 'CFA').trim() || 'CFA';
    const vat = clampNumber(refs.vatRate.value);

    const data = [
      [refs.docTitle.textContent],
      [],
      ['Numéro', refs.docNumber.value, '', 'Date', refs.docDate.value],
      [],
      ['ÉMETTEUR'],
      [refs.emitterName.value || 'Votre entreprise'],
      [refs.emitterAddress.value || ''],
      [refs.emitterExtra.value || ''],
      [refs.emitterTel.value || ''],
      [],
      ['CLIENT'],
      [refs.clientName.value || ''],
      [refs.clientAddress.value || ''],
      [refs.clientExtra.value || ''],
      ...(refs.clientIfu.value ? [['IFU', refs.clientIfu.value]] : []),
      [],
      ['Description', 'Note', 'Quantité', `Prix unitaire HT (${curr})`, `Total HT (${curr})`]
    ];

    for (const tr of refs.itemsBody.rows) {
      const desc = tr.querySelector('[data-field="description"]').value || '';
      const note = tr.querySelector('[data-field="note"]').value || '';
      const qty = clampNumber(tr.querySelector('[data-field="qty"]').value);
      const price = clampNumber(tr.querySelector('[data-field="price"]').value);
      data.push([desc, note, qty, price, qty * price]);
    }

    const subtotal = computeSubtotal();
    const tax = subtotal * vat / 100;
    const ttc = subtotal + tax;

    data.push([]);
    data.push(['Sous-total HT', '', '', '', subtotal]);
    if (vat > 0) data.push([`TVA (${vat}%)`, '', '', '', tax]);
    data.push(['Total TTC', '', '', '', ttc]);
    data.push([]);
    data.push(['Signature : _________________________________']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Document');

    XLSX.writeFile(wb, `${refs.docTitle.textContent}_${refs.docNumber.value}.xlsx`);
    showToast('Excel téléchargé.', 'success');
  }

  // Nouveau document
  function newDocument() {
    if (!confirm('Créer un nouveau document ?\n\nOK : sauvegarde l\'actuel dans l\'historique puis repart à zéro.')) return;

    const current = collectData();
    const hasContent = current.items.some(it => it.description.trim() !== '' || (it.qty > 0 && it.price > 0)) 
                    || current.client.name.trim() !== '';
    if (hasContent) {
      archiveCurrentDocument({ silent: true });
    }

    storage.remove(STORAGE.draft);

    state.draftId = uid();
    refs.docDate.value = todayISO();
    setMode('proforma');
    refs.docNumber.value = generateNextNumber('proforma');

    refs.clientName.value = '';
    ref
