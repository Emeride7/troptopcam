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

    // Regrouper les caméras par (description + note)
    const groups = {};

    cameras.forEach(camera => {
      let description, note;

      if (camera.etat === 'Bon') {
        description = 'Maintenance et Entretien';
        note = bonNote; // Note configurable
      } else {
        description = `Caméra ${camera.name} - ${camera.emplacement}${camera.problemes && camera.problemes.length ? ' (problème: ' + camera.problemes.join(', ') + ')' : ''}`;
        note = Array.isArray(camera.actions) ? camera.actions.join(', ') : (camera.actions || '');
      }

      const key = `${description}||${note}`; // Clé unique pour le groupement

      if (!groups[key]) {
        groups[key] = {
          description: description,
          note: note,
          qty: 0
        };
      }
      groups[key].qty += 1; // Incrémenter la quantité
    });

    // Transformer le groupe en tableau d'items
    const items = Object.values(groups).map(group => ({
      description: group.description,
      note: group.note,
      qty: group.qty,
      price: 0
    }));

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
