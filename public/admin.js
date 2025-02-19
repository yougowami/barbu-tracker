// admin.js
document.addEventListener('DOMContentLoaded', () => {

  // Fonction générique pour ajouter un document dans une collection Firestore
  async function addDocument(collectionName, data) {
    try {
      await db.collection(collectionName).add(data);
      alert(`Ajout dans ${collectionName} réussi !`);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'ajout.");
    }
  }

  // Gestion du formulaire d'ajout de saison
  const seasonForm = document.getElementById('seasonForm');
  seasonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const seasonName = document.getElementById('seasonName').value.trim();
    const seasonFinished = document.getElementById('seasonFinished').value === 'true';
    const data = {
      nom: seasonName,
      finished: seasonFinished,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('saisons', data);
    seasonForm.reset();
  });

  // Gestion du formulaire d'ajout de session
  const sessionForm = document.getElementById('sessionForm');
  sessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionDate = document.getElementById('sessionDate').value;
    const sessionSeasonId = document.getElementById('sessionSeasonId').value.trim();
    const sessionFinished = document.getElementById('sessionFinished').value === 'true';
    const data = {
      date: sessionDate,
      saisonId: sessionSeasonId,
      finished: sessionFinished,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('sessions', data);
    sessionForm.reset();
  });

  // Gestion du formulaire d'ajout de partie
  const partyForm = document.getElementById('partyForm');
  partyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const partySessionId = document.getElementById('partySessionId').value.trim();
    const partyScoresText = document.getElementById('partyScores').value.trim();
    const partyFinished = document.getElementById('partyFinished').value === 'true';

    // Parse des scores au format "Hugo:50, Léo:30" => objet { Hugo: 50, Léo: 30 }
    const scores = {};
    partyScoresText.split(',').forEach(item => {
      const [player, score] = item.split(':');
      if (player && score) {
        scores[player.trim()] = parseFloat(score.trim());
      }
    });

    const data = {
      sessionId: partySessionId,
      scores: scores,
      finished: partyFinished,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await addDocument('parties', data);
    partyForm.reset();
  });
});
