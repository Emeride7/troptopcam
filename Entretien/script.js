(function() {
  const { storage, uid, fmtMoney, todayISO, clampNumber, downscaleImageToDataURL } = Shared;

  // Données par défaut (caméras)
  const defaultData = {
    company: { name: '', address: '', extra: '', tel: '', logo: null },
    client: { name: '', address: '', extra: '', tel: '' },
    cameras: [
      { id: 1, name: 'Camera 1', emplacement: 'Extérieur Gauche', etat: 'Bon', probleme: 'RAS', action: 'Nettoyage des objectifs' },
      { id: 2, name: 'Camera 2', emplacement: 'Piscine', etat: 'Bon', probleme: 'RAS', action: 'Réglage des angles de vue' },
      { id: 3, name: 'Camera 3', emplacement: 'Couloir Cuisine', etat: 'Bon', probleme: 'RAS', action: 'Mise à jour du firmware' },
      { id: 4, name: 'Camera 4', emplacement: 'Couloir Gauche', etat: 'Bon', probleme: 'RAS', action: '' },
      { id: 5, name: 'Camera 5', emplacement: 'Montée Escalier', etat: 'Bon', probleme: 'RAS', action: '' },
      { id: 6, name: 'Camera 6', emplacement: 'Hal R+1', etat: 'Bon', probleme: 'RAS', action: '' },
      { id: 7, name: 'Camera 7', emplacement: 'Couloir Piscine', etat: 'Bon', probleme: 'RAS', action: '' },
      { id: 8, name: 'Camera 8', emplacement: 'Jardin', etat: 'Pas Bon', probleme: 'Camera court circuité à cause de l\'eau de pluie', action: 'Remplacement des caméras' },
      { id: 9, name: 'Camera 9', emplacement: 'Parking', etat: 'Pas Bon', probleme: '', action: 'Remplacement des caméras' },
      { id: 10, name: 'Camera 10', emplacement: 'Extérieur Droit', etat: 'Pas Bon', probleme: '', action: 'Remplacement des caméras' },
      { id: 11, name: 'Camera 11', emplacement: 'Hall Rez', etat: 'Pas Bon', probleme: 'Connecteurs endommagés', action: 'Remplacement de connecteurs endommagés' }
    ],
    emplacements: [
      'Extérieur Gauche', 'Piscine', 'Couloir Cuisine', 'Couloir Gauche',
      'Montée Escalier', 'Hal R+1', 'Couloir Piscine', 'Jardin',
      'Parking', 'Extérieur Droit', 'Hall Rez'
    ],
    problemes: [
      'RAS', 'Camera court circuité à cause de l\'eau de pluie',
      'Connecteurs endommagés', 'Problème de connexion', 'Image floue'
    ],
    actions: [
      'Nettoyage des objectifs', 'Réglage des angles de vue',
      'Mise à jour du firmware', 'Remplacement des caméras',
      'Remplacement de connecteurs endommagés', 'Réparation urgente'
    ]
  };

  // Chargement des données
  let appData = storage.get('cameraMaintenanceData') || defaultData;
  if (!Array.isArray(appData.emplacements)) appData.emplacements = defaultData.emplacements;
  if (!Array.isArray(appData.problemes)) appData.problemes = defaultData.problemes;
  if (!Array.isArray(appData.actions)) appData.actions = defaultData.actions;

  let company = { ...defaultData.company, ...appData.company };
  let client = { ...defaultData.client, ...appData.client };
  let cameras = appData.cameras || [];
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
  const cameraName = document.getElementById('cameraName');
  const cameraId = document.getElementById('cameraId');
  const emplacementSelect = document.getElementById('emplacement');
  const etatSelect = document.getElementById('etat');
  const problemeSelect = document.getElementById('probleme');
  const actionSelect = document.getElementById('action');
  const camerasTableBody = document.getElementById('camerasTableBody');
  const saveStatus = document.getElementById('saveStatus');
  const totalCamerasSpan = document.getElementById('totalCameras');
  const totalFonctionnellesSpan = document.getElementById('totalFonctionnelles');
  const totalNonFonctionnellesSpan = document.getElementById('totalNonFonctionnelles');
  const pdfBtn = document.getElementById('btnPdfMaintenance');
  const toast = document.getElementById('toast');

  // Fonction toast
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
    renderCameras();
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

    const data = { company, client, cameras, emplacements, problemes, actions };
    storage.set('cameraMaintenanceData', data);
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
  function renderCameras() {
    camerasTableBody.innerHTML = '';
    cameras.sort((a, b) => a.id - b.id).forEach(camera => {
      const row = camerasTableBody.insertRow();
      row.innerHTML = `
        <td>${camera.name}</td>
        <td>${camera.emplacement}</td>
        <td><span class="badge ${camera.etat === 'Bon' ? 'badge-success' : 'badge-danger'}">${camera.etat}</span></td>
        <td>${camera.probleme || '-'}</td>
        <td>${camera.action || '-'}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn edit-btn" onclick="window.editCamera(${camera.id})"><i class="fas fa-edit"></i> Modifier</button>
            <button class="action-btn delete-btn" onclick="window.deleteCamera(${camera.id})"><i class="fas fa-trash"></i> Suppr.</button>
          </div>
        </td>
      `;
    });

    totalCamerasSpan.textContent = cameras.length;
    totalFonctionnellesSpan.textContent = cameras.filter(c => c.etat === 'Bon').length;
    totalNonFonctionnellesSpan.textContent = cameras.filter(c => c.etat === 'Pas Bon').length;
  }

  // Formulaire
  document.getElementById('cameraForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const id = cameraId.value;
    const cameraData = {
      name: cameraName.value,
      emplacement: emplacementSelect.value,
      etat: etatSelect.value,
      probleme: problemeSelect.value || '',
      action: actionSelect.value || ''
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
      problemeSelect.value = camera.probleme || '';
      actionSelect.value = camera.action || '';
    }
  };

  window.deleteCamera = function(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette caméra ?')) {
      cameras = cameras.filter(c => c.id !== id);
      renderCameras();
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
    addUniqueItem(emplacements, input.value, 'emplacements');
    input.value = '';
  };

  window.addProbleme = function() {
    const input = document.getElementById('newProbleme');
    addUniqueItem(problemes, input.value, 'problemes');
    input.value = '';
  };

  window.addAction = function() {
    const input = document.getElementById('newAction');
    addUniqueItem(actions, input.value, 'actions');
    input.value = '';
  };

  // Réinitialisation
  window.resetToDefault = function() {
    if (confirm('Réinitialiser toutes les données ?')) {
      company = { ...defaultData.company };
      client = { ...defaultData.client };
      cameras = JSON.parse(JSON.stringify(defaultData.cameras));
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

        const tableData = cameras.map(c => [
          c.name,
          c.emplacement,
          c.etat,
          c.probleme || '-',
          c.action || '-'
        ]);

        doc.autoTable({
          head: [['Caméra', 'Emplacement', 'État', 'Problème', 'Actions']],
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

  init();
})();
