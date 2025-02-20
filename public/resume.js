// resume.js
document.addEventListener('DOMContentLoaded', function() {
  // Récupère les paramètres d'URL
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      type: params.get('type'),
      id: params.get('id')
    };
  }

  // Charge les données depuis Firestore
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

  // Affiche le résumé en fonction du type (saison, session, partie)
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
        sessions.forEach(sess => {
          totalParties += data.parties.filter(p => p.sessionId === sess.id).length;
        });
        html += `<p><strong>Total de parties :</strong> ${totalParties}</p></div>`;
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
          Object.entries(party.scores).forEach(([player, score]) => {
            html += `<li><strong>${player}</strong>: ${score !== null ? score : "-"}</li>`;
          });
          html += `</ul>`;
          const totalScore = Object.values(party.scores).reduce((acc, val) => acc + (val || 0), 0);
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

  // Initialisation de la page Resume
  (async function initResume() {
    const params = getQueryParams();
    const data = await loadData();
    renderResume(data, params.type, params.id);
  })();
});
