// admin.js
document.addEventListener('DOMContentLoaded', () => {

  // Charger les saisons depuis Firestore
  async function loadSeasons() {
    try {
      const snapshot = await db.collection('saisons').orderBy('nom').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erreur lors du chargement des saisons :", error);
      return [];
    }
  }
  
  // Charger les sessions depuis Firestore
  async function loadSessions() {
    try {
      const snapshot = await db.collection('sessions').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erreur lors du chargement des sessions :", error);
      return [];
    }
  }
  
  // Charger les parties depuis Firestore
  async function loadParties() {
    try {
      const snapshot = await db.collection('parties').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erreur lors du chargement des parties :", error);
      return [];
    }
  }
  
  // Remplit les dropdowns pour le formulaire de session (sélection de saison) et de partie (sélection de session)
  async function populateDropdowns() {
    const seasons = await loadSeasons();
    const seasonSelect = document.getElementById('sessionSeason');
    seasonSelect.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    seasons.forEach(season => {
      seasonSelect.innerHTML += `<option value="${season.id}">${season.nom}</option>`;
    });
    
    const sessions = await loadSessions();
    const sessionSelect = document.getElementById('partySession');
    sessionSelect.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    sessions.forEach(session => {
      sessionSelect.innerHTML += `<option value="${session.id}">${session.date}</option>`;
    });
  }
  
  // Fonction générique pour ajouter un document dans une collection Firestore
  async function addDocument(collectionName, data) {
    try {
      await db.collection(collectionName).add(data);
      alert(`Ajout dans ${collectionName} réussi !`);
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de l'ajout.");
    }
  }
  
  // Gestion du formulaire d'ajout d'une saison
  const seasonForm = document.getElementById('seasonForm');
  seasonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const seasonName = document.getElementById('seasonName').value.trim();
    const seasonEnd = document.getElementById('seasonEnd').value;
    // La saison est créée avec finished = false par défaut
    const data = {
      nom: seasonName,
      endDate: seasonEnd,
      finished: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('saisons', data);
    seasonForm.reset();
    populateDropdowns();
    refreshDataList();
  });
  
  // Gestion du formulaire d'ajout d'une session
  const sessionForm = document.getElementById('sessionForm');
  sessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionDateTime = document.getElementById('sessionDateTime').value;
    const seasonId = document.getElementById('sessionSeason').value;
    if (!seasonId) {
      alert("Veuillez sélectionner une saison.");
      return;
    }
    // La session est créée avec finished = false par défaut
    const data = {
      date: sessionDateTime,
      saisonId: seasonId,
      finished: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('sessions', data);
    sessionForm.reset();
    populateDropdowns();
    refreshDataList();
  });
  
  // Gestion du formulaire d'ajout d'une partie
  const partyForm = document.getElementById('partyForm');
  partyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionId = document.getElementById('partySession').value;
    if (!sessionId) {
      alert("Veuillez sélectionner une session.");
      return;
    }
    // Récupération des scores pour Hugo, Léo, Gabriel et Guillaume
    const hugoScore = parseFloat(document.getElementById('hugoScore').value);
    const leoScore = parseFloat(document.getElementById('leoScore').value);
    const gabrielScore = parseFloat(document.getElementById('gabrielScore').value);
    const guillaumeScore = parseFloat(document.getElementById('guillaumeScore').value);
    
    const scores = {
      Hugo: hugoScore,
      Léo: leoScore,
      Gabriel: gabrielScore,
      Guillaume: guillaumeScore
    };
    
    // La partie est créée avec finished = true dès que les scores sont saisis
    const data = {
      sessionId: sessionId,
      scores: scores,
      finished: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('parties', data);
    partyForm.reset();
    refreshDataList();
  });
  
  // Affiche une liste globale des saisons, sessions et parties
  async function refreshDataList() {
    const seasons = await loadSeasons();
    const sessions = await loadSessions();
    const parties = await loadParties();
    
    const listEl = document.getElementById('dataList');
    listEl.innerHTML = "";
    
    listEl.innerHTML += "<li><strong>Saisons :</strong></li>";
    seasons.forEach(season => {
      listEl.innerHTML += `<li>Saison: ${season.nom} | Fin: ${season.endDate} | ${season.finished ? "Terminée" : "Active"} | ID: ${season.id}
      <button class="delete-btn" onclick="deleteSeason('${season.id}')">Supprimer</button></li>`;
    });
    listEl.innerHTML += "<li><strong>Sessions :</strong></li>";
    sessions.forEach(session => {
      listEl.innerHTML += `<li>Session: ${session.date} | Saison ID: ${session.saisonId} | ${session.finished ? "Terminée" : "Active"} | ID: ${session.id}
      <button class="delete-btn" onclick="deleteSession('${session.id}')">Supprimer</button></li>`;
    });
    listEl.innerHTML += "<li><strong>Parties :</strong></li>";
    parties.forEach(party => {
      listEl.innerHTML += `<li>Partie ID: ${party.id} | Session ID: ${party.sessionId} | ${party.finished ? "Terminée" : "Active"} | Scores: ${JSON.stringify(party.scores)}
      <button class="delete-btn" onclick="deleteParty('${party.id}')">Supprimer</button></li>`;
    });
  }
  
  // Fonctions de suppression exposées globalement pour être appelées par les boutons
  window.deleteSeason = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette saison ?")) {
      try {
        await db.collection('saisons').doc(id).delete();
        alert("Saison supprimée.");
        populateDropdowns();
        refreshDataList();
      } catch (error) {
        console.error("Erreur lors de la suppression de la saison :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };
  
  window.deleteSession = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette session ?")) {
      try {
        await db.collection('sessions').doc(id).delete();
        alert("Session supprimée.");
        populateDropdowns();
        refreshDataList();
      } catch (error) {
        console.error("Erreur lors de la suppression de la session :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };
  
  window.deleteParty = async function(id) {
    if (confirm("Voulez-vous vraiment supprimer cette partie ?")) {
      try {
        await db.collection('parties').doc(id).delete();
        alert("Partie supprimée.");
        refreshDataList();
      } catch (error) {
        console.error("Erreur lors de la suppression de la partie :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };
  
  // Initialisation
  populateDropdowns();
  refreshDataList();
});
