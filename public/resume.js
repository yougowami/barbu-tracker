// resume.js
document.addEventListener('DOMContentLoaded', function() {
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      type: params.get('type'),
      id: params.get('id')
    };
  }

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
      console.error("Erreur lors du chargement des données :", err);
      return { saisons: [], sessions: [], parties: [] };
    }
  }

  function createRankingChart(rankingArray) {
    // Crée un graphique en barres pour le classement
    const ctx = document.getElementById('rankingChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rankingArray.map(item => item[0]),
        datasets: [{
          label: 'Score',
          data: rankingArray.map(item => item[1]),
          backgroundColor: 'rgba(74,144,226,0.5)',
          borderColor: 'rgba(74,144,226,1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function renderResume(data, type, id) {
    const container = document.getElementById('resume-content');
    let html = "";
    let breadcrumbCurrent = "";

    if (type === 'saison') {
      const saison = data.saisons.find(s => s.id === id);
      if (!saison) {
        html = "<p>Saison non trouvée.</p>";
        breadcrumbCurrent = "Saison non trouvée";
      } else {
        breadcrumbCurrent = saison.nom;
        html += `<h2>Saison : ${saison.nom}</h2>`;
        html += `<div class="info-section"><p><strong>ID :</strong> ${saison.id}</p>`;
        html += `<p><strong>Status :</strong> ${saison.finished ? "Terminée" : "Active"}</p></div>`;
        const sessions = data.sessions.filter(sess => sess.saisonId === saison.id);
        html += `<div class="info-section"><p><strong>Nombre de sessions :</strong> ${sessions.length}</p>`;
        let totalParties = 0;
        sessions.forEach(function(sess) {
          totalParties += data.parties.filter(function(p) { return p.sessionId === sess.id; }).length;
        });
        html += `<p><strong>Total de parties :</strong> ${totalParties}</p></div>`;
        // Calcul du classement pour la saison
        let seasonScores = {};
        sessions.forEach(function(sess) {
          const parties = data.parties.filter(function(p) { return p.sessionId === sess.id && p.finished; });
          parties.forEach(function(party) {
            Object.entries(party.scores).forEach(function([player, score]) {
              seasonScores[player] = (seasonScores[player] || 0) + score;
            });
          });
        });
        const seasonRanking = Object.entries(seasonScores).sort(function(a, b) { return a[1] - b[1]; });
        if (seasonRanking.length > 0) {
          html += `<h3>Classement de la saison</h3>`;
          html += "<ul class='detail-list'>";
          seasonRanking.forEach(function([player, score], index) {
            let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
            html += `<li>${emoji} ${index+1}. ${player}: ${score}</li>`;
          });
          html += "</ul>";
          html += `<h3>Graphique des scores</h3><canvas id="rankingChart"></canvas>`;
          // Création du graphique après l'insertion du canvas
          setTimeout(() => createRankingChart(seasonRanking), 100);
        }
      }
    } else if (type === 'session') {
      const session = data.sessions.find(s => s.id === id);
      if (!session) {
        html = "<p>Session non trouvée.</p>";
        breadcrumbCurrent = "Session non trouvée";
      } else {
        breadcrumbCurrent = `Session du ${session.date}`;
        html += `<h2>Session : ${session.date}</h2>`;
        html += `<div class="info-section"><p><strong>ID :</strong> ${session.id}</p>`;
        html += `<p><strong>Status :</strong> ${session.finished ? "Terminée" : "Active"}</p></div>`;
        const parties = data.parties.filter(p => p.sessionId === session.id);
        html += `<div class="info-section"><p><strong>Nombre de parties :</strong> ${parties.length}</p></div>`;
        // Classement de la session
        let sessionScores = {};
        parties.filter(p => p.finished).forEach(function(party) {
          Object.entries(party.scores).forEach(function([player, score]) {
            sessionScores[player] = (sessionScores[player] || 0) + score;
          });
        });
        const sessionRanking = Object.entries(sessionScores).sort(function(a, b) { return a[1] - b[1]; });
        if (sessionRanking.length > 0) {
          html += `<h3>Classement de la session</h3>`;
          html += "<ul class='detail-list'>";
          sessionRanking.forEach(function([player, score], index) {
            let emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
            html += `<li>${emoji} ${index+1}. ${player}: ${score}</li>`;
          });
          html += "</ul>";
          html += `<h3>Graphique des scores</h3><canvas id="rankingChart"></canvas>`;
          setTimeout(() => createRankingChart(sessionRanking), 100);
        }
      }
    } else if (type === 'partie') {
      const party = data.parties.find(p => p.id === id);
      if (!party) {
        html = "<p>Partie non trouvée.</p>";
        breadcrumbCurrent = "Partie non trouvée";
      } else {
        breadcrumbCurrent = `Partie ${party.id}`;
        html += `<h2>Partie : ${party.id}</h2>`;
        html += `<div class="info-section"><p><strong>Status :</strong> ${party.finished ? "Terminée" : "Active"}</p></div>`;
        if (!party.scores || Object.keys(party.scores).length === 0) {
          html += "<p>Aucun score disponible.</p>";
        } else {
          html += `<h3>Scores</h3>`;
          html += `<ul class="detail-list">`;
          Object.entries(party.scores).forEach(function([player, score]) {
            html += `<li><strong>${player}</strong>: ${score !== null ? score : "-"}</li>`;
          });
          html += `</ul>`;
          const totalScore = Object.values(party.scores).reduce(function(acc, val) { return acc + (val || 0); }, 0);
          html += `<p><strong>Total des scores :</strong> ${totalScore}</p>`;
        }
      }
    } else {
      html = "<p>Type non reconnu.</p>";
      breadcrumbCurrent = "Inconnu";
    }

    // Ajoute une citation inspirante
    const quotes = [
      "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte. – Winston Churchill",
      "Les grandes choses ne sont jamais faites par une seule personne. – Steve Jobs",
      "Il faut viser la lune, car même en cas d'échec, on atterrit dans les étoiles. – Oscar Wilde",
      "Croyez en vous et tout devient possible.",
      "Le futur appartient à ceux qui croient à la beauté de leurs rêves. – Eleanor Roosevelt",
      "Chaque jour est une nouvelle chance de changer votre vie."
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    html += `<div class="quote-section"><p>"${quote}"</p></div>`;

    document.getElementById('breadcrumb-current').textContent = breadcrumbCurrent;
    container.innerHTML = html;
  }

  (async function initResume() {
    const params = getQueryParams();
    const data = await loadData();
    renderResume(data, params.type, params.id);
  })();
});
