(function() {
  const { storage, uid, fmtMoney, todayISO, clampNumber, downscaleImageToDataURL } = Shared;

  // Données par défaut enrichies
  const defaultData = {
    company: { name: '', address: '', extra: '', tel: '', logo: null },
    client: { name: '', address: '', extra: '', tel: '' },
    cameras: [
      { id: 1, name: 'Camera 1', emplacement: 'Extérieur Gauche', etat: 'Bon', problemes: ['RAS'], actions: [], lastModified: new Date().toISOString() },
      { id: 2, name: 'Camera 2', emplacement: 'Piscine', etat: 'Bon', problemes: ['RAS'], actions: [], lastModified: new Date().toISOString() },
      // ... autres caméras avec problemes (tableau) au lieu de probleme (string)
      { id: 8, name: 'Camera 8', emplacement: 'Jardin', etat: 'Pas Bon', problemes: ['Camera court circuité à cause de l\'eau de pluie'], actions: ['Remplacement des caméras'], lastModified: new Date().toISOString() },
      { id: 11, name: 'Camera 11', emplacement: 'Hall Rez', etat: 'Pas Bon', problemes: ['Connecteurs endommagés'], actions: ['Remplacement de connecteurs endommagés'], lastModified: new Date().toISOString() }
    ],
    emplacements: [
      'Extérieur Gauche', 'Piscine', 'Couloir Cuisine', 'Couloir Gauche',
      'Montée Escalier', 'Hal R+1', 'Couloir Piscine', 'Jardin',
      'Parking', 'Extérieur Droit', 'Hall Rez'
    ],
    problemes: [
      'RAS',
      'Camera court circuité à cause de l\'eau de pluie',
      'Connecteurs endommagés',
      'Problème de connexion',
      'Image floue',
      'Problème d\'alimentation',
      'Firmware obsolète',
      'Câble endommagé',
      'Surchauffe',
      'Panne de disque dur'
    ],
    actions: [
      'Nettoyage des objectifs',
      'Réglage des angles de vue',
      'Mise à jour du firmware',
      'Remplacement des caméras',
      'Remplacement de connecteurs endommagés',
      'Réparation urgente',
      'Vérification câblage',
      'Reconfiguration réseau',
      'Remplacement disque dur',
      'Nettoyage ventilateur'
    ],
    // Table de correspondance problèmes -> actions (codée en dur)
    problemActionMap: {
      'Camera court circuité à cause de l\'eau de pluie': ['Remplacement des caméras'],
      'Connecteurs endommagés': ['Remplacement de connecteurs endommagés'],
      'Problème de connexion': ['Vérification câblage', 'Reconfiguration réseau'],
      'Image floue': ['Nettoyage des objectifs', 'Réglage des angles de vue'],
      'Problème d\'alimentation': ['Réparation urgente'],
      'Firmware obsolète': ['Mise à jour du firmware'],
      'Câble endommagé': ['Remplacement de connecteurs endommagés'],
      'Surchauffe': ['Nettoyage ventilateur'],
      'Panne de disque dur': ['Remplacement disque dur']
    },
    bonNote: 'Nettoyage des objectifs, Réglage des angles de vue, Mise à jour du firmware des caméras, Vérification enregistreurs NVR'
  };

  // Chargement des données
  let appData = storage.get('cameraMaintenanceData') || defaultData;
  // Fusionner les tableaux (au cas où)
  if (!Array.isArray(appData.emplacements)) appData.emplacements = defaultData.emplacements;
  if (!Array.isArray(appData.problemes)) appData.problemes = defaultData.problemes;
  if (!Array.isArray(appData.actions)) appData.actions = defaultData.actions;
  if (!appData.problemActionMap) appData.problemActionMap = defaultData.problemActionMap;
  if (!appData.bonNote) appData.bonNote = defaultData.bonNote;

  let company = { ...defaultData.company, ...appData.company };
  let client = { ...defaultData.client, ...appData.client };
  let cameras = appData.cameras || [];
  // Convertir les anciennes caméras avec "probleme" en tableau "problemes"
  cameras.forEach(c => {
    if (c.probleme && !c.problemes) {
      c.problemes = [c.probleme];
      delete c.probleme;
    }
    if (!c.problemes) c.problemes = [];
    if (!c.actions) c.actions = [];
    if (!c.lastModified) c.lastModified = new Date().toISOString();
  });
  let emplacements = appData.emplacements;
  let problemes = appData.problemes;
  let actions = appData.actions;
  let problemActionMap = appData.problemActionMap;
  let bonNote = appData.bonNote;

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
  const cameraName = document.getElementById('cameraName');
  const cameraId = document.getElementById('cameraId');
  const emplacementSelect = document.getElementById('emplacement');
  const etatSelect = document.getElementById('etat');
  const problemeCheckboxesDiv = document.getElementById('problemeCheckboxes');
  const actionsCheckboxesDiv = document.getElementById('actionsCheckboxes');
  const camerasTableBody = document.getElementById('camerasTableBody');
  const saveStatus = document.getElementById('saveStatus');
  const totalCamerasSpan = document.getElementById('totalCameras');
  const totalFonctionnellesSpan = document.getElementById('totalFonctionnelles');
  const totalNonFonctionnellesSpan = document.getElementById('totalNonFonctionnelles');
  const pdfBtn = document.getElementById('btnPdfMaintenance');
  const createInvoiceBtn = document.getElementById('createInvoiceBtn');
  const bonNoteTextarea = document.getElementById('bonNote');
  const toast = document.getElementById('toast');

  // Initialiser la zone de texte de la note Bon
  if (bonNoteTextarea) bonNoteTextarea.value = bonNote;

  // Fonction toast
  function showToast(msg, type = 'info', duration = 2500) {
    toast.textContent = msg;
    toast.style.background = type === 'error' ? '#7f1d1d' : type === 'success' ? '#14532d' : 'var(--primary)';
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('show'), duration);
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
    if (bonNoteTextarea) bonNote = bonNoteTextarea.value;

    const data = { company, client, cameras, emplacements, problemes, actions, problemActionMap, bonNote };
    storage.set('cameraMaintenanceData', data);
    if (showToastMsg) showToast('Données sauvegardées', 'success');
    else {
      saveStatus.style.display = 'flex';
      setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
    }
  }

  // Mise à jour des selects (emplacements)
  function updateSelects() {
    emplacementSelect.innerHTML = '<option value="">Sélectionner un emplacement</option>';
    emplacements.forEach(emp => {
      emplacementSelect.innerHTML += `<option value="${emp}">${emp}</option>`;
    });
  }

  // Rendu des cases à cocher pour les problèmes
  function renderProblemeCheckboxes(selectedProblemes = []) {
    problemeCheckboxesDiv.innerHTML = '';
    problemes.forEach(prob => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.marginBottom = '4px';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = prob;
      checkbox.checked = selectedProblemes.includes(prob);
      checkbox.addEventListener('change', function(e) {
        // Limiter à 3 sélections
        const checkboxes = problemeCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        if (checked.length > 3) {
          this.checked = false;
          showToast('Vous ne pouvez sélectionner que 3 problèmes maximum.', 'warning');
        }
        // Si l'état est "Bon", on force la déselection et on remet "RAS" ? On gère via l'événement sur etatSelect
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + prob));
      problemeCheckboxesDiv.appendChild(label);
    });
  }

  // Rendu des cases à cocher pour les actions
  function renderActionsCheckboxes(selectedActions = []) {
    actionsCheckboxesDiv.innerHTML = '';
    actions.forEach(action => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.marginBottom = '4px';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = action;
      checkbox.checked = selectedActions.includes(action);
      checkbox.addEventListener('change', function(e) {
        // Limiter à 3 sélections
        const checkboxes = actionsCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        if (checked.length > 3) {
          this.checked = false;
          showToast('Vous ne pouvez sélectionner que 3 actions maximum.', 'warning');
        }
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + action));
      actionsCheckboxesDiv.appendChild(label);
    });
  }

  // Mise à jour automatique des actions en fonction des problèmes sélectionnés
  function updateActionsFromProblemes() {
    const problemeCheckboxes = problemeCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked');
    const selectedProblemes = Array.from(problemeCheckboxes).map(cb => cb.value);
    let suggestedActions = new Set();
    selectedProblemes.forEach(prob => {
      if (problemActionMap[prob]) {
        problemActionMap[prob].forEach(action => suggestedActions.add(action));
      }
    });
    // Cocher les actions suggérées (sans dépasser 3)
    const actionCheckboxes = actionsCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
    actionCheckboxes.forEach(cb => {
      if (suggestedActions.has(cb.value)) {
        cb.checked = true;
      }
    });
    // Vérifier le nombre max (si trop, on avertit)
    const checkedActions = Array.from(actionCheckboxes).filter(cb => cb.checked);
    if (checkedActions.length > 3) {
      showToast('Trop d\'actions suggérées, veuillez en désélectionner.', 'warning');
    }
  }

  // Écouter les changements sur les cases de problèmes
  if (problemeCheckboxesDiv) {
    problemeCheckboxesDiv.addEventListener('change', updateActionsFromProblemes);
  }

  // Quand l'état change : si "Bon", forcer le problème à "RAS" et désactiver les autres ?
  etatSelect.addEventListener('change', function() {
    if (this.value === 'Bon') {
      // Décocher tous les problèmes sauf "RAS"
      const checkboxes = problemeCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb.value === 'RAS') cb.checked = true;
        else cb.checked = false;
      });
      // Forcer les actions ? On laisse l'utilisateur choisir, mais on peut suggérer des actions d'entretien
      // Optionnel : cocher quelques actions par défaut ? On ne fait rien.
    }
  });

  // Variables pour le drag & drop
  let draggedRow = null;

  function handleDragStart(e) {
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
    // Mettre à jour l'ordre des caméras
    const newOrder = [];
    for (const row of camerasTableBody.rows) {
      const id = parseInt(row.dataset.id);
      const camera = cameras.find(c => c.id === id);
      if (camera) newOrder.push(camera);
    }
    cameras = newOrder;
    saveToLocalStorage(true);
  }

  function handleDragEnd(e) {
    this.style.opacity = '1';
    draggedRow = null;
  }

  // Affichage du tableau
  function renderCameras() {
    camerasTableBody.innerHTML = '';
    cameras.forEach(camera => {
      const row = camerasTableBody.insertRow();
      row.draggable = true;
      row.dataset.id = camera.id;

      // Cellule de la poignée
      const cellDrag = row.insertCell(0);
      cellDrag.classList.add('drag-handle');
      cellDrag.innerHTML = '<i class="fas fa-grip-vertical"></i>';

      // Problèmes sous forme de liste
      const problemesStr = Array.isArray(camera.problemes) ? camera.problemes.join(', ') : (camera.problemes || '-');
      // Actions sous forme de liste
      const actionsStr = Array.isArray(camera.actions) ? camera.actions.join(', ') : (camera.actions || '-');

      row.innerHTML += `
        <td>${camera.name}</td>
        <td>${camera.emplacement}</td>
        <td><span class="badge ${camera.etat === 'Bon' ? 'badge-success' : 'badge-danger'}">${camera.etat}</span></td>
        <td>${problemesStr}</td>
        <td>${actionsStr}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit-btn" onclick="window.editCamera(${camera.id})"><i class="fas fa-edit"></i> Modifier</button>
            <button class="action-btn delete-btn" onclick="window.deleteCamera(${camera.id})"><i class="fas fa-trash"></i> Suppr.</button>
          </div>
        </td>
      `;

      row.addEventListener('dragstart', handleDragStart);
      row.addEventListener('dragover', handleDragOver);
      row.addEventListener('drop', handleDrop);
      row.addEventListener('dragend', handleDragEnd);
    });

    totalCamerasSpan.textContent = cameras.length;
    totalFonctionnellesSpan.textContent = cameras.filter(c => c.etat === 'Bon').length;
    totalNonFonctionnellesSpan.textContent = cameras.filter(c => c.etat === 'Pas Bon').length;
  }

  // Formulaire
  document.getElementById('cameraForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const id = cameraId.value;
    // Récupérer les problèmes cochés
    const problemeCheckboxes = problemeCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked');
    const selectedProblemes = Array.from(problemeCheckboxes).map(cb => cb.value);
    // Récupérer les actions cochées
    const actionCheckboxes = actionsCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked');
    const selectedActions = Array.from(actionCheckboxes).map(cb => cb.value);

    const cameraData = {
      name: cameraName.value,
      emplacement: emplacementSelect.value,
      etat: etatSelect.value,
      problemes: selectedProblemes,
      actions: selectedActions,
      lastModified: new Date().toISOString()
    };

    if (id) {
      const index = cameras.findIndex(c => c.id == id);
      if (index !== -1) {
        cameras[index] = { ...cameras[index], ...cameraData };
      }
    } else {
      const newId = cameras.length ? Math.max(...cameras.map(c => c.id)) + 1 : 1;
      cameras.push({ id: newId, ...cameraData });
    }

    this.reset();
    cameraId.value = '';
    renderProblemeCheckboxes();
    renderActionsCheckboxes();
    renderCameras();
    saveToLocalStorage(true);
  });

  window.editCamera = function(id) {
    const camera = cameras.find(c => c.id === id);
    if (camera) {
      cameraId.value = camera.id;
      cameraName.value = camera.name;
      emplacementSelect.value = camera.emplacement;
      etatSelect.value = camera.etat;
      renderProblemeCheckboxes(camera.problemes || []);
      renderActionsCheckboxes(camera.actions || []);
    }
  };

  window.deleteCamera = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette caméra ?')) {
      cameras = cameras.filter(c => c.id !== id);
      renderCameras();
      saveToLocalStorage(true);
    }
  };

  // Ajout dans les listes
  function addUniqueItem(list, newValue, listName) {
    const trimmed = newValue.trim();
    if (!trimmed) return false;
    const exists = list.some(item => item.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      list.push(trimmed);
      if (listName === 'problemes') {
        renderProblemeCheckboxes();
      } else if (listName === 'actions') {
        renderActionsCheckboxes();
      } else {
        updateSelects();
      }
      saveToLocalStorage(true);
      return true;
    }
    return false;
  }

  window.addEmplacement = function() {
    const input = document.getElementById('newEmplacement');
    addUniqueItem(emplacements, input.value, 'emplacements');
    input.value = '';
  };

  window.addProbleme = function() {
    const input = document.getElementById('newProbleme');
    if (addUniqueItem(problemes, input.value, 'problemes')) {
      input.value = '';
    }
  };

  window.addAction = function() {
    const input = document.getElementById('newAction');
    if (addUniqueItem(actions, input.value, 'actions')) {
      input.value = '';
    }
  };

  // Réinitialisation
  window.resetToDefault = function() {
    if (confirm('Réinitialiser toutes les données ?')) {
      company = { ...defaultData.company };
      client = { ...defaultData.client };
      cameras = JSON.parse(JSON.stringify(defaultData.cameras));
      cameras.forEach(c => {
        if (!c.problemes) c.problemes = c.probleme ? [c.probleme] : [];
        if (!c.actions) c.actions = c.action ? [c.action] : [];
        delete c.probleme;
        delete c.action;
        c.lastModified = new Date().toISOString();
      });
      emplacements = [...defaultData.emplacements];
      problemes = [...defaultData.problemes];
      actions = [...defaultData.actions];
      problemActionMap = { ...defaultData.problemActionMap };
      bonNote = defaultData.bonNote;
      if (bonNoteTextarea) bonNoteTextarea.value = bonNote;

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
      renderProblemeCheckboxes();
      renderActionsCheckboxes();
      renderCameras();
      saveToLocalStorage(true);
    }
  };

  // Sauvegarde automatique
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

  // Création d'une facture à partir du rapport
  if (createInvoiceBtn) {
    createInvoiceBtn.addEventListener('click', function() {
      if (!client.name || !client.address) {
        showToast('Veuillez renseigner les informations du client.', 'error');
        return;
      }
      if (cameras.length === 0) {
        showToast('Aucune caméra dans le rapport.', 'error');
        return;
      }

      // Construire les lignes de prestations pour la facture
      const items = cameras.map(camera => {
        let description, note;
        if (camera.etat === 'Bon') {
          description = 'Maintenance et Entretien';
          note = bonNote; // Utiliser la note configurable
        } else {
          description = `Caméra ${camera.name} - ${camera.emplacement}${camera.problemes && camera.problemes.length ? ' (problème: ' + camera.problemes.join(', ') + ')' : ''}`;
          note = Array.isArray(camera.actions) ? camera.actions.join(', ') : (camera.actions || '');
        }
        return {
          description: description,
          note: note,
          qty: 1,
          price: 0
        };
      });

      const pendingData = {
        client: {
          name: client.name,
          address: client.address,
          extra: client.extra || '',
          ifu: ''
        },
        items: items
      };

      storage.set('pendingInvoiceData', pendingData);
      showToast('Données prêtes. Redirection vers la facture...', 'success');
      setTimeout(() => {
        window.location.href = '../Facture/';
      }, 1500);
    });
  }

  // EXPORT PDF (adapté pour problèmes multiples et actions)
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

        const tableData = cameras.map(c => {
          const problemesStr = Array.isArray(c.problemes) ? c.problemes.join(', ') : (c.problemes || '-');
          const actionsStr = Array.isArray(c.actions) ? c.actions.join(', ') : (c.actions || '-');
          return [
            c.name,
            c.emplacement,
            c.etat,
            problemesStr,
            actionsStr
          ];
        });

        doc.autoTable({
          head: [['Caméra', 'Emplacement', 'État', 'Problème(s)', 'Actions recommandées']],
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
        doc.text(`Total caméras : ${cameras.length}`, margin, finalY);
        doc.text(`Fonctionnelles : ${cameras.filter(c => c.etat === 'Bon').length}`, margin + 80, finalY);
        doc.text(`Non fonctionnelles : ${cameras.filter(c => c.etat === 'Pas Bon').length}`, margin + 160, finalY);

        doc.save(`maintenance_${todayISO()}.pdf`);
        showToast('PDF téléchargé', 'success');
      } catch (error) {
        console.error(error);
        showToast('Erreur lors de la génération du PDF', 'error');
      }
    });
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
    renderProblemeCheckboxes();
    renderActionsCheckboxes();
    renderCameras();
  }

  init();
})();
