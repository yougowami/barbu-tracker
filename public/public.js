// public.js
document.addEventListener('DOMContentLoaded', () => {

  // Fonction pour charger les données depuis Firestore
  async function loadData() {
    try {
      const saisonsSnapshot = await db.collection('saisons').get();
      const sessionsSnapshot = await db.collection('sessions').get();
      const partiesSnapshot = await db.collection('parties').get();

      const saisons = saisonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const parties = partiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return { saisons, sessions, parties };
    } catch (err) {
      console.error(err);
      return { saisons: [], sessions: [], parties: [] };
    }
  }

  // Renvoie une citation inspirante aléatoire
  function getRandomQuote() {
    const quotes = [
      "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte. – Winston Churchill",
      "Les grandes choses ne sont jamais faites par une seule personne. – Steve Jobs",
      "Il faut viser la lune, car même en cas d'échec, on atterrit dans les étoiles. – Oscar Wilde",
      "Croyez en vous et tout devient possible.",
      "Le futur appartient à ceux qui croient à la beauté de leurs rêves. – Eleanor Roosevelt",
      "Chaque jour est une nouvelle chance de changer votre vie."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // Fonction pour afficher l'historique (saisons, sessions, parties)
  function renderHistory(data, searchDate, sortOrder) {
    // Rendu des saisons
    const historySaisons = document.getElementById('history-saisons');
    historySaisons.innerHTML = "";
    let sortedSaisons = data.saisons.slice();
    sortedSaisons.sort((a, b) => {
      return sortOrder === "ancien"
        ? Number(a.id.slice(1)) - Number(b.id.slice(1))
        : Number(b.id.slice(1)) - Number(a.id.slice(1));
    });
    sortedSaisons.forEach(saison => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="resume.html?type=saison&id=${encodeURIComponent(saison.id)}">
                        Saison : ${saison.nom} ${saison.finished ? "✅" : "⌛"}</a>`;
      historySaisons.appendChild(li);
    });

    // Rendu des sessions
    const historySessions = document.getElementById('history-sessions');
    historySessions.innerHTML = "";
    let filteredSessions = data.sessions;
    if (searchDate) {
      filteredSessions = filteredSessions.filter(session => session.date === searchDate);
    }
    filteredSessions.sort((a, b) => {
      return sortOrder === "ancien"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date);
    });
    filteredSessions.forEach(session => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="resume.html?type=session&id=${encodeURIComponent(session.id)}">
                        Session du ${session.date} ${session.finished ? "✅" : "⌛"}</a>`;
      historySessions.appendChild(li);
    });

    // Rendu des parties
    const historyParties = document.getElementById('history-parties');
    historyParties.innerHTML = "";
    let filteredParties = data.parties.filter(p => {
      if (searchDate) {
        const session = data.sessions.find(s => s.id === p.sessionId);
        return session && session.date === searchDate;
      }
      return true;
    });
    filteredParties.sort((a, b) => {
      return sortOrder === "ancien"
        ? Number(a.id.slice(1)) - Number(b.id.slice(1))
        : Number(b.id.slice(1)) - Number(a.id.slice(1));
    });
    filteredParties.forEach(party => {
      const session = data.sessions.find(s => s.id === party.sessionId);
      const li = document.createElement('li');
      li.innerHTML = `<a href="resume.html?type=partie&id=${encodeURIComponent(party.id)}">
                        Partie ${party.id} ${session ? "du " + session.date : ""} ${party.finished ? "✅" : "⌛"}</a>`;
      historyParties.appendChild(li);
    });
  }

  // Met à jour les informations du dashboard
  function renderDashboard(data) {
    // Parties du jour
    const today = new Date().toISOString().split('T')[0];
    const todayParties = data.parties.filter(p => {
      const session = data.sessions.find(s => s.id === p.sessionId);
      return session && session.date === today;
    });
    document.getElementById('parties-today').textContent = todayParties.length;

    // Calcul des scores du jour
    let dailyScores = {};
    todayParties.forEach(p => {
      Object.entries(p.scores).forEach(([player, score]) => {
        dailyScores[player] = (dailyScores[player] || 0) + score;
      });
    });
    const sortedDaily = Object.entries(dailyScores).sort((a, b) => a[1] - b[1]);
    document.getElementById('best-score').textContent = sortedDaily[0] ? sortedDaily[0][1] : "-";
    document.getElementById('top-player-today').textContent = sortedDaily[0] ? sortedDaily[0][0] : "-";

    // Résumé de la semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyParties = data.parties.filter(p => {
      const session = data.sessions.find(s => s.id === p.sessionId);
      return session && new Date(session.date) >= weekAgo;
    });
    document.getElementById('weekly-summary').textContent = `${weeklyParties.length} parties cette semaine`;

    // Session en cours
    const currentSessions = data.sessions.filter(s => !s.finished);
    let currentSession = currentSessions.length > 0 ? currentSessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
    if (currentSession) {
      const sessParties = data.parties.filter(p => p.sessionId === currentSession.id);
      document.getElementById('current-session').textContent = `${currentSession.date} (${sessParties.length} parties)`;
    } else {
      document.getElementById('current-session').textContent = "Aucune session en cours";
    }

    // Dernière partie terminée
    const finishedParties = data.parties.filter(p => p.finished);
    finishedParties.sort((a, b) => {
      const sessionA = data.sessions.find(s => s.id === a.sessionId);
      const sessionB = data.sessions.find(s => s.id === b.sessionId);
      const dateA = sessionA ? new Date(sessionA.date) : new Date(0);
      const dateB = sessionB ? new Date(sessionB.date) : new Date(0);
      return dateB - dateA;
    });
    const lastParty = finishedParties[0];
    if (lastParty) {
      let lastPartyHTML = "<ul>";
      for (const [player, score] of Object.entries(lastParty.scores)) {
        lastPartyHTML += `<li>${player}: ${score}</li>`;
      }
      lastPartyHTML += "</ul>";
      document.getElementById('last-party').innerHTML = lastPartyHTML;
    } else {
      document.getElementById('last-party').textContent = "Aucune partie terminée récemment";
    }
  }

  // Met à jour l'heure de dernière mise à jour et la citation inspirante
  function updateExtraFeatures() {
    document.getElementById('last-updated').textContent = "Dernière mise à jour : " + new Date().toLocaleString();
    document.getElementById('inspirational-quote').textContent = getRandomQuote();
  }

  // Fonction de rafraîchissement avec limitation de fréquence (60 secondes)
  let lastRefresh = 0;
  function refreshDashboard() {
    const now = Date.now();
    if (now - lastRefresh < 60000) {
      alert("Veuillez patienter un peu avant de rafraîchir à nouveau.");
      return;
    }
    lastRefresh = now;
    loadData().then(data => {
      renderDashboard(data);
      renderHistory(data, document.getElementById('search-date').value, document.getElementById('sort-order').value);
      updateExtraFeatures();
    });
  }

  // Événement pour le bouton Rafraîchir
  document.getElementById('refresh-button').addEventListener('click', refreshDashboard);

  // Initialisation
  loadData().then(data => {
    renderDashboard(data);
    renderHistory(data, "", "recent");
    updateExtraFeatures();
  });
});
