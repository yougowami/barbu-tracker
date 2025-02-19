// admin.js
document.addEventListener('DOMContentLoaded', () => {
  // Charge les parties depuis Firestore, triées par date de création (desc)
  async function loadParties() {
    try {
      const snapshot = await db.collection('parties').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erreur lors du chargement des parties :", err);
      return [];
    }
  }

  // Charge les sessions depuis Firestore, triées par date (desc)
  async function loadSessions() {
    try {
      const snapshot = await db.collection('sessions').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erreur lors du chargement des sessions :", err);
      return [];
    }
  }

  // Charge les saisons depuis Firestore, triées par nom (asc)
  async function loadSaisons() {
    try {
      const snapshot = await db.collection('saisons').orderBy('nom').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erreur lors du chargement des saisons :", err);
      return [];
    }
  }

  // Affiche la liste des parties avec un bouton de suppression pour chaque item
  function renderPartyList(parties) {
    const listEl = document.getElementById('party-list');
    listEl.innerHTML = '';
    parties.forEach(party => {
      const li = document.createElement('li');
      li.textContent = `Partie ID: ${party.id} | Session ID: ${party.sessionId} | ${party.finished ? 'Terminée' : 'Active'}`;
      const btn = document.createElement('button');
      btn.textContent = 'Supprimer';
      btn.classList.add('delete-btn');
      btn.addEventListener('click', () => {
        if (confirm(`Voulez-vous supprimer la partie ${party.id} ?`)) {
          deleteParty(party.id);
        }
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  // Affiche la liste des sessions avec bouton de suppression
  function renderSessionList(sessions) {
    const listEl = document.getElementById('session-list');
    listEl.innerHTML = '';
    sessions.forEach(session => {
      const li = document.createElement('li');
      li.textContent = `Session ID: ${session.id} | Date: ${session.date} | ${session.finished ? 'Terminée' : 'Active'}`;
      const btn = document.createElement('button');
      btn.textContent = 'Supprimer';
      btn.classList.add('delete-btn');
      btn.addEventListener('click', () => {
        if (confirm(`Voulez-vous supprimer la session ${session.id} ?`)) {
          deleteSession(session.id);
        }
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  // Affiche la liste des saisons avec bouton de suppression
  function renderSaisonList(saisons) {
    const listEl = document.getElementById('saison-list');
    listEl.innerHTML = '';
    saisons.forEach(saison => {
      const li = document.createElement('li');
      li.textContent = `Saison: ${saison.nom} (ID: ${saison.id}) | ${saison.finished ? 'Terminée' : 'Active'}`;
      const btn = document.createElement('button');
      btn.textContent = 'Supprimer';
      btn.classList.add('delete-btn');
      btn.addEventListener('click', () => {
        if (confirm(`Voulez-vous supprimer la saison ${saison.nom} ?`)) {
          deleteSaison(saison.id);
        }
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  // Supprimer une partie
  async function deleteParty(id) {
    try {
      await db.collection('parties').doc(id).delete();
      alert("Partie supprimée.");
      refreshLists();
    } catch (err) {
      console.error("Erreur lors de la suppression de la partie :", err);
      alert("Erreur lors de la suppression.");
    }
  }

  // Supprimer une session
  async function deleteSession(id) {
    try {
      await db.collection('sessions').doc(id).delete();
      alert("Session supprimée.");
      refreshLists();
    } catch (err) {
      console.error("Erreur lors de la suppression de la session :", err);
      alert("Erreur lors de la suppression.");
    }
  }

  // Supprimer une saison
  async function deleteSaison(id) {
    try {
      await db.collection('saisons').doc(id).delete();
      alert("Saison supprimée.");
      refreshLists();
    } catch (err) {
      console.error("Erreur lors de la suppression de la saison :", err);
      alert("Erreur lors de la suppression.");
    }
  }

  // Rafraîchit les listes de parties, sessions et saisons
  async function refreshLists() {
    const parties = await loadParties();
    renderPartyList(parties);
    const sessions = await loadSessions();
    renderSessionList(sessions);
    const saisons = await loadSaisons();
    renderSaisonList(saisons);
  }

  // Gestion du formulaire d'ajout d'une nouvelle partie
  const addPartyForm = document.getElementById('add-party-form');
  addPartyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionId = document.getElementById('session-id').value.trim();
    const scoresText = document.getElementById('player-scores').value.trim();
    const finished = document.getElementById('finished').value === 'true';

    // Parse les scores (format : "Hugo:50, Léo:30")
    const scores = {};
    scoresText.split(',').forEach(item => {
      const [player, score] = item.split(':');
      if (player && score) {
        scores[player.trim()] = parseFloat(score.trim());
      }
    });

    const newParty = {
      sessionId: sessionId,
      scores: scores,
      finished: finished,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('parties').add(newParty);
      alert("Partie ajoutée avec succès !");
      addPartyForm.reset();
      refreshLists();
    } catch (err) {
      console.error("Erreur lors de l'ajout de la partie :", err);
      alert("Erreur lors de l'ajout.");
    }
  });

  // Chargement initial des listes
  refreshLists();
});
