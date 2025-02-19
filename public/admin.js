// admin.js
document.addEventListener('DOMContentLoaded', () => {

  // Charger les saisons depuis Firestore
  async function loadSeasons() {
    try {
      const snapshot = await db.collection('saisons').orderBy('nom').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erreur lors du chargement des saisons :", err);
      return [];
    }
  }

  // Charger les sessions depuis Firestore
  async function loadSessions() {
    try {
      const snapshot = await db.collection('sessions').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erreur lors du chargement des sessions :", err);
      return [];
    }
  }

  // Charger les parties depuis Firestore
  async function loadParties() {
    try {
      const snapshot = await db.collection('parties').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Erreur lors du chargement des parties :", err);
      return [];
    }
  }

  // Afficher la liste des saisons
  function renderSeasonList(seasons) {
    const listEl = document.getElementById('season-list');
    listEl.innerHTML = '';
    seasons.forEach(season => {
      const li = document.createElement('li');
      li.textContent = `Saison: ${season.nom} (ID: ${season.id}) | ${season.finished ? 'Terminée' : 'Active'}`;
      const btn = document.createElement('button');
      btn.textContent = 'Supprimer';
      btn.classList.add('delete-btn');
      btn.addEventListener('click', () => {
        if (confirm(`Voulez-vous supprimer la saison "${season.nom}" ?`)) {
          deleteSeason(season.id);
        }
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  // Afficher la liste des sessions
  function renderSessionList(sessions) {
    const listEl = document.getElementById('session-list');
    listEl.innerHTML = '';
    sessions.forEach(session => {
      const li = document.createElement('li');
      li.textContent = `Session: ${session.date} (ID: ${session.id}) | ${session.finished ? 'Terminée' : 'Active'} | Saison ID: ${session.saisonId}`;
      const btn = document.createElement('button');
      btn.textContent = 'Supprimer';
      btn.classList.add('delete-btn');
      btn.addEventListener('click', () => {
        if (confirm(`Voulez-vous supprimer la session du ${session.date} ?`)) {
          deleteSession(session.id);
        }
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  // Afficher la liste des parties
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

  // Supprimer une saison
  async function deleteSeason(id) {
    try {
      await db.collection('saisons').doc(id).delete();
      alert("Saison supprimée.");
      refreshLists();
    } catch (err) {
      console.error("Erreur lors de la suppression de la saison :", err);
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

  // Rafraîchir toutes les listes
  async function refreshLists() {
    const seasons = await loadSeasons();
    renderSeasonList(seasons);
    const sessions = await loadSessions();
    renderSessionList(sessions);
    const parties = await loadParties();
    renderPartyList(parties);
  }

  // Gestion du formulaire d'ajout d'une nouvelle saison
  const addSeasonForm = document.getElementById('add-season-form');
  addSeasonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = document.getElementById('season-name').value.trim();
    const finished = document.getElementById('season-finished').value === 'true';
    const newSeason = {
      nom: nom,
      finished: finished,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection('saisons').add(newSeason);
      alert("Saison ajoutée avec succès !");
      addSeasonForm.reset();
      refreshLists();
    } catch (err) {
      console.error("Erreur lors de l'ajout de la saison :", err);
      alert("Erreur lors de l'ajout.");
    }
  });

  // Gestion du formulaire d'ajout d'une nouvelle session
  const addSessionForm = document.getElementById('add-session-form');
  if(addSessionForm) {
    addSessionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = document.getElementById('session-date').value.trim();
      const saisonId = document.getElementById('session-season').value.trim();
      const finished = document.getElementById('session-finished').value === 'true';
      const newSession = {
        date: date,
        saisonId: saisonId,
        finished: finished,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      try {
        await db.collection('sessions').add(newSession);
        alert("Session ajoutée avec succès !");
        addSessionForm.reset();
        refreshLists();
      } catch (err) {
        console.error("Erreur lors de l'ajout de la session :", err);
        alert("Erreur lors de l'ajout.");
      }
    });
  }

  // Gestion du formulaire d'ajout d'une nouvelle partie
  const addPartyForm = document.getElementById('add-party-form');
  addPartyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionId = document.getElementById('party-session').value.trim();
    const scoresText = document.getElementById('party-scores').value.trim();
    const finished = document.getElementById('party-finished').value === 'true';

    // Parse des scores (format "Hugo:50, Léo:30")
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
