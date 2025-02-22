document.addEventListener('DOMContentLoaded', function() {
  // Vérification de l'état de connexion
  firebase.auth().onAuthStateChanged(function(user) {
    if (user && user.email === "hugo.amistani82000@gmail.com") {
      document.getElementById('loginContainer').style.display = "none";
      document.getElementById('adminContent').style.display = "block";
      initAdmin();
    } else {
      document.getElementById('loginContainer').style.display = "block";
      document.getElementById('adminContent').style.display = "none";
    }
  });

  // Gestion du formulaire de connexion
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(function(error) {
        alert("Erreur de connexion : " + error.message);
      });
  });

  // Initialisation de l'interface admin
  function initAdmin() {
    loadSeasonsIntoDropdown();
    loadSessionsIntoDropdown();
    renderActiveSeasons();
    renderActiveSessions();
    setupFormListeners();
  }

  // Setup des formulaires d'ajout
  function setupFormListeners() {
    // Ajout d'une Saison
    document.getElementById('seasonForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const seasonName = document.getElementById('seasonName').value;
      const seasonEnd = document.getElementById('seasonEnd').value;
      try {
        await db.collection('saisons').add({
          nom: seasonName,
          endDate: seasonEnd,
          finished: false
        });
        alert("Saison ajoutée");
        document.getElementById('seasonForm').reset();
        renderActiveSeasons();
        loadSeasonsIntoDropdown();
      } catch (err) {
        alert("Erreur lors de l'ajout de la saison : " + err.message);
      }
    });

    // Ajout d'une Session
    document.getElementById('sessionForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const sessionDateTime = document.getElementById('sessionDateTime').value;
      const seasonId = document.getElementById('sessionSeason').value;
      if (!seasonId) { alert("Veuillez sélectionner une saison"); return; }
      try {
        await db.collection('sessions').add({
          date: sessionDateTime,
          saisonId: seasonId,
          finished: false
        });
        alert("Session ajoutée");
        document.getElementById('sessionForm').reset();
        renderActiveSessions();
        loadSessionsIntoDropdown();
      } catch (err) {
        alert("Erreur lors de l'ajout de la session : " + err.message);
      }
    });

    // Ajout d'une Partie
    document.getElementById('partyForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const sessionId = document.getElementById('partySession').value;
      if (!sessionId) { alert("Veuillez sélectionner une session"); return; }
      const hugoScore = Number(document.getElementById('hugoScore').value);
      const leoScore = Number(document.getElementById('leoScore').value);
      const gabrielScore = Number(document.getElementById('gabrielScore').value);
      const guillaumeScore = Number(document.getElementById('guillaumeScore').value);
      try {
        await db.collection('parties').add({
          sessionId: sessionId,
          scores: {
            Hugo: hugoScore,
            "Léo": leoScore,
            Gabriel: gabrielScore,
            Guillaume: guillaumeScore
          },
          finished: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Partie ajoutée");
        document.getElementById('partyForm').reset();
        // On ne rafraîchit pas l'affichage des parties actives puisque nous ne les affichons plus
      } catch (err) {
        alert("Erreur lors de l'ajout de la partie : " + err.message);
      }
    });
  }

  // Charger et afficher les saisons actives
  async function renderActiveSeasons() {
    const snapshot = await db.collection('saisons').where('finished', '==', false).get();
    const list = document.getElementById('activeSeasonsList');
    list.innerHTML = "";
    snapshot.forEach(doc => {
      const season = doc.data();
      const li = document.createElement('li');
      li.textContent = `Saison: ${season.nom} - Fin: ${season.endDate}`;
      const finishBtn = document.createElement('button');
      finishBtn.textContent = "Terminer";
      finishBtn.classList.add('finish-btn');
      finishBtn.addEventListener('click', async function() {
        if (confirm("Marquer cette saison comme terminée ?")) {
          await db.collection('saisons').doc(doc.id).update({ finished: true });
          renderActiveSeasons();
          loadSeasonsIntoDropdown();
        }
      });
      li.appendChild(finishBtn);
      list.appendChild(li);
    });
  }

  // Charger et afficher les sessions actives
  async function renderActiveSessions() {
    const snapshot = await db.collection('sessions').where('finished', '==', false).get();
    const list = document.getElementById('activeSessionsList');
    list.innerHTML = "";
    snapshot.forEach(doc => {
      const session = doc.data();
      const li = document.createElement('li');
      li.textContent = `Session: ${session.date} (Saison: ${session.saisonId})`;
      const finishBtn = document.createElement('button');
      finishBtn.textContent = "Terminer";
      finishBtn.classList.add('finish-btn');
      finishBtn.addEventListener('click', async function() {
        if (confirm("Marquer cette session comme terminée ?")) {
          await db.collection('sessions').doc(doc.id).update({ finished: true });
          renderActiveSessions();
          loadSessionsIntoDropdown();
        }
      });
      li.appendChild(finishBtn);
      list.appendChild(li);
    });
  }

  // Charger les saisons actives dans le menu déroulant
  async function loadSeasonsIntoDropdown() {
    const snapshot = await db.collection('saisons').where('finished', '==', false).get();
    const dropdown = document.getElementById('sessionSeason');
    dropdown.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    snapshot.forEach(doc => {
      const season = doc.data();
      dropdown.innerHTML += `<option value="${doc.id}">${season.nom}</option>`;
    });
  }

  // Charger les sessions actives dans le menu déroulant
  async function loadSessionsIntoDropdown() {
    const snapshot = await db.collection('sessions').where('finished', '==', false).get();
    const dropdown = document.getElementById('partySession');
    dropdown.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    snapshot.forEach(doc => {
      const session = doc.data();
      dropdown.innerHTML += `<option value="${doc.id}">${session.date}</option>`;
    });
  }

  // Section Historique
  async function populateHistoryDropdowns() {
    const seasonsSnapshot = await db.collection('saisons').get();
    const sessionsSnapshot = await db.collection('sessions').get();
    const historySeason = document.getElementById('historySeason');
    historySeason.innerHTML = '<option value="">-- Saison --</option>';
    seasonsSnapshot.forEach(doc => {
      const season = doc.data();
      historySeason.innerHTML += `<option value="${doc.id}">${season.nom}</option>`;
    });
    document.getElementById('historySession').innerHTML = '<option value="">-- Session --</option>';
    document.getElementById('historyParty').innerHTML = '<option value="">-- Partie --</option>';
  }

  document.getElementById('historySeason').addEventListener('change', async function(e) {
    const seasonId = e.target.value;
    const sessionsSnapshot = await db.collection('sessions').where('saisonId', '==', seasonId).get();
    const historySession = document.getElementById('historySession');
    historySession.innerHTML = '<option value="">-- Session --</option>';
    sessionsSnapshot.forEach(doc => {
      const session = doc.data();
      historySession.innerHTML += `<option value="${doc.id}">${session.date}</option>`;
    });
    document.getElementById('historyParty').innerHTML = '<option value="">-- Partie --</option>';
  });

  document.getElementById('historySession').addEventListener('change', async function(e) {
    const sessionId = e.target.value;
    const partiesSnapshot = await db.collection('parties').where('sessionId', '==', sessionId).get();
    const historyParty = document.getElementById('historyParty');
    historyParty.innerHTML = '<option value="">-- Partie --</option>';
    partiesSnapshot.forEach(doc => {
      historyParty.innerHTML += `<option value="${doc.id}">${doc.id}</option>`;
    });
  });

  document.getElementById('goToResumeBtn').addEventListener('click', function() {
    const seasonId = document.getElementById('historySeason').value;
    const sessionId = document.getElementById('historySession').value;
    const partyId = document.getElementById('historyParty').value;
    let url = "resume.html?";
    if (partyId) {
      url += "type=partie&id=" + encodeURIComponent(partyId);
    } else if (sessionId) {
      url += "type=session&id=" + encodeURIComponent(sessionId);
    } else if (seasonId) {
      url += "type=saison&id=" + encodeURIComponent(seasonId);
    } else {
      alert("Veuillez sélectionner au moins une saison.");
      return;
    }
    window.location.href = url;
  });

  document.getElementById('viewHistoryBtn').addEventListener('click', function() {
    const historyForm = document.getElementById('historyForm');
    if (historyForm.style.display === "none" || historyForm.style.display === "") {
      historyForm.style.display = "block";
      populateHistoryDropdowns();
    } else {
      historyForm.style.display = "none";
    }
  });

  // Fonction globale pour mettre à jour tous les éléments affichés (saisons et sessions)
  async function renderDashboard() {
    await renderActiveSeasons();
    await renderActiveSessions();
  }

  // Déclaration pour que populateDropdowns soit accessible globalement
  async function populateDropdowns() {
    await loadSeasonsIntoDropdown();
    await loadSessionsIntoDropdown();
  }

  function init() {
    window.populateDropdowns = populateDropdowns;
    renderDashboard();
  }
  init();
});
