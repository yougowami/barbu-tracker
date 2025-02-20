// admin.js
document.addEventListener('DOMContentLoaded', () => {

  // Charge les saisons depuis Firestore
  async function loadSeasons() {
    try {
      const snapshot = await db.collection('saisons').orderBy('nom').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erreur lors du chargement des saisons :", error);
      return [];
    }
  }
  
  // Charge les sessions depuis Firestore
  async function loadSessions() {
    try {
      const snapshot = await db.collection('sessions').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erreur lors du chargement des sessions :", error);
      return [];
    }
  }
  
  // Charge les parties depuis Firestore
  async function loadParties() {
    try {
      const snapshot = await db.collection('parties').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erreur lors du chargement des parties :", error);
      return [];
    }
  }
  
  // Remplit les dropdowns pour les formulaires de session et de partie en ne gardant que les éléments actifs
  async function populateDropdowns() {
    const seasons = await loadSeasons();
    const activeSeasons = seasons.filter(season => !season.finished);
    const seasonSelect = document.getElementById('sessionSeason');
    seasonSelect.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    activeSeasons.forEach(season => {
      seasonSelect.innerHTML += `<option value="${season.id}">${season.nom}</option>`;
    });
    
    const sessions = await loadSessions();
    // Ne garder que les sessions appartenant à une saison active et non terminée
    const activeSessions = sessions.filter(session => 
      activeSeasons.some(season => season.id === session.saisonId) && !session.finished
    );
    const sessionSelect = document.getElementById('partySession');
    sessionSelect.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    activeSessions.forEach(session => {
      sessionSelect.innerHTML += `<option value="${session.id}">${session.date}</option>`;
    });
  }
  
  // Fonction générique pour ajouter un document dans Firestore
  async function addDocument(collectionName, data) {
    try {
      await db.collection(collectionName).add(data);
      alert(`Ajout dans "${collectionName}" réussi !`);
    } catch (error) {
      console.error("Erreur lors de l'ajout dans " + collectionName + ":", error);
      alert("Erreur lors de l'ajout.");
    }
  }
  
  // Gestion du formulaire d'ajout d'une saison
  const seasonForm = document.getElementById('seasonForm');
  seasonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const seasonName = document.getElementById('seasonName').value.trim();
    const seasonEnd = document.getElementById('seasonEnd').value;
    const data = {
      nom: seasonName,
      endDate: seasonEnd,
      finished: false, // Par défaut, la saison est active (non terminée)
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
    const data = {
      date: sessionDateTime,
      saisonId: seasonId,
      finished: false, // Par défaut, la session est active
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
    
    const data = {
      sessionId: sessionId,
      scores: scores,
      finished: true, // La partie est terminée dès la saisie des scores
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('parties', data);
    partyForm.reset();
    refreshDataList();
  });
  
  // Affichage global des données actives
  async function refreshDataList() {
    // Charge uniquement les saisons non terminées (actives)
    const seasons = (await loadSeasons()).filter(season => !season.finished);
    // Charge les sessions appartenant aux saisons actives et non terminées
    const sessions = (await loadSessions()).filter(session => 
      seasons.some(season => season.id === session.saisonId) && !session.finished
    );
    // Charge les parties appartenant aux sessions actives
    const parties = (await loadParties()).filter(party => 
      sessions.some(session => session.id === party.sessionId)
    );
    
    const listEl = document.getElementById('dataList');
    listEl.innerHTML = "";
    
    listEl.innerHTML += "<li><strong>Saisons (actives) :</strong></li>";
    seasons.forEach(season => {
      // Vérifier automatiquement si la saison est expirée
      if (new Date(season.endDate) < new Date() && !season.finished) {
        // Met à jour la saison pour la marquer comme terminée
        db.collection('saisons').doc(season.id).update({ finished: true });
        season.finished = true; // Mise à jour locale
      }
      listEl.innerHTML += `<li>Saison: ${season.nom} | Fin: ${season.endDate} | ${season.finished ? "Terminée" : "Active"} | ID: ${season.id}
      <button class="delete-btn" onclick="deleteSeason('${season.id}')">Supprimer</button></li>`;
    });
    
    listEl.innerHTML += "<li><strong>Sessions (actives) :</strong></li>";
    sessions.forEach(session => {
      // Ajout d'un bouton pour marquer manuellement la session comme terminée
      let finishButton = "";
      if (!session.finished) {
        finishButton = `<button class="finish-btn" onclick="markSessionFinished('${session.id}')">Marquer terminée</button>`;
      }
      listEl.innerHTML += `<li>Session: ${session.date} | Saison ID: ${session.saisonId} | ${session.finished ? "Terminée" : "Active"} | ID: ${session.id}
      ${finishButton}
      <button class="delete-btn" onclick="deleteSession('${session.id}')">Supprimer</button></li>`;
    });
    
    listEl.innerHTML += "<li><strong>Parties (actives) :</strong></li>";
    parties.forEach(party => {
      listEl.innerHTML += `<li>Partie ID: ${party.id} | Session ID: ${party.sessionId} | ${party.finished ? "Terminée" : "Active"} | Scores: ${JSON.stringify(party.scores)}
      <button class="delete-btn" onclick="deleteParty('${party.id}')">Supprimer</button></li>`;
    });
  }
  
  // Fonction pour marquer une session comme terminée
  window.markSessionFinished = async function(id) {
    if (confirm("Voulez-vous marquer cette session comme terminée ?")) {
      try {
        await db.collection('sessions').doc(id).update({ finished: true });
        alert("Session marquée comme terminée.");
        populateDropdowns();
        refreshDataList();
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la session :", error);
        alert("Erreur lors de la mise à jour.");
      }
    }
  };
  
  // Fonctions de suppression exposées globalement
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
