(function() {
  // Données par défaut
  const defaultData = {
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

  // Charger les données depuis localStorage ou utiliser les défauts
  let appData = Shared.storage.get('cameraMaintenanceData') || defaultData;
  let cameras = appData.cameras;
  let emplacements = appData.emplacements;
  let problemes = appData.problemes;
  let actions = appData.actions;

  // Éléments DOM
  const cameraForm = document.getElementById('cameraForm');
  const cameraId = document.getElementById('cameraId');
  const cameraName = document.getElementById('cameraName');
  const emplacementSelect = document.getElementById('emplacement');
  const etatSelect = document.getElementById('etat');
  const problemeSelect = document.getElementById('probleme');
  const actionSelect = document.getElementById('action');
  const camerasTableBody = document.getElementById('camerasTableBody');
  const saveStatus = document.getElementById('saveStatus');
  const totalCamerasSpan = document.getElementById('totalCameras');
  const totalFonctionnellesSpan = document.getElementById('totalFonctionnelles');
  const totalNonFonctionnellesSpan = document.getElementById('totalNonFonctionnelles');

  // Initialisation
  function init() {
    updateSelects();
    renderCameras();
  }

  // Sauvegarde dans localStorage
  function saveToLocalStorage() {
    const data = { cameras, emplacements, problemes, actions };
    Shared.storage.set('cameraMaintenanceData', data);
    showSaveStatus();
  }

  function showSaveStatus() {
    saveStatus.style.display = 'block';
    setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
  }

  // Mise à jour des listes déroulantes
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

  // Rendu du tableau
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
            <button class="action-btn edit-btn" onclick="window.editCamera(${camera.id})">✏️</button>
            <button class="action-btn delete-btn" onclick="window.deleteCamera(${camera.id})">🗑️</button>
          </div>
        </td>
      `;
    });

    // Mise à jour des stats
    totalCamerasSpan.textContent = cameras.length;
    totalFonctionnellesSpan.textContent = cameras.filter(c => c.etat === 'Bon').length;
    totalNonFonctionnellesSpan.textContent = cameras.filter(c => c.etat === 'Pas Bon').length;
  }

  // Gestionnaires d'événements
  cameraForm.addEventListener('submit', function(e) {
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

    cameraForm.reset();
    cameraId.value = '';
    renderCameras();
    saveToLocalStorage();
  });

  // Fonctions globales pour les boutons
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
      saveToLocalStorage();
    }
  };

  // Ajouts dans les listes
  window.addEmplacement = function() {
    const newVal = document.getElementById('newEmplacement').value.trim();
    if (newVal && !emplacements.includes(newVal)) {
      emplacements.push(newVal);
      updateSelects();
      saveToLocalStorage();
      document.getElementById('newEmplacement').value = '';
    }
  };

  window.addProbleme = function() {
    const newVal = document.getElementById('newProbleme').value.trim();
    if (newVal && !problemes.includes(newVal)) {
      problemes.push(newVal);
      updateSelects();
      saveToLocalStorage();
      document.getElementById('newProbleme').value = '';
    }
  };

  window.addAction = function() {
    const newVal = document.getElementById('newAction').value.trim();
    if (newVal && !actions.includes(newVal)) {
      actions.push(newVal);
      updateSelects();
      saveToLocalStorage();
      document.getElementById('newAction').value = '';
    }
  };

  window.resetToDefault = function() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ?')) {
      appData = defaultData;
      cameras = appData.cameras;
      emplacements = appData.emplacements;
      problemes = appData.problemes;
      actions = appData.actions;
      updateSelects();
      renderCameras();
      saveToLocalStorage();
    }
  };

  init();
})();