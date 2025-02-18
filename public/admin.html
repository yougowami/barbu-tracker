// admin.js
document.addEventListener('DOMContentLoaded', () => {
  // Fonction pour charger toutes les parties depuis Firestore
  async function loadParties() {
    try {
      const partiesSnapshot = await db.collection('parties').get();
      const parties = partiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return parties;
    } catch (err) {
      console.error("Erreur lors du chargement des parties :", err);
      return [];
    }
  }

  // Fonction pour afficher la liste des parties dans l'interface admin
  function renderDataList(parties) {
    const dataList = document.getElementById('data-list');
    dataList.innerHTML = '';
    parties.forEach(party => {
      const li = document.createElement('li');
      li.textContent = `Partie ID: ${party.id} - Session ID: ${party.sessionId} - Status: ${party.finished ? 'Terminée' : 'Active'}`;
      dataList.appendChild(li);
    });
  }

  // Fonction pour ajouter une nouvelle partie dans Firestore
  async function ajouterPartie(nouvellePartie) {
    try {
      await db.collection('parties').add(nouvellePartie);
      alert("Partie ajoutée avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'ajout de la partie :", err);
      alert("Erreur lors de l'ajout de la partie.");
    }
  }

  // Gestion de la soumission du formulaire pour ajouter une partie
  const addPartyForm = document.getElementById('add-party-form');
  addPartyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionId = document.getElementById('session-id').value.trim();
    const scoresText = document.getElementById('player-scores').value.trim();
    const finishedValue = document.getElementById('finished').value;
    const finished = finishedValue === 'true';

    // Parse des scores, ex: "Hugo:50, Léo:30" devient { Hugo: 50, Léo: 30 }
    const scores = {};
    scoresText.split(',').forEach(item => {
      const [player, score] = item.split(':');
      if (player && score) {
        scores[player.trim()] = parseFloat(score.trim());
      }
    });

    const nouvellePartie = {
      sessionId: sessionId,
      scores: scores,
      finished: finished,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await ajouterPartie(nouvellePartie);
    addPartyForm.reset();
    // Recharge et affiche la liste des parties
    const parties = await loadParties();
    renderDataList(parties);
  });

  // Chargement initial des données
  loadParties().then(parties => {
    renderDataList(parties);
  });
});
