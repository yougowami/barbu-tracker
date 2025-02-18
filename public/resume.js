// resume.js
document.addEventListener('DOMContentLoaded', () => {

  // Récupère les paramètres d'URL (type et id)
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      type: params.get('type'),
      id: params.get('id')
    };
  }

  // Charge les données depuis Firestore (collections : saisons, sessions, parties)
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

  // Renvoie une citation inspirante aléatoire
  function getRandomQuote() {
    const quotes = [
      "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte. – Winston Churchill",
      "Les grandes choses ne sont jamais faites par une seule personne. – Steve Jobs",
      "Il faut viser la lune, car même en cas d'échec, on atterrit dans les étoiles. – Oscar Wilde",
      "Croyez en vous et tout devient possible.",
      "Le futur appartient à ceux qui croient à la beauté de leurs rêves. – Eleanor Roosevelt",
      "Chaque jour est une nouvelle chance de changer votre vie.",
      "Ils ne savaient pas que c'était impossible, alors ils l'ont fait. – Mark Twain",
      "Le succès, c'est tomber sept fois et se relever huit. – Proverbe japonais",
      "Faites de votre vie un rêve, et d'un rêve, une réalité. – Antoine de Saint-Exupéry",
      "Ne rêve pas ta vie, vis tes rêves.",
      "L'homme sage apprend plus de ses ennemis que l'imbécile de ses amis. – Baltasar Gracián",
      "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre. – Albert Einstein",
      "Le problème dans le monde, c'est que les idiots sont pleins de certitudes, et les gens intelligents remplis de doutes. – Bertrand Russell",
      "Si l'erreur est humaine, alors qui a inventé la correction automatique ?",
      "Pourquoi prendre la vie au sérieux ? De toute façon, on n'en sortira pas vivant. – Alphonse Allais",
      "J’ai tenté d’être normal une fois… Mes pires cinq minutes.",
      "Do, or do not. There is no try. – Yoda",
      "Le geek ne vieillit pas, il level up.",
      "La seule façon de faire du bon travail, c'est d'aimer ce que vous faites. – Steve Jobs",
      "Rien n'est impossible, seules les limites de notre esprit définissent certaines choses comme inconcevables. – Napoléon Bonaparte",
      "Le plus grand échec est de ne pas avoir le courage d’oser. – Abbé Pierre",
      "Le talent, ça n'existe pas. Le talent, c'est d'avoir l'envie de faire quelque chose. – Jacques Brel",
      "Le plus grand risque est de ne prendre aucun risque. – Mark Zuckerberg",
      "Quand tout semble aller contre vous, souvenez-vous que les avions décollent contre le vent, pas avec lui. – Henry Ford",
      "Celui qui combat peut perdre, mais celui qui ne combat pas a déjà perdu. – Bertolt Brecht",
      "L'imagination est plus importante que le savoir. – Albert Einstein",
      "Le bonheur ne se trouve pas au sommet de la montagne, mais dans la façon de la gravir. – Confucius",
      "Un pessimiste voit la difficulté dans chaque opportunité, un optimiste voit l'opportunité dans chaque difficulté. – Winston Churchill",
      "Tout ce que vous avez toujours voulu se trouve de l'autre côté de la peur. – George Addair",
      "Agis comme s'il était impossible d'échouer. – Winston Churchill",
      "Le seul moyen de faire un excellent travail est d’aimer ce que vous faites. – Steve Jobs",
      "Le savoir est la seule richesse qui s'accroît lorsqu'on la partage. – Socrate",
      "Ce n’est pas parce que les choses sont difficiles que nous n’osons pas, c’est parce que nous n’osons pas qu’elles sont difficiles. – Sénèque",
      "Chaque jour est une opportunité de faire mieux qu’hier.",
      "Les seules limites de demain sont les doutes d’aujourd’hui. – Franklin D. Roosevelt",
      "La logique vous mènera d’un point A à un point B. L’imagination vous mènera partout. – Albert Einstein",
      "Les erreurs sont la preuve que vous essayez.",
      "Il n’y a qu’une façon d’échouer, c’est d’abandonner avant d’avoir réussi. – Georges Clemenceau",
      "Ne laisse pas hier prendre trop de place aujourd’hui. – Will Rogers",
      "Les gagnants trouvent des moyens, les perdants des excuses.",
      "Rêvez grand, commencez petit, mais surtout, commencez.",
      "Ce que l’on fait dans cette vie résonne dans l’éternité. – Gladiator",
      "Ne laissez pas le bruit des opinions des autres étouffer votre propre voix intérieure. – Steve Jobs",
      "Une personne qui n’a jamais commis d’erreurs n’a jamais tenté d’innover. – Albert Einstein",
      "Le plus grand danger n’est pas de viser trop haut et d’échouer, mais de viser trop bas et de réussir. – Michel-Ange",
      "Les seules batailles perdues sont celles que l’on ne livre pas. – Napoléon Bonaparte"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // Génère un tableau de classement avec avatars et trophées
  // Trié par score croissant (le gagnant est celui avec le moins de points)
  function renderRankingTable(rankingArray) {
    rankingArray.sort((a, b) => a[1] - b[1]);
    let html = '<table class="ranking-table"><thead><tr><th>Rang</th><th>Joueur</th><th>Score</th></tr></thead><tbody>';
    rankingArray.forEach(([player, score], index) => {
      let trophyIcon = '';
      if (index === 0) trophyIcon = '<i class="fas fa-trophy" style="color:gold; margin-right:5px;"></i>';
      else if (index === 1) trophyIcon = '<i class="fas fa-medal" style="color:silver; margin-right:5px;"></i>';
      else if (index === 2) trophyIcon = '<i class="fas fa-medal" style="color:#cd7f32; margin-right:5px;"></i>';
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player)}&background=4A90E2&color=fff&size=64`;
      html += `<tr>
                <td>${index + 1}</td>
                <td>${trophyIcon}<img src="${avatarUrl}" alt="${player}" style="width:30px;height:30px;border-radius:50%;vertical-align:middle;margin-right:5px;"> ${player}</td>
                <td>${score}</td>
              </tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  // Crée un graphique avec Chart.js (optionnel)
  function createRankingChart(rankingArray) {
    rankingArray.sort((a, b) => a[1] - b[1]);
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

  // Affiche le contenu détaillé du résumé en fonction du type (saison, session, partie)
  function renderResume(data, type, id) {
    const container = document.getElementById('resume-content');
    let html = "";
    let breadcrumbCurrent = "";
    let rankingData = null;

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
        let seasonScores = {};
        sessions.forEach(sess => {
          const parties = data.parties.filter(p => p.sessionId === sess.id);
          parties.forEach(party => {
            Object.entries(party.scores).forEach(([player, score]) => {
              seasonScores[player] = (seasonScores[player] || 0) + score;
            });
          });
        });
        rankingData = Object.entries(seasonScores);
        rankingData.sort((a, b) => a[1] - b[1]);
        html += `<h3>Classement de la saison (gagnant = moins de points)</h3>`;
        if (rankingData.length === 0) {
          html += "<p>Aucun score disponible.</p>";
        } else {
          html += renderRankingTable(rankingData);
          html += `<h3>Graphique des scores</h3><canvas id="rankingChart"></canvas>`;
        }
        html += `<h3>Sessions</h3>`;
        if (sessions.length === 0) {
          html += "<p>Aucune session disponible.</p>";
        } else {
          html += `<ul class="detail-list">`;
          sessions.forEach(sess => {
            html += `<li><a href="resume.html?type=session&id=${encodeURIComponent(sess.id)}">Session du ${sess.date} ${sess.finished ? "(terminée)" : "(active)"}</a></li>`;
          });
          html += `</ul>`;
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
        let sessionScores = {};
        parties.forEach(party => {
          Object.entries(party.scores).forEach(([player, score]) => {
            sessionScores[player] = (sessionScores[player] || 0) + score;
          });
        });
        rankingData = Object.entries(sessionScores);
        rankingData.sort((a, b) => a[1] - b[1]);
        html += `<h3>Classement de la session (gagnant = moins de points)</h3>`;
        if (rankingData.length === 0) {
          html += "<p>Aucun score disponible.</p>";
        } else {
          html += renderRankingTable(rankingData);
          html += `<h3>Graphique des scores</h3><canvas id="rankingChart"></canvas>`;
        }
        html += `<h3>Parties</h3>`;
        if (parties.length === 0) {
          html += "<p>Aucune partie disponible.</p>";
        } else {
          html += `<ul class="detail-list">`;
          parties.forEach(party => {
            html += `<li><a href="resume.html?type=partie&id=${encodeURIComponent(party.id)}">Partie ${party.id} ${party.finished ? "(terminée)" : "(active)"}</a></li>`;
          });
          html += `</ul>`;
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
    const quote = getRandomQuote();
    html += `<div class="quote-section"><p>"${quote}"</p></div>`;

    document.getElementById('breadcrumb-current').textContent = breadcrumbCurrent;
    container.innerHTML = html;

    // Crée le graphique si nécessaire
    if (rankingData && document.getElementById('rankingChart')) {
      createRankingChart(rankingData);
    }
  }

  const params = getQueryParams();
  loadData().then(data => {
    renderResume(data, params.type, params.id);
  });
});
