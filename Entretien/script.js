(function() {
  const { storage, uid, fmtMoney, todayISO, clampNumber, downscaleImageToDataURL } = Shared;

  // Données par défaut génériques
  const defaultData = {
    company: { name: '', address: '', extra: '', tel: '', logo: null },
    client: { name: '', address: '', extra: '', tel: '' },
    equipments: [
      { id: 1, name: 'Équipement 1', emplacement: 'Local technique', etat: 'Bon', probleme: 'RAS', action: 'Nettoyage' },
      { id: 2, name: 'Équipement 2', emplacement: 'Toit', etat: 'Pas Bon', probleme: 'Fuite', action: 'Réparation' }
    ],
    emplacements: ['Local technique', 'Toit', 'Sous-sol', 'Extérieur'],
    problemes: ['RAS', 'Fuite', 'Panne électrique', 'Usure'],
    actions: ['Nettoyage', 'Réparation', 'Remplacement', 'Contrôle']
  };

  // Chargement des données avec validation
  let appData = storage.get('maintenanceData') || defaultData;
  if (!Array.isArray(appData.emplacements)) appData.emplacements = defaultData.emplacements;
  if (!Array.isArray(appData.problemes)) appData.problemes = defaultData.problemes;
  if (!Array.isArray(appData.actions)) appData.actions = defaultData.actions;

  let company = { ...defaultData.company, ...appData.company };
  let client = { ...defaultData.client, ...appData.client };
  let equipments = appData.equipments || [];
  let emplacements = appData.emplacements;
  let problemes = appData.problemes;
  let actions = appData.actions;

  // Références DOM
  const companyName = document.getElementById('companyName');
  const companyAddress = document.getElementById('companyAddress');
  const companyExtra = document.getElementById('companyExtra');
  const companyTel = document.getElementById('companyTel');
  const companyLogoPreview = document.getElementById('companyLogoPreview');
  const companyLogoPlaceholder = document.getElementById('companyLogoPlaceholder');
  const companyLogoUpload = document.getElementById('companyLogoUpload');
  const clientName = document.getElementById('clientName');
  const clientAddress = document.getElementById('clientAddress');
  const clientExtra = document.getElementById('clientExtra');
  const clientTel = document.getElementById('clientTel');
  const equipmentName = document.getElementById('equipmentName');
  const equipmentId = document.getElementById('equipmentId');
  const emplacementSelect = document.getElementById('emplacement');
  const etatSelect = document.getElementById('etat');
  const problemeSelect = document.getElementById('probleme');
  const actionSelect = document.getElementById('action');
  const equipmentsTableBody = document.getElementById('equipmentsTableBody');
  const saveStatus = document.getElementById('saveStatus');
  const totalEquipmentsSpan = document.getElementById('totalEquipments');
  const totalFonctionnelsSpan = document.getElementById('totalFonctionnels');
  const totalNonFonctionnelsSpan = document.getElementById('totalNonFonctionnels');
  const pdfBtn = document.getElementById('btnPdfMaintenance');
  const btnManageLists = document.getElementById('btnManageLists');
  const listsOverlay = document.getElementById('listsOverlay');
  const btnCloseLists = document.getElementById('btnCloseLists');
  const btnCloseListsBottom = document.getElementById('btnCloseListsBottom');
  const emplacementsListDiv = document.getElementById('emplacementsList');
  const problemesListDiv = document.getElementById('problemesList');
  const actionsListDiv = document.getElementById('actionsList');
  const toast = document.getElementById('toast');

  // Toast
  function showToast(msg, type = 'info', duration = 2500) {
    toast.textContent = msg;
    toast.style.background = type === 'error' ? '#7f1d1d' : type === 'success' ? '#14532d' : 'var(--primary)';
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // Initialisation
  function init() {
    companyName.value = company.name || '';
    companyAddress.value = company.address || '';
    companyExtra.value = company.extra || '';
    companyTel.value = company.tel || '';
    if (company.logo) {
      companyLogoPreview.src = company.logo;
      companyLogoPreview.style.display = 'block';
      companyLogoPlaceholder.style.display = 'none';
    }
    clientName.value = client.name || '';
    clientAddress.value = client.address || '';
    clientExtra.value = client.extra || '';
    clientTel.value = client.tel || '';

    updateSelects();
    renderEquipments();
  }

  // Sauvegarde
  function saveToLocalStorage(showToastMsg = false) {
    company.name = companyName.value;
    company.address = companyAddress.value;
    company.extra = companyExtra.value;
    company.tel = companyTel.value;
    client.name = clientName.value;
    client.address = clientAddress.value;
    client.extra = clientExtra.value;
    client.tel = clientTel.value;

    const data = { company, client, equipments, emplacements, problemes, actions };
    storage.set('maintenanceData', data);
    if (showToastMsg) showToast('Données sauvegardées', 'success');
    else {
      saveStatus.style.display = 'flex';
      setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
    }
  }

  // Mise à jour des selects
  function updateSelects() {
    emplacementSelect.innerHTML = '<option value="">Sélectionner un emplacement</option>';
    emplacements.forEach(emp => {
      emplacementSelect.innerHTML += `<option value="${emp}">${emp}</option>`;
    });

    problemeSelect.innerHTML = '<option value="">Sélectionner un problème</option>';
    problemes.forEach(prob => {
      problemeSelect.innerHTML += `<option value="${prob}">${prob}</option>`;
    });

    actionSelect.innerHTML = '<option value="">Sélectionner une action</option>';
    actions.forEach(act => {
      actionSelect.innerHTML += `<option value="${act}">${act}</option>`;
    });
  }

  // Affichage du tableau
  function renderEquipments() {
    equipmentsTableBody.innerHTML = '';
    equipments.sort((a, b) => a.id - b.id).forEach(eq => {
      const row = equipmentsTableBody.insertRow();
      row.innerHTML = `
        <td>${eq.name}</td>
        <td>${eq.emplacement}</td>
        <td><span class="badge ${eq.etat === 'Bon' ? 'badge-success' : 'badge-danger'}">${eq.etat}</span></td>
        <td>${eq.probleme || '-'}</td>
        <td>${eq.action || '-'}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit-btn" onclick="window.editEquipment(${eq.id})"><i class="fas fa-edit"></i> Modifier</button>
            <button class="action-btn delete-btn" onclick="window.deleteEquipment(${eq.id})"><i class="fas fa-trash"></i> Suppr.</button>
          </div>
        </td>
      `;
    });

    totalEquipmentsSpan.textContent = equipments.length;
    totalFonctionnelsSpan.textContent = equipments.filter(e => e.etat === 'Bon').length;
    totalNonFonctionnelsSpan.textContent = equipments.filter(e => e.etat === 'Pas Bon').length;
  }

  // Formulaire
  document.getElementById('equipmentForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const id = equipmentId.value;
    const eqData = {
      name: equipmentName.value,
      emplacement: emplacementSelect.value,
      etat: etatSelect.value,
      probleme: problemeSelect.value || '',
      action: actionSelect.value || ''
    };

    if (id) {
      const index = equipments.findIndex(e => e.id == id);
      if (index !== -1) {
        equipments[index] = { ...equipments[index], ...eqData };
      }
    } else {
      const newId = equipments.length ? Math.max(...equipments.map(e => e.id)) + 1 : 1;
      equipments.push({ id: newId, ...eqData });
    }

    this.reset();
    equipmentId.value = '';
    renderEquipments();
    saveToLocalStorage(true);
  });

  window.editEquipment = function(id) {
    const eq = equipments.find(e => e.id === id);
    if (eq) {
      equipmentId.value = eq.id;
      equipmentName.value = eq.name;
      emplacementSelect.value = eq.emplacement;
      etatSelect.value = eq.etat;
      problemeSelect.value = eq.probleme || '';
      actionSelect.value = eq.action || '';
    }
  };

  window.deleteEquipment = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) {
      equipments = equipments.filter(e => e.id !== id);
      renderEquipments();
      saveToLocalStorage(true);
    }
  };

  // Ajout dans les listes (insensible à la casse)
  function addUniqueItem(list, newValue, listName) {
    const trimmed = newValue.trim();
    if (!trimmed) return false;
    const exists = list.some(item => item.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      list.push(trimmed);
      updateSelects();
      saveToLocalStorage(true);
      return true;
    }
    return false;
  }

  window.addEmplacement = function() {
    const input = document.getElementById('newEmplacement');
    if (addUniqueItem(emplacements, input.value, 'emplacements')) {
      input.value = '';
      if (listsOverlay.classList.contains('open')) renderLists();
    }
  };

  window.addProbleme = function() {
    const input = document.getElementById('newProbleme');
    if (addUniqueItem(problemes, input.value, 'problemes')) {
      input.value = '';
      if (listsOverlay.classList.contains('open')) renderLists();
    }
  };

  window.addAction = function() {
    const input = document.getElementById('newAction');
    if (addUniqueItem(actions, input.value, 'actions')) {
      input.value = '';
      if (listsOverlay.classList.contains('open')) renderLists();
    }
  };

  // Suppression d'un élément de liste
  function removeFromList(list, value, listName) {
    const index = list.findIndex(item => item.toLowerCase() === value.toLowerCase());
    if (index !== -1) {
      list.splice(index, 1);
      updateSelects();
      saveToLocalStorage(true);
      renderLists();
    }
  }

  // Rendu des listes dans le panneau
  function renderLists() {
    emplacementsListDiv.innerHTML = '';
    emplacements.forEach(emp => {
      const row = document.createElement('div');
      row.className = 'list-item-row';
      row.innerHTML = `
        <span class="list-item-name">${emp}</span>
        <button class="list-item-delete" onclick="window.removeEmplacement('${emp.replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button>
      `;
      emplacementsListDiv.appendChild(row);
    });

    problemesListDiv.innerHTML = '';
    problemes.forEach(prob => {
      const row = document.createElement('div');
      row.className = 'list-item-row';
      row.innerHTML = `
        <span class="list-item-name">${prob}</span>
        <button class="list-item-delete" onclick="window.removeProbleme('${prob.replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button>
      `;
      problemesListDiv.appendChild(row);
    });

    actionsListDiv.innerHTML = '';
    actions.forEach(act => {
      const row = document.createElement('div');
      row.className = 'list-item-row';
      row.innerHTML = `
        <span class="list-item-name">${act}</span>
        <button class="list-item-delete" onclick="window.removeAction('${act.replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button>
      `;
      actionsListDiv.appendChild(row);
    });
  }

  window.removeEmplacement = function(value) {
    if (confirm(`Supprimer l'emplacement "${value}" ?`)) {
      removeFromList(emplacements, value, 'emplacements');
    }
  };
  window.removeProbleme = function(value) {
    if (confirm(`Supprimer le problème "${value}" ?`)) {
      removeFromList(problemes, value, 'problemes');
    }
  };
  window.removeAction = function(value) {
    if (confirm(`Supprimer l'action "${value}" ?`)) {
      removeFromList(actions, value, 'actions');
    }
  };

  // Réinitialisation
  window.resetToDefault = function() {
    if (confirm('Réinitialiser toutes les données ?')) {
      company = { ...defaultData.company };
      client = { ...defaultData.client };
      equipments = JSON.parse(JSON.stringify(defaultData.equipments));
      emplacements = [...defaultData.emplacements];
      problemes = [...defaultData.problemes];
      actions = [...defaultData.actions];

      companyName.value = company.name;
      companyAddress.value = company.address;
      companyExtra.value = company.extra;
      companyTel.value = company.tel;
      if (company.logo) {
        companyLogoPreview.src = company.logo;
        companyLogoPreview.style.display = 'block';
        companyLogoPlaceholder.style.display = 'none';
      } else {
        companyLogoPreview.style.display = 'none';
        companyLogoPlaceholder.style.display = 'block';
      }
      clientName.value = client.name;
      clientAddress.value = client.address;
      clientExtra.value = client.extra;
      clientTel.value = client.tel;

      updateSelects();
      renderEquipments();
      saveToLocalStorage(true);
      if (listsOverlay.classList.contains('open')) renderLists();
    }
  };

  // Sauvegarde automatique sur modification des champs
  [companyName, companyAddress, companyExtra, companyTel, clientName, clientAddress, clientExtra, clientTel].forEach(input => {
    input.addEventListener('input', () => saveToLocalStorage());
  });

  // Gestion du logo
  companyLogoPlaceholder.addEventListener('click', () => {
    companyLogoUpload.click();
  });

  companyLogoUpload.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await downscaleImageToDataURL(file, { max: 360, quality: 0.86 });
      company.logo = dataUrl;
      companyLogoPreview.src = dataUrl;
      companyLogoPreview.style.display = 'block';
      companyLogoPlaceholder.style.display = 'none';
      saveToLocalStorage(true);
    } catch (error) {
      showToast('Erreur lors du chargement du logo', 'error');
    }
  });

  // Gestionnaire de listes (panneau)
  let lastFocused = null;

  function openListsManager() {
    lastFocused = document.activeElement;
    renderLists();
    listsOverlay.classList.add('open');
    listsOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeListsManager() {
    listsOverlay.classList.remove('open');
    listsOverlay.setAttribute('aria-hidden', 'true');
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  btnManageLists.addEventListener('click', openListsManager);
  btnCloseLists.addEventListener('click', closeListsManager);
  btnCloseListsBottom.addEventListener('click', closeListsManager);
  listsOverlay.addEventListener('click', (e) => {
    if (e.target === listsOverlay) closeListsManager();
  });

  // EXPORT PDF
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function() {
      try {
        if (typeof window.jspdf === 'undefined') {
          showToast('jsPDF non chargé', 'error');
          return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 15;
        const primaryColor = [30, 60, 114];
        const secondaryColor = [42, 82, 152];

        // Bandeau supérieur
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageW, 45, 'F');

        let leftX = margin;
        if (company.logo) {
          try {
            doc.addImage(company.logo, 'JPEG', margin, 8, 28, 28, undefined, 'FAST');
            leftX = margin + 32;
          } catch (e) {
            showToast('Le logo n’a pas pu être intégré au PDF.', 'warning');
          }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(companyName.value || 'Prestataire', leftX, 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(companyAddress.value || '', leftX, 22);
        doc.text(companyExtra.value || '', leftX, 27);
        doc.text(companyTel.value || '', leftX, 32);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RAPPORT DE MAINTENANCE', pageW - margin, 18, { align: 'right' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Émis le : ${todayISO()}`, pageW - margin, 28, { align: 'right' });

        let y = 55;
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(232, 238, 255);
        doc.roundedRect(margin, y, pageW - margin * 2, 32, 3, 3, 'F');
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + 32);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('CLIENT', margin + 4, y + 6);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(clientName.value || 'Client', margin + 4, y + 13);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(clientAddress.value || '', margin + 4, y + 19);
        doc.text(clientExtra.value || '', margin + 4, y + 25);
        if (clientTel.value) doc.text(`Tél: ${clientTel.value}`, margin + 4, y + 31);

        y += 40;

        const tableData = equipments.map(e => [
          e.name,
          e.emplacement,
          e.etat,
          e.probleme || '-',
          e.action || '-'
        ]);

        doc.autoTable({
          head: [['Équipement', 'Emplacement', 'État', 'Problème', 'Actions']],
          body: tableData,
          startY: y,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 255] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 35 },
            2: { cellWidth: 20 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' }
          }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total équipements : ${equipments.length}`, margin, finalY);
        doc.text(`En bon état : ${equipments.filter(e => e.etat === 'Bon').length}`, margin + 80, finalY);
        doc.text(`Hors service : ${equipments.filter(e => e.etat === 'Pas Bon').length}`, margin + 160, finalY);

        doc.save(`maintenance_${todayISO()}.pdf`);
        showToast('PDF téléchargé', 'success');
      } catch (error) {
        console.error(error);
        showToast('Erreur lors de la génération du PDF', 'error');
      }
    });
  }

  init();
})();