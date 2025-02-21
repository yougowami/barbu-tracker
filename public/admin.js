document.addEventListener('DOMContentLoaded', function() {
  // Vérifier l'état de connexion
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
    renderActiveParties();
    setupFormListeners();
  }

  // Setup listeners pour les formulaires d'ajout
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
        renderActiveParties();
      } catch (err) {
        alert("Erreur lors de l'ajout de la partie : " + err.message);
      }
    });
  }

  // Charger les saisons actives dans le menu déroulant pour les sessions
  async function loadSeasonsIntoDropdown() {
    const snapshot = await db.collection('saisons').where('finished', '==', false).get();
    const dropdown = document.getElementById('sessionSeason');
    dropdown.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
    snapshot.forEach(doc => {
      const season = doc.data();
      dropdown.innerHTML += `<option value="${doc.id}">${season.nom}</option>`;
    });
  }

  // Charger les sessions actives dans le menu déroulant pour les parties
  async function loadSessionsIntoDropdown() {
    const snapshot = await db.collection('sessions').where('finished', '==', false).get();
    const dropdown = document.getElementById('partySession');
    dropdown.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
    snapshot.forEach(doc => {
      const session = doc.data();
      dropdown.innerHTML += `<option value="${doc.id}">${session.date}</option>`;
    });
  }

  // Fonction pour mettre à jour les dropdowns (saisons et sessions)
  function loadSeasonsIntoDropdown() {
    db.collection('saisons').where('finished', '==', false).get()
      .then(snapshot => {
        const dropdown = document.getElementById('sessionSeason');
        dropdown.innerHTML = '<option value="">-- Sélectionnez une saison --</option>';
        snapshot.forEach(doc => {
          const season = doc.data();
          dropdown.innerHTML += `<option value="${doc.id}">${season.nom}</option>`;
        });
      });
  }
  
  function loadSessionsIntoDropdown() {
    db.collection('sessions').where('finished', '==', false).get()
      .then(snapshot => {
        const dropdown = document.getElementById('partySession');
        dropdown.innerHTML = '<option value="">-- Sélectionnez une session --</option>';
        snapshot.forEach(doc => {
          const session = doc.data();
          dropdown.innerHTML += `<option value="${doc.id}">${session.date}</option>`;
        });
      });
  }
  
  // Afficher les parties actives et permettre leur suppression
  async function renderActiveParties() {
    const snapshot = await db.collection('parties').where('finished', '==', false).get();
    const list = document.getElementById('activePartiesList');
    list.innerHTML = "";
    snapshot.forEach(doc => {
      const party = doc.data();
      const li = document.createElement('li');
      li.textContent = `Partie ${doc.id} - Session: ${party.sessionId} - Scores: Hugo: ${party.scores?.Hugo || 0}, Léo: ${party.scores?.["Léo"] || 0}, Gabriel: ${party.scores?.Gabriel || 0}, Guillaume: ${party.scores?.Guillaume || 0}`;
      const delBtn = document.createElement('button');
      delBtn.textContent = "Supprimer";
      delBtn.classList.add('delete-btn');
      delBtn.addEventListener('click', async function() {
        if (confirm("Voulez-vous vraiment supprimer cette partie ?")) {
          await db.collection('parties').doc(doc.id).delete();
          renderActiveParties();
        }
      });
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }
  
  // Initialisation
  function initAdmin() {
    loadSeasonsIntoDropdown();
    loadSessionsIntoDropdown();
    renderActiveParties();
    setupFormListeners();
  }
  
  // Expose functions globally si besoin
  window.renderActiveParties = renderActiveParties;
});
